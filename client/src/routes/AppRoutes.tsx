import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { DashboardLayout } from '../components/layout/DashboardLayout';

// Public Pages
import { LandingPage } from '../pages/public/LandingPage';
import { LiveDisplayPage } from '../pages/public/LiveDisplayPage';
import { AIPredictionDashboard } from '../pages/ai/AIPredictionDashboard';

// Auth Pages
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';

// Workspaces
import { PatientDashboard } from '../pages/patient/PatientDashboard';
import { DoctorDashboard } from '../pages/doctor/DoctorDashboard';
import { AdminDashboard } from '../pages/admin/AdminDashboard';
import { DepartmentManagement } from '../pages/admin/DepartmentManagement';
import { DoctorManagement } from '../pages/admin/DoctorManagement';
import { AuditLogsPage } from '../pages/admin/AuditLogsPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/live-display" element={<LiveDisplayPage />} />
      <Route path="/ai-predictions" element={<AIPredictionDashboard />} />

      {/* Auth Pages */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Protected Patient Routes */}
      <Route
        path="/patient"
        element={
          <ProtectedRoute allowedRoles={['patient']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<PatientDashboard />} />
        <Route path="book" element={<PatientDashboard />} />
        <Route path="history" element={<PatientDashboard />} />
      </Route>

      {/* Protected Doctor Routes */}
      <Route
        path="/doctor"
        element={
          <ProtectedRoute allowedRoles={['doctor']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<DoctorDashboard />} />
        <Route path="queue" element={<DoctorDashboard />} />
      </Route>

      {/* Protected Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="departments" element={<DepartmentManagement />} />
        <Route path="doctors" element={<DoctorManagement />} />
        <Route path="queue" element={<AdminDashboard />} />
        <Route path="counter-allocation" element={<AIPredictionDashboard />} />
        <Route path="analytics" element={<AdminDashboard />} />
        <Route path="audit-logs" element={<AuditLogsPage />} />
      </Route>

      {/* 404 Catch-All */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
