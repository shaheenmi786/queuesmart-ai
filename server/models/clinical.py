from datetime import datetime, timezone
import sys
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(current_dir, ".."))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from models.database import db

class Treatment(db.Model):
    __tablename__ = "treatments"

    id = db.Column(db.Integer, primary_key=True)
    treatment_code = db.Column(db.String(30), nullable=True, index=True) # e.g. T001
    appointment_id = db.Column(db.Integer, db.ForeignKey("appointments.id"), nullable=False)
    treatment_type = db.Column(db.String(100), nullable=False) # e.g. 'Medication', 'Physical Therapy'
    description = db.Column(db.Text, nullable=True)
    service_duration_minutes = db.Column(db.Float, default=15.0)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    billings = db.relationship("Billing", backref="treatment", lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "treatment_code": self.treatment_code,
            "appointment_id": self.appointment_id,
            "treatment_type": self.treatment_type,
            "description": self.description,
            "service_duration_minutes": self.service_duration_minutes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

class Billing(db.Model):
    __tablename__ = "billing"

    id = db.Column(db.Integer, primary_key=True)
    billing_code = db.Column(db.String(30), nullable=True, index=True) # e.g. B001
    treatment_id = db.Column(db.Integer, db.ForeignKey("treatments.id"), nullable=False)
    patient_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    cost = db.Column(db.Float, nullable=False, default=0.0)
    payment_method = db.Column(db.String(50), default="Insurance") # 'Insurance', 'Credit Card', 'Cash', 'Direct Deposit'
    payment_status = db.Column(db.String(30), default="Pending") # 'Paid', 'Pending', 'Failed'
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    patient = db.relationship("User", foreign_keys=[patient_id])

    def to_dict(self):
        return {
            "id": self.id,
            "billing_code": self.billing_code,
            "treatment_id": self.treatment_id,
            "patient_id": self.patient_id,
            "cost": self.cost,
            "payment_method": self.payment_method,
            "payment_status": self.payment_status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
