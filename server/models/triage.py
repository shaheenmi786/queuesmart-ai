from datetime import datetime, timezone
import json
import sys
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(current_dir, ".."))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from models.database import db

class PatientSymptoms(db.Model):
    __tablename__ = "patient_symptoms"

    id = db.Column(db.Integer, primary_key=True)
    appointment_id = db.Column(db.Integer, db.ForeignKey("appointments.id"), unique=True, nullable=False, index=True)
    patient_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    hospital_id = db.Column(db.Integer, db.ForeignKey("hospitals.id"), nullable=True, index=True)

    main_symptoms = db.Column(db.String(255), nullable=False)
    symptom_description = db.Column(db.Text, nullable=False)
    symptom_duration = db.Column(db.String(100), nullable=False)
    reported_severity = db.Column(db.String(20), default="moderate")  # 'mild', 'moderate', 'severe'
    is_worsening = db.Column(db.Boolean, default=False)
    existing_conditions = db.Column(db.Text, nullable=True)
    additional_notes = db.Column(db.Text, nullable=True)
    consent_acknowledged = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    patient = db.relationship("User", foreign_keys=[patient_id])

    def to_dict(self):
        return {
            "id": self.id,
            "appointment_id": self.appointment_id,
            "patient_id": self.patient_id,
            "patient_name": self.patient.name if self.patient else "Patient",
            "hospital_id": self.hospital_id,
            "main_symptoms": self.main_symptoms,
            "symptom_description": self.symptom_description,
            "symptom_duration": self.symptom_duration,
            "reported_severity": self.reported_severity,
            "is_worsening": self.is_worsening,
            "existing_conditions": self.existing_conditions,
            "additional_notes": self.additional_notes,
            "consent_acknowledged": self.consent_acknowledged,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

class TriageAssessment(db.Model):
    __tablename__ = "triage_assessments"

    id = db.Column(db.Integer, primary_key=True)
    appointment_id = db.Column(db.Integer, db.ForeignKey("appointments.id"), unique=True, nullable=False, index=True)
    hospital_id = db.Column(db.Integer, db.ForeignKey("hospitals.id"), nullable=True, index=True)
    patient_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)

    # Categories: 'emergency_warning', 'urgent_review', 'normal_priority', 'priority_pending'
    preliminary_urgency = db.Column(db.String(30), default="priority_pending", nullable=False)
    # Staff approved: 'normal', 'urgent', 'emergency', 'pending'
    staff_approved_priority = db.Column(db.String(30), default="pending", nullable=False)
    # Review status: 'pending_review', 'approved', 'modified', 'escalated_emergency', 'info_requested', 'completed'
    review_status = db.Column(db.String(30), default="pending_review", nullable=False)

    reviewed_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    clinical_summary = db.Column(db.Text, nullable=True)
    warning_flags_json = db.Column(db.Text, default="[]")
    assessment_notes = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    reviewer = db.relationship("User", foreign_keys=[reviewed_by])
    audit_logs = db.relationship("PriorityAuditLog", backref="triage_assessment", lazy=True, cascade="all, delete-orphan")

    def get_warning_flags(self):
        try:
            return json.loads(self.warning_flags_json) if self.warning_flags_json else []
        except Exception:
            return []

    def set_warning_flags(self, flags):
        self.warning_flags_json = json.dumps(flags if isinstance(flags, list) else [flags])

    def to_dict(self):
        return {
            "id": self.id,
            "appointment_id": self.appointment_id,
            "hospital_id": self.hospital_id,
            "patient_id": self.patient_id,
            "preliminary_urgency": self.preliminary_urgency,
            "staff_approved_priority": self.staff_approved_priority,
            "review_status": self.review_status,
            "reviewed_by": self.reviewed_by,
            "reviewer_name": self.reviewer.name if self.reviewer else None,
            "reviewed_at": self.reviewed_at.isoformat() if self.reviewed_at else None,
            "clinical_summary": self.clinical_summary,
            "warning_flags": self.get_warning_flags(),
            "assessment_notes": self.assessment_notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

class PriorityAuditLog(db.Model):
    __tablename__ = "priority_audit_logs"

    id = db.Column(db.Integer, primary_key=True)
    appointment_id = db.Column(db.Integer, db.ForeignKey("appointments.id"), nullable=False, index=True)
    hospital_id = db.Column(db.Integer, db.ForeignKey("hospitals.id"), nullable=True, index=True)
    triage_assessment_id = db.Column(db.Integer, db.ForeignKey("triage_assessments.id"), nullable=True)

    previous_priority = db.Column(db.String(30), nullable=False)
    new_priority = db.Column(db.String(30), nullable=False)
    changed_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    reason = db.Column(db.Text, nullable=False)  # Mandatory clinical justification
    action_type = db.Column(db.String(30), default="priority_changed")  # 'approved', 'priority_changed', 'emergency_escalated', 'info_requested'
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = db.relationship("User", foreign_keys=[changed_by])

    def to_dict(self):
        return {
            "id": self.id,
            "appointment_id": self.appointment_id,
            "hospital_id": self.hospital_id,
            "triage_assessment_id": self.triage_assessment_id,
            "previous_priority": self.previous_priority,
            "new_priority": self.new_priority,
            "changed_by": self.changed_by,
            "changed_by_name": self.user.name if self.user else "Staff",
            "reason": self.reason,
            "action_type": self.action_type,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
