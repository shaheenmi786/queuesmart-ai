from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from datetime import datetime, timezone
import numpy as np
import sys
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(current_dir, ".."))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from models.database import db
from models.user import User
from models.doctor import Doctor
from models.department import Department
from models.counter import Counter, CounterAssignment
from models.appointment import Appointment
from models.queue import QueueToken
from models.audit import AuditLog
from models.ml_ops import ServiceRecord
from utils.auth_helpers import role_required, log_audit, get_current_user, enforce_tenant

admin_bp = Blueprint("admin", __name__, url_prefix="/api/v1/admin")

@admin_bp.route("/dashboard", methods=["GET"])
@jwt_required()
@role_required(["admin", "hospital_admin", "platform_admin"])
def admin_dashboard():
    user = get_current_user()
    hospital_id = request.args.get("hospital_id", type=int) or user.hospital_id

    p_query = User.query.filter_by(role="patient")
    doc_query = Doctor.query
    dept_query = Department.query.filter_by(is_active=True)
    appt_query = Appointment.query.filter_by(status="scheduled")
    q_query = QueueToken.query
    
    if hospital_id:
        p_query = p_query.filter_by(hospital_id=hospital_id)
        doc_query = doc_query.filter_by(hospital_id=hospital_id)
        dept_query = dept_query.filter_by(hospital_id=hospital_id)
        appt_query = appt_query.filter_by(hospital_id=hospital_id)
        q_query = q_query.filter_by(hospital_id=hospital_id)

    patients_count = p_query.count()
    doctors_count = doc_query.count()
    available_doctors_count = doc_query.filter_by(status="available").count()
    departments_count = dept_query.count()
    active_appointments_count = appt_query.count()
    waiting_patients_count = q_query.filter(QueueToken.status.in_(["waiting", "calling"])).count()
    completed_consultations_count = q_query.filter_by(status="completed").count()

    # Real averages from database
    avg_wait_q = db.session.query(db.func.avg(QueueToken.actual_wait_minutes)).filter(
        QueueToken.actual_wait_minutes.isnot(None)
    )
    if hospital_id:
        avg_wait_q = avg_wait_q.filter(QueueToken.hospital_id == hospital_id)
    avg_wait = avg_wait_q.scalar() or 0.0

    avg_serv_q = db.session.query(db.func.avg(QueueToken.actual_service_minutes)).filter(
        QueueToken.actual_service_minutes.isnot(None)
    )
    if hospital_id:
        avg_serv_q = avg_serv_q.filter(QueueToken.hospital_id == hospital_id)
    avg_service = avg_serv_q.scalar() or 0.0

    return jsonify({
        "metrics": {
            "registered_patients": patients_count,
            "total_doctors": doctors_count,
            "available_doctors": available_doctors_count,
            "active_departments": departments_count,
            "active_appointments": active_appointments_count,
            "patients_waiting": waiting_patients_count,
            "completed_consultations": completed_consultations_count,
            "average_waiting_time_mins": round(float(avg_wait), 1),
            "average_service_duration_mins": round(float(avg_service), 1),
        }
    }), 200

# Department Management
@admin_bp.route("/departments", methods=["GET"])
@jwt_required()
@role_required(["admin", "hospital_admin", "platform_admin"])
def get_departments():
    user = get_current_user()
    hospital_id = request.args.get("hospital_id", type=int) or user.hospital_id

    query = Department.query
    if hospital_id:
        query = query.filter_by(hospital_id=hospital_id)

    depts = query.order_by(Department.id.asc()).all()
    return jsonify({"departments": [d.to_dict() for d in depts]}), 200

@admin_bp.route("/departments", methods=["POST"])
@jwt_required()
@role_required(["admin", "hospital_admin", "platform_admin"])
def create_department():
    user = get_current_user()
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    code = data.get("code", "").strip().upper()
    description = data.get("description", "").strip()
    location = data.get("location", "").strip()
    avg_service = float(data.get("average_service_time_mins", 15.0))
    hospital_id = data.get("hospital_id") or user.hospital_id

    if not name or not code:
        return jsonify({"error": "Department name and code are required."}), 400

    existing = Department.query.filter(
        (Department.name == name) | (Department.code == code)
    )
    if hospital_id:
        existing = existing.filter_by(hospital_id=hospital_id)
    if existing.first():
        return jsonify({"error": "A department with this name or code already exists in this hospital."}), 409

    dept = Department(
        hospital_id=hospital_id,
        name=name,
        code=code,
        description=description,
        location=location,
        average_service_time_mins=avg_service,
        is_active=True
    )
    db.session.add(dept)
    db.session.commit()

    log_audit("department_created", "departments", dept.id, f"Department {dept.name} ({dept.code}) created.", user.id, hospital_id)
    return jsonify({"message": "Department created successfully.", "department": dept.to_dict()}), 201

@admin_bp.route("/departments/<int:id>", methods=["PUT"])
@jwt_required()
@role_required(["admin", "hospital_admin", "platform_admin"])
def update_department(id):
    dept = Department.query.get(id)
    if not dept:
        return jsonify({"error": "Department not found."}), 404

    data = request.get_json() or {}
    if "name" in data: dept.name = data["name"]
    if "description" in data: dept.description = data["description"]
    if "location" in data: dept.location = data["location"]
    if "average_service_time_mins" in data: dept.average_service_time_mins = float(data["average_service_time_mins"])
    if "is_active" in data: dept.is_active = bool(data["is_active"])

    db.session.commit()
    log_audit("department_updated", "departments", dept.id, f"Department {dept.name} updated.", hospital_id=dept.hospital_id)
    return jsonify({"message": "Department updated.", "department": dept.to_dict()}), 200

# Doctor Management
@admin_bp.route("/doctors", methods=["GET"])
@jwt_required()
@role_required(["admin", "hospital_admin", "platform_admin"])
def get_all_doctors():
    user = get_current_user()
    hospital_id = request.args.get("hospital_id", type=int) or user.hospital_id

    query = Doctor.query
    if hospital_id:
        query = query.filter_by(hospital_id=hospital_id)

    doctors = query.order_by(Doctor.id.asc()).all()
    return jsonify({"doctors": [d.to_dict() for d in doctors]}), 200

@admin_bp.route("/doctors", methods=["POST"])
@jwt_required()
@role_required(["admin", "hospital_admin", "platform_admin"])
def create_doctor():
    user = get_current_user()
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "Doctor@123")
    phone = data.get("phone", "")
    department_id = data.get("department_id")
    specialization = data.get("specialization", "Specialist Physician")
    room_number = data.get("room_number", "Room 101")
    counter_number = data.get("counter_number", "Counter 1")
    fee = float(data.get("consultation_fee", 50.0))
    experience = int(data.get("years_experience", 5))
    hospital_id = data.get("hospital_id") or user.hospital_id

    if not name or not email or not department_id:
        return jsonify({"error": "Name, email, and department are required."}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "An account with this email address already exists."}), 409

    dept = Department.query.get(department_id)
    if not dept:
        return jsonify({"error": "Department not found."}), 404

    # Create user with role='doctor'
    new_user = User(
        hospital_id=hospital_id,
        name=name,
        email=email,
        phone=phone,
        role="doctor",
        is_active=True
    )
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.flush()

    doctor = Doctor(
        user_id=new_user.id,
        hospital_id=hospital_id,
        department_id=dept.id,
        specialization=specialization,
        years_experience=experience,
        room_number=room_number,
        counter_number=counter_number,
        status="available",
        consultation_fee=fee,
        schedule_json='{"days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "hours": "09:00 - 17:00"}'
    )
    db.session.add(doctor)
    db.session.commit()

    log_audit("doctor_registered", "doctors", doctor.id, f"Dr. {name} registered in {dept.name}.", user.id, hospital_id)
    return jsonify({"message": "Doctor registered successfully.", "doctor": doctor.to_dict()}), 201

# Counter Management
@admin_bp.route("/counters", methods=["GET"])
@jwt_required()
@role_required(["admin", "hospital_admin", "platform_admin"])
def get_counters():
    user = get_current_user()
    hospital_id = request.args.get("hospital_id", type=int) or user.hospital_id
    query = Counter.query
    if hospital_id:
        query = query.filter_by(hospital_id=hospital_id)
    counters = query.all()
    return jsonify({"counters": [c.to_dict() for c in counters]}), 200

@admin_bp.route("/counters", methods=["POST"])
@jwt_required()
@role_required(["admin", "hospital_admin", "platform_admin"])
def create_counter():
    user = get_current_user()
    data = request.get_json() or {}
    counter_name = data.get("counter_name", "").strip()
    counter_number = data.get("counter_number", "").strip()
    department_id = data.get("department_id")
    room_number = data.get("room_number", "")
    hospital_id = data.get("hospital_id") or user.hospital_id

    if not counter_name or not counter_number:
        return jsonify({"error": "Counter name and number required."}), 400

    counter = Counter(
        hospital_id=hospital_id,
        department_id=department_id,
        counter_name=counter_name,
        counter_number=counter_number,
        room_number=room_number,
        status="active"
    )
    db.session.add(counter)
    db.session.commit()

    log_audit("counter_created", "counters", counter.id, f"Counter {counter_name} registered.", user.id, hospital_id)
    return jsonify({"message": "Counter created successfully.", "counter": counter.to_dict()}), 201

# Analytics & Reports
@admin_bp.route("/analytics", methods=["GET"])
@jwt_required()
@role_required(["admin", "hospital_admin", "platform_admin"])
def admin_analytics():
    user = get_current_user()
    hospital_id = request.args.get("hospital_id", type=int) or user.hospital_id

    dept_query = Department.query
    doc_query = Doctor.query
    if hospital_id:
        dept_query = dept_query.filter_by(hospital_id=hospital_id)
        doc_query = doc_query.filter_by(hospital_id=hospital_id)

    depts = dept_query.all()
    dept_workload = []
    for d in depts:
        count = QueueToken.query.filter_by(department_id=d.id).count()
        completed = QueueToken.query.filter_by(department_id=d.id, status="completed").count()
        dept_workload.append({
            "department": d.name,
            "total_tokens": count,
            "completed": completed,
            "code": d.code
        })

    doctors = doc_query.all()
    doc_utilization = []
    for doc in doctors:
        consulted = QueueToken.query.filter_by(doctor_id=doc.id, status="completed").count()
        doc_utilization.append({
            "doctor": doc.user.name if doc.user else f"Doctor {doc.id}",
            "department": doc.department.name if doc.department else "General",
            "completed_consultations": consulted,
            "status": doc.status
        })

    return jsonify({
        "department_workload": dept_workload,
        "doctor_utilization": doc_utilization
    }), 200

@admin_bp.route("/reports", methods=["GET"])
@jwt_required()
@role_required(["admin", "hospital_admin", "platform_admin"])
def admin_reports():
    user = get_current_user()
    hospital_id = request.args.get("hospital_id", type=int) or user.hospital_id

    # Compute 90th percentile waiting time from completed tokens
    q_tokens = QueueToken.query.filter(
        QueueToken.status == "completed",
        QueueToken.actual_wait_minutes.isnot(None)
    )
    if hospital_id:
        q_tokens = q_tokens.filter_by(hospital_id=hospital_id)

    wait_times = [t.actual_wait_minutes for t in q_tokens.all()]
    p90_wait = float(np.percentile(wait_times, 90)) if wait_times else 0.0

    service_times = [t.actual_service_minutes for t in q_tokens.all() if t.actual_service_minutes is not None]
    avg_service = float(np.mean(service_times)) if service_times else 15.0

    return jsonify({
        "hospital_id": hospital_id,
        "total_service_records": len(wait_times),
        "percentile_90_waiting_time_mins": round(p90_wait, 1),
        "average_service_duration_mins": round(avg_service, 1),
        "total_active_counters": Counter.query.filter_by(status="active").count(),
        "generated_at": datetime.now(timezone.utc).isoformat()
    }), 200

@admin_bp.route("/audit-logs", methods=["GET"])
@jwt_required()
@role_required(["admin", "hospital_admin", "platform_admin"])
def get_audit_logs():
    user = get_current_user()
    hospital_id = request.args.get("hospital_id", type=int) or user.hospital_id

    query = AuditLog.query
    if hospital_id and user.role != "platform_admin":
        query = query.filter_by(hospital_id=hospital_id)

    logs = query.order_by(AuditLog.id.desc()).limit(50).all()
    return jsonify({"audit_logs": [l.to_dict() for l in logs]}), 200
