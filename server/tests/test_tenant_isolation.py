import json
from models.database import db
from models.hospital import Hospital, HospitalSetting
from models.department import Department
from models.user import User
from models.doctor import Doctor
from conftest import get_auth_token

def test_hospital_onboarding_registration(client, app, seed_test_data):
    admin_id = seed_test_data["admin_id"]
    token = get_auth_token(app, admin_id, role="admin")
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "name": "St. Jude Metropolitan Hospital",
        "code": "SJM-01",
        "city": "Chicago",
        "state": "Illinois",
        "country": "United States",
        "contact_number": "+1 312 555-0199",
        "official_email": "admin@stjude.org",
        "operating_hours": "07:00 - 21:00"
    }

    response = client.post("/api/v1/hospitals/register", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.get_json()
    assert data["hospital"]["code"] == "SJM-01"
    assert data["hospital"]["status"] in ["onboarding", "active"]

def test_hospital_setup_status_wizard(client, app, seed_test_data):
    hosp_id = seed_test_data["hospital_id"]
    admin_id = seed_test_data["admin_id"]
    token = get_auth_token(app, admin_id, role="admin")
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get(f"/api/v1/hospitals/{hosp_id}/setup-status", headers=headers)
    assert response.status_code == 200
    data = response.get_json()
    assert "checklist" in data
    assert "has_departments" in data["checklist"]
    assert "has_counters" in data["checklist"]
    assert "is_ready" in data

def test_tenant_isolation_doctors_and_departments(client, app, seed_test_data):
    hosp_a_id = seed_test_data["hospital_id"]

    with app.app_context():
        # Create second hospital
        hosp_b = Hospital(
            name="Hospital Beta",
            code="BETA-01",
            city="Boston",
            status="active"
        )
        db.session.add(hosp_b)
        db.session.flush()

        dept_b = Department(
            hospital_id=hosp_b.id,
            name="Pediatrics Beta",
            code="PED-B",
            is_active=True
        )
        db.session.add(dept_b)
        db.session.flush()

        doc_b_user = User(
            hospital_id=hosp_b.id,
            name="Dr. Beta Doctor",
            email="beta.doc@test.com",
            phone="+1555000004",
            role="doctor",
            is_active=True
        )
        doc_b_user.set_password("Doctor@123")
        db.session.add(doc_b_user)
        db.session.flush()

        doc_b = Doctor(
            user_id=doc_b_user.id,
            hospital_id=hosp_b.id,
            department_id=dept_b.id,
            specialization="Pediatrics",
            status="available"
        )
        db.session.add(doc_b)
        db.session.commit()
        hosp_b_id = hosp_b.id

    admin_id = seed_test_data["admin_id"]
    token = get_auth_token(app, admin_id, role="admin")
    headers = {"Authorization": f"Bearer {token}"}

    # Query doctors for Hospital A only
    res_a = client.get(f"/api/v1/admin/doctors?hospital_id={hosp_a_id}", headers=headers)
    assert res_a.status_code == 200
    docs_a = res_a.get_json()["doctors"]
    doc_emails_a = [d["email"] for d in docs_a]
    assert "doctor@test.com" in doc_emails_a
    assert "beta.doc@test.com" not in doc_emails_a

    # Query doctors for Hospital B only
    res_b = client.get(f"/api/v1/admin/doctors?hospital_id={hosp_b_id}", headers=headers)
    assert res_b.status_code == 200
    docs_b = res_b.get_json()["doctors"]
    doc_emails_b = [d["email"] for d in docs_b]
    assert "beta.doc@test.com" in doc_emails_b
    assert "doctor@test.com" not in doc_emails_b
