'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createReport, detectImage } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import DemoBanner from '@/components/DemoBanner';
import {
  EngineBadge,
  PriorityBadge,
  SeverityBadge,
} from '@/components/StatusBadge';
import DetectionOverlay from '@/components/DetectionOverlay';

import {
  IconCamera,
  IconUpload,
  IconCrosshair,
  IconMapPin,
  IconSparkles,
  IconCpu,
  IconAlertTriangle,
  IconCheckCircle2,
  IconTrash,
  IconArrowRight,
  IconLayers,
  IconRefresh,
} from '@/components/Icons';

export default function ReportPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [fileDetails, setFileDetails] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [address, setAddress] = useState('');
  const [locating, setLocating] = useState(false);

  // AI Pipeline State
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [detectionResult, setDetectionResult] = useState(null);
  const [hoveredDetIndex, setHoveredDetIndex] = useState(null);
  const [activeViewMode, setActiveViewMode] = useState('annotated');

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submittedReport, setSubmittedReport] = useState(null);
  const [error, setError] = useState('');

  // =========================================================
  // FILE HANDLING
  // =========================================================

  const handleFileSelect = (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file (JPG, PNG, WEBP).');
      return;
    }

    if (file.size > 16 * 1024 * 1024) {
      setError('Image is too large. Maximum allowed size is 16MB.');
      return;
    }

    setImageFile(file);

    setFileDetails({
      name: file.name,
      sizeKb: (file.size / 1024).toFixed(1),
      type: file.type,
    });

    setPreviewUrl(URL.createObjectURL(file));

    setDetectionResult(null);
    setSubmittedReport(null);
    setError('');
    setAnalysisStep(0);
    setActiveViewMode('annotated');
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);

    const file = e.dataTransfer.files?.[0];

    if (file) {
      handleFileSelect(file);
    }
  };

  const handleClearImage = () => {
    setImageFile(null);
    setPreviewUrl('');
    setFileDetails(null);
    setDetectionResult(null);
    setError('');
    setAnalysisStep(0);
    setActiveViewMode('annotated');
  };

  // =========================================================
  // GEOLOCATION
  // =========================================================

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setLocating(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));

        if (!address) {
          setAddress(
            `GPS (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`
          );
        }

        setLocating(false);
      },
      (err) => {
        setError(`Unable to retrieve GPS coordinates: ${err.message}`);
        setLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  };

  // =========================================================
  // AI DETECTION
  // =========================================================

  const handleRunAIDetection = async () => {
    if (!imageFile) {
      setError('Please select or upload a road damage image first.');
      return;
    }

    if (!user) {
      router.push('/login');
      return;
    }

    setError('');
    setAnalyzing(true);
    setAnalysisStep(1);

    try {
      const stepTimer1 = setTimeout(() => {
        setAnalysisStep(2);
      }, 500);

      const stepTimer2 = setTimeout(() => {
        setAnalysisStep(3);
      }, 1100);

      const formData = new FormData();
      formData.append('image', imageFile);

      const result = await detectImage(formData);

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      setAnalysisStep(4);
      setDetectionResult(result);
    } catch (err) {
      setError(
        err.message ||
          'AI detection failed. Please check your backend connection.'
      );
    } finally {
      setAnalyzing(false);
    }
  };

  // =========================================================
  // SUBMIT REPORT
  // =========================================================

  const handleSubmitReport = async (e) => {
    e.preventDefault();

    if (!imageFile) {
      setError('Please select or capture a road damage image.');
      return;
    }

    if (!user) {
      router.push('/login');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const formData = new FormData();

      formData.append('image', imageFile);

      if (latitude) {
        formData.append('latitude', latitude);
      }

      if (longitude) {
        formData.append('longitude', longitude);
      }

      if (address) {
        formData.append('address', address);
      }

      const report = await createReport(formData);

      setSubmittedReport(report);
    } catch (err) {
      setError(
        err.message || 'Failed to dispatch road complaint.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // =========================================================
  // AUTHENTICATION SCREEN
  // =========================================================

  if (!user) {
    return (
      <div
        className="container"
        style={{
          minHeight: 'calc(100vh - 100px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '50px 20px',
        }}
      >
        <div
          className="card-3d"
          style={{
            width: 'min(720px, 100%)',
            minHeight: '390px',
            margin: '0 auto',
            padding: '55px 40px',
            borderRadius: '26px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
            border: '1px solid rgba(255,107,0,0.22)',
            boxShadow:
              '0 30px 80px rgba(15,23,42,0.14), 0 10px 30px rgba(255,107,0,0.06)',
            background:
              'linear-gradient(145deg, rgba(255,255,255,0.98), rgba(248,250,252,0.98))',
          }}
        >
          {/* Top Accent */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: '8%',
              right: '8%',
              height: '4px',
              borderRadius: '0 0 10px 10px',
              background:
                'linear-gradient(90deg, #FF6B00, #FF9A3D, #06B6D4)',
            }}
          />

          {/* Shield */}
          <div
            style={{
              width: '82px',
              height: '82px',
              borderRadius: '24px',
              margin: '0 auto 22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background:
                'linear-gradient(145deg, rgba(255,107,0,0.12), rgba(0,210,255,0.10))',
              border: '1px solid rgba(255,107,0,0.25)',
              boxShadow:
                '0 15px 35px rgba(255,107,0,0.12)',
              fontSize: '2.6rem',
            }}
          >
            🛡️
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '6px 12px',
              borderRadius: '999px',
              marginBottom: '14px',
              background: 'rgba(255,107,0,0.08)',
              border: '1px solid rgba(255,107,0,0.18)',
              color: '#FF6B00',
              fontSize: '0.72rem',
              fontWeight: 800,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
            }}
          >
            🔐 Secure Citizen Portal
          </div>

          <h2
            style={{
              margin: '0 0 10px',
              fontSize: '1.8rem',
              color: 'var(--text-primary)',
            }}
          >
            Authentication Required
          </h2>

          <p
            style={{
              color: 'var(--text-secondary)',
              maxWidth: '520px',
              margin: '0 auto 30px',
              fontSize: '0.95rem',
              lineHeight: 1.65,
            }}
          >
            Please sign in to your RoadRakshak account to upload road hazard
            evidence, run AI diagnostics, and trigger municipal response teams.
          </p>

          <div
            style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <Link
              href="/login"
              className="btn btn-primary btn-lg"
              style={{
                minWidth: '145px',
                borderRadius: '11px',
                fontWeight: 800,
              }}
            >
              Sign In
              <IconArrowRight size={17} />
            </Link>

            <Link
              href="/register"
              className="btn btn-outline btn-lg"
              style={{
                minWidth: '160px',
                borderRadius: '11px',
                fontWeight: 800,
              }}
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // MAIN REPORT PAGE
  // =========================================================

  return (
    <div
      className="container"
      style={{
        paddingTop: '34px',
        paddingBottom: '70px',
      }}
    >
      {/* =====================================================
          TOP HEADER
      ===================================================== */}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: '18px',
          marginBottom: '30px',
          paddingBottom: '20px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '7px',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background:
                  'linear-gradient(145deg, rgba(255,107,0,0.16), rgba(255,107,0,0.05))',
                border: '1px solid rgba(255,107,0,0.25)',
                boxShadow:
                  '0 8px 20px rgba(255,107,0,0.10)',
                fontSize: '1.35rem',
              }}
            >
              📸
            </div>

            <div>
              <div
                style={{
                  fontSize: '0.68rem',
                  color: 'var(--text-muted)',
                  fontWeight: 800,
                  letterSpacing: '1.2px',
                  textTransform: 'uppercase',
                  marginBottom: '2px',
                }}
              >
                Citizen Incident System
              </div>

              <h1
                className="gradient-text-orange"
                style={{
                  margin: 0,
                  fontSize: 'clamp(1.65rem, 3vw, 2.25rem)',
                  lineHeight: 1.1,
                }}
              >
                Report Road Hazard
              </h1>
            </div>
          </div>

          <p
            style={{
              color: 'var(--text-secondary)',
              maxWidth: '760px',
              margin: 0,
              fontSize: '0.91rem',
              lineHeight: 1.6,
            }}
          >
            Upload road distress evidence. Our vision engine identifies defect
            classes, computes structural severity, and assigns priority for
            municipal dispatch.
          </p>
        </div>

        <Link
          href="/reports"
          className="btn btn-outline btn-sm"
          style={{
            minHeight: '40px',
            padding: '8px 15px',
            borderRadius: '10px',
            fontWeight: 750,
            whiteSpace: 'nowrap',
          }}
        >
          <IconLayers size={15} />
          <span>Network Incident Feed</span>
        </Link>
      </div>

      {/* =====================================================
          SUCCESS SCREEN
      ===================================================== */}

      {submittedReport ? (
        <div
          className="card-3d"
          style={{
            width: 'min(780px, 100%)',
            margin: '30px auto',
            textAlign: 'center',
            padding: '48px 34px',
            borderRadius: '24px',
            border: '1px solid rgba(16,185,129,0.35)',
            boxShadow:
              '0 25px 70px rgba(16,185,129,0.12), var(--shadow-3d)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Success Accent */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: '10%',
              right: '10%',
              height: '3px',
              borderRadius: '0 0 8px 8px',
              background:
                'linear-gradient(90deg, #10B981, #06B6D4, #10B981)',
            }}
          />

          <div
            style={{
              width: '76px',
              height: '76px',
              borderRadius: '50%',
              background: 'rgba(16,185,129,0.12)',
              border: '2px solid #10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow:
                '0 0 35px rgba(16,185,129,0.25)',
            }}
          >
            <IconCheckCircle2
              size={44}
              color="#10B981"
            />
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '6px 12px',
              borderRadius: '999px',
              marginBottom: '14px',
              background: 'rgba(16,185,129,0.09)',
              border: '1px solid rgba(16,185,129,0.2)',
              color: '#10B981',
              fontSize: '0.7rem',
              fontWeight: 800,
              letterSpacing: '0.5px',
            }}
          >
            ● MUNICIPAL QUEUE UPDATED
          </div>

          <h2
            style={{
              color: '#FFFFFF',
              fontSize: '1.8rem',
              marginBottom: '8px',
            }}
          >
            Incident Dispatched Successfully!
          </h2>

          <p
            style={{
              color: 'var(--text-secondary)',
              marginBottom: '28px',
              fontSize: '0.92rem',
              lineHeight: 1.6,
            }}
          >
            Your road damage report has been logged into the municipal triage
            queue with automated AI classification.
          </p>

          {/* Report Information */}
          <div
            style={{
              background: 'rgba(11,15,23,0.85)',
              border: '1px solid var(--border)',
              borderRadius: '15px',
              padding: '22px',
              marginBottom: '28px',
              textAlign: 'left',
            }}
          >
            <div className="flex-between mb-12">
              <span
                style={{
                  color: 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                }}
              >
                Official Report ID:
              </span>

              <span
                className="font-mono"
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  color: 'var(--primary)',
                }}
              >
                #{submittedReport.id}
              </span>
            </div>

            <div className="flex-between mb-12">
              <span
                style={{
                  color: 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                }}
              >
                Detected Defect:
              </span>

              <span
                style={{
                  fontWeight: 700,
                  color: '#FFFFFF',
                  fontSize: '0.95rem',
                }}
              >
                {submittedReport.damage_type ||
                  'Unspecified Defect'}
              </span>
            </div>

            <div className="flex-between mb-12">
              <span
                style={{
                  color: 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                }}
              >
                Severity Evaluation:
              </span>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span
                  style={{
                    fontWeight: 800,
                    color: 'var(--primary)',
                  }}
                >
                  {submittedReport.severity_score} / 10.0
                </span>

                <SeverityBadge
                  level={submittedReport.severity_level}
                />
              </div>
            </div>

            <div className="flex-between mb-12">
              <span
                style={{
                  color: 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                }}
              >
                Assigned Priority Tag:
              </span>

              <PriorityBadge
                priority={submittedReport.priority}
              />
            </div>

            {submittedReport.cluster && (
              <div className="flex-between mb-12">
                <span
                  style={{
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                  }}
                >
                  GPS Spatial Cluster:
                </span>

                <span
                  className="badge"
                  style={{
                    background: 'rgba(0,210,255,0.12)',
                    color: '#00E5FF',
                    border:
                      '1px solid rgba(0,210,255,0.3)',
                  }}
                >
                  Cluster #{submittedReport.cluster.id} (
                  {submittedReport.cluster.report_count} nearby
                  citizen reports)
                </span>
              </div>
            )}

            <div className="flex-between">
              <span
                style={{
                  color: 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                }}
              >
                AI Inference Engine:
              </span>

              <EngineBadge
                isDemo={submittedReport.is_demo}
                engine={submittedReport.engine}
              />
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '14px',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <Link
              href={`/reports/${submittedReport.id}`}
              className="btn btn-primary btn-lg"
              style={{
                borderRadius: '11px',
                fontWeight: 800,
              }}
            >
              🔍 Inspect Full Incident Dossier
            </Link>

            <button
              onClick={() => {
                setSubmittedReport(null);
                setImageFile(null);
                setPreviewUrl('');
                setFileDetails(null);
                setDetectionResult(null);
                setAnalysisStep(0);
              }}
              className="btn btn-outline btn-lg"
              style={{
                borderRadius: '11px',
                fontWeight: 800,
              }}
            >
              Submit Another Report
            </button>
          </div>
        </div>
      ) : (
        /* ===================================================
           MAIN 2-COLUMN ARCHITECTURE
        =================================================== */

        <div
          className="grid-2"
          style={{
            alignItems: 'start',
            gap: '22px',
          }}
        >
          {/* =================================================
              COLUMN 1 — UPLOAD
          ================================================= */}

          <div
            className="card-3d"
            style={{
              borderRadius: '20px',
              border:
                '1px solid rgba(255,107,0,0.16)',
              boxShadow:
                '0 20px 50px rgba(15,23,42,0.10), 0 4px 14px rgba(255,107,0,0.05)',
              overflow: 'hidden',
            }}
          >
            <div className="card-header">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '11px',
                }}
              >
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '10px',
                    background:
                      'linear-gradient(145deg, rgba(255,107,0,0.16), rgba(255,107,0,0.05))',
                    border:
                      '1px solid rgba(255,107,0,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary)',
                    fontWeight: 900,
                    fontSize: '0.9rem',
                  }}
                >
                  1
                </div>

                <div>
                  <h2
                    style={{
                      fontSize: '1.2rem',
                      marginBottom: '2px',
                    }}
                  >
                    Upload Evidence & Location
                  </h2>

                  <div
                    style={{
                      fontSize: '0.74rem',
                      color: 'var(--text-muted)',
                    }}
                  >
                    Capture road evidence and geocode GPS coordinates
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div
                className="alert alert-danger"
                style={{
                  marginBottom: '18px',
                  borderRadius: '10px',
                }}
              >
                <IconAlertTriangle size={18} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmitReport}>
              {/* =============================================
                  UPLOAD ZONE
              ============================================= */}

              <div className="form-group">
                <label
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    letterSpacing: '0.8px',
                  }}
                >
                  ROAD HAZARD PHOTOGRAPH *
                </label>

                {!imageFile ? (
                  <label
                    className={`upload-zone-3d ${
                      isDragOver ? 'drag-active' : ''
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    style={{
                      minHeight: '250px',
                      borderRadius: '18px',
                      border: isDragOver
                        ? '2px solid #FF6B00'
                        : '2px dashed rgba(255,107,0,0.35)',
                      background:
                        'linear-gradient(145deg, rgba(255,107,0,0.07), rgba(0,210,255,0.04))',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      padding: '28px 20px',
                      cursor: 'pointer',
                      transition: 'all 0.25s ease',
                      boxShadow: isDragOver
                        ? '0 0 30px rgba(255,107,0,0.18)'
                        : 'inset 0 1px 0 rgba(255,255,255,0.05)',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Hidden Native Input */}
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      onChange={(e) =>
                        handleFileSelect(
                          e.target.files?.[0]
                        )
                      }
                      style={{
                        display: 'none',
                      }}
                    />

                    {/* Decorative Glow */}
                    <div
                      style={{
                        position: 'absolute',
                        width: '180px',
                        height: '180px',
                        borderRadius: '50%',
                        background:
                          'rgba(255,107,0,0.07)',
                        filter: 'blur(30px)',
                        pointerEvents: 'none',
                      }}
                    />

                    {/* Upload Icon */}
                    <div
                      style={{
                        width: '78px',
                        height: '78px',
                        borderRadius: '22px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '18px',
                        background:
                          'linear-gradient(135deg, rgba(255,107,0,0.18), rgba(255,154,61,0.08))',
                        border:
                          '1px solid rgba(255,107,0,0.35)',
                        boxShadow:
                          '0 12px 30px rgba(255,107,0,0.12), inset 0 1px rgba(255,255,255,0.08)',
                        fontSize: '2rem',
                        position: 'relative',
                      }}
                    >
                      📸
                    </div>

                    <div
                      style={{
                        fontSize: '1.08rem',
                        fontWeight: 800,
                        color: 'var(--text-primary)',
                        marginBottom: '7px',
                        position: 'relative',
                      }}
                    >
                      Upload Road Damage Evidence
                    </div>

                    <div
                      style={{
                        fontSize: '0.84rem',
                        color: 'var(--text-secondary)',
                        marginBottom: '18px',
                        maxWidth: '320px',
                        lineHeight: 1.5,
                        position: 'relative',
                      }}
                    >
                      Drag & drop your road photograph here
                      <br />
                      or choose a file from your device
                    </div>

                    {/* Proper Upload Button */}
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '12px 23px',
                        borderRadius: '11px',
                        background:
                          'linear-gradient(135deg, #FF6B00, #FF8A2B)',
                        color: '#FFFFFF',
                        fontWeight: 800,
                        fontSize: '0.88rem',
                        boxShadow:
                          '0 8px 22px rgba(255,107,0,0.25)',
                        position: 'relative',
                      }}
                    >
                      <IconUpload size={17} />
                      Choose Road Image
                    </div>

                    <div
                      style={{
                        marginTop: '14px',
                        fontSize: '0.72rem',
                        color: 'var(--text-muted)',
                        position: 'relative',
                      }}
                    >
                      JPG • PNG • WEBP &nbsp; | &nbsp; Maximum 16 MB
                    </div>
                  </label>
                ) : (
                  /* =========================================
                     SELECTED IMAGE
                  ========================================= */

                  <div
                    style={{
                      background:
                        'linear-gradient(145deg, rgba(16,185,129,0.07), rgba(11,15,23,0.95))',
                      border:
                        '1px solid rgba(16,185,129,0.32)',
                      borderRadius: '18px',
                      padding: '16px',
                      boxShadow:
                        '0 0 25px rgba(16,185,129,0.07)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        marginBottom: '14px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          minWidth: 0,
                        }}
                      >
                        <div
                          style={{
                            width: '58px',
                            height: '58px',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            background: '#07090E',
                            border:
                              '1px solid var(--border)',
                            flexShrink: 0,
                          }}
                        >
                          <img
                            src={previewUrl}
                            alt="Selected road evidence"
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                          />
                        </div>

                        <div
                          style={{
                            minWidth: 0,
                          }}
                        >
                          <div
                            style={{
                              fontSize: '0.7rem',
                              color: '#10B981',
                              fontWeight: 800,
                              letterSpacing: '0.7px',
                              marginBottom: '3px',
                            }}
                          >
                            ✓ EVIDENCE LOADED
                          </div>

                          <div
                            style={{
                              fontWeight: 750,
                              color: '#FFFFFF',
                              fontSize: '0.9rem',
                              maxWidth: '230px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {fileDetails?.name}
                          </div>

                          <div
                            style={{
                              fontSize: '0.72rem',
                              color: 'var(--text-secondary)',
                              marginTop: '2px',
                            }}
                          >
                            {fileDetails?.sizeKb} KB •{' '}
                            {fileDetails?.type}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleClearImage}
                        className="btn btn-outline btn-sm"
                        style={{
                          color: '#FF6680',
                          borderColor:
                            'rgba(255,46,77,0.3)',
                          padding: '7px 10px',
                          borderRadius: '9px',
                          flexShrink: 0,
                        }}
                        title="Remove selected image"
                      >
                        <IconTrash size={14} />
                        <span>Remove</span>
                      </button>
                    </div>

                    <div
                      style={{
                        height: '5px',
                        borderRadius: '999px',
                        background:
                          'linear-gradient(90deg, #10B981, #06B6D4)',
                        boxShadow:
                          '0 0 12px rgba(16,185,129,0.25)',
                      }}
                    />
                  </div>
                )}
              </div>

              {/* =============================================
                  GPS SECTION
              ============================================= */}

              <div
                className="form-group"
                style={{
                  marginTop: '22px',
                }}
              >
                <div className="flex-between mb-8">
                  <label
                    style={{
                      margin: 0,
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      letterSpacing: '0.8px',
                    }}
                  >
                    GPS SPATIAL COORDINATES (OPTIONAL)
                  </label>

                  <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={locating}
                    className="btn btn-outline btn-sm"
                    style={{
                      background:
                        'rgba(0,210,255,0.08)',
                      borderColor:
                        'rgba(0,210,255,0.3)',
                      color: '#00D2FF',
                      fontSize: '0.74rem',
                      padding: '6px 11px',
                      borderRadius: '9px',
                      fontWeight: 750,
                    }}
                  >
                    <IconCrosshair size={13} />
                    <span>
                      {locating
                        ? 'Acquiring GPS...'
                        : '📍 Fetch Live GPS'}
                    </span>
                  </button>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      '1fr 1fr',
                    gap: '10px',
                  }}
                >
                  <div
                    style={{
                      position: 'relative',
                    }}
                  >
                    <input
                      type="number"
                      step="any"
                      placeholder="Latitude (e.g. 12.9716)"
                      value={latitude}
                      onChange={(e) =>
                        setLatitude(e.target.value)
                      }
                      style={{
                        width: '100%',
                      }}
                    />
                  </div>

                  <input
                    type="number"
                    step="any"
                    placeholder="Longitude (e.g. 77.5946)"
                    value={longitude}
                    onChange={(e) =>
                      setLongitude(e.target.value)
                    }
                    style={{
                      width: '100%',
                    }}
                  />
                </div>
              </div>

              {/* =============================================
                  ADDRESS
              ============================================= */}

              <div className="form-group">
                <label
                  htmlFor="address"
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    letterSpacing: '0.8px',
                  }}
                >
                  LANDMARK / CORRIDOR ADDRESS
                </label>

                <input
                  id="address"
                  type="text"
                  placeholder="e.g. Outer Ring Road, 200m North of Silk Board Junction"
                  value={address}
                  onChange={(e) =>
                    setAddress(e.target.value)
                  }
                />
              </div>

              {/* =============================================
                  ACTION BUTTONS
              ============================================= */}

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    '1fr 1fr',
                  gap: '12px',
                  marginTop: '26px',
                }}
              >
                <button
                  type="button"
                  onClick={handleRunAIDetection}
                  disabled={!imageFile || analyzing}
                  className="btn btn-accent"
                  style={{
                    padding: '13px 16px',
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    borderRadius: '11px',
                    boxShadow:
                      '0 8px 20px rgba(0,210,255,0.18)',
                  }}
                >
                  {analyzing ? (
                    <>
                      <div
                        className="spinner"
                        style={{
                          width: '16px',
                          height: '16px',
                          borderTopColor: '#07090E',
                        }}
                      />
                      <span>Scanning...</span>
                    </>
                  ) : (
                    <>
                      <IconSparkles size={17} />
                      <span>Pre-Check with AI</span>
                    </>
                  )}
                </button>

                <button
                  type="submit"
                  disabled={!imageFile || submitting}
                  className="btn btn-primary"
                  style={{
                    padding: '13px 16px',
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    borderRadius: '11px',
                    boxShadow:
                      '0 8px 20px rgba(255,107,0,0.22)',
                  }}
                >
                  {submitting ? (
                    <>
                      <div
                        className="spinner"
                        style={{
                          width: '16px',
                          height: '16px',
                        }}
                      />
                      <span>Dispatching...</span>
                    </>
                  ) : (
                    <>
                      <IconUpload size={17} />
                      <span>Submit Complaint</span>
                    </>
                  )}
                </button>
              </div>

              {/* Trust indicator */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '7px',
                  marginTop: '17px',
                  color: 'var(--text-muted)',
                  fontSize: '0.7rem',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#10B981',
                    boxShadow:
                      '0 0 8px rgba(16,185,129,0.6)',
                  }}
                />
                Evidence encrypted and processed securely
              </div>
            </form>
          </div>

          {/* =================================================
              COLUMN 2 — AI VISION
          ================================================= */}

          <div
            className="card-3d ai-hud-container"
            style={{
              minHeight: '570px',
              borderRadius: '20px',
              border:
                '1px solid rgba(0,210,255,0.16)',
              boxShadow:
                '0 20px 50px rgba(15,23,42,0.10), 0 4px 14px rgba(0,210,255,0.04)',
              overflow: 'hidden',
            }}
          >
            {/* HUD Corners */}
            <div className="corner-bracket-tl" />
            <div className="corner-bracket-tr" />
            <div className="corner-bracket-bl" />
            <div className="corner-bracket-br" />

            <div className="card-header">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '11px',
                }}
              >
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '10px',
                    background:
                      'linear-gradient(145deg, rgba(0,210,255,0.16), rgba(0,210,255,0.05))',
                    border:
                      '1px solid rgba(0,210,255,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#00D2FF',
                    fontWeight: 900,
                    fontSize: '0.9rem',
                  }}
                >
                  2
                </div>

                <div>
                  <h2
                    style={{
                      fontSize: '1.2rem',
                      marginBottom: '4px',
                    }}
                  >
                    AI Vision & Severity Breakdown
                  </h2>

                  <div
                    className="telemetry-pill"
                    style={{
                      marginTop: '2px',
                    }}
                  >
                    <span className="pulse-dot pulse-dot-green" />
                    <span>
                      YOLO11s-CUSTOM • INFERENCE HUD
                    </span>
                  </div>
                </div>
              </div>

              {detectionResult && (
                <EngineBadge
                  isDemo={detectionResult.is_demo}
                  engine={detectionResult.engine}
                />
              )}
            </div>

            {detectionResult?.is_demo && (
              <DemoBanner
                isDemo={true}
                engine="demo"
              />
            )}

            {/* ===============================================
                AI PIPELINE STEPPER
            =============================================== */}

            {analyzing && (
              <div
                className="ai-stepper"
                style={{
                  marginBottom: '18px',
                }}
              >
                <div
                  className={`ai-step-item ${
                    analysisStep >= 1
                      ? analysisStep === 1
                        ? 'active'
                        : 'completed'
                      : ''
                  }`}
                >
                  <div className="ai-step-dot">
                    1
                  </div>
                  <span>Image Feed</span>
                </div>

                <div
                  className={`ai-step-item ${
                    analysisStep >= 2
                      ? analysisStep === 2
                        ? 'active'
                        : 'completed'
                      : ''
                  }`}
                >
                  <div className="ai-step-dot">
                    2
                  </div>
                  <span>YOLO Vision</span>
                </div>

                <div
                  className={`ai-step-item ${
                    analysisStep >= 3
                      ? analysisStep === 3
                        ? 'active'
                        : 'completed'
                      : ''
                  }`}
                >
                  <div className="ai-step-dot">
                    3
                  </div>
                  <span>Severity Calc</span>
                </div>

                <div
                  className={`ai-step-item ${
                    analysisStep >= 4
                      ? 'active'
                      : ''
                  }`}
                >
                  <div className="ai-step-dot">
                    4
                  </div>
                  <span>Target Ready</span>
                </div>
              </div>
            )}

            {/* ===============================================
                IMAGE / EMPTY STATE
            =============================================== */}

            {previewUrl ? (
              <div>
                {/* Main Visual */}
                <div
                  style={{
                    position: 'relative',
                    marginBottom: '18px',
                  }}
                >
                  {analyzing && (
                    <div className="scanner-overlay" />
                  )}

                  {detectionResult?.annotated_image_path &&
                  activeViewMode === 'annotated' ? (
                    <DetectionOverlay
                      imageSrc={getImageUrl(detectionResult.annotated_image_path)}
                      detections={
                        detectionResult.detections
                      }
                      imageWidth={
                        detectionResult.image_width
                      }
                      imageHeight={
                        detectionResult.image_height
                      }
                      hoveredIndex={hoveredDetIndex}
                      onHoverDetection={
                        setHoveredDetIndex
                      }
                    />
                  ) : (
                    <div
                      style={{
                        position: 'relative',
                        borderRadius: '15px',
                        overflow: 'hidden',
                        background: '#07090E',
                        border:
                          '1px solid var(--border-cyan)',
                        boxShadow:
                          '0 12px 30px rgba(0,0,0,0.18)',
                      }}
                    >
                      <img
                        src={previewUrl}
                        alt="Road hazard input preview"
                        style={{
                          width: '100%',
                          maxHeight: '380px',
                          objectFit: 'contain',
                          display: 'block',
                          margin: '0 auto',
                        }}
                      />
                    </div>
                  )}

                  {/* Image Toggle */}
                  {detectionResult && (
                    <div
                      style={{
                        display: 'flex',
                        gap: '7px',
                        marginTop: '10px',
                        justifyContent:
                          'flex-end',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setActiveViewMode(
                            'annotated'
                          )
                        }
                        className={`btn btn-sm ${
                          activeViewMode ===
                          'annotated'
                            ? 'btn-primary'
                            : 'btn-outline'
                        }`}
                        style={{
                          fontSize: '0.74rem',
                          padding: '5px 11px',
                          borderRadius: '8px',
                        }}
                      >
                        AI Bounding Boxes
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setActiveViewMode(
                            'original'
                          )
                        }
                        className={`btn btn-sm ${
                          activeViewMode ===
                          'original'
                            ? 'btn-primary'
                            : 'btn-outline'
                        }`}
                        style={{
                          fontSize: '0.74rem',
                          padding: '5px 11px',
                          borderRadius: '8px',
                        }}
                      >
                        Raw Photo
                      </button>
                    </div>
                  )}
                </div>

                {/* =========================================
                    DETECTION RESULTS
                ========================================= */}

                {detectionResult ? (
                  <div>
                    {/* Severity Panel */}
                    <div
                      style={{
                        background:
                          'linear-gradient(145deg, rgba(11,15,23,0.95), rgba(15,23,42,0.9))',
                        border:
                          '1px solid var(--border)',
                        borderRadius: '15px',
                        padding: '18px',
                        marginBottom: '18px',
                      }}
                    >
                      <div className="flex-between mb-12">
                        <div>
                          <div
                            style={{
                              fontSize: '0.7rem',
                              color:
                                'var(--text-muted)',
                              textTransform:
                                'uppercase',
                              letterSpacing:
                                '0.8px',
                              fontWeight: 800,
                            }}
                          >
                            COMPUTED SEVERITY
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              alignItems:
                                'baseline',
                              gap: '8px',
                              marginTop: '5px',
                            }}
                          >
                            <span
                              style={{
                                fontSize:
                                  '2rem',
                                fontWeight: 900,
                                color:
                                  'var(--primary)',
                                lineHeight: 1,
                              }}
                            >
                              {
                                detectionResult.severity_score
                              }
                            </span>

                            <span
                              style={{
                                color:
                                  'var(--text-muted)',
                                fontSize:
                                  '0.85rem',
                              }}
                            >
                              / 10.0
                            </span>

                            <SeverityBadge
                              level={
                                detectionResult.severity_level
                              }
                            />
                          </div>
                        </div>

                        <div
                          style={{
                            textAlign: 'right',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '0.7rem',
                              color:
                                'var(--text-muted)',
                              textTransform:
                                'uppercase',
                              letterSpacing:
                                '0.8px',
                              fontWeight: 800,
                            }}
                          >
                            ASSIGNED PRIORITY
                          </div>

                          <div
                            style={{
                              marginTop: '6px',
                            }}
                          >
                            <PriorityBadge
                              priority={
                                detectionResult.priority
                              }
                            />
                          </div>
                        </div>
                      </div>

                      {/* Severity Meter */}
                      <div
                        className="progress-bar mb-12"
                        style={{
                          height: '9px',
                          borderRadius: '999px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          className="progress-fill"
                          style={{
                            width: `${Math.max(
                              0,
                              Math.min(
                                100,
                                (detectionResult.severity_score /
                                  10) *
                                  100
                              )
                            )}%`,
                            background:
                              detectionResult.severity_score >=
                              8
                                ? 'linear-gradient(90deg, #FF6B00, #FF2E4D)'
                                : detectionResult.severity_score >=
                                  6
                                ? 'linear-gradient(90deg, #FFB800, #FF7A00)'
                                : detectionResult.severity_score >=
                                  4
                                ? 'linear-gradient(90deg, #00E676, #FFB800)'
                                : '#00E676',
                            boxShadow:
                              '0 0 14px var(--primary-glow)',
                          }}
                        />
                      </div>

                      {/* Mathematical Breakdown */}
                      <div
                        style={{
                          background:
                            'rgba(7,9,14,0.7)',
                          borderRadius: '10px',
                          padding: '13px',
                          fontSize: '0.77rem',
                          border:
                            '1px solid var(--border-light)',
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 800,
                            color: '#FFFFFF',
                            marginBottom: '8px',
                          }}
                        >
                          📐 Transparent Severity Formulation
                        </div>

                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns:
                              '1fr 1fr',
                            gap: '9px',
                            color:
                              'var(--text-secondary)',
                          }}
                        >
                          <div>
                            • Damage Class (30%):{' '}
                            <strong
                              style={{
                                color: '#FFFFFF',
                              }}
                            >
                              {(
                                (detectionResult
                                  .scoring_factors
                                  ?.damage_type_score ||
                                  0) * 100
                              ).toFixed(0)}
                              %
                            </strong>
                          </div>

                          <div>
                            • BBox Surface Area (30%):{' '}
                            <strong
                              style={{
                                color: '#FFFFFF',
                              }}
                            >
                              {(
                                (detectionResult
                                  .scoring_factors
                                  ?.bbox_area_score ||
                                  0) * 100
                              ).toFixed(0)}
                              %
                            </strong>
                          </div>

                          <div>
                            • Model Confidence (20%):{' '}
                            <strong
                              style={{
                                color: '#FFFFFF',
                              }}
                            >
                              {(
                                (detectionResult
                                  .scoring_factors
                                  ?.confidence_score ||
                                  0) * 100
                              ).toFixed(0)}
                              %
                            </strong>
                          </div>

                          <div>
                            • Defect Density (20%):{' '}
                            <strong
                              style={{
                                color: '#FFFFFF',
                              }}
                            >
                              {(
                                (detectionResult
                                  .scoring_factors
                                  ?.count_score ||
                                  0) * 100
                              ).toFixed(0)}
                              %
                            </strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* =====================================
                        DETECTED OBJECTS
                    ===================================== */}

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent:
                          'space-between',
                        marginBottom: '10px',
                      }}
                    >
                      <h4
                        style={{
                          margin: 0,
                          fontSize: '0.92rem',
                        }}
                      >
                        Detected Defect Objects (
                        {
                          detectionResult
                            .detections?.length || 0
                        }
                        )
                      </h4>

                      <span
                        style={{
                          fontSize: '0.72rem',
                          color:
                            'var(--text-muted)',
                        }}
                      >
                        Hover card to highlight target
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      {(
                        detectionResult.detections ||
                        []
                      ).map((det, idx) => {
                        const isHovered =
                          hoveredDetIndex === idx;

                        const label =
                          det.label ||
                          det.class ||
                          'Unknown Defect';

                        return (
                          <div
                            key={idx}
                            onMouseEnter={() =>
                              setHoveredDetIndex(
                                idx
                              )
                            }
                            onMouseLeave={() =>
                              setHoveredDetIndex(
                                null
                              )
                            }
                            style={{
                              display: 'flex',
                              justifyContent:
                                'space-between',
                              alignItems:
                                'center',
                              padding:
                                '11px 14px',
                              background: isHovered
                                ? 'rgba(255,107,0,0.12)'
                                : 'rgba(11,15,23,0.8)',
                              border: isHovered
                                ? '1px solid rgba(255,107,0,0.45)'
                                : '1px solid var(--border-light)',
                              borderRadius:
                                '10px',
                              transition:
                                'all 0.18s cubic-bezier(0.16,1,0.3,1)',
                              transform: isHovered
                                ? 'translateX(4px)'
                                : 'none',
                              cursor: 'pointer',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems:
                                  'center',
                                gap: '10px',
                                minWidth: 0,
                              }}
                            >
                              <div
                                style={{
                                  width: '9px',
                                  height: '9px',
                                  borderRadius:
                                    '50%',
                                  background:
                                    label.includes(
                                      'Pothole'
                                    ) ||
                                    label.includes(
                                      'D40'
                                    )
                                      ? '#FF2E4D'
                                      : '#FF7A00',
                                  boxShadow:
                                    isHovered
                                      ? '0 0 10px #FF7A00'
                                      : 'none',
                                  flexShrink: 0,
                                }}
                              />

                              <div
                                style={{
                                  minWidth: 0,
                                }}
                              >
                                <strong
                                  style={{
                                    color:
                                      '#FFFFFF',
                                    fontSize:
                                      '0.88rem',
                                  }}
                                >
                                  {label}
                                </strong>

                                <div
                                  className="font-mono"
                                  style={{
                                    fontSize:
                                      '0.68rem',
                                    color:
                                      'var(--text-muted)',
                                    marginTop:
                                      '2px',
                                  }}
                                >
                                  BBox: [
                                  {det.bbox?.x1?.toFixed(
                                    0
                                  )}
                                  ,{' '}
                                  {det.bbox?.y1?.toFixed(
                                    0
                                  )}
                                  ] - [
                                  {det.bbox?.x2?.toFixed(
                                    0
                                  )}
                                  ,{' '}
                                  {det.bbox?.y2?.toFixed(
                                    0
                                  )}
                                  ]
                                </div>
                              </div>
                            </div>

                            <span
                              className="badge"
                              style={{
                                background:
                                  'rgba(0,210,255,0.12)',
                                color: '#00D2FF',
                                border:
                                  '1px solid rgba(0,210,255,0.3)',
                                flexShrink: 0,
                              }}
                            >
                              {(
                                (det.confidence ||
                                  0) * 100
                              ).toFixed(1)}
                              % Conf
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* =========================================
                     ANALYZING / READY STATE
                  ========================================= */

                  <div
                    style={{
                      textAlign: 'center',
                      padding: '38px 18px',
                      background:
                        'rgba(11,15,23,0.6)',
                      borderRadius: '15px',
                      border:
                        '1px dashed var(--border)',
                    }}
                  >
                    {analyzing ? (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection:
                            'column',
                          alignItems:
                            'center',
                          gap: '11px',
                        }}
                      >
                        <div
                          className="spinner"
                          style={{
                            width: '32px',
                            height: '32px',
                          }}
                        />

                        <div
                          style={{
                            fontWeight: 800,
                            color: '#FFFFFF',
                            fontSize:
                              '0.95rem',
                          }}
                        >
                          Executing YOLO11s Inference...
                        </div>

                        <div
                          style={{
                            fontSize:
                              '0.79rem',
                            color:
                              'var(--text-muted)',
                            maxWidth:
                              '390px',
                            lineHeight: 1.5,
                          }}
                        >
                          Detecting potholes,
                          alligator cracks,
                          longitudinal and
                          transverse distress
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div
                          style={{
                            width: '58px',
                            height: '58px',
                            borderRadius:
                              '17px',
                            margin:
                              '0 auto 12px',
                            display: 'flex',
                            alignItems:
                              'center',
                            justifyContent:
                              'center',
                            background:
                              'rgba(0,210,255,0.08)',
                            border:
                              '1px solid rgba(0,210,255,0.18)',
                            fontSize:
                              '1.6rem',
                          }}
                        >
                          ⚡
                        </div>

                        <div
                          style={{
                            fontWeight: 800,
                            color: '#FFFFFF',
                            marginBottom:
                              '5px',
                            fontSize:
                              '0.95rem',
                          }}
                        >
                          Evidence Loaded
                        </div>

                        <div
                          style={{
                            display:
                              'inline-flex',
                            alignItems:
                              'center',
                            gap: '6px',
                            padding:
                              '5px 10px',
                            borderRadius:
                              '999px',
                            background:
                              'rgba(0,230,118,0.08)',
                            border:
                              '1px solid rgba(0,230,118,0.16)',
                            color:
                              '#10B981',
                            fontSize:
                              '0.68rem',
                            fontWeight:
                              800,
                            marginBottom:
                              '10px',
                          }}
                        >
                          ● READY FOR AI PRE-CHECK
                        </div>

                        <p
                          style={{
                            fontSize:
                              '0.8rem',
                            color:
                              'var(--text-secondary)',
                            maxWidth:
                              '380px',
                            margin:
                              '0 auto',
                            lineHeight:
                              1.55,
                          }}
                        >
                          Click{' '}
                          <strong>
                            Pre-Check with AI
                          </strong>{' '}
                          to inspect bounding
                          boxes and severity
                          metrics before
                          submitting.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* =============================================
                 NO IMAGE STATE
              ============================================= */

              <div
                style={{
                  minHeight: '430px',
                  display: 'flex',
                  flexDirection:
                    'column',
                  alignItems: 'center',
                  justifyContent:
                    'center',
                  textAlign: 'center',
                  padding: '35px 20px',
                  position: 'relative',
                }}
              >
                {/* Radar-like decorative circles */}
                <div
                  style={{
                    position: 'relative',
                    width: '130px',
                    height: '130px',
                    marginBottom: '22px',
                    display: 'flex',
                    alignItems:
                      'center',
                    justifyContent:
                      'center',
                  }}
                >
                  <div
                    style={{
                      position:
                        'absolute',
                      inset: 0,
                      border:
                        '1px solid rgba(0,210,255,0.13)',
                      borderRadius: '50%',
                    }}
                  />

                  <div
                    style={{
                      position:
                        'absolute',
                      inset: '15px',
                      border:
                        '1px solid rgba(0,210,255,0.18)',
                      borderRadius: '50%',
                    }}
                  />

                  <div
                    style={{
                      position:
                        'absolute',
                      inset: '30px',
                      border:
                        '1px solid rgba(0,210,255,0.22)',
                      borderRadius: '50%',
                    }}
                  />

                  <div
                    style={{
                      width: '55px',
                      height: '55px',
                      borderRadius:
                        '17px',
                      display: 'flex',
                      alignItems:
                        'center',
                      justifyContent:
                        'center',
                      background:
                        'linear-gradient(145deg, rgba(0,210,255,0.12), rgba(0,210,255,0.04))',
                      border:
                        '1px solid rgba(0,210,255,0.25)',
                      fontSize:
                        '1.55rem',
                      boxShadow:
                        '0 0 25px rgba(0,210,255,0.08)',
                    }}
                  >
                    🛰️
                  </div>
                </div>

                <div
                  style={{
                    display:
                      'inline-flex',
                    alignItems:
                      'center',
                    gap: '7px',
                    padding:
                      '6px 11px',
                    borderRadius:
                      '999px',
                    background:
                      'rgba(0,210,255,0.07)',
                    border:
                      '1px solid rgba(0,210,255,0.16)',
                    color: '#00D2FF',
                    fontSize:
                      '0.68rem',
                    fontWeight: 800,
                    letterSpacing:
                      '0.5px',
                    marginBottom:
                      '12px',
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius:
                        '50%',
                      background:
                        '#00D2FF',
                      boxShadow:
                        '0 0 8px rgba(0,210,255,0.7)',
                    }}
                  />
                  VISION ENGINE STANDBY
                </div>

                <h3
                  style={{
                    color: '#FFFFFF',
                    marginBottom:
                      '7px',
                    fontSize:
                      '1.15rem',
                  }}
                >
                  No Evidence Loaded
                </h3>

                <p
                  style={{
                    fontSize:
                      '0.84rem',
                    color:
                      'var(--text-muted)',
                    maxWidth:
                      '390px',
                    margin:
                      '0 auto',
                    lineHeight:
                      1.6,
                  }}
                >
                  Upload a road damage
                  photograph on the left to
                  activate the YOLO detection
                  engine and severity matrix.
                </p>

                <div
                  style={{
                    display:
                      'flex',
                    alignItems:
                      'center',
                    gap: '8px',
                    marginTop:
                      '20px',
                    fontSize:
                      '0.7rem',
                    color:
                      'var(--text-muted)',
                  }}
                >
                  <IconCpu size={14} />
                  AI diagnostic systems online
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================
          MOBILE RESPONSIVE OVERRIDE
      ===================================================== */}

      <style jsx>{`
        @media (max-width: 768px) {
          .grid-2 {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 640px) {
          .grid-2 {
            gap: 16px !important;
          }
        }
      `}</style>
    </div>
  );
}