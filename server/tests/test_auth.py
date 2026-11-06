import json
from conftest import get_auth_token

def test_patient_registration(client, app):
    payload = {
        "name": "Jane Doe",
        "email": "jane.doe@example.com",
        "phone": "+1 555-123-4567",
        "password": "SecurePassword@123",
        "gender": "F",
        "date_of_birth": "1992-04-12",
        "insurance_provider": "Aetna"
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.get_json()
    assert "access_token" in data
    assert data["user"]["email"] == "jane.doe@example.com"
    assert data["user"]["role"] == "patient"
    assert "patient_mrn" in data

def test_registration_validation_missing_fields(client):
    payload = {
        "name": "Incomplete User"
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data

def test_login_success(client, seed_test_data):
    payload = {
        "email": "admin@test.com",
        "password": "Admin@123"
    }
    response = client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 200
    data = response.get_json()
    assert "access_token" in data
    assert data["user"]["role"] == "admin"
    assert data["user"]["name"] == "System Admin"

def test_login_invalid_password(client, seed_test_data):
    payload = {
        "email": "admin@test.com",
        "password": "WrongPassword999"
    }
    response = client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 401
    data = response.get_json()
    assert "error" in data

def test_get_current_user_profile(client, app, seed_test_data):
    patient = seed_test_data["patient"]
    token = get_auth_token(app, patient)
    headers = {"Authorization": f"Bearer {token}"}
    
    response = client.get("/api/v1/auth/me", headers=headers)
    assert response.status_code == 200
    data = response.get_json()
    assert data["user"]["email"] == "patient@test.com"
    assert data["user"]["role"] == "patient"

def test_unauthorized_access_fails(client):
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401

def test_role_based_access_control(client, app, seed_test_data):
    # Patient trying to access admin dashboard should receive 403 Forbidden
    patient = seed_test_data["patient"]
    token = get_auth_token(app, patient)
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/api/v1/admin/dashboard", headers=headers)
    assert response.status_code == 403
    data = response.get_json()
    assert "forbidden" in data["error"].lower() or "unauthorized" in data["error"].lower() or "access denied" in data["error"].lower()
