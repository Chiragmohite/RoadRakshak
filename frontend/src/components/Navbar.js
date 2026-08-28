'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  IconShield,
  IconCamera,
  IconLayers,
  IconActivity,
} from '@/components/Icons';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logoutUser } = useAuth();

  const handleLogout = () => {
    logoutUser();
    router.push('/login');
  };

  const navLinkStyle = (path) => {
    const isActive =
      pathname === path ||
      (path !== '/' && pathname.startsWith(path));

    return {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '7px',
      padding: '8px 13px',
      borderRadius: 'var(--radius-sm)',
      fontSize: '0.86rem',
      fontWeight: isActive ? 700 : 600,
      color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
      background: isActive ? 'var(--primary-light)' : 'transparent',
      border: isActive
        ? '1px solid rgba(255, 107, 0, 0.18)'
        : '1px solid transparent',
      transition: 'all 0.2s ease',
      textDecoration: 'none',
    };
  };

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 'var(--nav-height)',
        background: 'rgba(255, 255, 255, 0.94)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        zIndex: 1000,
        boxShadow: '0 2px 12px rgba(15, 23, 42, 0.06)',
      }}
    >
      {/* Brand */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
        }}
      >
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            textDecoration: 'none',
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background:
                'linear-gradient(135deg, #FF7A1A 0%, #FF5500 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(255, 107, 0, 0.25)',
            }}
          >
            <IconShield size={22} color="#FFFFFF" />
          </div>

          <div>
            <div
              style={{
                fontSize: '1.2rem',
                fontWeight: 800,
                color: 'var(--text-main)',
                letterSpacing: '-0.035em',
                lineHeight: 1.1,
              }}
            >
              Road
              <span style={{ color: 'var(--primary)' }}>
                Rakshak
              </span>
            </div>

            <div
              style={{
                fontSize: '0.58rem',
                color: 'var(--text-muted)',
                fontWeight: 700,
                letterSpacing: '0.7px',
                textTransform: 'uppercase',
              }}
            >
              AI Road Defense Core
            </div>
          </div>
        </Link>

        {/* Live Engine Status */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            background: '#ECFDF5',
            border: '1px solid #A7F3D0',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.65rem',
            fontWeight: 700,
            color: '#047857',
            letterSpacing: '0.4px',
          }}
        >
          <span className="pulse-dot pulse-dot-green" />
          YOLO VISION ACTIVE
        </div>
      </div>

      {/* Navigation */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        {user ? (
          <>
            <Link
              href="/report"
              style={navLinkStyle('/report')}
            >
              <IconCamera size={16} />
              <span>Report Damage</span>
            </Link>

            <Link
              href="/reports"
              style={navLinkStyle('/reports')}
            >
              <IconLayers size={16} />
              <span>All Reports</span>
            </Link>

            {(user.role === 'municipal' ||
              user.role === 'admin') && (
              <Link
                href="/dashboard"
                style={navLinkStyle('/dashboard')}
              >
                <IconActivity size={16} />
                <span>Municipal Dashboard</span>
              </Link>
            )}

            {/* User Profile */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginLeft: '8px',
                paddingLeft: '14px',
                borderLeft: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'var(--surface-alt)',
                  padding: '5px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                }}
              >
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background:
                      'linear-gradient(135deg, #FF7A00, #0891B2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    color: '#FFFFFF',
                  }}
                >
                  {user.username.charAt(0).toUpperCase()}
                </div>

                <div
                  style={{
                    fontSize: '0.8rem',
                    lineHeight: 1.2,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      color: 'var(--text-main)',
                    }}
                  >
                    {user.username}
                  </div>

                  <div
                    style={{
                      fontSize: '0.65rem',
                      color: 'var(--text-muted)',
                      textTransform: 'capitalize',
                    }}
                  >
                    {user.role}
                  </div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="btn btn-outline btn-sm"
                style={{
                  fontSize: '0.78rem',
                  padding: '5px 11px',
                }}
                title="Sign out of RoadRakshak"
              >
                Logout
              </button>
            </div>
          </>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Link
              href="/login"
              className="btn btn-outline btn-sm"
            >
              Sign In
            </Link>

            <Link
              href="/register"
              className="btn btn-primary btn-sm"
            >
              Get Started
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}