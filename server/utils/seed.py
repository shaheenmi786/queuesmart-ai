import sys
import os
import csv
from datetime import datetime, timezone, timedelta, time
import random

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(current_dir, ".."))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from app import create_app
from models.database import db
from models.hospital import Hospital, HospitalSetting, OperatingHours
from models.counter import Counter, CounterAssignment
from models.user import User
from models.department import Department
from models.doctor import Doctor, DoctorSchedule
from models.patient import Patient
from models.appointment import Appointment
from models.queue import QueueToken, QueueEvent
from models.clinical import Treatment, Billing
from models.ml_ops import ServiceRecord
from models.notification import Notification

DOCTOR_NAMES = [
    "Dr. Marcus Vance, MD",
    "Dr. Elena Rostova, MD",
    "Dr. Tariq Al-Mansoor, MD",
    "Dr. Claire Dupont, MD",
    "Dr. Rajiv Sharma, MD",
    "Dr. Sophia Hernandez, MD",
    "Dr. David Kim, MD",
    "Dr. Aisha Bello, MD",
    "Dr. Liam O'Connor, MD",
    "Dr. Mei-Ling Zhou, MD",
]

PATIENT_NAMES = [
    "James Smith", "Emma Johnson", "Michael Brown", "Olivia Garcia", "William Miller",
    "Sophia Davis", "Alexander Rodriguez", "Ava Martinez", "Benjamin Hernandez", "Isabella Lopez",
    "Lucas Gonzalez", "Mia Wilson", "Henry Anderson", "Charlotte Thomas", "Mason Taylor",
    "Amelia Moore", "Ethan Jackson", "Harper Martin", "Jacob Lee", "Evelyn Perez",
    "Daniel Thompson", "Abigail White", "Logan Harris", "Emily Sanchez", "Jackson Clark",
    "Elizabeth Ramirez", "Sebastian Lewis", "Mila Robinson", "Jack Walker", "Ella Young",
    "Aiden Allen", "Avery King", "Owen Wright", "Scarlett Scott", "Samuel Torres",
    "Chloe Nguyen", "Matthew Hill", "Camila Flores", "Joseph Green", "Penelope Adams",
    "Levi Nelson", "Layla Baker", "David Hall", "Grace Rivera", "John Campbell",
    "Zoey Mitchell", "Wyatt Carter", "Nora Roberts", "Carter Gomez", "Hannah Phillips"
]

def seed_database():
    app = create_app()
    with app.app_context():
        print("[QueueSmart Seed] Initializing database tables...")
        db.create_all()

        # -------------------------------------------------------------
        # 1. Hospital Setup (Primary Multi-Tenant Anchor)
        # -------------------------------------------------------------
        hospital = Hospital.query.filter_by(code="ACH-01").first()
        if not hospital:
            hospital = Hospital(
                name="Apex Care General Hospital",
                code="ACH-01",
                address="450 Healthcare Boulevard, Suite 100",
                city="Metro City",
                state="New York",
                country="United States",
                contact_number="+1 (555) 019-2000",
                official_email="contact@apexcare.org",
                website="https://apexcare.queuesmart.ai",
                operating_hours="08:00 - 20:00",
                timezone="America/New_York",
                status="active"
            )
            db.session.add(hospital)
            db.session.flush()

            # Hospital Setting
            setting = HospitalSetting(
                hospital_id=hospital.id,
                max_advance_booking_days=30,
                queue_buffer_minutes=5,
                allow_walkins=True,
                auto_call_next=False,
                emergency_priority_weight=3.0,
                urgent_priority_weight=2.0,
                grace_period_minutes=15
            )
            db.session.add(setting)

            # Operating Hours for each day
            for day_idx in range(7):
                oh = OperatingHours(
                    hospital_id=hospital.id,
                    day_of_week=day_idx,
                    is_closed=False,
                    opening_time="08:00",
                    closing_time="20:00"
                )
                db.session.add(oh)
            print(f"[QueueSmart Seed] Initialized Hospital: {hospital.name} ({hospital.code})")

        # -------------------------------------------------------------
        # 2. Departments
        # -------------------------------------------------------------
        departments_meta = [
            {"name": "Cardiology", "code": "CARD", "desc": "Cardiovascular evaluations, ECGs, and vascular medicine.", "room": "Floor 2, Wing A", "avg": 22.0},
            {"name": "General Medicine", "code": "GEN", "desc": "Primary care consultations, diagnostics, and routine screenings.", "room": "Ground Floor, Wing A", "avg": 14.0},
            {"name": "Orthopedics", "code": "ORTH", "desc": "Bone, joint, musculoskeletal trauma, and sports medicine clinic.", "room": "Floor 1, Wing B", "avg": 18.0},
            {"name": "Pediatrics", "code": "PEDI", "desc": "Infant, child, and adolescent healthcare, immunizations, and developmental reviews.", "room": "Floor 3, Wing C", "avg": 16.0},
            {"name": "Neurology", "code": "NEUR", "desc": "Neurological assessments, electroencephalography, and migraine care.", "room": "Floor 4, Wing A", "avg": 25.0},
            {"name": "Dermatology", "code": "DERM", "desc": "Clinical dermatology, skin biopsies, and cutaneous wound care.", "room": "Floor 2, Wing B", "avg": 15.0},
        ]

        dept_map = {}
        for d in departments_meta:
            dept = Department.query.filter_by(code=d["code"]).first()
            if not dept:
                dept = Department(
                    hospital_id=hospital.id,
                    name=d["name"],
                    code=d["code"],
                    description=d["desc"],
                    location=d["room"],
                    average_service_time_mins=d["avg"],
                    is_active=True
                )
                db.session.add(dept)
                db.session.flush()
            dept_map[d["code"]] = dept
            dept_map[d["name"]] = dept

        # -------------------------------------------------------------
        # 3. Counters
        # -------------------------------------------------------------
        counters_meta = [
            ("Counter 1", "Room 101", "General Medicine"),
            ("Counter 2", "Room 102", "Cardiology"),
            ("Counter 3", "Room 103", "Orthopedics"),
            ("Counter 4", "Room 104", "Pediatrics"),
            ("Counter 5", "Room 105", "Neurology"),
            ("Counter 6", "Room 106", "Dermatology"),
        ]
        counter_objects = []
        for c_num, room, d_name in counters_meta:
            counter = Counter.query.filter_by(hospital_id=hospital.id, counter_number=c_num).first()
            if not counter:
                counter = Counter(
                    hospital_id=hospital.id,
                    department_id=dept_map[d_name].id if d_name in dept_map else None,
                    counter_name=f"{d_name} {c_num}",
                    counter_number=c_num,
                    room_number=room,
                    status="active"
                )
                db.session.add(counter)
                db.session.flush()
            counter_objects.append(counter)

        # -------------------------------------------------------------
        # 4. Standard Platform Roles & Accounts
        # -------------------------------------------------------------
        # System Admin
        admin_user = User.query.filter_by(email="admin@queuesmart.ai").first()
        if not admin_user:
            admin_user = User(
                hospital_id=hospital.id,
                name="Chief Medical Director",
                email="admin@queuesmart.ai",
                phone="+1 (555) 019-2831",
                role="admin",
                is_active=True
            )
            admin_user.set_password("Admin@123")
            db.session.add(admin_user)
            print("[QueueSmart Seed] Admin: admin@queuesmart.ai / Admin@123")

        # Receptionist Staff
        staff_user = User.query.filter_by(email="staff@queuesmart.ai").first()
        if not staff_user:
            staff_user = User(
                hospital_id=hospital.id,
                name="Sarah Jenkins (Lead Receptionist)",
                email="staff@queuesmart.ai",
                phone="+1 (555) 019-4400",
                role="receptionist",
                is_active=True
            )
            staff_user.set_password("Staff@123")
            db.session.add(staff_user)
            print("[QueueSmart Seed] Staff: staff@queuesmart.ai / Staff@123")

        # Default Patient for quick manual testing
        demo_patient = User.query.filter_by(email="patient@queuesmart.ai").first()
        if not demo_patient:
            demo_patient = User(
                hospital_id=hospital.id,
                name="John Doe",
                email="patient@queuesmart.ai",
                phone="+1 (555) 998-1234",
                role="patient",
                is_active=True
            )
            demo_patient.set_password("Patient@123")
            db.session.add(demo_patient)
            db.session.flush()
            print("[QueueSmart Seed] Patient: patient@queuesmart.ai / Patient@123")

        # -------------------------------------------------------------
        # 5. Load Doctors from doctors.csv (D001 - D010)
        # -------------------------------------------------------------
        data_dir = os.path.join(parent_dir, "data", "hospital_data")
        doctors_csv_path = os.path.join(data_dir, "doctors.csv")
        doctor_id_to_obj = {}

        if os.path.exists(doctors_csv_path):
            with open(doctors_csv_path, mode="r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for idx, row in enumerate(reader):
                    doc_id_code = row["doctor_id"] # e.g. D001
                    spec = row["specialization"]
                    exp = int(row.get("years_experience", 5))
                    name = DOCTOR_NAMES[idx % len(DOCTOR_NAMES)]
                    email = f"dr.{doc_id_code.lower()}@queuesmart.ai"
                    phone = f"+1 (555) 012-{3400 + idx + 1:04d}"

                    user = User.query.filter_by(email=email).first()
                    if not user:
                        user = User(
                            hospital_id=hospital.id,
                            name=name,
                            email=email,
                            phone=phone,
                            role="doctor",
                            is_active=True
                        )
                        user.set_password("Doctor@123")
                        db.session.add(user)
                        db.session.flush()

                    dept = dept_map.get(spec, dept_map["General Medicine"])
                    counter_idx = idx % len(counter_objects)
                    counter = counter_objects[counter_idx]

                    doctor = Doctor.query.filter_by(user_id=user.id).first()
                    if not doctor:
                        doctor = Doctor(
                            user_id=user.id,
                            hospital_id=hospital.id,
                            department_id=dept.id,
                            specialization=f"Consultant {spec}",
                            license_number=f"MD-{doc_id_code}-USA",
                            years_experience=exp,
                            room_number=counter.room_number,
                            counter_number=counter.counter_number,
                            status="available",
                            consultation_fee=50.0 + (exp * 2.5),
                            schedule_json='{"days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "hours": "08:30 - 17:30"}'
                        )
                        db.session.add(doctor)
                        db.session.flush()

                        # Add DoctorSchedule entries for Mon-Fri (0-4)
                        for day_idx in range(5):
                            ds = DoctorSchedule(
                                hospital_id=hospital.id,
                                doctor_id=doctor.id,
                                day_of_week=day_idx,
                                start_time="08:30",
                                end_time="17:30",
                                slot_duration_mins=30,
                                max_patients_per_slot=1
                            )
                            db.session.add(ds)

                    doctor_id_to_obj[doc_id_code] = doctor

            print(f"[QueueSmart Seed] Seeded {len(doctor_id_to_obj)} Doctors from doctors.csv")

        # -------------------------------------------------------------
        # 6. Load Patients from patients.csv (P001 - P050)
        # -------------------------------------------------------------
        patients_csv_path = os.path.join(data_dir, "patients.csv")
        patient_id_to_obj = {}

        if os.path.exists(patients_csv_path):
            with open(patients_csv_path, mode="r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for idx, row in enumerate(reader):
                    p_code = row["patient_id"] # e.g. P001
                    gender = row["gender"]
                    dob = row["date_of_birth"]
                    reg_date = row.get("registration_date", "2023-01-01")
                    ins = row.get("insurance_provider", "None")
                    p_name = PATIENT_NAMES[idx % len(PATIENT_NAMES)]
                    p_email = f"patient.{p_code.lower()}@queuesmart.ai"
                    p_phone = f"+1 (555) 700-{1000 + idx:04d}"

                    p_user = User.query.filter_by(email=p_email).first()
                    if not p_user:
                        p_user = User(
                            hospital_id=hospital.id,
                            name=p_name,
                            email=p_email,
                            phone=p_phone,
                            role="patient",
                            is_active=True
                        )
                        p_user.set_password("Patient@123")
                        db.session.add(p_user)
                        db.session.flush()

                    patient_rec = Patient.query.filter_by(user_id=p_user.id).first()
                    if not patient_rec:
                        patient_rec = Patient(
                            user_id=p_user.id,
                            hospital_id=hospital.id,
                            patient_mrn=f"MRN-{p_code}",
                            gender=gender,
                            date_of_birth=dob,
                            blood_group=random.choice(["A+", "O+", "B+", "AB+", "A-", "O-"]),
                            emergency_contact="+1 (555) 999-0000",
                            insurance_provider=ins,
                            registration_date=reg_date
                        )
                        db.session.add(patient_rec)
                        db.session.flush()

                    patient_id_to_obj[p_code] = p_user

            print(f"[QueueSmart Seed] Seeded {len(patient_id_to_obj)} Patients from patients.csv")

        # -------------------------------------------------------------
        # 7. Load Appointments from appointments.csv (A001 - A200)
        # -------------------------------------------------------------
        appointments_csv_path = os.path.join(data_dir, "appointments.csv")
        appointment_id_to_obj = {}

        if os.path.exists(appointments_csv_path):
            with open(appointments_csv_path, mode="r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    appt_code = row["appointment_id"] # A001
                    p_code = row["patient_id"]
                    d_code = row["doctor_id"]
                    appt_date = row["appointment_date"]
                    appt_time = row["appointment_time"]
                    status = row["status"].lower()
                    reason = row.get("reason_for_visit", "Routine Consultation")

                    user = patient_id_to_obj.get(p_code)
                    doc = doctor_id_to_obj.get(d_code)

                    if user and doc:
                        appt = Appointment.query.filter_by(
                            patient_id=user.id,
                            doctor_id=doc.id,
                            appointment_date=appt_date,
                            appointment_time=appt_time
                        ).first()

                        if not appt:
                            # Map appointment status to standard values
                            status_val = "completed" if status in ["completed", "attended"] else ("no_show" if status in ["no-show", "no_show"] else "cancelled" if status == "cancelled" else "scheduled")
                            appt = Appointment(
                                hospital_id=hospital.id,
                                patient_id=user.id,
                                doctor_id=doc.id,
                                department_id=doc.department_id,
                                appointment_date=appt_date,
                                appointment_time=appt_time,
                                status=status_val,
                                reason=reason
                            )
                            db.session.add(appt)
                            db.session.flush()
                        appointment_id_to_obj[appt_code] = appt

            print(f"[QueueSmart Seed] Seeded {len(appointment_id_to_obj)} Appointments from appointments.csv")

        # -------------------------------------------------------------
        # 8. Load Treatments & Billing from treatments.csv and billing.csv
        # -------------------------------------------------------------
        treatments_csv_path = os.path.join(data_dir, "treatments.csv")
        billing_csv_path = os.path.join(data_dir, "billing.csv")
        treatment_id_to_obj = {}

        if os.path.exists(treatments_csv_path):
            with open(treatments_csv_path, mode="r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    t_code = row["treatment_id"]
                    a_code = row["appointment_id"]
                    t_type = row["treatment_type"]
                    desc = row.get("description", "")
                    service_dur = float(row.get("service_duration_minutes", 15.0))

                    appt = appointment_id_to_obj.get(a_code)
                    if appt:
                        treatment = Treatment.query.filter_by(treatment_code=t_code).first()
                        if not treatment:
                            treatment = Treatment(
                                treatment_code=t_code,
                                appointment_id=appt.id,
                                treatment_type=t_type,
                                description=desc,
                                service_duration_minutes=service_dur
                            )
                            db.session.add(treatment)
                            db.session.flush()

                            # Create historical ServiceRecord for ML tracking
                            srec = ServiceRecord(
                                hospital_id=hospital.id,
                                doctor_id=appt.doctor_id,
                                department_id=appt.department_id,
                                patient_id=appt.patient_id,
                                appointment_id=appt.id,
                                actual_wait_minutes=max(5.0, round(service_dur * 1.1 + (int(appt.appointment_time.split(":")[0]) if ":" in appt.appointment_time else 10) * 1.5, 1)),
                                actual_service_minutes=service_dur,
                                ml_predicted_service_minutes=service_dur,
                                hour_of_day=int(appt.appointment_time.split(":")[0]) if ":" in appt.appointment_time else 10,
                                day_of_week=0,
                                priority=appt.priority,
                                reason_for_visit=appt.reason
                            )
                            db.session.add(srec)

                        treatment_id_to_obj[t_code] = treatment

            print(f"[QueueSmart Seed] Seeded {len(treatment_id_to_obj)} Treatments from treatments.csv")

        if os.path.exists(billing_csv_path):
            with open(billing_csv_path, mode="r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                b_count = 0
                for row in reader:
                    b_code = row["billing_id"]
                    t_code = row["treatment_id"]
                    p_code = row["patient_id"]
                    cost = float(row.get("cost", 100.0))
                    p_method = row.get("payment_method", "Credit Card")
                    p_status = row.get("payment_status", "Paid")

                    treatment = treatment_id_to_obj.get(t_code)
                    p_user = patient_id_to_obj.get(p_code)

                    if treatment and p_user:
                        bill = Billing.query.filter_by(billing_code=b_code).first()
                        if not bill:
                            bill = Billing(
                                billing_code=b_code,
                                treatment_id=treatment.id,
                                patient_id=p_user.id,
                                cost=cost,
                                payment_method=p_method,
                                payment_status=p_status
                            )
                            db.session.add(bill)
                            b_count += 1
                db.session.flush()
                print(f"[QueueSmart Seed] Seeded {b_count} Billing records from billing.csv")

        # -------------------------------------------------------------
        # 9. Seed Active Live Queue Tokens for Today
        # -------------------------------------------------------------
        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        existing_tokens = QueueToken.query.filter_by(token_date=today_str).count()
        if existing_tokens == 0:
            print("[QueueSmart Seed] Populating live queue tokens for today's operational demonstration...")
            # Pick first 4 doctors and patients
            active_docs = list(doctor_id_to_obj.values())[:4]
            active_patients = list(patient_id_to_obj.values())[:6]

            # Token 1: In Progress / Consulting
            t1 = QueueToken(
                hospital_id=hospital.id,
                department_id=active_docs[0].department_id,
                doctor_id=active_docs[0].id,
                patient_id=active_patients[0].id,
                counter_id=counter_objects[0].id,
                token_number=f"{active_docs[0].department.code}-001",
                token_date=today_str,
                daily_sequence=1,
                priority="normal",
                status="consulting",
                counter_number=counter_objects[0].counter_number,
                check_in_time=datetime.now(timezone.utc) - timedelta(minutes=25),
                call_time=datetime.now(timezone.utc) - timedelta(minutes=10),
                consult_start_time=datetime.now(timezone.utc) - timedelta(minutes=8),
                ml_predicted_wait_minutes=15.0,
                ml_predicted_service_minutes=20.0
            )
            db.session.add(t1)

            # Token 2: Calling
            t2 = QueueToken(
                hospital_id=hospital.id,
                department_id=active_docs[1].department_id,
                doctor_id=active_docs[1].id,
                patient_id=active_patients[1].id,
                counter_id=counter_objects[1].id,
                token_number=f"{active_docs[1].department.code}-001",
                token_date=today_str,
                daily_sequence=1,
                priority="urgent",
                status="calling",
                counter_number=counter_objects[1].counter_number,
                check_in_time=datetime.now(timezone.utc) - timedelta(minutes=18),
                call_time=datetime.now(timezone.utc) - timedelta(minutes=1),
                ml_predicted_wait_minutes=17.5,
                ml_predicted_service_minutes=18.0
            )
            db.session.add(t2)

            # Tokens 3, 4, 5: Waiting in queue
            for i in range(2, 5):
                doc = active_docs[i % len(active_docs)]
                tok = QueueToken(
                    hospital_id=hospital.id,
                    department_id=doc.department_id,
                    doctor_id=doc.id,
                    patient_id=active_patients[i].id,
                    token_number=f"{doc.department.code}-{i + 1:03d}",
                    token_date=today_str,
                    daily_sequence=i + 1,
                    priority="normal" if i != 3 else "emergency",
                    status="waiting",
                    check_in_time=datetime.now(timezone.utc) - timedelta(minutes=(30 - i * 5)),
                    ml_predicted_wait_minutes=float(15 + i * 8),
                    ml_predicted_service_minutes=18.0
                )
                db.session.add(tok)

        db.session.commit()
        print("\n[QueueSmart Seed] Database seeding and population finished successfully!")
        print("----------------------------------------------------------------------")
        print("Sample Credentials:")
        print("  Administrator : admin@queuesmart.ai   / Admin@123")
        print("  Staff/Desk    : staff@queuesmart.ai   / Staff@123")
        print("  Doctor (D001) : dr.d001@queuesmart.ai / Doctor@123")
        print("  Patient (P001): patient.p001@queuesmart.ai / Patient@123")
        print("  Demo Patient  : patient@queuesmart.ai / Patient@123")
        print("----------------------------------------------------------------------")

if __name__ == "__main__":
    seed_database()
