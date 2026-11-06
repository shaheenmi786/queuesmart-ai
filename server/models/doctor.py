import json
from datetime import datetime, timezone
import sys
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(current_dir, ".."))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from models.database import db

class Doctor(db.Model):
    __tablename__ = "doctors"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, unique=True)
    hospital_id = db.Column(db.Integer, db.ForeignKey("hospitals.id"), nullable=True, index=True)
    department_id = db.Column(db.Integer, db.ForeignKey("departments.id"), nullable=False)
    specialization = db.Column(db.String(120), nullable=False)
    license_number = db.Column(db.String(50), nullable=True)
    years_experience = db.Column(db.Integer, default=5)
    room_number = db.Column(db.String(50), nullable=True)
    counter_number = db.Column(db.String(50), nullable=True)
    status = db.Column(db.String(20), default="available") # 'available', 'paused', 'offline'
    consultation_fee = db.Column(db.Float, default=50.0)
    schedule_json = db.Column(db.Text, default="{}")

    # Relationships
    appointments = db.relationship("Appointment", backref="doctor", lazy=True)
    tokens = db.relationship("QueueToken", backref="doctor", lazy=True)
    schedules = db.relationship("DoctorSchedule", backref="doctor", lazy=True, cascade="all, delete-orphan")
    leaves = db.relationship("DoctorLeave", backref="doctor", lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        parsed_schedule = {}
        if self.schedule_json:
            try:
                parsed_schedule = json.loads(self.schedule_json)
            except Exception:
                parsed_schedule = {}

        return {
            "id": self.id,
            "user_id": self.user_id,
            "hospital_id": self.hospital_id,
            "name": self.user.name if self.user else "Dr. Unknown",
            "email": self.user.email if self.user else "",
            "phone": self.user.phone if self.user else "",
            "department_id": self.department_id,
            "department_name": self.department.name if self.department else "",
            "department_code": self.department.code if self.department else "",
            "specialization": self.specialization,
            "license_number": self.license_number,
            "years_experience": self.years_experience,
            "room_number": self.room_number,
            "counter_number": self.counter_number,
            "status": self.status,
            "consultation_fee": self.consultation_fee,
            "schedule": parsed_schedule,
            "is_active": self.user.is_active if self.user else True,
        }

class DoctorSchedule(db.Model):
    __tablename__ = "doctor_schedules"

    id = db.Column(db.Integer, primary_key=True)
    hospital_id = db.Column(db.Integer, db.ForeignKey("hospitals.id"), nullable=True)
    doctor_id = db.Column(db.Integer, db.ForeignKey("doctors.id"), nullable=False)
    day_of_week = db.Column(db.Integer, nullable=False) # 0 = Monday, 6 = Sunday
    start_time = db.Column(db.String(10), default="09:00")
    end_time = db.Column(db.String(10), default="17:00")
    slot_duration_mins = db.Column(db.Integer, default=30)
    max_patients_per_slot = db.Column(db.Integer, default=1)
    is_active = db.Column(db.Boolean, default=True)

    def to_dict(self):
        days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        return {
            "id": self.id,
            "doctor_id": self.doctor_id,
            "day_of_week": self.day_of_week,
            "day_name": days[self.day_of_week] if 0 <= self.day_of_week <= 6 else str(self.day_of_week),
            "start_time": self.start_time,
            "end_time": self.end_time,
            "slot_duration_mins": self.slot_duration_mins,
            "max_patients_per_slot": self.max_patients_per_slot,
            "is_active": self.is_active,
        }

class DoctorLeave(db.Model):
    __tablename__ = "doctor_leaves"

    id = db.Column(db.Integer, primary_key=True)
    doctor_id = db.Column(db.Integer, db.ForeignKey("doctors.id"), nullable=False)
    start_date = db.Column(db.String(15), nullable=False) # YYYY-MM-DD
    end_date = db.Column(db.String(15), nullable=False)
    reason = db.Column(db.String(255), nullable=True)
    status = db.Column(db.String(20), default="approved") # 'approved', 'pending', 'rejected'
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "doctor_id": self.doctor_id,
            "start_date": self.start_date,
            "end_date": self.end_date,
            "reason": self.reason,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
