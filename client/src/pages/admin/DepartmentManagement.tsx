import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/analytics/adminService';
import { Department } from '../../types';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { AlertBanner } from '../../components/common/AlertBanner';
import { Skeleton } from '../../components/common/Skeleton';
import { Building2, Plus, Edit, CheckCircle, XCircle } from 'lucide-react';

export const DepartmentManagement: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [avgServiceTime, setAvgServiceTime] = useState('15');

  const fetchDepartments = async () => {
    try {
      setIsLoading(true);
      const res = await adminService.getDepartments();
      setDepartments(res.departments);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch departments.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) return;

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await adminService.createDepartment({
        name,
        code: code.toUpperCase(),
        description,
        location,
        average_service_time_mins: parseFloat(avgServiceTime) || 15,
      });

      setIsModalOpen(false);
      setName('');
      setCode('');
      setDescription('');
      setLocation('');
      await fetchDepartments();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create department.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (dept: Department) => {
    try {
      await adminService.updateDepartment(dept.id, {
        is_active: !dept.is_active,
      });
      await fetchDepartments();
    } catch (err: any) {
      alert(err.message || 'Failed to update department status.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-600" />
            Clinical Department Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure hospital clinic wings, codes, service time baselines, and counter routing.
          </p>
        </div>

        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => {
            setErrorMsg(null);
            setIsModalOpen(true);
          }}
        >
          Add Department
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
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Department Name</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Doctors</th>
                <th className="px-4 py-3">Baseline Service</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {departments.map((dept) => (
                <tr key={dept.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-blue-600">
                    {dept.code}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{dept.name}</div>
                    <span className="text-[11px] text-slate-400 block max-w-xs truncate">{dept.description}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {dept.location || 'Main Building'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-slate-800">{dept.doctor_count || 0}</span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {dept.average_service_time_mins} mins
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                      dept.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {dept.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleToggleStatus(dept)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
                        dept.is_active
                          ? 'text-red-600 border-red-200 hover:bg-red-50'
                          : 'text-green-600 border-green-200 hover:bg-green-50'
                      }`}
                    >
                      {dept.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Department Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Hospital Department"
        description="Register a clinical division for queue routing and doctor assignments."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Department Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dermatology & Allergy Clinic"
              className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Department Code * (Prefix)
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. DERM"
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-900 uppercase font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Avg Service Time (mins)
              </label>
              <input
                type="number"
                min={5}
                max={60}
                value={avgServiceTime}
                onChange={(e) => setAvgServiceTime(e.target.value)}
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Physical Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Floor 3, East Wing"
              className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Clinical Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Specialty procedures, target patient conditions..."
              className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              Create Department
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
