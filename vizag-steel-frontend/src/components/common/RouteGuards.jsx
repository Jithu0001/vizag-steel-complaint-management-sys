import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Spinner } from './UI';

// Redirect to login if not authenticated
export const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh' }}><Spinner size={32} /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

// Redirect if already logged in
export const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh' }}><Spinner size={32} /></div>;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
};

// Restrict to specific roles
export const RoleRoute = ({ children, roles }) => {
  const { user } = useAuth();
  if (!roles.includes(user?.role)) return <Navigate to="/dashboard" replace />;
  return children;
};
