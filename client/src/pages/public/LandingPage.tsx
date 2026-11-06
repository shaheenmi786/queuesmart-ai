import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Clock,
  Users,
  Cpu,
  BarChart3,
  CalendarCheck,
  ShieldAlert,
  Sparkles,
  Layers,
  TrendingUp,
  Stethoscope,
  ChevronRight,
  ShieldCheck,
  Play
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { useAuth } from '../../context/AuthContext';

export const LandingPage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const handleGetStarted = () => {
    if (isAuthenticated) {
      if (user?.role === 'admin') navigate('/admin/dashboard');
      else if (user?.role === 'doctor') navigate('/doctor/dashboard');
      else navigate('/patient/dashboard');
    } else {
      navigate('/register');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-slate-200 bg-gradient-to-b from-white via-slate-50 to-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Production Machine Learning & Queueing Theory</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
                Smarter Queues. <br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
                  Faster Healthcare.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Experience intelligent hospital queue management with AI-powered waiting-time predictions.
                Reduce waiting, improve patient experiences, and help hospitals operate smarter.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                <Button
                  variant="primary"
                  size="lg"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  onClick={handleGetStarted}
                  className="w-full sm:w-auto"
                >
                  Get Started
                </Button>
                <a
                  href="#features"
                  className="w-full sm:w-auto inline-flex items-center justify-center font-medium rounded-lg px-5 py-2.5 text-base border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                >
                  Explore Features
                </a>
              </div>

              {/* Verified Architecture Micro-Badges */}
              <div className="pt-6 border-t border-slate-200/80 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Role-Protected Workspaces
                </span>
                <span className="flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-blue-600" />
                  Scikit-Learn ML Pipeline
                </span>
                <span className="flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-teal-600" />
                  Live Socket Event Streams
                </span>
              </div>
            </div>

            {/* Right Side: Illustrative Product Preview */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                {/* Decorative blur backdrop */}
                <div className="absolute -top-4 -right-4 -bottom-4 -left-4 bg-gradient-to-tr from-blue-100 to-teal-100 rounded-3xl filter blur-xl opacity-70 -z-10" />

                <div className="bg-white rounded-2xl shadow-xl border border-slate-200/90 overflow-hidden">
                  {/* Mock Window Top Bar */}
                  <div className="px-4 py-3 bg-slate-900 flex items-center justify-between border-b border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono tracking-tight">QueueSmart AI Operational Console</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>

                  {/* Illustrative Interface Structure */}
                  <div className="p-5 space-y-4 text-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400">Cardiology Clinic</span>
                        <div className="text-xl font-extrabold text-slate-900 mt-0.5">TOKEN #CARD-101</div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-700 animate-pulse">
                        Calling Now
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 py-2 bg-slate-50 rounded-xl p-3 border border-slate-100 text-center">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Position</span>
                        <span className="text-sm font-bold text-slate-800">#1</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Est. Wait</span>
                        <span className="text-sm font-bold text-teal-600">~8 min</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Counter</span>
                        <span className="text-sm font-bold text-slate-800">Counter 1</span>
                      </div>
                    </div>

                    {/* AI Predictor Callout */}
                    <div className="p-3 bg-blue-50/70 border border-blue-200/60 rounded-xl space-y-1">
                      <div className="flex items-center justify-between text-blue-900 font-bold text-[11px]">
                        <span className="flex items-center gap-1">
                          <Cpu className="w-3.5 h-3.5 text-blue-600" />
                          ML Dynamic Recalculation
                        </span>
                        <span className="text-[10px] text-teal-700 font-mono">92% Calibrated</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-tight">
                        RandomForest evaluated active queue density, arrival velocity, and doctor consultation speed.
                      </p>
                    </div>

                    <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Live WebSocket Connected</span>
                      <span className="font-mono text-slate-500">Illustrative Product Preview</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust and Value Section */}
      <section className="py-16 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-xs uppercase font-bold tracking-widest text-blue-600 mb-2">Core Advantages</h2>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Transforming Hospital Service Delivery
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-blue-300 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
                <Clock className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-2">Intelligent Waiting-Time Prediction</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Replaces static estimates with regression models trained on department velocity, clinical complexity, and queue volume.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-teal-300 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center mb-4">
                <Activity className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-2">Real-Time Queue Monitoring</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Bi-directional Socket.IO updates alert patients and clinicians the moment consultations progress or delays are detected.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-purple-300 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-4">
                <Layers className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-2">Improved Service Allocation</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Algorithmic counter balancing based on Erlang-C formulas prevents department congestion and balances physician workloads.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-amber-300 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-2">Data-Driven Hospital Operations</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Real-time administrative dashboards report waiting times, consultation durations, patient throughput, and audit logs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-[#F8FAFC] border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs uppercase font-bold tracking-widest text-blue-600 mb-2">Capabilities</h2>
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Six Comprehensive Healthcare Modules
            </h3>
            <p className="text-sm text-slate-600 mt-3">
              Engineered for seamless synchronization between patients, attending physicians, and administrative managers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
                <Cpu className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-2">1. AI Waiting-Time Prediction</h4>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Calculates precise waiting durations using machine learning regression with uncertainty calibration and explainable factors.
              </p>
              <Link to="/ai-predictions" className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1">
                View AI Engine <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center mb-4">
                <Layers className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-2">2. Smart Queue Management</h4>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Dynamic token state management: waiting, calling, consulting, completed, absent, and cancelled across clinic counters.
              </p>
              <Link to="/live-display" className="text-xs font-semibold text-teal-600 hover:text-teal-800 flex items-center gap-1">
                View Live Board <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-4">
                <Activity className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-2">3. Live Queue Tracking</h4>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Real-time Socket.IO broadcasts ensure patients monitor their turn, patients ahead, and assigned consultation rooms live.
              </p>
              <Link to="/patient/dashboard" className="text-xs font-semibold text-purple-600 hover:text-purple-800 flex items-center gap-1">
                Patient Portal <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
                <Stethoscope className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-2">4. Doctor Availability</h4>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Physicians toggle between Available, Paused, and Offline. Automatic schedule tracking prevents conflicting clinic allocations.
              </p>
              <Link to="/doctor/dashboard" className="text-xs font-semibold text-amber-600 hover:text-amber-800 flex items-center gap-1">
                Doctor Console <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-2">5. Appointment Booking</h4>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Server-validated scheduling with automatic unique token generation, slot conflict protection, and cancellation rules.
              </p>
              <Link to="/patient/book" className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1">
                Book Visit <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-2">6. Analytics Dashboard</h4>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Operational reports tracking actual vs predicted wait times, doctor utilization rates, department throughput, and audit trails.
              </p>
              <Link to="/admin/dashboard" className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 flex items-center gap-1">
                Admin Dashboard <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs uppercase font-bold tracking-widest text-blue-600 mb-2">Workflow</h2>
            <h3 className="text-3xl font-extrabold text-slate-900">
              How QueueSmart AI Works
            </h3>
            <p className="text-sm text-slate-600 mt-2">
              Four streamlined steps from initial registration to consultation completion.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            {/* Step 1 */}
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-extrabold flex items-center justify-center mx-auto text-lg shadow-md">
                1
              </div>
              <h4 className="text-sm font-bold text-slate-900">Department Selection</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Patient registers or signs in and selects their desired clinical department and physician.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white font-extrabold flex items-center justify-center mx-auto text-lg shadow-md">
                2
              </div>
              <h4 className="text-sm font-bold text-slate-900">Appointment Booking</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Patient picks an available time slot. Server validates availability to prevent double-booking.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white font-extrabold flex items-center justify-center mx-auto text-lg shadow-md">
                3
              </div>
              <h4 className="text-sm font-bold text-slate-900">Token Generation</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                QueueSmart AI issues a unique persistent token (e.g. CARD-101) with assigned counter and room.
              </p>
            </div>

            {/* Step 4 */}
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white font-extrabold flex items-center justify-center mx-auto text-lg shadow-md">
                4
              </div>
              <h4 className="text-sm font-bold text-slate-900">Live AI Predictions</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Patient receives continuous, calibrated waiting time predictions and instant notification upon call.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* AI Technology Section */}
      <section id="ai-technology" className="py-20 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-teal-400 text-xs font-semibold mb-3">
              <Cpu className="w-3.5 h-3.5" />
              <span>Calibrated Operational Intelligence</span>
            </div>
            <h3 className="text-3xl font-extrabold text-white tracking-tight">
              Real Machine Learning & Mathematical Optimization
            </h3>
            <p className="text-sm text-slate-400 mt-3">
              QueueSmart AI relies on genuine machine learning pipelines and queueing theory formulas, avoiding artificial simulations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
              <h4 className="text-base font-bold text-teal-300">Machine Learning Regression</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                RandomForest regression pipelines trained on clinical features including department baselines, reason categories, and priority weights.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
              <h4 className="text-base font-bold text-blue-300">Service-Duration Prediction</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Estimates physician consultation lengths based on diagnosis complexity, hour-of-day fatigue factors, and visit reason.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
              <h4 className="text-base font-bold text-emerald-300">Queueing Theory (M/M/c)</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Applies multi-server Erlang-C formulas to model waiting probability, queue backlog, and traffic intensity ratios ($ho = \lambda / c\mu$).
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
              <h4 className="text-base font-bold text-purple-300">Dynamic Counter Allocation</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Detects overloaded clinics ($ho \ge 0.85$) and underutilized counters to recommend capacity reallocation automatically.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
              <h4 className="text-base font-bold text-amber-300">Arrival-Pattern Forecasting</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Projects clinic rush hours and morning surges across operating horizons to help hospital directors plan doctor staffing.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
              <h4 className="text-base font-bold text-cyan-300">Real-Time Queue Recalculation</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Continuously recalculates wait estimates whenever a patient completes, cancels, or joins, broadcasting updates over WebSockets.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* User Roles Section */}
      <section className="py-20 bg-[#F8FAFC] border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs uppercase font-bold tracking-widest text-blue-600 mb-2">Access Control</h2>
            <h3 className="text-3xl font-extrabold text-slate-900">
              Role-Specific Workspaces
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold mb-4">
                  <Users className="w-5 h-5" />
                </div>
                <h4 className="text-lg font-bold text-slate-900 mb-1">Patients</h4>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  Search doctors, book appointments, view tokens, monitor live position in queue, and receive real-time notifications.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/register')}>
                Register as Patient
              </Button>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center font-bold mb-4">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <h4 className="text-lg font-bold text-slate-900 mb-1">Doctors & Clinicians</h4>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  Call next patient, start and complete consultations, mark absent, toggle availability, and monitor department wait queues.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/login')}>
                Doctor Sign-In
              </Button>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold mb-4">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <h4 className="text-lg font-bold text-slate-900 mb-1">Hospital Administrators</h4>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  Manage departments, register doctors, adjust counter allocations, monitor facility metrics, and review security audit trails.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/login')}>
                Admin Sign-In
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-teal-600 text-white text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Transform the Way Hospitals Manage Queues.
          </h2>
          <p className="text-base text-blue-50 max-w-2xl mx-auto leading-relaxed">
            Eliminate chaotic waiting rooms, deliver predictable patient journeys, and empower clinical staff with algorithmic queue optimization.
          </p>
          <div className="pt-2">
            <Button
              variant="secondary"
              size="lg"
              onClick={handleGetStarted}
              className="bg-white text-blue-700 hover:bg-blue-50 shadow-lg text-base px-8 py-3"
            >
              Get Started Today
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};
