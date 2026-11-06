from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
import sys
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(current_dir, ".."))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from models.database import db
from models.doctor import Doctor, DoctorSchedule, DoctorLeave
from models.queue import QueueToken
from models.department import Department
from utils.auth_helpers import get_current_user, role_required, log_audit, enforce_tenant
from sockets.events import broadcast_doctor_status

doctors_bp = Blueprint("doctors", __name__, url_prefix="/api/v1/doctors")

@doctors_bp.route("", methods=["GET"])
def get_doctors():
    department_id = request.args.get("department_id", type=int)
    hospital_id = request.args.get("hospital_id", type=int)

    query = Doctor.query.join(Doctor.user).filter(Doctor.user.has(is_active=True))
    if hospital_id:
        query = query.filter(Doctor.hospital_id == hospital_id)
    if department_id:
        query = query.filter(Doctor.department_id == department_id)
    
    doctors = query.all()
    return jsonify({"doctors": [d.to_dict() for d in doctors]}), 200

@doctors_bp.route("/<int:doctor_id>", methods=["GET"])
def get_doctor(doctor_id):
    doctor = Doctor.query.get(doctor_id)
    if not doctor:
        return jsonify({"error": "Doctor not found."}), 404
    return jsonify({"doctor": doctor.to_dict()}), 200

@doctors_bp.route("/<int:doctor_id>/schedules", methods=["GET"])
def get_doctor_schedules(doctor_id):
    doctor = Doctor.query.get(doctor_id)
    if not doctor:
        return jsonify({"error": "Doctor not found."}), 404
    schedules = DoctorSchedule.query.filter_by(doctor_id=doctor_id, is_active=True).all()
    return jsonify({"schedules": [s.to_dict() for s in schedules]}), 200

@doctors_bp.route("/<int:doctor_id>/schedules", methods=["POST"])
@jwt_required()
@role_required(["admin", "hospital_admin", "doctor"])
def add_doctor_schedule(doctor_id):
    doctor = Doctor.query.get(doctor_id)
    if not doctor:
        return jsonify({"error": "Doctor not found."}), 404

    data = request.get_json() or {}
    day_of_week = int(data.get("day_of_week", 0))
    start_time = data.get("start_time", "09:00")
    end_time = data.get("end_time", "17:00")
    slot_duration = int(data.get("slot_duration_mins", 30))
    max_patients = int(data.get("max_patients_per_slot", 1))

    schedule = DoctorSchedule(
        hospital_id=doctor.hospital_id,
        doctor_id=doctor.id,
        day_of_week=day_of_week,
        start_time=start_time,
        end_time=end_time,
        slot_duration_mins=slot_duration,
        max_patients_per_slot=max_patients,
        is_active=True
    )
    db.session.add(schedule)
    db.session.commit()

    log_audit("doctor_schedule_created", "doctor_schedules", schedule.id, f"Schedule added for Dr. {doctor.user.name}", hospital_id=doctor.hospital_id)
    return jsonify({"message": "Schedule created successfully.", "schedule": schedule.to_dict()}), 201

@doctors_bp.route("/me", methods=["GET"])
@jwt_required()
@role_required(["doctor", "admin", "hospital_admin"])
def get_doctor_profile():
    user = get_current_user()
    if not user.doctor_profile:
        return jsonify({"error": "Doctor profile not configured for this account."}), 404
    return jsonify({"doctor": user.doctor_profile.to_dict()}), 200

@doctors_bp.route("/availability", methods=["GET"])
@jwt_required()
def get_availability():
    doctor_id = request.args.get("doctor_id", type=int)
    if doctor_id:
        doctor = Doctor.query.get(doctor_id)
    else:
        user = get_current_user()
        doctor = user.doctor_profile if user else None

    if not doctor:
        return jsonify({"error": "Doctor not found."}), 404

    return jsonify({
        "doctor_id": doctor.id,
        "name": doctor.user.name,
        "status": doctor.status,
        "counter_number": doctor.counter_number,
        "room_number": doctor.room_number,
        "schedule": doctor.to_dict().get("schedule", {})
    }), 200

@doctors_bp.route("/availability", methods=["PUT"])
@jwt_required()
@role_required(["doctor", "admin", "hospital_admin"])
def update_availability():
    user = get_current_user()
    doctor = user.doctor_profile
    if not doctor and user.role in ["admin", "hospital_admin", "platform_admin"]:
        doctor_id = request.get_json().get("doctor_id")
        doctor = Doctor.query.get(doctor_id)

    if not doctor:
        return jsonify({"error": "Doctor record not found."}), 404

    data = request.get_json() or {}
    status = data.get("status")
    counter_number = data.get("counter_number")
    room_number = data.get("room_number")

    if status and status in ["available", "paused", "offline"]:
        doctor.status = status
    if counter_number:
        doctor.counter_number = counter_number
    if room_number:
        doctor.room_number = room_number

    db.session.commit()
    log_audit("doctor_availability_update", "doctors", doctor.id, f"Status updated to {doctor.status}", hospital_id=doctor.hospital_id)

    doc_data = doctor.to_dict()
    broadcast_doctor_status(doc_data)

    return jsonify({
        "message": "Availability updated successfully.",
        "doctor": doc_data
    }), 200

@doctors_bp.route("/queue", methods=["GET"])
@jwt_required()
@role_required(["doctor", "admin", "hospital_admin", "staff"])
def get_doctor_queue():
    user = get_current_user()
    doctor = user.doctor_profile
    doctor_id = request.args.get("doctor_id", type=int)

    if doctor_id:
        target_doctor_id = doctor_id
    elif doctor:
        target_doctor_id = doctor.id
    else:
        return jsonify({"error": "Doctor identifier required."}), 400

    target_doc = Doctor.query.get(target_doctor_id)

    tokens = QueueToken.query.filter(
        (QueueToken.doctor_id == target_doctor_id) |
        (QueueToken.department_id == (target_doc.department_id if target_doc else None)),
        QueueToken.status.in_(["waiting", "calling", "consulting", "in_progress"])
    ).order_by(
        db.case(
            (QueueToken.priority == "emergency", 1),
            (QueueToken.priority == "urgent", 2),
            else_=3
        ),
        QueueToken.id.asc()
    ).all()

    completed_today = QueueToken.query.filter(
        QueueToken.doctor_id == target_doctor_id,
        QueueToken.status == "completed"
    ).count()

    waiting_count = len([t for t in tokens if t.status in ["waiting", "calling"]])
    consulting_token = next((t for t in tokens if t.status in ["consulting", "in_progress"]), None)

    avg_service = db.session.query(db.func.avg(QueueToken.actual_service_minutes)).filter(
        QueueToken.doctor_id == target_doctor_id,
        QueueToken.actual_service_minutes.isnot(None)
    ).scalar() or (target_doc.department.average_service_time_mins if target_doc and target_doc.department else 15.0)

    return jsonify({
        "queue": [t.to_dict() for t in tokens],
        "metrics": {
            "patients_waiting": waiting_count,
            "currently_consulting": consulting_token.to_dict() if consulting_token else None,
            "completed_today": completed_today,
            "average_service_duration_mins": round(float(avg_service), 1),
            "doctor_status": target_doc.status if target_doc else "available"
        }
    }), 200
