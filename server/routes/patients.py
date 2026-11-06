from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
import sys
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(current_dir, ".."))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from models.database import db
from models.user import User
from models.appointment import Appointment
from models.queue import QueueToken
from utils.auth_helpers import get_current_user, log_audit

patients_bp = Blueprint("patients", __name__, url_prefix="/api/v1/patients")

@patients_bp.route("/me", methods=["GET"])
@jwt_required()
def get_patient_profile():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    # Active token (waiting, calling, consulting)
    active_token = QueueToken.query.filter(
        QueueToken.patient_id == user.id,
        QueueToken.status.in_(["waiting", "calling", "consulting"])
    ).order_by(QueueToken.id.desc()).first()

    # Next scheduled appointment
    next_appointment = Appointment.query.filter_by(
        patient_id=user.id,
        status="scheduled"
    ).order_by(Appointment.appointment_date.asc(), Appointment.appointment_time.asc()).first()

    return jsonify({
        "patient": user.to_dict(),
        "active_token": active_token.to_dict() if active_token else None,
        "upcoming_appointment": next_appointment.to_dict() if next_appointment else None
    }), 200

@patients_bp.route("/me", methods=["PUT"])
@jwt_required()
def update_patient_profile():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json() or {}
    if "name" in data and data["name"].strip():
        user.name = data["name"].strip()
    if "phone" in data:
        user.phone = data["phone"].strip()

    db.session.commit()
    log_audit("patient_profile_updated", "users", user.id, "Profile information updated.")

    return jsonify({
        "message": "Profile updated successfully.",
        "patient": user.to_dict()
    }), 200

@patients_bp.route("/appointments", methods=["GET"])
@jwt_required()
def get_patient_appointments():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    appointments = Appointment.query.filter_by(patient_id=user.id).order_by(Appointment.id.desc()).all()
    return jsonify({"appointments": [a.to_dict() for a in appointments]}), 200
