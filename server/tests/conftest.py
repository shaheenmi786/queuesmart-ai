import pytest
import os
import sys
from sqlalchemy.pool import StaticPool

# Ensure server root is in sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
server_root = os.path.abspath(os.path.join(current_dir, ".."))
if server_root not in sys.path:
    sys.path.insert(0, server_root)

from app import create_app
from models.database import db
from models.hospital import Hospital, HospitalSetting, OperatingHours
from models.department import Department
from models.counter import Counter
from models.user import User
from models.doctor import Doctor, DoctorSchedule
from models.patient import Patient
from flask_jwt_extended import create_access_token

class TestConfig:
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    SQLALCHEMY_ENGINE_OPTIONS = {
        "connect_args": {"check_same_thread": False},
        "poolclass": StaticPool
    }
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = "test-secret-key-super-secure-production-ready-64-bytes-min-len-queuesmart"
    JWT_SECRET_KEY = "test-jwt-secret-key-super-secure-production-ready-64-bytes-min-len-queuesmart"
    JWT_TOKEN_LOCATION = ["headers"]

@pytest.fixture(scope="session")
def app():
    application = create_app(TestConfig)
    return application

@pytest.fixture(scope="function")
def client(app):
    with app.app_context():
        db.create_all()
        with app.test_client() as test_client:
            yield test_client
        db.session.rollback()
        db.drop_all()

@pytest.fixture(scope="function")
def seed_test_data(app):
    with app.app_context():
        # 1. Hospital
        hosp = Hospital(
            name="Apex General Test Hospital",
            code="ACH-TEST",
            city="New York",
            operating_hours="08:00 - 20:00",
            status="active"
        )
        db.session.add(hosp)
        db.session.flush()

        # Setting
        setting = HospitalSetting(hospital_id=hosp.id)
        db.session.add(setting)

        # 2. Department
        dept = Department(
            hospital_id=hosp.id,
            name="Cardiology",
            code="CARD",
            average_service_time_mins=20.0,
            is_active=True
        )
        db.session.add(dept)
        db.session.flush()

        # 3. Counter
        counter = Counter(
            hospital_id=hosp.id,
            department_id=dept.id,
            counter_name="Cardiology Room 101",
            counter_number="Counter 1",
            room_number="Room 101",
            status="active"
        )
        db.session.add(counter)
        db.session.flush()

        # 4. Admin User
        admin_user = User(
            hospital_id=hosp.id,
            name="System Admin",
            email="admin@test.com",
            phone="+1555000001",
            role="admin",
            is_active=True
        )
        admin_user.set_password("Admin@123")
        db.session.add(admin_user)

        # 5. Doctor User & Record
        doc_user = User(
            hospital_id=hosp.id,
            name="Dr. Test Cardiologist",
            email="doctor@test.com",
            phone="+1555000002",
            role="doctor",
            is_active=True
        )
        doc_user.set_password("Doctor@123")
        db.session.add(doc_user)
        db.session.flush()

        doc_rec = Doctor(
            user_id=doc_user.id,
            hospital_id=hosp.id,
            department_id=dept.id,
            specialization="Cardiology",
            room_number="Room 101",
            counter_number="Counter 1",
            status="available",
            consultation_fee=75.0
        )
        db.session.add(doc_rec)
        db.session.flush()

        # 6. Patient User & Record
        patient_user = User(
            hospital_id=hosp.id,
            name="Alice Test Patient",
            email="patient@test.com",
            phone="+1555000003",
            role="patient",
            is_active=True
        )
        patient_user.set_password("Patient@123")
        db.session.add(patient_user)
        db.session.flush()

        patient_rec = Patient(
            user_id=patient_user.id,
            hospital_id=hosp.id,
            patient_mrn="MRN-TEST-001",
            gender="F",
            date_of_birth="1990-05-15",
            insurance_provider="BlueCross"
        )
        db.session.add(patient_rec)

        db.session.commit()

        # Return detached-safe data dictionaries along with IDs
        return {
            "hospital_id": hosp.id,
            "department_id": dept.id,
            "counter_id": counter.id,
            "admin_id": admin_user.id,
            "doctor_id": doc_rec.id,
            "doctor_user_id": doc_user.id,
            "patient_id": patient_user.id,
            "hospital": hosp,
            "department": dept,
            "counter": counter,
            "admin": admin_user,
            "doctor": doc_rec,
            "patient": patient_user
        }

def get_auth_token(app, user_or_id, role="patient", hospital_id=None):
    with app.app_context():
        if isinstance(user_or_id, int):
            user_id = user_or_id
        elif isinstance(user_or_id, str) and user_or_id.isdigit():
            user_id = int(user_or_id)
        else:
            user_id = getattr(user_or_id, "id", 1)
            role = getattr(user_or_id, "role", role)
            hospital_id = getattr(user_or_id, "hospital_id", hospital_id)

        return create_access_token(
            identity=str(user_id),
            additional_claims={"role": role, "hospital_id": hospital_id}
        )
