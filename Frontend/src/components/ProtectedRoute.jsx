import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
        <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading...</span>
      </div>
    );
  }

  if (!token) return <Navigate to="/" replace />;
  return children;
}
