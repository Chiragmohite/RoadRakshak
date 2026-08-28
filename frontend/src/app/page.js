'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
  IconShield,
  IconCamera,
  IconCpu,
  IconMapPin,
  IconCheckCircle2,
  IconActivity,
  IconLayers,
} from '@/components/Icons';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="container">

      {/* =========================================================
          HERO
      ========================================================= */}
      <section
        style={{
          position: 'relative',
          overflow: 'hidden',
          marginTop: '24px',
          marginBottom: '52px',
          padding: '72px 40px 68px',
          borderRadius: '28px',
          background:
            'linear-gradient(135deg, #FFFFFF 0%, #FFF8F3 52%, #F0FBFD 100%)',
          border: '1px solid #E2E8F0',
          boxShadow:
            '0 24px 60px rgba(15, 23, 42, 0.09), 0 4px 14px rgba(15, 23, 42, 0.04)',
          textAlign: 'center',
        }}
      >
        {/* Decorative orange glow */}
        <div
          style={{
            position: 'absolute',
            width: '360px',
            height: '360px',
            top: '-190px',
            left: '-120px',
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(255,107,0,0.16), transparent 68%)',
            pointerEvents: 'none',
          }}
        />

        {/* Decorative cyan glow */}
        <div
          style={{
            position: 'absolute',
            width: '360px',
            height: '360px',
            bottom: '-210px',
            right: '-100px',
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(8,145,178,0.13), transparent 68%)',
            pointerEvents: 'none',
          }}
        />

        {/* Floating grid */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.35,
            pointerEvents: 'none',
            backgroundImage:
              'linear-gradient(rgba(15,23,42,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.035) 1px, transparent 1px)',
            backgroundSize: '42px 42px',
            maskImage:
              'linear-gradient(to bottom, black, transparent 75%)',
          }}
        />

        <div style={{ position: 'relative', zIndex: 2 }}>

          {/* Shield */}
          <div
            style={{
              width: '76px',
              height: '76px',
              margin: '0 auto 22px',
              borderRadius: '22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background:
                'linear-gradient(135deg, #FF7A1A 0%, #FF5A00 100%)',
              boxShadow:
                '0 14px 32px rgba(255,107,0,0.25), 0 4px 10px rgba(255,107,0,0.12)',
              transform: 'translateY(0)',
              transition: 'transform 0.25s ease, box-shadow 0.25s ease',
            }}
          >
            <IconShield size={40} color="#FFFFFF" />
          </div>

          {/* Eyebrow */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '7px 15px',
              marginBottom: '20px',
              borderRadius: '999px',
              background: '#FFF4EC',
              border: '1px solid #FED7AA',
              color: '#C2410C',
              fontSize: '0.74rem',
              fontWeight: 800,
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
            }}
          >
            <span className="pulse-dot pulse-dot-orange" />
            AI-Powered Civic Infrastructure
          </div>

          {/* Heading */}
          <h1
            style={{
              maxWidth: '900px',
              margin: '0 auto 20px',
              fontSize: 'clamp(2.3rem, 5vw, 3.65rem)',
              lineHeight: 1.1,
              fontWeight: 800,
              letterSpacing: '-0.045em',
              color: '#0F172A',
            }}
          >
            Intelligent Road Safety &
            <br />
            <span className="gradient-text-orange">
              Automated Repair Governance
            </span>
          </h1>

          {/* Description */}
          <p
            style={{
              maxWidth: '760px',
              margin: '0 auto 34px',
              color: '#475569',
              fontSize: '1.08rem',
              lineHeight: 1.75,
            }}
          >
            Citizen hazard reporting powered by custom{' '}
            <strong style={{ color: '#0F172A' }}>Ultralytics YOLO</strong>{' '}
            vision, mathematical severity scoring, GPS duplicate clustering,
            and certified municipal verification.
          </p>

          {/* CTA */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <Link
              href="/report"
              className="btn btn-primary btn-lg"
              style={{
                minWidth: '210px',
                height: '54px',
                borderRadius: '11px',
                fontSize: '0.96rem',
              }}
            >
              <IconCamera size={20} />
              Report Road Hazard
            </Link>

            {user &&
            (user.role === 'municipal' || user.role === 'admin') ? (
              <Link
                href="/dashboard"
                className="btn btn-accent btn-lg"
                style={{
                  minWidth: '230px',
                  height: '54px',
                  borderRadius: '11px',
                  fontSize: '0.96rem',
                }}
              >
                <IconActivity size={20} />
                Municipal Command Center
              </Link>
            ) : (
              <Link
                href="/reports"
                className="btn btn-outline btn-lg"
                style={{
                  minWidth: '200px',
                  height: '54px',
                  borderRadius: '11px',
                  fontSize: '0.96rem',
                }}
              >
                <IconLayers size={20} />
                Browse Live Reports
              </Link>
            )}
          </div>

          {/* Trust indicators */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '24px',
              flexWrap: 'wrap',
              marginTop: '30px',
              color: '#64748B',
              fontSize: '0.78rem',
              fontWeight: 600,
            }}
          >
            <span>✓ AI Vision Detection</span>
            <span>✓ GPS Clustering</span>
            <span>✓ Municipal Verification</span>
          </div>
        </div>
      </section>

      {/* =========================================================
          PIPELINE
      ========================================================= */}
      <section style={{ marginBottom: '56px' }}>
        <div
          style={{
            textAlign: 'center',
            marginBottom: '32px',
          }}
        >
          <div
            style={{
              fontSize: '0.75rem',
              color: '#0891B2',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '7px',
            }}
          >
            END-TO-END PIPELINE
          </div>

          <h2
            style={{
              fontSize: '2rem',
              marginBottom: '8px',
            }}
          >
            From Road Damage to Verified Repair
          </h2>

          <p
            style={{
              maxWidth: '620px',
              margin: '0 auto',
              color: '#64748B',
              fontSize: '0.92rem',
            }}
          >
            Every report moves through a transparent AI-assisted municipal
            workflow.
          </p>
        </div>

        <div className="grid-3">

          {/* Card 1 */}
          <div
            className="card-3d"
            style={{
              position: 'relative',
              overflow: 'hidden',
              borderTop: '3px solid #FF6B00',
              transition: 'transform 0.25s ease, box-shadow 0.25s ease',
            }}
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                background: '#FFF4EC',
                border: '1px solid #FED7AA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FF6B00',
                marginBottom: '18px',
              }}
            >
              <IconCpu size={25} />
            </div>

            <div
              style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                color: '#FF6B00',
                letterSpacing: '0.8px',
                marginBottom: '6px',
              }}
            >
              STEP 01
            </div>

            <h3 style={{ marginBottom: '10px' }}>
              YOLO Vision & Severity
            </h3>

            <p
              style={{
                color: '#64748B',
                fontSize: '0.9rem',
                lineHeight: 1.65,
              }}
            >
              Ultralytics YOLO detects potholes and cracks with bounding
              boxes. A transparent mathematical formulation derives a
              severity score from demonstrable detection factors.
            </p>
          </div>

          {/* Card 2 */}
          <div
            className="card-3d"
            style={{
              borderTop: '3px solid #0891B2',
            }}
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                background: '#ECFEFF',
                border: '1px solid #A5F3FC',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0891B2',
                marginBottom: '18px',
              }}
            >
              <IconMapPin size={25} />
            </div>

            <div
              style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                color: '#0891B2',
                letterSpacing: '0.8px',
                marginBottom: '6px',
              }}
            >
              STEP 02
            </div>

            <h3 style={{ marginBottom: '10px' }}>
              50m Spatial Clustering
            </h3>

            <p
              style={{
                color: '#64748B',
                fontSize: '0.9rem',
                lineHeight: 1.65,
              }}
            >
              Haversine GPS clustering groups duplicate complaints within a
              50-meter radius while preserving each citizen report and
              consolidating municipal work orders.
            </p>
          </div>

          {/* Card 3 */}
          <div
            className="card-3d"
            style={{
              borderTop: '3px solid #059669',
            }}
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                background: '#ECFDF5',
                border: '1px solid #A7F3D0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#059669',
                marginBottom: '18px',
              }}
            >
              <IconCheckCircle2 size={25} />
            </div>

            <div
              style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                color: '#059669',
                letterSpacing: '0.8px',
                marginBottom: '6px',
              }}
            >
              STEP 03
            </div>

            <h3 style={{ marginBottom: '10px' }}>
              Certified Verification
            </h3>

            <p
              style={{
                color: '#64748B',
                fontSize: '0.9rem',
                lineHeight: 1.65,
              }}
            >
              Field teams upload post-repair imagery for visual comparison.
              Official authorities manually certify the repair and transition
              the report to VERIFIED FIXED.
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================
          PRIORITY MATRIX
      ========================================================= */}
      <section
        className="card-3d"
        style={{
          marginBottom: '48px',
          padding: '28px',
        }}
      >
        <div className="card-header">
          <div>
            <h2 style={{ fontSize: '1.35rem' }}>
              Transparent Priority & SLA Matrix
            </h2>

            <div
              style={{
                fontSize: '0.8rem',
                color: '#64748B',
                marginTop: '4px',
              }}
            >
              Deterministic mapping based on demonstrable detection
              parameters
            </div>
          </div>

          <span className="badge badge-real">
            Deterministic Formula
          </span>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Priority</th>
                <th>Severity Range</th>
                <th>Classification</th>
                <th>Defect Criteria</th>
                <th>Target SLA</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td>
                  <span className="badge badge-p1">P1</span>
                </td>

                <td>
                  <strong style={{ color: '#DC2626' }}>
                    8.0 – 10.0
                  </strong>
                </td>

                <td>
                  <span className="badge badge-critical">
                    Critical
                  </span>
                </td>

                <td>
                  Large Potholes, high frame area coverage (&gt;30%),
                  high model confidence
                </td>

                <td>
                  <strong style={{ color: '#991B1B' }}>
                    &lt; 24 Hours
                  </strong>
                </td>
              </tr>

              <tr>
                <td>
                  <span className="badge badge-p2">P2</span>
                </td>

                <td>
                  <strong style={{ color: '#EA580C' }}>
                    6.0 – 7.9
                  </strong>
                </td>

                <td>
                  <span className="badge badge-high">High</span>
                </td>

                <td>
                  Alligator Cracks, structural road base failures,
                  medium-to-large area
                </td>

                <td>
                  <strong style={{ color: '#9A3412' }}>
                    &lt; 48 Hours
                  </strong>
                </td>
              </tr>

              <tr>
                <td>
                  <span className="badge badge-p3">P3</span>
                </td>

                <td>
                  <strong style={{ color: '#D97706' }}>
                    4.0 – 5.9
                  </strong>
                </td>

                <td>
                  <span className="badge badge-medium">
                    Medium
                  </span>
                </td>

                <td>
                  Longitudinal Cracks, multiple surface distress
                  fractures
                </td>

                <td>
                  <strong style={{ color: '#92400E' }}>
                    &lt; 7 Days
                  </strong>
                </td>
              </tr>

              <tr>
                <td>
                  <span className="badge badge-p4">P4</span>
                </td>

                <td>
                  <strong style={{ color: '#059669' }}>
                    1.0 – 3.9
                  </strong>
                </td>

                <td>
                  <span className="badge badge-low">Low</span>
                </td>

                <td>
                  Transverse / minor surface hairline cracks
                </td>

                <td>
                  <strong style={{ color: '#065F46' }}>
                    Scheduled
                  </strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* =========================================================
          JOIN CTA
      ========================================================= */}
      {!user && (
        <section
          style={{
            position: 'relative',
            overflow: 'hidden',
            marginBottom: '40px',
            padding: '48px 32px',
            textAlign: 'center',
            borderRadius: '24px',
            background:
              'linear-gradient(135deg, #FFFFFF 0%, #FFF7F0 100%)',
            border: '1px solid #FED7AA',
            boxShadow:
              '0 16px 40px rgba(15,23,42,0.07)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              width: '260px',
              height: '260px',
              top: '-160px',
              right: '-80px',
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(255,107,0,0.14), transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '6px 13px',
                borderRadius: '999px',
                background: '#FFF4EC',
                color: '#C2410C',
                border: '1px solid #FED7AA',
                fontSize: '0.72rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.7px',
                marginBottom: '14px',
              }}
            >
              <IconShield size={14} />
              Join the Network
            </div>

            <h2
              style={{
                fontSize: '1.9rem',
                marginBottom: '10px',
              }}
            >
              Help Make Roads Safer
            </h2>

            <p
              style={{
                color: '#64748B',
                maxWidth: '560px',
                margin: '0 auto 28px',
                fontSize: '0.95rem',
                lineHeight: 1.65,
              }}
            >
              Register as a <strong style={{ color: '#0F172A' }}>
                Citizen
              </strong>{' '}
              to report road hazards, or as a{' '}
              <strong style={{ color: '#0F172A' }}>
                Municipal Authority
              </strong>{' '}
              to manage and verify repairs.
            </p>

            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <Link
                href="/register"
                className="btn btn-primary btn-lg"
                style={{
                  minWidth: '190px',
                  height: '52px',
                }}
              >
                Create an Account
              </Link>

              <Link
                href="/login"
                className="btn btn-outline btn-lg"
                style={{
                  minWidth: '170px',
                  height: '52px',
                }}
              >
                Sign In to Portal
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}