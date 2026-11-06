from datetime import datetime, timezone
import sys
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(current_dir, ".."))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from models.database import db

class QueueToken(db.Model):
    __tablename__ = "queue_tokens"

    id = db.Column(db.Integer, primary_key=True)
    hospital_id = db.Column(db.Integer, db.ForeignKey("hospitals.id"), nullable=True, index=True)
    department_id = db.Column(db.Integer, db.ForeignKey("departments.id"), nullable=False, index=True)
    doctor_id = db.Column(db.Integer, db.ForeignKey("doctors.id"), nullable=True)
    patient_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    appointment_id = db.Column(db.Integer, db.ForeignKey("appointments.id"), nullable=True)
    counter_id = db.Column(db.Integer, db.ForeignKey("counters.id"), nullable=True)

    token_number = db.Column(db.String(30), nullable=False, index=True) # e.g. CARD-001
    token_date = db.Column(db.String(15), default=lambda: datetime.now(timezone.utc).strftime("%Y-%m-%d"), index=True)
    daily_sequence = db.Column(db.Integer, default=1)
    
    priority = db.Column(db.String(20), default="normal") # 'normal', 'urgent', 'emergency'
    status = db.Column(db.String(30), default="waiting", index=True) # 'waiting', 'calling', 'consulting', 'completed', 'absent', 'cancelled', 'no_show', 'in_progress'
    counter_number = db.Column(db.String(50), nullable=True)
    
    check_in_time = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    call_time = db.Column(db.DateTime, nullable=True)
    consult_start_time = db.Column(db.DateTime, nullable=True)
    consult_end_time = db.Column(db.DateTime, nullable=True)

    actual_wait_minutes = db.Column(db.Float, nullable=True)
    actual_service_minutes = db.Column(db.Float, nullable=True)
    ml_predicted_wait_minutes = db.Column(db.Float, nullable=True)
    ml_predicted_service_minutes = db.Column(db.Float, nullable=True)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    events = db.relationship("QueueEvent", backref="token", lazy=True, cascade="all, delete-orphan")

    def get_queue_position(self) -> int:
        if self.status not in ["waiting", "calling"]:
            return 0
        
        query = QueueToken.query.filter(
            QueueToken.department_id == self.department_id,
            QueueToken.status.in_(["waiting", "calling"]),
            QueueToken.id <= self.id
        )
        if self.hospital_id:
            query = query.filter(QueueToken.hospital_id == self.hospital_id)
        return query.count()

    def get_patients_ahead(self) -> int:
        pos = self.get_queue_position()
        return max(0, pos - 1)

    def to_dict(self):
        active_token = QueueToken.query.filter(
            QueueToken.department_id == self.department_id,
            QueueToken.status.in_(["calling", "consulting", "in_progress"])
        ).order_by(QueueToken.id.asc()).first()

        now_serving = active_token.token_number if active_token else "None"

        return {
            "id": self.id,
            "hospital_id": self.hospital_id,
            "token_number": self.token_number,
            "token_date": self.token_date,
            "daily_sequence": self.daily_sequence,
            "appointment_id": self.appointment_id,
            "patient_id": self.patient_id,
            "patient_name": self.patient.name if self.patient else "Patient",
            "patient_phone": self.patient.phone if self.patient else "",
            "doctor_id": self.doctor_id,
            "doctor_name": self.doctor.user.name if self.doctor and self.doctor.user else "Attending Physician",
            "doctor_status": self.doctor.status if self.doctor else "available",
            "department_id": self.department_id,
            "department_name": self.department.name if self.department else "Department",
            "department_code": self.department.code if self.department else "",
            "priority": self.priority,
            "status": self.status,
            "counter_number": self.counter_number or (self.doctor.counter_number if self.doctor else "Counter 1"),
            "room_number": self.doctor.room_number if self.doctor else "Room 1",
            "queue_position": self.get_queue_position(),
            "patients_ahead": self.get_patients_ahead(),
            "now_serving": now_serving,
            "check_in_time": self.check_in_time.isoformat() if self.check_in_time else None,
            "call_time": self.call_time.isoformat() if self.call_time else None,
            "consult_start_time": self.consult_start_time.isoformat() if self.consult_start_time else None,
            "consult_end_time": self.consult_end_time.isoformat() if self.consult_end_time else None,
            "actual_wait_minutes": round(self.actual_wait_minutes, 1) if self.actual_wait_minutes is not None else None,
            "actual_service_minutes": round(self.actual_service_minutes, 1) if self.actual_service_minutes is not None else None,
            "ml_predicted_wait_minutes": round(self.ml_predicted_wait_minutes, 1) if self.ml_predicted_wait_minutes is not None else None,
            "ml_predicted_service_minutes": round(self.ml_predicted_service_minutes, 1) if self.ml_predicted_service_minutes is not None else None,
            "triage_urgency": self.appointment.triage_assessment.preliminary_urgency if (self.appointment and self.appointment.triage_assessment) else "normal_priority",
            "triage_status": self.appointment.triage_assessment.review_status if (self.appointment and self.appointment.triage_assessment) else "approved",
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

class QueueEvent(db.Model):
    __tablename__ = "queue_events"

    id = db.Column(db.Integer, primary_key=True)
    hospital_id = db.Column(db.Integer, db.ForeignKey("hospitals.id"), nullable=True)
    token_id = db.Column(db.Integer, db.ForeignKey("queue_tokens.id"), nullable=False)
    event_type = db.Column(db.String(50), nullable=False) # 'created', 'called', 'started', 'completed', 'no_show', 'cancelled'
    from_status = db.Column(db.String(30), nullable=True)
    to_status = db.Column(db.String(30), nullable=False)
    actor_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    details = db.Column(db.Text, nullable=True)
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    actor = db.relationship("User", foreign_keys=[actor_user_id])

    def to_dict(self):
        return {
            "id": self.id,
            "token_id": self.token_id,
            "event_type": self.event_type,
            "from_status": self.from_status,
            "to_status": self.to_status,
            "actor_user_id": self.actor_user_id,
            "actor_name": self.actor.name if self.actor else "System",
            "details": self.details,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }

class QueueRule(db.Model):
    __tablename__ = "queue_rules"

    id = db.Column(db.Integer, primary_key=True)
    hospital_id = db.Column(db.Integer, db.ForeignKey("hospitals.id"), nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey("departments.id"), nullable=True)
    rule_name = db.Column(db.String(100), nullable=False)
    priority_weight = db.Column(db.Float, default=1.0)
    max_wait_threshold_mins = db.Column(db.Integer, default=45)
    allow_auto_call = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "hospital_id": self.hospital_id,
            "department_id": self.department_id,
            "rule_name": self.rule_name,
            "priority_weight": self.priority_weight,
            "max_wait_threshold_mins": self.max_wait_threshold_mins,
            "allow_auto_call": self.allow_auto_call,
        }
