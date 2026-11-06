from datetime import datetime, timezone
import sys
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(current_dir, ".."))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from models.database import db

class Department(db.Model):
    __tablename__ = "departments"

    id = db.Column(db.Integer, primary_key=True)
    hospital_id = db.Column(db.Integer, db.ForeignKey("hospitals.id"), nullable=True, index=True)
    name = db.Column(db.String(100), nullable=False)
    code = db.Column(db.String(10), nullable=False, index=True) # e.g. CARD, ORTH, PEDI, GEN, NEUR
    description = db.Column(db.Text, nullable=True)
    location = db.Column(db.String(100), nullable=True) # e.g. Floor 2, Wing B
    average_service_time_mins = db.Column(db.Float, default=15.0)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    doctors = db.relationship("Doctor", backref="department", lazy=True)
    appointments = db.relationship("Appointment", backref="department", lazy=True)
    tokens = db.relationship("QueueToken", backref="department", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "hospital_id": self.hospital_id,
            "name": self.name,
            "code": self.code,
            "description": self.description,
            "location": self.location,
            "average_service_time_mins": self.average_service_time_mins,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "doctor_count": len(self.doctors) if self.doctors else 0,
        }
