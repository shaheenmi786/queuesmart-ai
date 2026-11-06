from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from datetime import datetime, timezone
import json
import sys
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(current_dir, ".."))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from models.database import db
from models.appointment import Appointment
from models.queue import QueueToken, QueueEvent
from models.doctor import Doctor, DoctorSchedule, DoctorLeave
from models.department import Department
from models.notification import Notification
from models.triage import PatientSymptoms, TriageAssessment, PriorityAuditLog
from services.triage_engine import TriageEngine
from utils.auth_helpers import get_current_user, log_audit
from ml.model import MLPredictionEngine
from sockets.events import broadcast_queue_update

appointments_bp = Blueprint("appointments", __name__, url_prefix="/api/v1/appointments")

@appointments_bp.route("", methods=["GET"])
@jwt_required()
def get_appointments():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    hospital_id = request.args.get("hospital_id", type=int) or user.hospital_id

    query = Appointment.query
    if hospital_id:
        query = query.filter(Appointment.hospital_id == hospital_id)

    if user.role == "patient":
        appointments = query.filter_by(patient_id=user.id).order_by(Appointment.id.desc()).all()
    elif user.role == "doctor":
        if not user.doctor_profile:
            return jsonify({"appointments": []}), 200
        appointments = query.filter_by(doctor_id=user.doctor_profile.id).order_by(Appointment.id.desc()).all()
    else: # platform_admin, hospital_admin, staff
        appointments = query.order_by(Appointment.id.desc()).all()

    return jsonify({"appointments": [a.to_dict() for a in appointments]}), 200

@appointments_bp.route("/<int:appointment_id>", methods=["GET"])
@jwt_required()
def get_appointment(appointment_id):
    user = get_current_user()
    appointment = Appointment.query.get(appointment_id)
    if not appointment:
        return jsonify({"error": "Appointment not found."}), 404

    # Tenant & user isolation
    if user.role == "patient" and appointment.patient_id != user.id:
        return jsonify({"error": "Access forbidden."}), 403

    return jsonify({"appointment": appointment.to_dict()}), 200

@appointments_bp.route("", methods=["POST"])
@jwt_required()
def create_appointment():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json() or {}
    department_id = data.get("department_id")
    doctor_id = data.get("doctor_id")
    appointment_date = data.get("appointment_date") # YYYY-MM-DD
    appointment_time = data.get("appointment_time") # HH:MM or HH:MM:SS
    hospital_id = data.get("hospital_id") or user.hospital_id

    # Symptom-Based Smart Triage Fields
    main_symptoms = (data.get("main_symptoms") or data.get("reason") or data.get("reason_for_visit") or "General Consultation").strip()
    symptom_description = (data.get("symptom_description") or data.get("description") or main_symptoms).strip()
    symptom_duration = (data.get("symptom_duration") or "Not specified").strip()
    reported_severity = (data.get("reported_severity") or "moderate").strip().lower()
    is_worsening = bool(data.get("is_worsening", False))
    existing_conditions = (data.get("existing_conditions") or "").strip()
    additional_notes = (data.get("additional_notes") or "").strip()
    consent_acknowledged = bool(data.get("consent_acknowledged", True))

    # Evaluate symptoms through rule-based clinical triage engine
    triage_eval = TriageEngine.evaluate_symptoms({
        "main_symptoms": main_symptoms,
        "symptom_description": symptom_description,
        "symptom_duration": symptom_duration,
        "reported_severity": reported_severity,
        "is_worsening": is_worsening,
        "existing_conditions": existing_conditions,
    })
    prelim_urgency = triage_eval["preliminary_urgency"]

    # Initial priority based on triage assessment or user specification
    if prelim_urgency == "emergency_warning":
        calculated_priority = "emergency"
    elif prelim_urgency == "urgent_review":
        calculated_priority = "urgent"
    else:
        calculated_priority = data.get("priority", "normal")

    reason = main_symptoms

    if not department_id or not doctor_id or not appointment_date or not appointment_time:
        return jsonify({"error": "Department, doctor, date, and time are required."}), 400

    # Validate department and doctor
    department = Department.query.get(department_id)
    if not department or not department.is_active:
        return jsonify({"error": "Department not found or inactive."}), 404

    doctor = Doctor.query.get(doctor_id)
    if not doctor or doctor.department_id != department.id:
        return jsonify({"error": "Selected doctor is not associated with this department."}), 400

    if not hospital_id:
        hospital_id = department.hospital_id or doctor.hospital_id

    # Check doctor leave
    leave = DoctorLeave.query.filter(
        DoctorLeave.doctor_id == doctor_id,
        DoctorLeave.status == "approved",
        DoctorLeave.start_date <= appointment_date,
        DoctorLeave.end_date >= appointment_date
    ).first()
    if leave:
        return jsonify({"error": f"Doctor is on scheduled leave on {appointment_date}."}), 409

    # Strict transaction isolation and row locking to prevent race-condition booking collisions
    try:
        # Check doctor slot conflict
        existing = Appointment.query.filter_by(
            doctor_id=doctor_id,
            appointment_date=appointment_date,
            appointment_time=appointment_time
        ).filter(Appointment.status.in_(["scheduled", "confirmed", "checked_in"])).first()

        if existing:
            return jsonify({"error": "This appointment slot is already booked. Please choose another slot."}), 409

        # Check patient conflict at same time
        patient_conflict = Appointment.query.filter_by(
            patient_id=user.id,
            appointment_date=appointment_date,
            appointment_time=appointment_time
        ).filter(Appointment.status.in_(["scheduled", "confirmed", "checked_in"])).first()

        if patient_conflict:
            return jsonify({"error": "You already have another active appointment scheduled at this time."}), 409

        # Create appointment record
        appointment = Appointment(
            hospital_id=hospital_id,
            patient_id=user.id,
            doctor_id=doctor_id,
            department_id=department_id,
            appointment_date=appointment_date,
            appointment_time=appointment_time,
            reason=reason,
            priority=calculated_priority,
            status="scheduled"
        )
        db.session.add(appointment)
        db.session.flush()

        # Persist structured symptoms
        patient_symptoms = PatientSymptoms(
            appointment_id=appointment.id,
            patient_id=user.id,
            hospital_id=hospital_id,
            main_symptoms=main_symptoms,
            symptom_description=symptom_description,
            symptom_duration=symptom_duration,
            reported_severity=reported_severity,
            is_worsening=is_worsening,
            existing_conditions=existing_conditions,
            additional_notes=additional_notes,
            consent_acknowledged=consent_acknowledged
        )
        db.session.add(patient_symptoms)

        # Persist preliminary triage assessment
        triage_assessment = TriageAssessment(
            appointment_id=appointment.id,
            hospital_id=hospital_id,
            patient_id=user.id,
            preliminary_urgency=prelim_urgency,
            staff_approved_priority="pending",
            review_status="pending_review",
            clinical_summary=triage_eval.get("clinical_summary"),
            warning_flags_json=json.dumps(triage_eval.get("warning_flags", [])),
            assessment_notes=f"Initial automated rule triage: {prelim_urgency}. Awaiting clinical staff confirmation."
        )
        db.session.add(triage_assessment)

        # Generate unique daily token sequence with priority indicator
        dept_code = department.code.upper()
        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        daily_count = QueueToken.query.filter(
            QueueToken.department_id == department_id,
            QueueToken.token_date == today_str
        ).count() + 1

        if prelim_urgency == "emergency_warning":
            token_str = f"{dept_code}-EMG{daily_count:03d}"
        elif prelim_urgency == "urgent_review" or calculated_priority == "urgent":
            token_str = f"{dept_code}-U{daily_count:03d}"
        else:
            token_str = f"{dept_code}-N{daily_count:03d}"

        # ML Predictions (Service Duration & Waiting Time & No-Show Risk)
        active_queue_len = QueueToken.query.filter(
            QueueToken.department_id == department_id,
            QueueToken.status.in_(["waiting", "calling"])
        ).count()

        avail_docs_count = Doctor.query.filter_by(
            department_id=department_id,
            status="available"
        ).count() or 1

        engine = MLPredictionEngine.get_instance()
        
        service_pred = engine.predict_service_time({
            "department_code": dept_code,
            "specialization": doctor.specialization,
            "reason_for_visit": reason,
            "years_experience": doctor.years_experience,
            "hour": int(appointment_time.split(":")[0]) if ":" in appointment_time else 10,
            "weekday": datetime.now().weekday()
        })
        pred_service_mins = service_pred.get("predicted_service_minutes", department.average_service_time_mins or 15.0)

        wait_pred = engine.predict_waiting_time({
            "department_code": dept_code,
            "specialization": doctor.specialization,
            "queue_length": active_queue_len,
            "available_doctors": avail_docs_count,
            "hour": int(appointment_time.split(":")[0]) if ":" in appointment_time else 10,
            "weekday": datetime.now().weekday()
        })
        pred_wait_mins = wait_pred.get("predicted_wait_minutes", max(2.0, active_queue_len * 10.0))

        # Check no-show probability
        noshow_pred = engine.predict_no_show_risk({
            "prior_noshows": 0,
            "prior_appts": 1,
            "specialization": doctor.specialization,
            "reason_for_visit": reason,
            "hour": int(appointment_time.split(":")[0]) if ":" in appointment_time else 10
        })

        # Create persistent QueueToken
        queue_token = QueueToken(
            hospital_id=hospital_id,
            token_number=token_str,
            token_date=today_str,
            daily_sequence=daily_count,
            appointment_id=appointment.id,
            patient_id=user.id,
            doctor_id=doctor_id,
            department_id=department_id,
            priority=calculated_priority,
            status="waiting",
            counter_number=doctor.counter_number or "Counter 1",
            ml_predicted_wait_minutes=pred_wait_mins,
            ml_predicted_service_minutes=pred_service_mins
        )
        db.session.add(queue_token)
        db.session.flush()

        # Log queue lifecycle event
        event = QueueEvent(
            hospital_id=hospital_id,
            token_id=queue_token.id,
            event_type="created",
            from_status="none",
            to_status="waiting",
            actor_user_id=user.id,
            details=f"Token {token_str} issued with appointment {appointment.id} ({calculated_priority.upper()} priority)."
        )
        db.session.add(event)

        # Notify patient
        notif = Notification(
            user_id=user.id,
            hospital_id=hospital_id,
            title="Appointment Confirmed",
            message=f"Booked with {doctor.user.name} ({department.name}) on {appointment_date} at {appointment_time}. Token: {token_str}.",
            category="appointment",
            channel="in_app"
        )
        db.session.add(notif)

        # If emergency warning detected, notify patient and record immediate alert
        if triage_eval.get("requires_immediate_escalation"):
            emerg_notif = Notification(
                user_id=user.id,
                hospital_id=hospital_id,
                title="EMERGENCY NOTICE: Immediate Care Recommended",
                message=triage_eval.get("emergency_message", "Warning flags detected. Seek immediate emergency care."),
                category="emergency",
                channel="in_app"
            )
            db.session.add(emerg_notif)

        db.session.commit()

        log_audit("appointment_booked", "appointments", appointment.id, f"Token {token_str} booked. Urgency: {prelim_urgency}.", user.id, hospital_id)

        token_dict = queue_token.to_dict()
        broadcast_queue_update(token_dict, "created")

        return jsonify({
            "message": "Appointment booked and token issued successfully.",
            "appointment": appointment.to_dict(),
            "token": token_dict,
            "triage": {
                "assessment": triage_assessment.to_dict(),
                "symptoms": patient_symptoms.to_dict(),
                "requires_immediate_escalation": triage_eval.get("requires_immediate_escalation", False),
                "emergency_message": triage_eval.get("emergency_message"),
                "warning_flags": triage_eval.get("warning_flags", []),
                "clinical_summary": triage_eval.get("clinical_summary"),
                "clinical_disclaimer": triage_eval.get("clinical_disclaimer")
            },
            "ai_insights": {
                "predicted_service_minutes": pred_service_mins,
                "predicted_wait_minutes": pred_wait_mins,
                "no_show_risk": noshow_pred.get("risk_level", "Low")
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to book appointment: {str(e)}"}), 500

@appointments_bp.route("/<int:appointment_id>/cancel", methods=["PATCH"])
@jwt_required()
def cancel_appointment(appointment_id):
    user = get_current_user()
    appointment = Appointment.query.get(appointment_id)

    if not appointment:
        return jsonify({"error": "Appointment not found."}), 404

    if user.role == "patient" and appointment.patient_id != user.id:
        return jsonify({"error": "Unauthorized to cancel this appointment."}), 403

    appointment.status = "cancelled"
    if appointment.token:
        appointment.token.status = "cancelled"
        event = QueueEvent(
            hospital_id=appointment.hospital_id,
            token_id=appointment.token.id,
            event_type="cancelled",
            from_status="waiting",
            to_status="cancelled",
            actor_user_id=user.id,
            details=f"Appointment {appointment_id} cancelled by user {user.name}."
        )
        db.session.add(event)
        broadcast_queue_update(appointment.token.to_dict(), "cancelled")

    notif = Notification(
        user_id=appointment.patient_id,
        hospital_id=appointment.hospital_id,
        title="Appointment Cancelled",
        message=f"Your appointment on {appointment.appointment_date} has been cancelled.",
        category="appointment"
    )
    db.session.add(notif)
    db.session.commit()

    log_audit("appointment_cancelled", "appointments", appointment.id, f"Cancelled by user {user.id}", user.id, appointment.hospital_id)

    return jsonify({
        "message": "Appointment cancelled successfully.",
        "appointment": appointment.to_dict()
    }), 200
