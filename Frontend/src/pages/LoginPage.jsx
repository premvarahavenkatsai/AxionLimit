import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../components/Toast';
import { devLogin } from '../api/client';

export default function LoginPage() {
  const { user, login } = useAuth();
  const { theme, toggle } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://axionlimit-alb-693430163.ap-south-1.elb.amazonaws.com';

  const handleDevLogin = async () => {
    setLoading(true);
    try {
      const res = await devLogin();
      login(res.data.token, res.data.user);
      navigate('/dashboard');
    } catch (err) {
      toast('Developer login failed. Check backend connectivity.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${backendUrl}/auth/google`;
  };

  return (
    <div className="login-page">
      <button
        className="theme-toggle"
        onClick={toggle}
        style={{ position: 'fixed', top: 20, right: 20 }}
        aria-label="Toggle theme"
      >
        <div className="theme-toggle-knob">
          {theme === 'dark' ? '🌙' : '☀️'}
        </div>
      </button>

      <div className="login-card">
        <div className="login-logo">⚡</div>

        <h1 className="login-title">AxionLimit</h1>
        <p className="login-subtitle">
          Production-grade API rate limiting &amp; real-time telemetry for your applications.
        </p>

        <button className="btn-google" onClick={handleGoogleLogin}>
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <div className="login-divider">or</div>

        <button
          className="btn btn-ghost w-full"
          style={{ borderRadius: 'var(--radius-pill)', padding: '12px', fontSize: '0.9375rem', width: '100%' }}
          onClick={handleDevLogin}
          disabled={loading}
        >
          {loading ? (
            <><div className="spinner" style={{ width: 16, height: 16 }} /> Logging in...</>
          ) : (
            <><span>🛠</span> Developer Mock Login</>
          )}
        </button>

        <p style={{ marginTop: 24, fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Developer mock login creates a test account without needing Google OAuth.
          Use it to explore the dashboard locally.
        </p>
      </div>
    </div>
  );
}

