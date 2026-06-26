import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './styles/globals.css';

import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import Layout from './components/layout/Layout';
import { ProtectedRoute, PublicRoute, RoleRoute } from './components/common/RouteGuards';
import { Spinner } from './components/common/UI';

// ── Lazy-loaded pages ─────────────────────────────────────────────────────────
const LoginPage       = lazy(() => import('./pages/shared/LoginPage'));
const RegisterPage    = lazy(() => import('./pages/shared/RegisterPage'));
const ComplaintsListPage  = lazy(() => import('./pages/shared/ComplaintsListPage'));
const ComplaintDetailPage = lazy(() => import('./pages/shared/ComplaintDetailPage'));
const NotificationsPage   = lazy(() => import('./pages/shared/NotificationsPage'));
const ProfilePage         = lazy(() => import('./pages/shared/ProfilePage'));
const MapPage             = lazy(() => import('./pages/shared/MapPage'));
const EmployeeDashboard   = lazy(() => import('./pages/employee/EmployeeDashboard'));
const NewComplaintPage    = lazy(() => import('./pages/employee/NewComplaintPage'));
const AdminDashboard      = lazy(() => import('./pages/admin/AdminDashboard'));
const UserManagementPage  = lazy(() => import('./pages/admin/UserManagementPage'));
const AuditLogPage        = lazy(() => import('./pages/admin/AuditLogPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
    mutations: { retry: 0 },
  },
});

const Loading = () => (
  <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh' }}>
    <Spinner size={32} />
  </div>
);

// Smart dashboard: redirect to role-specific dashboard
const SmartDashboard = () => {
  const { user, isAdmin, canManage } = useAuth();
  if (isAdmin || canManage) return <AdminDashboard />;
  return <EmployeeDashboard />;
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <NotificationProvider>
            <Suspense fallback={<Loading />}>
              <Routes>
                {/* Public */}
                <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
                <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

                {/* Protected — all inside Layout */}
                <Route path="/" element={<ProtectedRoute><Layout><Navigate to="/dashboard" replace /></Layout></ProtectedRoute>} />

                <Route path="/dashboard" element={<ProtectedRoute><Layout><SmartDashboard /></Layout></ProtectedRoute>} />

                <Route path="/complaints" element={<ProtectedRoute><Layout><ComplaintsListPage /></Layout></ProtectedRoute>} />
                <Route path="/complaints/new" element={<ProtectedRoute><Layout><NewComplaintPage /></Layout></ProtectedRoute>} />
                <Route path="/complaints/:id" element={<ProtectedRoute><Layout><ComplaintDetailPage /></Layout></ProtectedRoute>} />

                <Route path="/notifications" element={<ProtectedRoute><Layout><NotificationsPage /></Layout></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Layout><ProfilePage /></Layout></ProtectedRoute>} />

                {/* Supervisor+ */}
                <Route path="/map" element={
                  <ProtectedRoute><Layout>
                    <RoleRoute roles={['supervisor','department_admin','super_admin']}><MapPage /></RoleRoute>
                  </Layout></ProtectedRoute>
                } />

                {/* Admin+ */}
                <Route path="/analytics" element={
                  <ProtectedRoute><Layout>
                    <RoleRoute roles={['department_admin','super_admin']}><AdminDashboard /></RoleRoute>
                  </Layout></ProtectedRoute>
                } />
                <Route path="/users" element={
                  <ProtectedRoute><Layout>
                    <RoleRoute roles={['department_admin','super_admin']}><UserManagementPage /></RoleRoute>
                  </Layout></ProtectedRoute>
                } />
                <Route path="/audit" element={
                  <ProtectedRoute><Layout>
                    <RoleRoute roles={['department_admin','super_admin']}><AuditLogPage /></RoleRoute>
                  </Layout></ProtectedRoute>
                } />

                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Suspense>

            <ToastContainer
              position="top-right" autoClose={4000} hideProgressBar={false}
              newestOnTop closeOnClick pauseOnFocusLoss draggable pauseOnHover
              theme="dark"
              toastStyle={{ background:'var(--color-bg-elevated)', border:'1px solid var(--color-border)', color:'var(--color-text-primary)', fontSize:'13px' }}
            />
          </NotificationProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
