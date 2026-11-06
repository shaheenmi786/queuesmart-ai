from flask import Blueprint, jsonify, request
import sys
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(current_dir, ".."))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from models.department import Department

departments_bp = Blueprint("departments", __name__, url_prefix="/api/v1/departments")

@departments_bp.route("", methods=["GET"])
def get_departments():
    hospital_id = request.args.get("hospital_id", type=int)
    query = Department.query.filter_by(is_active=True)
    if hospital_id:
        query = query.filter_by(hospital_id=hospital_id)
    depts = query.order_by(Department.name.asc()).all()
    return jsonify({"departments": [d.to_dict() for d in depts]}), 200

@departments_bp.route("/<int:id>", methods=["GET"])
def get_department_detail(id):
    dept = Department.query.get(id)
    if not dept:
        return jsonify({"error": "Department not found."}), 404
    return jsonify({"department": dept.to_dict()}), 200
