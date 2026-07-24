import React, { useState } from 'react';
import { API } from '../App';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      onLogin(data.user, data.token);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-card fade-in">
        <div className="login-logo">
          <div style={{ fontSize: '3rem', marginBottom: '8px' }}>✈</div>
          <h1 style={{ fontSize: '1.8rem', color: 'var(--primary)', fontWeight: 800, margin: 0 }}>
            AeroMRO Pro
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            AI-Powered Aerospace Maintenance Platform
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          {error && (
            <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '16px', padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: '6px' }}>
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={() => { setEmail(import.meta.env.VITE_DEMO_EMAIL || ''); setPassword(import.meta.env.VITE_DEMO_PASSWORD || ''); }}
            disabled={!import.meta.env.VITE_DEMO_EMAIL || !import.meta.env.VITE_DEMO_PASSWORD}
            aria-label="Auto Fill Demo Credentials"
            style={{ width: '100%', marginBottom: '12px', padding: '10px 14px', borderRadius: '8px', border: '1px solid currentColor', background: 'transparent', cursor: 'pointer' }}
          >
            Auto Fill Demo Credentials
          </button>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', fontSize: '1rem' }} disabled={loading}>
            {loading ? 'Signing In...' : 'Sign In'}
          </button>

        </form>
      </div>
    </div>
  );
}

export default Login;
