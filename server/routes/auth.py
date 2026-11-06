from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from datetime import datetime, timezone
import sys
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(current_dir, ".."))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from models.database import db
from models.user import User, UserSession
from models.patient import Patient
from models.hospital import Hospital
from utils.auth_helpers import log_audit, get_current_user

auth_bp = Blueprint("auth", __name__, url_prefix="/api/v1/auth")

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    phone = data.get("phone", "").strip()
    hospital_id = data.get("hospital_id")

    if not name or not email or not password:
        return jsonify({"error": "Name, email, and password are required."}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters long."}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "An account with this email address already exists."}), 409

    # Default hospital if none specified (single-hospital deployment)
    if not hospital_id:
        active_hosp = Hospital.query.filter_by(status="active").first()
        hospital_id = active_hosp.id if active_hosp else None

    # Strict security requirement: Public registration ONLY creates patient role.
    # Administrative & Clinical roles can NEVER be self-assigned.
    user = User(
        hospital_id=hospital_id,
        name=name,
        email=email,
        phone=phone,
        role="patient",
        is_active=True,
        status="active"
    )
    user.set_password(password)
    db.session.add(user)
    db.session.flush()

    # Create associated clinical Patient record with MRN
    total_patients = Patient.query.count() + 1
    mrn = f"MRN-P{total_patients:04d}"
    patient_record = Patient(
        user_id=user.id,
        hospital_id=hospital_id,
        patient_mrn=mrn,
        gender=data.get("gender", "Unspecified"),
        date_of_birth=data.get("date_of_birth"),
        insurance_provider=data.get("insurance_provider", "None")
    )
    db.session.add(patient_record)
    db.session.commit()

    log_audit("user_registered", "users", user.id, f"Patient {email} registered (MRN: {mrn}).", user.id, hospital_id)

    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))

    return jsonify({
        "message": "Registration successful.",
        "user": user.to_dict(),
        "patient_mrn": mrn,
        "access_token": access_token,
        "refresh_token": refresh_token
    }), 201

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 400

    user = User.query.filter_by(email=email).first()

    # Generic error preventing account enumeration
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid email or password."}), 401

    if not user.is_active or user.status == "suspended":
        return jsonify({"error": "Account is inactive or suspended. Please contact hospital administration."}), 403

    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))

    log_audit("user_login", "users", user.id, f"User {user.email} authenticated.", user.id, user.hospital_id)

    return jsonify({
        "message": "Login successful.",
        "user": user.to_dict(),
        "access_token": access_token,
        "refresh_token": refresh_token
    }), 200

@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh_token():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id)) if user_id else None
    if not user or not user.is_active:
        return jsonify({"error": "User account inactive or not found."}), 401

    new_access_token = create_access_token(identity=str(user.id))
    return jsonify({"access_token": new_access_token}), 200

@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    user = get_current_user()
    if not user:
        return jsonify({"error": "User session not found."}), 404
    return jsonify({"user": user.to_dict()}), 200

@auth_bp.route("/logout", methods=["POST"])
def logout():
    return jsonify({"message": "Successfully logged out."}), 200

@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    return jsonify({
        "message": "If an account with that email exists, password reset instructions have been dispatched."
    }), 200

@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    new_password = data.get("password", "")

    if not email or not new_password:
        return jsonify({"error": "Email and new password are required."}), 400

    user = User.query.filter_by(email=email).first()
    if user:
        user.set_password(new_password)
        db.session.commit()
        log_audit("password_reset", "users", user.id, "Password reset successfully.", user.id, user.hospital_id)

    return jsonify({"message": "Password updated successfully. Please log in with your new password."}), 200
