'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { register as apiRegister } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { IconShield, IconAlertTriangle, IconCheckCircle2 } from '@/components/Icons';

export default function RegisterPage() {
  const router = useRouter();
  const { loginUser } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('citizen');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await apiRegister(username, email, password, role);
      loginUser(data.user, data.token);

      if (data.user.role === 'municipal' || data.user.role === 'admin') {
        router.push('/dashboard');
      } else {
        router.push('/report');
      }
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="register-card">

        {/* Header */}
        <div className="auth-icon">
          <IconShield size={30} color="#FFFFFF" />
        </div>

        <div className="auth-eyebrow">
          <span className="pulse-dot pulse-dot-orange" />
          ROADRAKSHAK CIVIC NETWORK
        </div>

        <h1 className="gradient-text-orange">
          Create Account
        </h1>

        <p className="auth-subtitle">
          Join the network helping identify and resolve road hazards faster.
        </p>

        {/* Error */}
        {error && (
          <div className="alert alert-danger">
            <IconAlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              required
              minLength={3}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose your username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a secure password"
            />
            <div className="password-hint">
              Minimum 6 characters
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="role">Account Type</label>

            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="citizen">
                Citizen — Report & Track Hazards
              </option>
              <option value="municipal">
                Municipal Authority — Inspect & Verify
              </option>
              <option value="admin">
                Administrator — Full System Governance
              </option>
            </select>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg auth-submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner" />
                Creating Account...
              </>
            ) : (
              <>
                <IconCheckCircle2 size={19} />
                Create My Account
              </>
            )}
          </button>
        </form>

        {/* Trust indicators */}
        <div className="auth-trust">
          <div>
            <span>✓</span>
            Secure authentication
          </div>

          <div>
            <span>✓</span>
            AI-powered reporting
          </div>

          <div>
            <span>✓</span>
            Civic transparency
          </div>
        </div>

        {/* Login */}
        <div className="auth-footer">
          Already have an account?

          <Link href="/login">
            Sign In
          </Link>
        </div>

      </div>
    </div>
  );
}