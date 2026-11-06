import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/analytics/adminService';
import { Doctor, Department } from '../../types';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { AlertBanner } from '../../components/common/AlertBanner';
import { Skeleton } from '../../components/common/Skeleton';
import { Stethoscope, UserPlus, Edit3, ShieldAlert } from 'lucide-react';

export const DoctorManagement: React.FC = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('Doctor@123');
  const [departmentId, setDepartmentId] = useState<number | ''>('');
  const [specialization, setSpecialization] = useState('');
  const [roomNumber, setRoomNumber] = useState('Room 101');
  const [counterNumber, setCounterNumber] = useState('Counter 1');
  const [fee, setFee] = useState('50.0');

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [docsRes, deptsRes] = await Promise.all([
        adminService.getDoctors(),
        adminService.getDepartments(),
      ]);
      setDoctors(docsRes.doctors);
      setDepartments(deptsRes.departments);
      if (deptsRes.departments.length > 0 && !departmentId) {
        setDepartmentId(deptsRes.departments[0].id);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch medical staff data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRegisterDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !departmentId) return;

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await adminService.createDoctor({
        name,
        email,
        password,
        phone,
        department_id: Number(departmentId),
        specialization: specialization || 'Specialist Physician',
        room_number: roomNumber,
        counter_number: counterNumber,
        consultation_fee: parseFloat(fee) || 50.0,
      });

      setIsModalOpen(false);
      setName('');
      setEmail('');
      setPhone('');
      setSpecialization('');
      await fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to register doctor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleDoctorStatus = async (doctor: Doctor) => {
    try {
      const newStatus = doctor.status === 'available' ? 'paused' : 'available';
      await adminService.updateDoctor(doctor.id, { status: newStatus });
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update doctor status.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-teal-600" />
            Medical Staff & Doctor Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Register authorized physician accounts, assign clinic departments, counters, and consult rooms.
          </p>
        </div>

        <Button
          variant="primary"
          leftIcon={<UserPlus className="w-4 h-4" />}
          onClick={() => {
            setErrorMsg(null);
            setIsModalOpen(true);
          }}
        >
          Register Doctor
        </Button>
      </div>

      {errorMsg && (
        <AlertBanner
          type="error"
          message={errorMsg}
          onDismiss={() => setErrorMsg(null)}
        />
      )}

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Doctor</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Specialization</th>
                <th className="px-4 py-3">Room & Counter</th>
                <th className="px-4 py-3">Consult Fee</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Quick Toggle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {doctors.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{doc.name}</div>
                    <span className="text-[11px] text-slate-400 font-mono block">{doc.email}</span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {doc.department_name} ({doc.department_code})
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {doc.specialization}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-slate-800">{doc.room_number || 'Room 101'}</span>
                    <span className="text-[10px] text-slate-400 block">{doc.counter_number || 'Counter 1'}</span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    ${doc.consultation_fee?.toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                      doc.status === 'available'
                        ? 'bg-green-100 text-green-800'
                        : doc.status === 'paused'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}>
                      {doc.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleToggleDoctorStatus(doc)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 px-2.5 py-1 rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors"
                    >
                      {doc.status === 'available' ? 'Set Paused' : 'Set Available'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Register Doctor Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Register Physician Account"
        description="Authorized admin workflow to create a doctor profile with clinical department mapping."
        maxWidth="lg"
      >
        <form onSubmit={handleRegisterDoctor} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Doctor Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dr. Siddharth Rao, MD"
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dr.rao@queuesmart.ai"
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Department *
              </label>
              <select
                required
                value={departmentId}
                onChange={(e) => setDepartmentId(Number(e.target.value))}
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Specialization
              </label>
              <input
                type="text"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                placeholder="e.g. Interventional Cardiologist"
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Consultation Room
              </label>
              <input
                type="text"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                placeholder="e.g. Room 204"
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Assigned Counter
              </label>
              <input
                type="text"
                value={counterNumber}
                onChange={(e) => setCounterNumber(e.target.value)}
                placeholder="e.g. Counter 4"
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Consultation Fee ($)
              </label>
              <input
                type="number"
                step="5"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Initial Account Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              Complete Doctor Registration
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
