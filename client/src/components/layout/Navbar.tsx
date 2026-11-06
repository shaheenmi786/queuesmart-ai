import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, Menu, X, LogIn, LayoutDashboard, Radio } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { NotificationDropdown } from '../notifications/NotificationDropdown';
import { Button } from '../common/Button';

export const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const { isConnected } = useSocket();
  const navigate = useNavigate();

  const getDashboardPath = () => {
    if (!user) return '/login';
    switch (user.role) {
      case 'admin':
        return '/admin/dashboard';
      case 'doctor':
        return '/doctor/dashboard';
      case 'patient':
      default:
        return '/patient/dashboard';
    }
  };

  return (
    <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-teal-500 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold text-slate-900 tracking-tight">QueueSmart <span className="text-blue-600">AI</span></span>
              <span className="hidden sm:block text-[10px] text-slate-400 font-medium tracking-wide uppercase">Hospital Queue Platform</span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <Link to="/#features" className="hover:text-blue-600 transition-colors">Features</Link>
            <Link to="/#how-it-works" className="hover:text-blue-600 transition-colors">How It Works</Link>
            <Link to="/#ai-technology" className="hover:text-blue-600 transition-colors">AI Technology</Link>
            <Link to="/ai-predictions" className="hover:text-blue-600 transition-colors flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>
              AI Engine
            </Link>
            <Link to="/live-display" className="hover:text-blue-600 transition-colors flex items-center gap-1.5 text-slate-700">
              <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse" />
              Live Display
            </Link>
          </div>

          {/* Action buttons & Socket indicator */}
          <div className="hidden md:flex items-center gap-3">
            {/* Live Socket Status Dot */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border bg-slate-50 border-slate-200"
              title={isConnected ? 'Connected to live hospital event stream' : 'Reconnecting to event stream...'}
            >
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-amber-400 animate-ping'}`} />
              <span className="text-slate-600">{isConnected ? 'Live' : 'Syncing'}</span>
            </div>

            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <NotificationDropdown />
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<LayoutDashboard className="w-4 h-4" />}
                  onClick={() => navigate(getDashboardPath())}
                >
                  Dashboard
                </Button>
                <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                  <div className="text-right">
                    <p className="text-xs font-semibold text-slate-800 leading-tight">{user?.name}</p>
                    <span className="text-[10px] uppercase font-bold text-blue-600">{user?.role}</span>
                  </div>
                  <button
                    onClick={() => logout()}
                    className="text-xs text-slate-500 hover:text-red-600 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<LogIn className="w-4 h-4" />}
                  onClick={() => navigate('/login')}
                >
                  Login
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/register')}
                >
                  Get Started
                </Button>
              </div>
            )}
          </div>

          {/* Mobile menu toggle */}
          <div className="flex md:hidden items-center gap-2">
            {isAuthenticated && <NotificationDropdown />}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3 animate-fadeIn">
          <Link
            to="/#features"
            onClick={() => setIsOpen(false)}
            className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
          >
            Features
          </Link>
          <Link
            to="/#how-it-works"
            onClick={() => setIsOpen(false)}
            className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
          >
            How It Works
          </Link>
          <Link
            to="/#ai-technology"
            onClick={() => setIsOpen(false)}
            className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
          >
            AI Technology
          </Link>
          <Link
            to="/ai-predictions"
            onClick={() => setIsOpen(false)}
            className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
          >
            AI Engine Dashboard
          </Link>
          <Link
            to="/live-display"
            onClick={() => setIsOpen(false)}
            className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
          >
            Live Public Display
          </Link>

          <div className="pt-4 border-t border-slate-100 space-y-2">
            {isAuthenticated ? (
              <>
                <Button
                  variant="primary"
                  className="w-full justify-center"
                  onClick={() => {
                    setIsOpen(false);
                    navigate(getDashboardPath());
                  }}
                >
                  Go to {user?.role.toUpperCase()} Dashboard
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-center"
                  onClick={() => {
                    setIsOpen(false);
                    logout();
                  }}
                >
                  Logout
                </Button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="w-full justify-center"
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/login');
                  }}
                >
                  Login
                </Button>
                <Button
                  variant="primary"
                  className="w-full justify-center"
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/register');
                  }}
                >
                  Get Started
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
