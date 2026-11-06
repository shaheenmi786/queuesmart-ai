from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
import sys
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(current_dir, ".."))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from models.database import db
from models.hospital import Hospital, HospitalSetting, OperatingHours
from models.department import Department
from models.doctor import Doctor
from models.counter import Counter
from models.queue import QueueRule
from utils.auth_helpers import get_current_user, role_required, log_audit, enforce_tenant

hospitals_bp = Blueprint("hospitals", __name__, url_prefix="/api/v1/hospitals")

@hospitals_bp.route("", methods=["GET"])
def get_hospitals():
    user = get_current_user()
    if user and user.role == "platform_admin":
        hospitals = Hospital.query.order_by(Hospital.id.asc()).all()
    elif user and user.hospital_id:
        hospitals = Hospital.query.filter_by(id=user.hospital_id).all()
    else:
        hospitals = Hospital.query.filter_by(status="active").order_by(Hospital.name.asc()).all()

    return jsonify({"hospitals": [h.to_dict() for h in hospitals]}), 200

@hospitals_bp.route("/me", methods=["GET"])
@jwt_required()
def get_my_hospital():
    user = get_current_user()
    if not user or not user.hospital_id:
        # Default to first active hospital if single-hospital installation
        hospital = Hospital.query.filter_by(status="active").first()
        if not hospital:
            return jsonify({"error": "No active hospital configured."}), 404
        return jsonify({"hospital": hospital.to_dict()}), 200

    hospital = Hospital.query.get(user.hospital_id)
    if not hospital:
        return jsonify({"error": "Hospital not found."}), 404

    return jsonify({"hospital": hospital.to_dict()}), 200

@hospitals_bp.route("/<int:hospital_id>", methods=["GET"])
def get_hospital_by_id(hospital_id):
    hospital = Hospital.query.get(hospital_id)
    if not hospital:
        return jsonify({"error": "Hospital not found."}), 404

    return jsonify({"hospital": hospital.to_dict()}), 200

@hospitals_bp.route("", methods=["POST"])
@hospitals_bp.route("/register", methods=["POST"])
@jwt_required()
@role_required(["platform_admin", "admin", "hospital_admin"])
def register_hospital():
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    code = data.get("code", "").strip().upper()
    address = data.get("address", "").strip()
    city = data.get("city", "").strip()
    state = data.get("state", "").strip()
    contact_number = data.get("contact_number", "").strip()
    official_email = data.get("official_email", "").strip().lower()
    operating_hours = data.get("operating_hours", "08:00 - 20:00")
    timezone = data.get("timezone", "Asia/Kolkata")

    if not name or not code:
        return jsonify({"error": "Hospital name and unique code are required."}), 400

    if Hospital.query.filter_by(code=code).first():
        return jsonify({"error": f"Hospital code '{code}' already exists."}), 409

    hospital = Hospital(
        name=name,
        code=code,
        address=address,
        city=city,
        state=state,
        contact_number=contact_number,
        official_email=official_email,
        operating_hours=operating_hours,
        timezone=timezone,
        status="onboarding" # Incomplete until activated
    )
    db.session.add(hospital)
    db.session.flush()

    # Create default settings
    settings = HospitalSetting(hospital_id=hospital.id)
    db.session.add(settings)

    # Initialize 7 days operating hours
    for day in range(7):
        db.session.add(OperatingHours(
            hospital_id=hospital.id,
            day_of_week=day,
            opening_time="08:00",
            closing_time="20:00",
            is_closed=(day == 6) # Closed on Sunday by default
        ))

    db.session.commit()
    log_audit("hospital_registered", "hospitals", hospital.id, f"Hospital {name} ({code}) registered.", hospital_id=hospital.id)

    return jsonify({
        "message": "Hospital registered successfully in onboarding status.",
        "hospital": hospital.to_dict()
    }), 201

@hospitals_bp.route("/<int:hospital_id>/setup-status", methods=["GET"])
@jwt_required()
def get_setup_status(hospital_id):
    if not enforce_tenant(hospital_id):
        return jsonify({"error": "Unauthorized access to hospital setup."}), 403

    hospital = Hospital.query.get(hospital_id)
    if not hospital:
        return jsonify({"error": "Hospital not found."}), 404

    dept_count = Department.query.filter_by(hospital_id=hospital_id).count()
    doctor_count = Doctor.query.filter_by(hospital_id=hospital_id).count()
    counter_count = Counter.query.filter_by(hospital_id=hospital_id).count()
    rule_count = QueueRule.query.filter_by(hospital_id=hospital_id).count()

    steps = {
        "hospital_registered": True,
        "operating_hours_configured": bool(hospital.operating_hours),
        "departments_added": dept_count > 0,
        "doctors_added": doctor_count > 0,
        "counters_registered": counter_count > 0,
        "queue_rules_configured": rule_count > 0 or True, # Default policies exist
        "is_activated": hospital.status == "active"
    }

    completed_steps = sum(1 for v in steps.values() if v is True)
    total_steps = len(steps)
    pct = int((completed_steps / total_steps) * 100)

    checklist = {
        "has_departments": dept_count > 0,
        "has_doctors": doctor_count > 0,
        "has_counters": counter_count > 0,
        "has_operating_hours": bool(hospital.operating_hours),
    }
    is_ready = pct >= 80

    return jsonify({
        "hospital_id": hospital_id,
        "hospital_name": hospital.name,
        "status": hospital.status,
        "completion_percentage": pct,
        "is_ready": is_ready,
        "checklist": checklist,
        "steps": steps,
        "counts": {
            "departments": dept_count,
            "doctors": doctor_count,
            "counters": counter_count,
        }
    }), 200

@hospitals_bp.route("/<int:hospital_id>/activate", methods=["POST"])
@jwt_required()
@role_required(["platform_admin", "admin", "hospital_admin"])
def activate_hospital(hospital_id):
    if not enforce_tenant(hospital_id):
        return jsonify({"error": "Unauthorized"}), 403

    hospital = Hospital.query.get(hospital_id)
    if not hospital:
        return jsonify({"error": "Hospital not found."}), 404

    hospital.status = "active"
    db.session.commit()
    log_audit("hospital_activated", "hospitals", hospital.id, f"Hospital {hospital.name} activated.", hospital_id=hospital.id)

    return jsonify({"message": f"Hospital {hospital.name} is now active.", "hospital": hospital.to_dict()}), 200
