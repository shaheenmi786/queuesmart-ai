from datetime import datetime, timezone
import sys
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(current_dir, ".."))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from models.database import db

class Patient(db.Model):
    __tablename__ = "patients"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), unique=True, nullable=False)
    hospital_id = db.Column(db.Integer, db.ForeignKey("hospitals.id"), nullable=True, index=True)
    patient_mrn = db.Column(db.String(30), unique=True, nullable=False, index=True) # Medical Record Number e.g. MRN-P001
    gender = db.Column(db.String(10), nullable=True) # 'M', 'F', 'Other'
    date_of_birth = db.Column(db.String(15), nullable=True) # YYYY-MM-DD
    blood_group = db.Column(db.String(10), nullable=True)
    emergency_contact = db.Column(db.String(50), nullable=True)
    insurance_provider = db.Column(db.String(100), default="None")
    registration_date = db.Column(db.String(15), default=lambda: datetime.now(timezone.utc).strftime("%Y-%m-%d"))
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = db.relationship("User", backref=db.backref("patient_record", uselist=False))

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "hospital_id": self.hospital_id,
            "name": self.user.name if self.user else "Patient",
            "email": self.user.email if self.user else "",
            "phone": self.user.phone if self.user else "",
            "patient_mrn": self.patient_mrn,
            "gender": self.gender,
            "date_of_birth": self.date_of_birth,
            "blood_group": self.blood_group,
            "emergency_contact": self.emergency_contact,
            "insurance_provider": self.insurance_provider,
            "registration_date": self.registration_date,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
