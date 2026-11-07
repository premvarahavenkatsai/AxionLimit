import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'AX';

  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <div className="navbar-logo-icon">⚡</div>
        AxionLimit
      </div>

      <div className="navbar-nav">
        <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          Dashboard
        </NavLink>
        <NavLink to="/sandbox" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          Sandbox
        </NavLink>
        <NavLink to="/docs" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          Docs & Integrations
        </NavLink>
      </div>

      <div className="navbar-right">
        <button className="theme-toggle" onClick={toggle} aria-label="Toggle theme">
          <div className="theme-toggle-knob">
            {theme === 'dark' ? '🌙' : '☀️'}
          </div>
        </button>

        {user && (
          <div className="user-pill" onClick={() => setDropOpen(o => !o)} ref={dropRef}>
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="user-avatar" />
            ) : (
              <div className="user-avatar-placeholder">{initials}</div>
            )}
            <span className="user-name">{user.name}</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 2 }}>▾</span>

            {dropOpen && (
              <div className="user-dropdown">
                <div className="dropdown-item" style={{ color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'default' }}>
                  {user.email}
                </div>
                <div className="divider" style={{ margin: '4px 0' }} />
                <div className="dropdown-item danger" onClick={handleLogout}>
                  Sign out
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

