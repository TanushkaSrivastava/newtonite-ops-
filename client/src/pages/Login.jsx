import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { isDemoMode, setDemoMode } from '../services/mockAdapter';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please provide an email address.');
      return;
    }
    if (!password) {
      setError('Please provide your password.');
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(
        err.message || 'Authentication failed. Please verify your email and password.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('Password123!');
    setError('');
  };

  const handleOfflineDemo = () => {
    setDemoMode(true);
    window.location.href = '/dashboard';
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        {/* Brand Header */}
        <div className="auth-brand-header">
          <div className="auth-logo-badge">
            <span>NO</span>
          </div>
          <h1 className="auth-title">Newtonite Ops</h1>
          <p className="auth-subtitle">Internal Operations & Incident Management</p>
        </div>

        {error && (
          <div className="auth-error-banner" role="alert">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <Input
            label="Work Email"
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="operator@newtonite.io"
            required
            icon={Mail}
            autoComplete="username"
          />

          <Input
            label="Password"
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            required
            icon={Lock}
            autoComplete="current-password"
            endAdornment={
              <button
                type="button"
                className="input-adornment-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
          />

          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={loading}
            icon={ArrowRight}
            className="auth-submit-btn"
          >
            Sign In to Newtonite
          </Button>
        </form>

        {/* Demo Fast Logins for reviewers */}
        <div className="auth-demo-section">
          <div className="auth-demo-header">
            <ShieldCheck size={13} className="text-secondary" />
            <span>Fast Sign-in Personas (Seeded)</span>
          </div>
          <div className="auth-demo-chips">
            <button
              type="button"
              className="demo-chip"
              onClick={() => handleFillDemo('admin@newtonite.io')}
            >
              <strong>Admin:</strong> admin@newtonite.io
            </button>
            <button
              type="button"
              className="demo-chip"
              onClick={() => handleFillDemo('sarah.chen@newtonite.io')}
            >
              <strong>Manager:</strong> sarah.chen@newtonite.io
            </button>
            <button
              type="button"
              className="demo-chip"
              onClick={() => handleFillDemo('marcus.vance@newtonite.io')}
            >
              <strong>Member:</strong> marcus.vance@newtonite.io
            </button>
          </div>
        </div>

        <div className="auth-footer">
          <span className="text-secondary text-sm">Need a new workspace account?</span>{' '}
          <Link to="/register" className="auth-link">
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}
