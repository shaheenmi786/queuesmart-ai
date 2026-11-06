import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Clock,
  Users,
  Building2,
  Stethoscope,
  Cpu,
  BarChart3,
  History,
  Radio,
  Sliders,
  FileText
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onCloseMobile }) => {
  const { user } = useAuth();
  if (!user) return null;

  const role = user.role;

  const getLinks = () => {
    switch (role) {
      case 'patient':
        return [
          { to: '/patient/dashboard', label: 'My Queue & Token', icon: LayoutDashboard },
          { to: '/patient/book', label: 'Book Appointment', icon: Calendar },
          { to: '/patient/history', label: 'Appointment History', icon: History },
          { to: '/ai-predictions', label: 'AI Wait-Time Estimator', icon: Cpu },
          { to: '/live-display', label: 'Hospital Display', icon: Radio },
        ];
      case 'doctor':
        return [
          { to: '/doctor/dashboard', label: 'Consultation Desk', icon: Stethoscope },
          { to: '/doctor/queue', label: 'Active Queue Table', icon: Users },
          { to: '/ai-predictions', label: 'AI Service Insights', icon: Cpu },
          { to: '/live-display', label: 'Waiting Room Board', icon: Radio },
        ];
      case 'admin':
        return [
          { to: '/admin/dashboard', label: 'Operations Overview', icon: LayoutDashboard },
          { to: '/admin/departments', label: 'Departments', icon: Building2 },
          { to: '/admin/doctors', label: 'Doctors & Schedules', icon: Stethoscope },
          { to: '/admin/queue', label: 'Live Queue Manager', icon: Users },
          { to: '/ai-predictions', label: 'AI Optimization & ML', icon: Cpu },
          { to: '/admin/counter-allocation', label: 'Counter Allocation', icon: Sliders },
          { to: '/admin/analytics', label: 'Operational Reports', icon: BarChart3 },
          { to: '/admin/audit-logs', label: 'Audit Trail', icon: FileText },
          { to: '/live-display', label: 'Public Display View', icon: Radio },
        ];
      default:
        return [];
    }
  };

  const links = getLinks();

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-[calc(100vh-4rem)] sticky top-16 select-none">
      <div className="p-4 border-b border-slate-100 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
          {user.name.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
          <span className="text-xs uppercase font-medium text-slate-500 tracking-wider">
            {role === 'admin' ? 'Administrator' : role === 'doctor' ? 'Medical Staff' : 'Patient'}
          </span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{link.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Real Model Badge at footer of sidebar */}
      <div className="p-3 m-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
        <div className="flex items-center gap-1.5 font-semibold text-slate-800 mb-1">
          <Cpu className="w-3.5 h-3.5 text-blue-600" />
          <span>QueueSmart ML v1.0</span>
        </div>
        <p className="text-[11px] text-slate-500">
          RandomForest Regressor connected. Real database records only.
        </p>
      </div>
    </aside>
  );
};
