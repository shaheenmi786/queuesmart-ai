from datetime import datetime, timezone
import sys
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(current_dir, ".."))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from models.database import db

class Counter(db.Model):
    __tablename__ = "counters"

    id = db.Column(db.Integer, primary_key=True)
    hospital_id = db.Column(db.Integer, db.ForeignKey("hospitals.id"), nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey("departments.id"), nullable=True)
    counter_name = db.Column(db.String(80), nullable=False) # e.g. "Cardiology Counter 1"
    counter_number = db.Column(db.String(20), nullable=False) # e.g. "Counter 1"
    room_number = db.Column(db.String(50), nullable=True) # e.g. "Room 201"
    status = db.Column(db.String(20), default="active") # 'active', 'inactive', 'paused'
    current_token_id = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    department = db.relationship("Department", backref="counters", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "hospital_id": self.hospital_id,
            "department_id": self.department_id,
            "department_name": self.department.name if self.department else None,
            "counter_name": self.counter_name,
            "counter_number": self.counter_number,
            "room_number": self.room_number,
            "status": self.status,
            "current_token_id": self.current_token_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

class CounterAssignment(db.Model):
    __tablename__ = "counter_assignments"

    id = db.Column(db.Integer, primary_key=True)
    hospital_id = db.Column(db.Integer, db.ForeignKey("hospitals.id"), nullable=False)
    counter_id = db.Column(db.Integer, db.ForeignKey("counters.id"), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey("doctors.id"), nullable=False)
    assigned_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    unassigned_at = db.Column(db.DateTime, nullable=True)
    is_active = db.Column(db.Boolean, default=True)

    counter = db.relationship("Counter", backref="assignments")
    doctor = db.relationship("Doctor", backref="counter_assignments")

    def to_dict(self):
        return {
            "id": self.id,
            "hospital_id": self.hospital_id,
            "counter_id": self.counter_id,
            "counter_number": self.counter.counter_number if self.counter else "",
            "doctor_id": self.doctor_id,
            "doctor_name": self.doctor.user.name if self.doctor and self.doctor.user else "",
            "assigned_at": self.assigned_at.isoformat() if self.assigned_at else None,
            "is_active": self.is_active,
        }
