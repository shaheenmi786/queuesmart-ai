from flask_socketio import SocketIO, emit, join_room, leave_room

socketio = SocketIO(cors_allowed_origins="*")

@socketio.on("connect")
def handle_connect():
    print("[SocketIO] Client connected")
    emit("connected", {"status": "connected", "message": "QueueSmart AI Live Socket Ready"})

@socketio.on("disconnect")
def handle_disconnect():
    print("[SocketIO] Client disconnected")

@socketio.on("join_queue")
def handle_join_queue(data):
    department_id = data.get("department_id")
    if department_id:
        room = f"dept_{department_id}"
        join_room(room)
        print(f"[SocketIO] Client joined room {room}")

@socketio.on("leave_queue")
def handle_leave_queue(data):
    department_id = data.get("department_id")
    if department_id:
        room = f"dept_{department_id}"
        leave_room(room)
        print(f"[SocketIO] Client left room {room}")

def broadcast_queue_update(token_data, action: str = "update"):
    """
    Broadcasts token updates to all clients and department room.
    """
    if not isinstance(token_data, dict):
        if hasattr(token_data, "to_dict"):
            token_data = token_data.to_dict()
        else:
            token_data = {"id": token_data}
    payload = {
        "action": action,
        "token": token_data
    }
    socketio.emit("queue_updated", payload)
    dept_id = token_data.get("department_id")
    if dept_id:
        socketio.emit("queue_updated", payload, room=f"dept_{dept_id}")

def broadcast_doctor_status(doctor_data: dict):
    socketio.emit("doctor_status_changed", doctor_data)

def broadcast_counter_allocation(recommendations: list):
    socketio.emit("counter_allocated", {"recommendations": recommendations})

def broadcast_triage_update(triage_data: dict, action: str = "triage_updated"):
    if hasattr(triage_data, "to_dict"):
        triage_data = triage_data.to_dict()
    payload = {
        "action": action,
        "triage": triage_data
    }
    socketio.emit("triage_updated", payload)
    hospital_id = triage_data.get("hospital_id")
    if hospital_id:
        socketio.emit("triage_updated", payload, room=f"hospital_{hospital_id}")

def emit_user_notification(user_id: int, notification_data: dict):
    socketio.emit("notification_created", notification_data, room=f"user_{user_id}")
