import sys
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(current_dir, ".."))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from models.database import db
from models.hospital import Hospital, HospitalSetting, OperatingHours
from models.department import Department
from models.counter import Counter, CounterAssignment
from models.user import User, UserSession, PasswordResetToken, Role, Permission, role_permissions
from models.patient import Patient
from models.doctor import Doctor, DoctorSchedule, DoctorLeave
from models.appointment import Appointment
from models.queue import QueueToken, QueueEvent, QueueRule
from models.clinical import Treatment, Billing
from models.ml_ops import ServiceRecord, PredictionLog, ModelVersion
from models.notification import Notification
from models.audit import AuditLog
from models.triage import PatientSymptoms, TriageAssessment, PriorityAuditLog

__all__ = [
    "db",
    "Hospital",
    "HospitalSetting",
    "OperatingHours",
    "Department",
    "Counter",
    "CounterAssignment",
    "User",
    "UserSession",
    "PasswordResetToken",
    "Role",
    "Permission",
    "role_permissions",
    "Patient",
    "Doctor",
    "DoctorSchedule",
    "DoctorLeave",
    "Appointment",
    "QueueToken",
    "QueueEvent",
    "QueueRule",
    "Treatment",
    "Billing",
    "ServiceRecord",
    "PredictionLog",
    "ModelVersion",
    "Notification",
    "AuditLog",
    "PatientSymptoms",
    "TriageAssessment",
    "PriorityAuditLog",
]
