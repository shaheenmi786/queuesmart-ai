import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { AlertBanner } from '../../components/common/AlertBanner';
import { Activity, LogIn, Lock, Mail, ShieldCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg(null);
      const user = await login(email, password);

      // Server-side verified role redirect
      if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (user.role === 'doctor') {
        navigate('/doctor/dashboard');
      } else {
        navigate('/patient/dashboard');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2 group">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-teal-500 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
            <Activity className="w-6 h-6" />
          </div>
          <span className="text-2xl font-extrabold text-slate-900 tracking-tight">QueueSmart <span className="text-blue-600">AI</span></span>
        </Link>
        <h2 className="mt-4 text-xl font-bold text-slate-900">Sign in to your account</h2>
        <p className="mt-1 text-xs text-slate-500">
          Enter your authorized credentials to access your clinical dashboard.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-md rounded-2xl border border-slate-200 sm:px-10">
          {errorMsg && (
            <AlertBanner
              type="error"
              message={errorMsg}
              onDismiss={() => setErrorMsg(null)}
              className="mb-5"
            />
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@hospital.com"
                className="w-full text-sm rounded-lg border border-slate-300 px-3.5 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  Password
                </label>
                <Link to="/forgot-password" className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-sm rounded-lg border border-slate-300 px-3.5 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="pt-2">
              <Button
                variant="primary"
                type="submit"
                isLoading={isLoading}
                leftIcon={<LogIn className="w-4 h-4" />}
                className="w-full justify-center py-2.5 text-sm"
              >
                Sign In
              </Button>
            </div>
          </form>

          {/* Quick test credentials hint for authorized reviewers */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-xs text-slate-500 space-y-1.5 bg-slate-50 p-3 rounded-xl border">
            <div className="font-semibold text-slate-700 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Available Initial Accounts:</span>
            </div>
            <div className="grid grid-cols-1 gap-1 text-[11px] text-slate-600 font-mono">
              <div>• Admin: admin@queuesmart.ai / Admin@123</div>
              <div>• Doctor: dr.sharma@queuesmart.ai / Doctor@123</div>
              <div>• Patient: patient@queuesmart.ai / Patient@123</div>
            </div>
          </div>

          <div className="mt-5 text-center text-xs text-slate-500">
            Don't have a patient account?{' '}
            <Link to="/register" className="text-blue-600 hover:text-blue-800 font-semibold">
              Register here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
