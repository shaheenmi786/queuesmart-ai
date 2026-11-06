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
from models.department import Department
from models.doctor import Doctor
from models.queue import QueueToken, QueueEvent
from models.ml_ops import ServiceRecord
from models.notification import Notification
from ml.model import MLPredictionEngine
from utils.auth_helpers import get_current_user, role_required, log_audit, enforce_tenant
from sockets.events import broadcast_queue_update

queue_bp = Blueprint("queue", __name__, url_prefix="/api/v1/queue")

@queue_bp.route("", methods=["GET"])
@queue_bp.route("/tokens", methods=["GET"])
def get_queue():
    dept_id = request.args.get("department_id", type=int)
    doctor_id = request.args.get("doctor_id", type=int)
    hospital_id = request.args.get("hospital_id", type=int)
    status = request.args.get("status")

    query = QueueToken.query
    if hospital_id:
        query = query.filter(QueueToken.hospital_id == hospital_id)
    if dept_id:
        query = query.filter(QueueToken.department_id == dept_id)
    if doctor_id:
        query = query.filter(QueueToken.doctor_id == doctor_id)
    if status:
        query = query.filter(QueueToken.status == status)
    else:
        query = query.filter(QueueToken.status.in_(["waiting", "calling", "consulting", "in_progress"]))

    tokens = query.order_by(
        db.case(
            (QueueToken.priority == "emergency", 1),
            (QueueToken.priority == "urgent", 2),
            else_=3
        ),
        QueueToken.id.asc()
    ).all()

    return jsonify({"queue": [t.to_dict() for t in tokens]}), 200

@queue_bp.route("/tokens", methods=["POST"])
@jwt_required()
def generate_token():
    user = get_current_user()
    data = request.get_json() or {}
    department_id = data.get("department_id")
    doctor_id = data.get("doctor_id")
    priority = data.get("priority", "normal")
    patient_id = data.get("patient_id") or user.id
    hospital_id = data.get("hospital_id") or user.hospital_id

    if not department_id:
        return jsonify({"error": "department_id is required."}), 400

    dept = Department.query.get(department_id)
    if not dept:
        return jsonify({"error": "Department not found."}), 404

    # Determine token prefix and daily sequence
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    seq = QueueToken.query.filter_by(department_id=dept.id, token_date=today_str).count() + 1
    token_number = f"{dept.code}-{seq:03d}"

    # ML initial wait prediction
    engine = MLPredictionEngine.get_instance()
    waiting_count = QueueToken.query.filter(
        QueueToken.department_id == dept.id,
        QueueToken.status == "waiting",
        QueueToken.token_date == today_str
    ).count()

    pred_res = engine.predict_waiting_time({
        "department": dept.name,
        "queue_length": waiting_count,
        "priority": priority
    })
    pred_wait = pred_res.get("predicted_wait_minutes", 15.0)

    token = QueueToken(
        hospital_id=hospital_id or dept.hospital_id,
        department_id=dept.id,
        doctor_id=doctor_id,
        patient_id=patient_id,
        token_number=token_number,
        token_date=today_str,
        daily_sequence=seq,
        priority=priority,
        status="waiting",
        check_in_time=datetime.now(timezone.utc),
        ml_predicted_wait_minutes=pred_wait,
        ml_predicted_service_minutes=dept.average_service_time_mins or 15.0
    )
    db.session.add(token)
    db.session.flush()

    evt = QueueEvent(
        hospital_id=token.hospital_id,
        token_id=token.id,
        event_type="token_generated",
        from_status="none",
        to_status="waiting",
        actor_user_id=user.id,
        details=f"Token {token_number} generated (Priority: {priority})."
    )
    db.session.add(evt)
    db.session.commit()

    broadcast_queue_update(token.to_dict(), "TOKEN_GENERATED")

    return jsonify({"message": "Token generated successfully.", "token": token.to_dict()}), 201

@queue_bp.route("/status", methods=["GET"])
def get_queue_status_summary():
    hospital_id = request.args.get("hospital_id", type=int)
    dept_id = request.args.get("department_id", type=int)

    query = QueueToken.query
    if hospital_id:
        query = query.filter(QueueToken.hospital_id == hospital_id)
    if dept_id:
        query = query.filter(QueueToken.department_id == dept_id)

    total_waiting = query.filter(QueueToken.status.in_(["waiting", "calling"])).count()
    currently_consulting = query.filter(QueueToken.status.in_(["consulting", "in_progress"])).count()
    completed = query.filter_by(status="completed").count()

    active_calling = query.filter_by(status="calling").first()

    return jsonify({
        "hospital_id": hospital_id,
        "department_id": dept_id,
        "total_waiting": total_waiting,
        "currently_consulting": currently_consulting,
        "completed_today": completed,
        "now_calling_token": active_calling.token_number if active_calling else None,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }), 200

@queue_bp.route("/<string:token_number>", methods=["GET"])
def get_token_by_number(token_number):
    token = QueueToken.query.filter_by(token_number=token_number.upper()).first()
    if not token:
        return jsonify({"error": f"Token '{token_number}' not found."}), 404
    return jsonify({"token": token.to_dict()}), 200

@queue_bp.route("/call-next", methods=["POST"])
@jwt_required()
@role_required(["doctor", "admin", "hospital_admin", "staff"])
def call_next():
    user = get_current_user()
    doctor = user.doctor_profile
    data = request.get_json() or {}
    department_id = data.get("department_id") or (doctor.department_id if doctor else None)
    doctor_id = data.get("doctor_id") or (doctor.id if doctor else None)

    query = QueueToken.query.filter_by(status="waiting")
    if doctor_id:
        query = query.filter(QueueToken.doctor_id == doctor_id)
    elif department_id:
        query = query.filter(QueueToken.department_id == department_id)

    next_token = query.order_by(
        db.case(
            (QueueToken.priority == "emergency", 1),
            (QueueToken.priority == "urgent", 2),
            else_=3
        ),
        QueueToken.id.asc()
    ).first()

    if not next_token:
        return jsonify({"message": "No waiting patients in queue.", "token": None}), 200

    return call_token(next_token.id)

@queue_bp.route("/<int:token_id>/call", methods=["POST"])
@jwt_required()
@role_required(["doctor", "admin", "hospital_admin", "staff"])
def call_token(token_id):
    token = QueueToken.query.get(token_id)
    if not token:
        return jsonify({"error": "Token not found."}), 404

    user = get_current_user()
    doctor = user.doctor_profile

    old_status = token.status
    token.status = "calling"
    token.call_time = datetime.now(timezone.utc)
    if doctor and doctor.counter_number:
        token.counter_number = doctor.counter_number

    # Record event
    event = QueueEvent(
        hospital_id=token.hospital_id,
        token_id=token.id,
        event_type="called",
        from_status=old_status,
        to_status="calling",
        actor_user_id=user.id,
        details=f"Token {token.token_number} called by {user.name}."
    )
    db.session.add(event)

    # Patient notification
    notif = Notification(
        user_id=token.patient_id,
        hospital_id=token.hospital_id,
        title="Token Called!",
        message=f"Token {token.token_number} is being called at {token.counter_number or 'Counter 1'}. Please proceed to consultation.",
        category="queue"
    )
    db.session.add(notif)
    db.session.commit()

    log_audit("token_called", "queue_tokens", token.id, f"Token {token.token_number} called.", user.id, token.hospital_id)
    
    token_dict = token.to_dict()
    broadcast_queue_update(token_dict, "calling")

    return jsonify({
        "message": f"Token {token.token_number} called.",
        "token": token_dict
    }), 200

@queue_bp.route("/<int:token_id>/start", methods=["POST"])
@jwt_required()
@role_required(["doctor", "admin", "hospital_admin", "staff"])
def start_consultation(token_id):
    token = QueueToken.query.get(token_id)
    if not token:
        return jsonify({"error": "Token not found."}), 404

    user = get_current_user()
    now = datetime.now(timezone.utc)
    old_status = token.status
    token.status = "consulting"
    token.consult_start_time = now

    if token.check_in_time:
        checkin = token.check_in_time
        if checkin.tzinfo is None:
            checkin = checkin.replace(tzinfo=timezone.utc)
        diff_mins = (now - checkin).total_seconds() / 60.0
        token.actual_wait_minutes = max(1.0, round(diff_mins, 1))

    if token.appointment:
        token.appointment.status = "in_progress"

    event = QueueEvent(
        hospital_id=token.hospital_id,
        token_id=token.id,
        event_type="started",
        from_status=old_status,
        to_status="consulting",
        actor_user_id=user.id,
        details=f"Consultation started for {token.token_number}."
    )
    db.session.add(event)
    db.session.commit()

    log_audit("consultation_started", "queue_tokens", token.id, f"Consultation started for {token.token_number}", user.id, token.hospital_id)

    token_dict = token.to_dict()
    broadcast_queue_update(token_dict, "consulting")

    return jsonify({
        "message": f"Consultation started for token {token.token_number}.",
        "token": token_dict
    }), 200

@queue_bp.route("/<int:token_id>/complete", methods=["POST"])
@jwt_required()
@role_required(["doctor", "admin", "hospital_admin", "staff"])
def complete_consultation(token_id):
    token = QueueToken.query.get(token_id)
    if not token:
        return jsonify({"error": "Token not found."}), 404

    user = get_current_user()
    now = datetime.now(timezone.utc)
    old_status = token.status
    token.status = "completed"
    token.consult_end_time = now

    data = request.get_json(silent=True) or {}
    explicit_service_mins = data.get("actual_service_minutes")
    if explicit_service_mins is not None:
        token.actual_service_minutes = float(explicit_service_mins)
    elif token.consult_start_time:
        start = token.consult_start_time
        if start.tzinfo is None:
            start = start.replace(tzinfo=timezone.utc)
        s_mins = (now - start).total_seconds() / 60.0
        token.actual_service_minutes = max(2.0, round(s_mins, 1))
    else:
        token.actual_service_minutes = 15.0

    if token.appointment:
        token.appointment.status = "completed"

    # Save to ServiceRecord for ML continuous learning
    rec = ServiceRecord(
        hospital_id=token.hospital_id,
        department_id=token.department_id,
        doctor_id=token.doctor_id or 1,
        patient_id=token.patient_id,
        appointment_id=token.appointment_id,
        token_id=token.id,
        actual_wait_minutes=token.actual_wait_minutes or 10.0,
        actual_service_minutes=token.actual_service_minutes,
        ml_predicted_wait_minutes=token.ml_predicted_wait_minutes,
        ml_predicted_service_minutes=token.ml_predicted_service_minutes,
        hour_of_day=now.hour,
        day_of_week=now.weekday(),
        priority=token.priority,
        reason_for_visit=token.appointment.reason if token.appointment else "Consultation"
    )
    db.session.add(rec)

    event = QueueEvent(
        hospital_id=token.hospital_id,
        token_id=token.id,
        event_type="completed",
        from_status=old_status,
        to_status="completed",
        actor_user_id=user.id,
        details=f"Consultation completed. Duration: {token.actual_service_minutes} mins."
    )
    db.session.add(event)

    notif = Notification(
        user_id=token.patient_id,
        hospital_id=token.hospital_id,
        title="Consultation Completed",
        message=f"Your visit for token {token.token_number} is completed. Thank you.",
        category="queue"
    )
    db.session.add(notif)
    db.session.commit()

    log_audit("consultation_completed", "queue_tokens", token.id, f"Completed {token.token_number}. Service: {token.actual_service_minutes}m", user.id, token.hospital_id)

    token_dict = token.to_dict()
    broadcast_queue_update(token_dict, "completed")

    return jsonify({
        "message": f"Consultation completed for token {token.token_number}.",
        "token": token_dict
    }), 200

@queue_bp.route("/<int:token_id>/absent", methods=["POST"])
@queue_bp.route("/<int:token_id>/no-show", methods=["POST"])
@jwt_required()
@role_required(["doctor", "admin", "hospital_admin", "staff"])
def mark_absent(token_id):
    token = QueueToken.query.get(token_id)
    if not token:
        return jsonify({"error": "Token not found."}), 404

    user = get_current_user()
    old_status = token.status
    token.status = "absent"
    if token.appointment:
        token.appointment.status = "no_show"

    event = QueueEvent(
        hospital_id=token.hospital_id,
        token_id=token.id,
        event_type="no_show",
        from_status=old_status,
        to_status="absent",
        actor_user_id=user.id,
        details=f"Token {token.token_number} marked no-show/absent."
    )
    db.session.add(event)
    db.session.commit()

    log_audit("token_marked_absent", "queue_tokens", token.id, f"Token {token.token_number} marked absent", user.id, token.hospital_id)

    token_dict = token.to_dict()
    broadcast_queue_update(token_dict, "absent")

    return jsonify({
        "message": f"Token {token.token_number} marked absent.",
        "token": token_dict
    }), 200

@queue_bp.route("/<int:token_id>/cancel", methods=["POST"])
@jwt_required()
def cancel_queue_token(token_id):
    token = QueueToken.query.get(token_id)
    if not token:
        return jsonify({"error": "Token not found."}), 404

    user = get_current_user()
    if user.role == "patient" and token.patient_id != user.id:
        return jsonify({"error": "Unauthorized"}), 403

    old_status = token.status
    token.status = "cancelled"
    if token.appointment:
        token.appointment.status = "cancelled"

    event = QueueEvent(
        hospital_id=token.hospital_id,
        token_id=token.id,
        event_type="cancelled",
        from_status=old_status,
        to_status="cancelled",
        actor_user_id=user.id,
        details=f"Token {token.token_number} cancelled."
    )
    db.session.add(event)
    db.session.commit()

    token_dict = token.to_dict()
    broadcast_queue_update(token_dict, "cancelled")

    return jsonify({"message": "Token cancelled successfully.", "token": token_dict}), 200

@queue_bp.route("/patient/<int:patient_id>", methods=["GET"])
@jwt_required()
def get_patient_queue_tokens(patient_id):
    """
    Retrieve active and recent queue tokens for a patient,
    including real-time queue position ahead, waiting estimate, and triage urgency badge.
    """
    user = get_current_user()
    if user.role == "patient" and user.id != patient_id:
        return jsonify({"error": "Unauthorized access to other patient tokens."}), 403

    tokens = QueueToken.query.filter_by(patient_id=patient_id).order_by(QueueToken.id.desc()).all()
    results = []

    for t in tokens:
        t_dict = t.to_dict()
        if t.status in ["waiting", "calling"]:
            # Calculate position ahead in priority queue
            ahead_higher_prio = QueueToken.query.filter(
                QueueToken.department_id == t.department_id,
                QueueToken.token_date == t.token_date,
                QueueToken.status.in_(["waiting", "calling"]),
                db.case(
                    (QueueToken.priority == "emergency", 1),
                    (QueueToken.priority == "urgent", 2),
                    else_=3
                ) < (1 if t.priority == "emergency" else 2 if t.priority == "urgent" else 3)
            ).count()

            same_prio_ahead = QueueToken.query.filter(
                QueueToken.department_id == t.department_id,
                QueueToken.token_date == t.token_date,
                QueueToken.status.in_(["waiting", "calling"]),
                QueueToken.priority == t.priority,
                QueueToken.id < t.id
            ).count()
            t_dict["position_ahead"] = ahead_higher_prio + same_prio_ahead
        else:
            t_dict["position_ahead"] = 0
        results.append(t_dict)

    active_tokens = [tok for tok in results if tok.get("status") in ["waiting", "calling", "consulting", "in_progress"]]
    return jsonify({
        "tokens": results,
        "active_token": active_tokens[0] if active_tokens else (results[0] if results else None)
    }), 200
