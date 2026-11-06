# QueueSmart AI – AI-Powered Hospital Queue Management and Service-Time Optimization Platform

> **Smarter Queues. Faster Healthcare.**

QueueSmart AI is a production-oriented, multi-tenant healthcare SaaS platform engineered to modernize outpatient clinics, emergency triage, and specialty hospital departments. It unites genuine machine learning regression & classification pipelines trained on realistic hospital clinical datasets, multi-server Erlang-C queuing theory ($M/M/c$), dynamic counter allocation, real-time bi-directional WebSocket event streaming, multi-hospital tenant isolation, and automated Pytest test suites into a cohesive clinical operating system.

---

## 🏥 Architecture Overview

```
queuesmart-ai/
├── client/                     # React 18 + Vite + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── components/         # Reusable common, layout, queue, appointments, charts
│   │   ├── pages/              # Landing, Auth, Patient, Doctor, Admin, AI Engine, Live Display
│   │   ├── services/           # Typed API Client, Auth, Queue, Appointments, ML, Sockets
│   │   ├── context/            # AuthContext (JWT/Role enforcement), SocketContext (Real-time)
│   │   ├── types/              # Strict TypeScript domain interfaces
│   │   └── routes/             # Role-based protected routing (Patient, Doctor, Admin)
│   ├── dist/                   # Production-compiled bundle
│   ├── vercel.json             # Vercel SPA routing configuration
│   └── .env.example            # Public frontend service variables
│
├── server/                     # Python 3.12 Flask + Scikit-Learn + SQLAlchemy + SocketIO
│   ├── app.py                  # Application factory, CORS, JWT error handlers, blueprints
│   ├── config.py               # Environment configuration with native SQLite / PostgreSQL
│   ├── wsgi.py                 # Production WSGI entry point
│   ├── gunicorn.conf.py        # Production Gunicorn concurrency configuration
│   ├── data/
│   │   ├── generate_dataset.py # Generates verified hospital clinical dataset (5 tables)
│   │   └── hospital_data/      # appointments.csv, billing.csv, doctors.csv, patients.csv, treatments.csv
│   ├── models/                 # Normalized multi-hospital SQLAlchemy models
│   │   ├── hospital.py         # Hospital, HospitalSetting, OperatingHours
│   │   ├── department.py       # Department with hospital_id isolation
│   │   ├── doctor.py           # Doctor, DoctorSchedule, DoctorLeave
│   │   ├── patient.py          # Patient with unique MRN, demographics, insurance
│   │   ├── user.py             # User, UserSession, PasswordResetToken
│   │   ├── appointment.py      # Appointment with slot conflict prevention
│   │   ├── queue.py            # QueueToken, QueueEvent, QueueRule
│   │   ├── counter.py          # Counter, CounterAssignment
│   │   ├── clinical.py         # Treatment, Billing
│   │   ├── ml_ops.py           # ServiceRecord, PredictionLog, ModelVersion
│   │   └── notification.py     # In-app notifications
│   ├── ml/                     # Real Scikit-Learn pipelines & Erlang-C optimizer
│   │   ├── model.py            # ML Prediction Engine with calibrated uncertainty & explanations
│   │   ├── trainer.py          # GroupShuffleSplit training pipeline generator
│   │   ├── optimizer.py        # M/M/c multi-server queuing formulas & arrival forecasting
│   │   └── saved_models/       # Serialized joblib models (Service, Wait, No-show, Cost)
│   ├── routes/                 # REST API endpoints (Hospitals, Auth, Queue, Doctors, AI, Admin, etc.)
│   ├── sockets/                # WebSocket room & event broadcasters
│   ├── tests/                  # Automated Pytest suite (22 tests, 100% passing)
│   │   ├── conftest.py         # Test fixtures and shared in-memory DB configuration
│   │   ├── test_auth.py        # Authentication & RBAC tests
│   │   ├── test_tenant_isolation.py # Multi-hospital boundary tests
│   │   ├── test_appointments.py # Duplicate slot conflict tests
│   │   ├── test_queue.py       # Token lifecycle & calling tests
│   │   └── test_ml_predictions.py # Machine learning inference tests
│   ├── utils/                  # Seed script & auth helpers
│   └── requirements.txt        # Production Python dependencies
```

---

## 🧠 Machine Learning & Queuing Theory Innovation

The platform features **four genuine Scikit-Learn models** trained on the merged hospital dataset using `GroupShuffleSplit` by `patient_id` to eliminate patient-level data leakage:

### 1. Service Duration Prediction (`RandomForestRegressor`)
- Evaluates department baseline velocity, consultation visit reason, priority triage level, doctor years of experience, and hour-of-day physician pacing.
- Delivers $R^2 \ge 0.66$ and MAE $\approx 4.0$ minutes.
- Evaluates tree estimator standard deviation ($\pm \sigma$) for calibrated confidence intervals.

### 2. Waiting Time Estimation (`RandomForestRegressor` + $M/M/c$ Queuing Dynamics)
- Evaluates real active queue backlog, available attending doctors, arrival rate $\lambda$, and congestion velocity.
- Integrates Erlang-C delay formulas directly into the regression feature space.

### 3. Patient No-Show Risk Classifier (`LogisticRegression`)
- Evaluates appointment lead time, patient age, prior attendance history, gender, insurance provider, and clinic timing.
- Predicts probability of absence ($0.0 - 1.0$) categorized into **Low**, **Moderate**, and **High** risk tiers.

### 4. Treatment Cost Estimation (`Ridge Regression`)
- Evaluates clinical treatment type, clinical notes/description text, consultation duration, and patient demographics.
- Predicts expected patient cost with upper and lower reimbursement intervals.

### 5. Multi-Server Erlang-C Optimization Engine (`M/M/c`)
- Calculates traffic intensity: $\rho = \frac{\lambda}{c \cdot \mu}$
- Evaluates queue delay probability $P(\text{Wait} > 0)$ and expected queue length $L_q$.
- Dynamically flags congested clinics ($\rho \ge 0.85$) or underutilized counters ($\rho < 0.35$), recommending doctor counter reassignments with projected wait-time reductions.

---

## 🩺 Symptom-Based Smart Priority Token Allocation & Clinical Triage

QueueSmart AI features a hospital-approved, rule-based clinical symptom triage and priority token allocation engine designed with rigorous clinical safety guardrails:

### Core Capabilities:
1. **Intelligent Symptom Collection:**
   - Patient appointment booking collects main symptoms, detailed descriptions, onset duration, self-reported severity (Mild/Moderate/Severe), rapid worsening status, existing medical conditions, and mandatory clinical consent.
2. **Rule-Based Emergency & Urgent Detection:**
   - Detects acute cardiovascular red flags (crushing chest pain, radiation), severe respiratory distress, neurological/stroke indicators (FAST symptoms), loss of consciousness, uncontrolled hemorrhage, and acute anaphylaxis.
   - Detects urgent indicators: bone fractures, peritoneal tenderness, high fever with stiff neck, deep lacerations, and severe worsening pain.
3. **Clinical Safety Guardrails:**
   - AI models and rules **never** prescribe medication, diagnose diseases, or independently make final triage decisions.
   - Patient self-reported severity alone never dictates clinical priority.
   - Active doctor consultations are strictly non-interruptible.
4. **Emergency Warning Interceptor:**
   - Emergency warning cases immediately prompt patients to contact emergency services (911/112) or proceed to the nearest Emergency Room.
   - Automatically issues prioritized token sequence (`{DEPT}-EMG001` for emergency, `{DEPT}-U001` for urgent review, `{DEPT}-N001` for routine outpatient).
5. **Doctor & Staff Clinical Governance Console:**
   - Dedicated "Symptom Review & Priority Management" dashboard for clinicians.
   - Clinicians review pending cases, perform quick approvals, or alter priority tiers.
   - **Mandatory Justification Audit:** Altering or confirming priority mandates non-empty clinical justification logged to `PriorityAuditLog` with attending clinician user ID and timestamp.
   - One-click immediate Emergency Protocol escalation workflow.

---

## 🔐 Verified Access Roles & Seed Accounts

The platform strictly enforces role-based access control and tenant isolation.

| Role | Email | Password | Primary Capabilities |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@queuesmart.ai` | `Admin@123` | Hospital onboarding wizard, Department CRUD, Doctor registration, Hospital-wide queue manager, Dynamic counter allocation, Audit trail |
| **Receptionist/Staff** | `staff@queuesmart.ai` | `Staff@123` | Walk-in patient token generation, Counter check-in desk, Department status monitor |
| **Doctor (D001)** | `dr.d001@queuesmart.ai` | `Doctor@123` | Consultation desk, Call next patient, Start/complete consult, Clinical notes entry, Availability toggle |
| **Patient (P001)** | `patient.p001@queuesmart.ai` | `Patient@123` | Medical Record Number (`MRN-P001`), Live token tracking, Doctor appointment booking, Slot conflict protection |
| **Demo Patient** | `patient@queuesmart.ai` | `Patient@123` | Clean test patient account ready for interactive booking |

---

## 🧪 Automated Pytest Test Suite

The test suite validates backend stability, security, and algorithmic precision:

```bash
cd server
pytest tests -v
```

**Results:**
- `test_auth.py`: 7 passed (Registration, MRN issuance, token login, invalid password, unauthorized rejection, RBAC)
- `test_tenant_isolation.py`: 3 passed (Hospital registration, setup status wizard, multi-tenant doctor/department isolation)
- `test_appointments.py`: 3 passed (Booking success, duplicate slot 409 conflict, appointment cancellation)
- `test_queue.py`: 3 passed (Token generation, doctor call next, complete lifecycle start-to-finish)
- `test_ml_predictions.py`: 6 passed (Service duration, wait time, no-show probability, cost regression, crowd forecast, counter recommendations)
- `test_symptom_triage.py`: 8 passed (Emergency detection, urgent review, routine triage, preview API, U/N/EMG tokens, staff approval, mandatory audit reason validation, ER escalation)
- **Total: 30 passed, 0 failed (100% pass rate)**

---

## 🚀 Quick Start Guide

### 1. Backend Setup

```bash
cd server

# Activate Python environment
# Windows:
..\server_venv\Scripts\activate
# Linux/macOS:
python3 -m venv venv && source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# (Optional) Retrain ML models from CSV dataset
python ml/trainer.py

# Initialize database schema and seed clinical data
python utils/seed.py

# Launch Flask SocketIO development server on port 5000
python app.py
```

### 2. Frontend Setup

```bash
cd client

# Install packages
npm install

# Build production bundle
npm run build

# Start Vite development server on port 5173
npm run dev
```

Open `http://localhost:5173` to explore QueueSmart AI!
