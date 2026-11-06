import json
from datetime import datetime, timezone, timedelta
from conftest import get_auth_token

def test_book_appointment_success(client, app, seed_test_data):
    patient = seed_test_data["patient"]
    doctor = seed_test_data["doctor"]
    token = get_auth_token(app, patient)
    headers = {"Authorization": f"Bearer {token}"}

    future_date = (datetime.now(timezone.utc) + timedelta(days=2)).strftime("%Y-%m-%d")

    payload = {
        "doctor_id": doctor.id,
        "department_id": doctor.department_id,
        "appointment_date": future_date,
        "appointment_time": "10:30",
        "reason": "Routine hypertension check",
        "priority": "normal"
    }

    response = client.post("/api/v1/appointments", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.get_json()
    assert "appointment" in data
    assert data["appointment"]["status"] == "scheduled"
    assert data["appointment"]["appointment_date"] == future_date
    assert data["appointment"]["appointment_time"] == "10:30"

def test_duplicate_appointment_slot_conflict(client, app, seed_test_data):
    patient = seed_test_data["patient"]
    doctor = seed_test_data["doctor"]
    token = get_auth_token(app, patient)
    headers = {"Authorization": f"Bearer {token}"}

    future_date = (datetime.now(timezone.utc) + timedelta(days=3)).strftime("%Y-%m-%d")

    payload = {
        "doctor_id": doctor.id,
        "department_id": doctor.department_id,
        "appointment_date": future_date,
        "appointment_time": "11:00",
        "reason": "Consultation A",
        "priority": "normal"
    }

    # First booking: success
    res1 = client.post("/api/v1/appointments", json=payload, headers=headers)
    assert res1.status_code == 201

    # Second booking at exact same doctor + date + time slot: must return 409 conflict
    res2 = client.post("/api/v1/appointments", json=payload, headers=headers)
    assert res2.status_code == 409
    data = res2.get_json()
    assert "already booked" in data["error"].lower() or "conflict" in data["error"].lower()

def test_cancel_appointment(client, app, seed_test_data):
    patient = seed_test_data["patient"]
    doctor = seed_test_data["doctor"]
    token = get_auth_token(app, patient)
    headers = {"Authorization": f"Bearer {token}"}

    future_date = (datetime.now(timezone.utc) + timedelta(days=4)).strftime("%Y-%m-%d")
    payload = {
        "doctor_id": doctor.id,
        "department_id": doctor.department_id,
        "appointment_date": future_date,
        "appointment_time": "14:00",
        "reason": "Checkup before cancellation"
    }
    create_res = client.post("/api/v1/appointments", json=payload, headers=headers)
    assert create_res.status_code == 201
    appt_id = create_res.get_json()["appointment"]["id"]

    # Cancel
    cancel_res = client.patch(f"/api/v1/appointments/{appt_id}/cancel", headers=headers)
    assert cancel_res.status_code == 200
    assert cancel_res.get_json()["appointment"]["status"] == "cancelled"
