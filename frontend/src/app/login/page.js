'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { login as apiLogin } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { IconShield, IconAlertTriangle } from '@/components/Icons';

export default function LoginPage() {
  const router = useRouter();
  const { loginUser } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await apiLogin(username, password);
      loginUser(data.user, data.token);

      if (data.user.role === 'municipal' || data.user.role === 'admin') {
        router.push('/dashboard');
      } else {
        router.push('/report');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div
        className="auth-card"
        style={{
          width: '100%',
          maxWidth: '560px',
          padding: '48px 52px',
          margin: '32px auto',
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '24px',
          boxShadow:
            '0 24px 60px rgba(15, 23, 42, 0.10), 0 4px 16px rgba(15, 23, 42, 0.05)',
        }}
      >
        {/* Shield Icon */}
        <div
          style={{
            width: '68px',
            height: '68px',
            borderRadius: '18px',
            background: 'linear-gradient(135deg, #FF7A1A 0%, #FF5500 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 8px 24px rgba(255, 107, 0, 0.22)',
            border: '1px solid rgba(255, 255, 255, 0.35)',
          }}
        >
          <IconShield size={34} color="#FFFFFF" />
        </div>

        {/* Heading */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1
            className="gradient-text-orange"
            style={{
              fontSize: '2rem',
              marginBottom: '10px',
              fontWeight: 800,
            }}
          >
            Portal Sign In
          </h1>

          <p
            className="auth-subtitle"
            style={{
              margin: 0,
              color: '#64748B',
              fontSize: '0.95rem',
              lineHeight: 1.6,
            }}
          >
            Access your RoadRakshak AI Civic Interface
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            className="alert alert-danger"
            style={{
              marginBottom: '24px',
              borderRadius: '10px',
            }}
          >
            <IconAlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '22px' }}>
            <label htmlFor="username">USERNAME</label>

            <input
              id="username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              style={{
                height: '54px',
                fontSize: '0.96rem',
                padding: '12px 17px',
              }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label htmlFor="password">PASSWORD</label>

            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              style={{
                height: '54px',
                fontSize: '0.96rem',
                padding: '12px 17px',
              }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{
              width: '100%',
              height: '56px',
              marginTop: '2px',
              fontSize: '1rem',
              borderRadius: '10px',
            }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In to Portal'}
          </button>
        </form>

        {/* Register */}
        <div
          style={{
            textAlign: 'center',
            marginTop: '30px',
            paddingTop: '24px',
            borderTop: '1px solid #EDF2F7',
            fontSize: '0.9rem',
            color: '#64748B',
          }}
        >
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            style={{
              fontWeight: 700,
              color: '#FF6B00',
            }}
          >
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}