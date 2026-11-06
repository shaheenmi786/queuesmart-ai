from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from datetime import datetime, timezone
import sys
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(current_dir, ".."))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from models.database import db
from models.user import User
from models.appointment import Appointment
from models.queue import QueueToken, QueueEvent
from models.triage import PatientSymptoms, TriageAssessment, PriorityAuditLog
from models.notification import Notification
from services.triage_engine import TriageEngine
from utils.auth_helpers import get_current_user, role_required, log_audit, enforce_tenant
from sockets.events import broadcast_queue_update, broadcast_triage_update

triage_bp = Blueprint("triage", __name__, url_prefix="/api/v1/triage")

@triage_bp.route("/assess", methods=["POST"])
@jwt_required()
def preliminary_assess():
    """
    Run preliminary rule-based triage assessment without saving an appointment.
    Useful for live booking preview or immediate emergency warning checking.
    """
    data = request.get_json() or {}
    assessment = TriageEngine.evaluate_symptoms(data)
    return jsonify({"assessment": assessment}), 200

@triage_bp.route("/pending", methods=["GET"])
@jwt_required()
@role_required(["doctor", "admin", "hospital_admin", "staff", "receptionist"])
def get_pending_triage():
    """
    Retrieve all appointments awaiting clinical staff priority assessment/review.
    Supports hospital_id and department_id filtering.
    """
    user = get_current_user()
    hospital_id = request.args.get("hospital_id", type=int) or user.hospital_id
    department_id = request.args.get("department_id", type=int)

    query = TriageAssessment.query.join(Appointment, TriageAssessment.appointment_id == Appointment.id)

    if hospital_id:
        query = query.filter(TriageAssessment.hospital_id == hospital_id)
    if department_id:
        query = query.filter(Appointment.department_id == department_id)
    elif user.role == "doctor" and user.doctor_profile:
        query = query.filter(Appointment.department_id == user.doctor_profile.department_id)

    # Filter for cases needing review (pending_review or urgent/emergency)
    review_status = request.args.get("status")
    if review_status:
        query = query.filter(TriageAssessment.review_status == review_status)
    else:
        query = query.filter(TriageAssessment.review_status.in_(["pending_review", "info_requested"]))

    assessments = query.order_by(
        db.case(
            (TriageAssessment.preliminary_urgency == "emergency_warning", 1),
            (TriageAssessment.preliminary_urgency == "urgent_review", 2),
            else_=3
        ),
        TriageAssessment.created_at.asc()
    ).all()

    result = []
    for ta in assessments:
        appt = Appointment.query.get(ta.appointment_id)
        symptoms = PatientSymptoms.query.filter_by(appointment_id=ta.appointment_id).first()
        token = QueueToken.query.filter_by(appointment_id=ta.appointment_id).first()

        item = ta.to_dict()
        item["appointment"] = appt.to_dict() if appt else None
        item["symptoms"] = symptoms.to_dict() if symptoms else None
        item["token_number"] = token.token_number if token else None
        item["token_status"] = token.status if token else None
        result.append(item)

    return jsonify({"pending_triage": result, "pending": result, "count": len(result)}), 200

@triage_bp.route("/<int:assessment_id>", methods=["GET"])
@jwt_required()
def get_triage_detail(assessment_id):
    """
    Retrieve complete assessment, symptoms, and audit logs.
    """
    user = get_current_user()
    ta = TriageAssessment.query.get(assessment_id)
    if not ta:
        return jsonify({"error": "Triage assessment not found."}), 404

    # Authorization
    if user.role == "patient" and ta.patient_id != user.id:
        return jsonify({"error": "Unauthorized access."}), 403

    appt = Appointment.query.get(ta.appointment_id)
    symptoms = PatientSymptoms.query.filter_by(appointment_id=ta.appointment_id).first()
    token = QueueToken.query.filter_by(appointment_id=ta.appointment_id).first()
    logs = PriorityAuditLog.query.filter_by(appointment_id=ta.appointment_id).order_by(PriorityAuditLog.id.desc()).all()

    return jsonify({
        "assessment": ta.to_dict(),
        "appointment": appt.to_dict() if appt else None,
        "symptoms": symptoms.to_dict() if symptoms else None,
        "token": token.to_dict() if token else None,
        "audit_logs": [log.to_dict() for log in logs]
    }), 200

@triage_bp.route("/<int:assessment_id>/priority", methods=["PATCH"])
@jwt_required()
@role_required(["doctor", "admin", "hospital_admin", "staff", "receptionist"])
def update_priority(assessment_id):
    """
    Staff review action: approve or change priority with mandatory clinical reason.
    Records audit log, updates appointment and queue token, and broadcasts real-time update.
    """
    user = get_current_user()
    ta = TriageAssessment.query.get(assessment_id)
    if not ta:
        return jsonify({"error": "Triage assessment not found."}), 404

    data = request.get_json() or {}
    new_priority = data.get("priority", "").strip().lower()
    reason = (data.get("reason") or "").strip()
    action = data.get("action")
    if not action:
        # If new priority matches preliminary classification, consider it approved; otherwise modified
        prelim_core = ta.preliminary_urgency.replace("_priority", "").replace("_review", "").replace("_warning", "")
        action = "approved" if new_priority == prelim_core else "modified"
    assessment_notes = data.get("assessment_notes", "")

    if not new_priority or new_priority not in ["normal", "urgent", "emergency"]:
        return jsonify({"error": "Valid priority ('normal', 'urgent', 'emergency') is required."}), 400

    if not reason:
        return jsonify({"error": "Mandatory clinical reason is required for any staff priority assessment."}), 400

    appt = Appointment.query.get(ta.appointment_id)
    if not appt:
        return jsonify({"error": "Associated appointment not found."}), 404

    prev_priority = appt.priority

    # Update TriageAssessment
    ta.staff_approved_priority = new_priority
    ta.review_status = "approved" if action == "approved" else "modified"
    ta.reviewed_by = user.id
    ta.reviewed_at = datetime.now(timezone.utc)
    if assessment_notes:
        ta.assessment_notes = assessment_notes

    # Update Appointment
    appt.priority = new_priority

    # Update QueueToken if present
    token = QueueToken.query.filter_by(appointment_id=appt.id).first()
    if token:
        token.priority = new_priority

        # If priority elevated to urgent or normal, adjust token prefix if desired or maintain sequence
        dept_code = appt.department.code.upper() if appt.department else "CLIN"
        if new_priority == "urgent" and not token.token_number.startswith(f"{dept_code}-U"):
            # Update prefix to indicate urgent priority while keeping sequence
            seq = token.daily_sequence
            token.token_number = f"{dept_code}-U{seq:03d}"
        elif new_priority == "normal" and not token.token_number.startswith(f"{dept_code}-N"):
            seq = token.daily_sequence
            token.token_number = f"{dept_code}-N{seq:03d}"

        # Queue Event
        event = QueueEvent(
            hospital_id=appt.hospital_id,
            token_id=token.id,
            event_type="priority_updated",
            from_status=token.status,
            to_status=token.status,
            actor_user_id=user.id,
            details=f"Priority updated from {prev_priority} to {new_priority} by {user.name}. Reason: {reason}"
        )
        db.session.add(event)

    # Record Priority Audit Log
    audit = PriorityAuditLog(
        appointment_id=appt.id,
        hospital_id=appt.hospital_id,
        triage_assessment_id=ta.id,
        previous_priority=prev_priority,
        new_priority=new_priority,
        changed_by=user.id,
        reason=reason,
        action_type=action
    )
    db.session.add(audit)

    # Notification to patient
    notif = Notification(
        user_id=appt.patient_id,
        hospital_id=appt.hospital_id,
        title="Queue Priority Confirmed",
        message=f"Clinical staff reviewed your symptoms. Queue priority is set to: {new_priority.upper()}.",
        category="queue"
    )
    db.session.add(notif)
    db.session.commit()

    log_audit("priority_updated", "triage_assessments", ta.id, f"Priority changed to {new_priority} ({reason})", user.id, appt.hospital_id)

    if token:
        broadcast_queue_update(token.to_dict(), "priority_updated")
    broadcast_triage_update(ta.to_dict(), "priority_updated")

    return jsonify({
        "message": f"Priority successfully set to {new_priority}.",
        "assessment": ta.to_dict(),
        "appointment": appt.to_dict(),
        "token": token.to_dict() if token else None,
        "audit_log": audit.to_dict()
    }), 200

@triage_bp.route("/<int:assessment_id>/escalate", methods=["POST"])
@jwt_required()
@role_required(["doctor", "admin", "hospital_admin", "staff", "receptionist"])
def escalate_emergency(assessment_id):
    """
    Staff action: immediately escalates patient to the hospital's Emergency Workflow.
    """
    user = get_current_user()
    ta = TriageAssessment.query.get(assessment_id)
    if not ta:
        return jsonify({"error": "Triage assessment not found."}), 404

    data = request.get_json() or {}
    reason = (data.get("reason") or "Immediate emergency clinical escalation triggered by attending staff.").strip()

    appt = Appointment.query.get(ta.appointment_id)
    prev_priority = appt.priority if appt else "normal"

    ta.staff_approved_priority = "emergency"
    ta.review_status = "escalated_emergency"
    ta.reviewed_by = user.id
    ta.reviewed_at = datetime.now(timezone.utc)
    ta.assessment_notes = f"[EMERGENCY ESCALATION] {reason}"

    if appt:
        appt.priority = "emergency"
        appt.status = "confirmed"

    token = QueueToken.query.filter_by(appointment_id=ta.appointment_id).first()
    if token:
        token.priority = "emergency"
        dept_code = appt.department.code.upper() if appt and appt.department else "EMG"
        token.token_number = f"{dept_code}-EMG{token.daily_sequence:03d}"

        event = QueueEvent(
            hospital_id=token.hospital_id,
            token_id=token.id,
            event_type="emergency_escalation",
            from_status=token.status,
            to_status=token.status,
            actor_user_id=user.id,
            details=f"Escalated to Emergency Department by {user.name}. Reason: {reason}"
        )
        db.session.add(event)

    audit = PriorityAuditLog(
        appointment_id=ta.appointment_id,
        hospital_id=ta.hospital_id,
        triage_assessment_id=ta.id,
        previous_priority=prev_priority,
        new_priority="emergency",
        changed_by=user.id,
        reason=reason,
        action_type="emergency_escalated"
    )
    db.session.add(audit)

    notif = Notification(
        user_id=ta.patient_id,
        hospital_id=ta.hospital_id,
        title="Emergency Protocol Escalated",
        message="Hospital staff have escalated your case for immediate emergency medical care.",
        category="emergency"
    )
    db.session.add(notif)
    db.session.commit()

    if token:
        broadcast_queue_update(token.to_dict(), "emergency_escalated")
    broadcast_triage_update(ta.to_dict(), "emergency_escalated")

    return jsonify({
        "message": "Emergency escalation initiated.",
        "assessment": ta.to_dict(),
        "token": token.to_dict() if token else None
    }), 200
