from datetime import datetime, timezone
import sys
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(current_dir, ".."))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from models.database import db

class Appointment(db.Model):
    __tablename__ = "appointments"

    id = db.Column(db.Integer, primary_key=True)
    hospital_id = db.Column(db.Integer, db.ForeignKey("hospitals.id"), nullable=True, index=True)
    patient_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey("doctors.id"), nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey("departments.id"), nullable=False)
    appointment_date = db.Column(db.String(10), nullable=False) # 'YYYY-MM-DD'
    appointment_time = db.Column(db.String(10), nullable=False) # 'HH:MM:SS' or 'HH:MM'
    reason = db.Column(db.String(255), nullable=True) # Also maps to reason_for_visit
    priority = db.Column(db.String(20), default="normal") # 'normal', 'urgent', 'emergency'
    status = db.Column(db.String(30), default="scheduled", index=True) # 'scheduled', 'confirmed', 'checked_in', 'in_queue', 'in_progress', 'completed', 'cancelled', 'no_show'
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    token = db.relationship("QueueToken", backref="appointment", uselist=False, cascade="all, delete-orphan")
    treatments = db.relationship("Treatment", backref="appointment", lazy=True, cascade="all, delete-orphan")
    symptoms = db.relationship("PatientSymptoms", backref="appointment", uselist=False, cascade="all, delete-orphan")
    triage_assessment = db.relationship("TriageAssessment", backref="appointment", uselist=False, cascade="all, delete-orphan")
    priority_audit_logs = db.relationship("PriorityAuditLog", backref="appointment", lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "hospital_id": self.hospital_id,
            "patient_id": self.patient_id,
            "patient_name": self.patient.name if self.patient else "Patient",
            "patient_phone": self.patient.phone if self.patient else "",
            "doctor_id": self.doctor_id,
            "doctor_name": self.doctor.user.name if self.doctor and self.doctor.user else "Doctor",
            "department_id": self.department_id,
            "department_name": self.department.name if self.department else "Department",
            "department_code": self.department.code if self.department else "",
            "room_number": self.doctor.room_number if self.doctor else "",
            "counter_number": self.doctor.counter_number if self.doctor else "",
            "appointment_date": self.appointment_date,
            "appointment_time": self.appointment_time,
            "reason": self.reason,
            "priority": self.priority,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "token_number": self.token.token_number if self.token else None,
            "token_status": self.token.status if self.token else None,
            "queue_position": self.token.get_queue_position() if self.token else None,
            "symptoms": self.symptoms.to_dict() if self.symptoms else None,
            "triage_assessment": self.triage_assessment.to_dict() if self.triage_assessment else None,
        }
