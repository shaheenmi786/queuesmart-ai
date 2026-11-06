import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, Mail, Phone, MapPin, ShieldCheck, Cpu } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-500 to-teal-400 flex items-center justify-center text-white shadow-md">
                <Activity className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">QueueSmart <span className="text-blue-400">AI</span></span>
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed">
              AI-Powered Hospital Queue Management and Service-Time Optimization Platform. Bringing calibrated machine learning to healthcare operations.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Production Healthcare Operations</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white text-xs font-semibold uppercase tracking-wider mb-4">Platform</h4>
            <ul className="space-y-2.5 text-xs">
              <li><Link to="/#features" className="hover:text-white transition-colors">Features</Link></li>
              <li><Link to="/#how-it-works" className="hover:text-white transition-colors">How It Works</Link></li>
              <li><Link to="/#ai-technology" className="hover:text-white transition-colors">AI & Queuing Theory</Link></li>
              <li><Link to="/ai-predictions" className="hover:text-white transition-colors">AI Optimization Engine</Link></li>
              <li><Link to="/live-display" className="hover:text-white transition-colors">Live Public Queue Display</Link></li>
            </ul>
          </div>

          {/* User Dashboards */}
          <div>
            <h4 className="text-white text-xs font-semibold uppercase tracking-wider mb-4">Workspaces</h4>
            <ul className="space-y-2.5 text-xs">
              <li><Link to="/patient/dashboard" className="hover:text-white transition-colors">Patient Portal & Booking</Link></li>
              <li><Link to="/doctor/dashboard" className="hover:text-white transition-colors">Doctor Consultation Console</Link></li>
              <li><Link to="/admin/dashboard" className="hover:text-white transition-colors">Hospital Administration</Link></li>
              <li><Link to="/login" className="hover:text-white transition-colors">Authorized Staff Sign-In</Link></li>
            </ul>
          </div>

          {/* Contact & Support */}
          <div>
            <h4 className="text-white text-xs font-semibold uppercase tracking-wider mb-4">Contact & Support</h4>
            <ul className="space-y-3 text-xs">
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-500" />
                <span>support@queuesmart.ai</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-500" />
                <span>+1 (800) 412-QUEUE</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-500" />
                <span>Clinical AI Systems, Tech Park</span>
              </li>
              <li className="flex items-center gap-2 text-teal-400 pt-1">
                <Cpu className="w-4 h-4" />
                <span>Real RandomForest Regressors Active</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} QueueSmart AI Healthcare Technologies. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-slate-400 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-slate-400 cursor-pointer">Terms of Service</span>
            <span className="hover:text-slate-400 cursor-pointer">HIPAA & Healthcare Data Security</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
