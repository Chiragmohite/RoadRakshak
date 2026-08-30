'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  createAssignment,
  getReport,
  updateReport,
  getUsers,
} from '@/lib/api';

import { useAuth } from '@/lib/auth-context';
import DemoBanner from '@/components/DemoBanner';

import {
  EngineBadge,
  PriorityBadge,
  SeverityBadge,
  StatusBadge,
} from '@/components/StatusBadge';

import DetectionOverlay from '@/components/DetectionOverlay';

import {
  IconCheckCircle2,
  IconAlertTriangle,
} from '@/components/Icons';

/*
 * IMPORTANT:
 * Images are stored/served by the Flask backend.
 * They are NOT served by the Next.js/Vercel frontend.
 *
 * In Vercel Environment Variables set:
 *
 * NEXT_PUBLIC_API_URL=https://YOUR-BACKEND-URL.onrender.com
 *
 * Then redeploy the frontend.
 */

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  ''
).replace(/\/$/, '');

/*
 * Convert a backend image path into a complete URL.
 *
 * Examples:
 *
 * imagePath = "abc.jpg"
 * -> https://backend.com/uploads/abc.jpg
 *
 * imagePath = "uploads/abc.jpg"
 * -> https://backend.com/uploads/abc.jpg
 *
 * imagePath = "https://backend.com/uploads/abc.jpg"
 * -> unchanged
 */
const getImageUrl = (imagePath) => {
  if (!imagePath) return '';

  // Already an absolute URL
  if (
    imagePath.startsWith('http://') ||
    imagePath.startsWith('https://')
  ) {
    return imagePath;
  }

  // Remove leading slash
  const cleanPath = imagePath.replace(/^\/+/, '');

  // Already contains uploads/
  if (cleanPath.startsWith('uploads/')) {
    return `${API_URL}/${cleanPath}`;
  }

  // Normal backend upload filename
  return `${API_URL}/uploads/${cleanPath}`;
};

export default function ReportDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState('annotated');
  const [hoveredDetIndex, setHoveredDetIndex] = useState(null);

  const [assigneeId, setAssigneeId] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState('');

  const [municipalUsers, setMunicipalUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    fetchReport();

    if (user.role === 'municipal' || user.role === 'admin') {
      fetchMunicipalUsers();
    }
  }, [id, user]);

  const fetchReport = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await getReport(id);

      setReport(data);

      if (data.assignment) {
        setAssigneeId(String(data.assignment.assigned_to));
      }
    } catch (err) {
      setError(err.message || 'Failed to load report dossier');
    } finally {
      setLoading(false);
    }
  };

  const fetchMunicipalUsers = async () => {
    setLoadingUsers(true);

    try {
      const data = await getUsers();
      const users = data.users || [];

      setMunicipalUsers(
        users.filter(
          (u) => u.role === 'municipal' || u.role === 'admin'
        )
      );
    } catch (err) {
      setError(
        err.message || 'Failed to load municipal personnel'
      );
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();

    if (!assigneeId) {
      setError('Please select a municipal field worker.');
      return;
    }

    setAssigning(true);
    setError('');
    setAssignSuccess('');

    try {
      await createAssignment({
        report_id: parseInt(id, 10),
        assigned_to: parseInt(assigneeId, 10),
        notes: assignNotes,
      });

      setAssignSuccess(
        'Successfully assigned incident to municipal field technician!'
      );

      await fetchReport();
    } catch (err) {
      setError(err.message || 'Failed to create assignment');
    } finally {
      setAssigning(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    setStatusUpdating(true);
    setError('');

    try {
      await updateReport(id, { status: newStatus });
      await fetchReport();
    } catch (err) {
      setError(err.message || 'Failed to update status');
    } finally {
      setStatusUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">
          <div className="spinner" />
          Loading incident dossier #{id}...
        </div>
      </div>
    );
  }

  if (error && !report) {
    return (
      <div className="container">
        <div className="alert alert-danger">
          <IconAlertTriangle size={18} />
          <span>{error}</span>
        </div>

        <Link href="/reports" className="btn btn-outline">
          ← Back to Reports
        </Link>
      </div>
    );
  }

  if (!report) return null;

  // Parse bounding boxes safely
  let boundingBoxes = [];

  try {
    if (report.bounding_boxes) {
      boundingBoxes =
        typeof report.bounding_boxes === 'string'
          ? JSON.parse(report.bounding_boxes)
          : report.bounding_boxes;
    }
  } catch {
    boundingBoxes = [];
  }

  const isMunicipalOrAdmin =
    user?.role === 'municipal' || user?.role === 'admin';

  // Build backend image URLs
  const originalImageUrl = getImageUrl(report.image_path);

  const annotatedImageUrl = getImageUrl(
    report.annotated_image_path
  );

  return (
    <div className="container">

      {/* Back */}
      <div style={{ marginBottom: '16px' }}>
        <Link
          href="/reports"
          style={{
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span>← Back to Network Reports</span>
        </Link>
      </div>

      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '28px',
          paddingBottom: '16px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <h1 style={{ margin: 0 }}>
              Incident #{report.id}
            </h1>

            <PriorityBadge priority={report.priority} />
            <StatusBadge status={report.status} />
          </div>

          <p
            style={{
              color: 'var(--text-secondary)',
              marginTop: '4px',
              margin: 0,
              fontSize: '0.9rem',
            }}
          >
            Reported on{' '}
            {new Date(report.created_at).toLocaleString()}
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
          }}
        >
          <EngineBadge isDemo={report.is_demo} />

          {report.repair && (
            <Link
              href={`/repairs/${report.id}`}
              className="btn btn-success btn-sm"
            >
              <IconCheckCircle2 size={15} />
              <span>View Repair Verification</span>
            </Link>
          )}
        </div>
      </div>

      {report.is_demo && (
        <DemoBanner isDemo={true} engine="demo" />
      )}

      {error && (
        <div className="alert alert-danger">
          <IconAlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {assignSuccess && (
        <div className="alert alert-success">
          <IconCheckCircle2 size={18} />
          <span>{assignSuccess}</span>
        </div>
      )}

      <div className="grid-2">

        {/* LEFT COLUMN */}
        <div className="card-3d">

          <div className="card-header">
            <div>
              <h3 style={{ fontSize: '1.15rem' }}>
                Visual Evidence & Neural Annotation
              </h3>

              <div
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)',
                }}
              >
                Annotated bounding boxes from YOLO detector
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '6px',
              }}
            >
              {report.annotated_image_path && (
                <button
                  type="button"
                  onClick={() => setActiveTab('annotated')}
                  className={`btn btn-sm ${
                    activeTab === 'annotated'
                      ? 'btn-primary'
                      : 'btn-outline'
                  }`}
                  style={{
                    fontSize: '0.78rem',
                    padding: '4px 10px',
                  }}
                >
                  AI Annotated
                </button>
              )}

              <button
                type="button"
                onClick={() => setActiveTab('original')}
                className={`btn btn-sm ${
                  activeTab === 'original'
                    ? 'btn-primary'
                    : 'btn-outline'
                }`}
                style={{
                  fontSize: '0.78rem',
                  padding: '4px 10px',
                }}
              >
                Original
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>

            {/* AI ANNOTATED IMAGE */}
            {activeTab === 'annotated' &&
            report.annotated_image_path ? (

              <DetectionOverlay
                imageSrc={annotatedImageUrl}
                detections={boundingBoxes}
                hoveredIndex={hoveredDetIndex}
                onHoverDetection={setHoveredDetIndex}
              />

            ) : (

              /* ORIGINAL IMAGE */
              <div
                style={{
                  position: 'relative',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                  background: '#0B0F19',
                  border: '1px solid var(--border)',
                }}
              >
                {originalImageUrl ? (
                  <img
                    src={originalImageUrl}
                    alt="Road defect raw"
                    onError={(e) => {
                      console.error(
                        'Failed to load original image:',
                        originalImageUrl
                      );
                    }}
                    style={{
                      width: '100%',
                      maxHeight: '420px',
                      objectFit: 'contain',
                      display: 'block',
                      margin: '0 auto',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      minHeight: '320px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-muted)',
                    }}
                  >
                    No original image available
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Detections */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
            }}
          >
            <h4
              style={{
                fontSize: '0.92rem',
                margin: 0,
              }}
            >
              Detected Defect Classes ({boundingBoxes.length})
            </h4>

            <span
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
              }}
            >
              Hover to locate box
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {boundingBoxes.length === 0 ? (
              <p
                style={{
                  color: 'var(--text-muted)',
                  fontSize: '0.85rem',
                }}
              >
                No individual bounding box coordinates recorded
                for this scan.
              </p>
            ) : (
              boundingBoxes.map((det, idx) => {
                const isHovered =
                  hoveredDetIndex === idx;

                return (
                  <div
                    key={idx}
                    onMouseEnter={() =>
                      setHoveredDetIndex(idx)
                    }
                    onMouseLeave={() =>
                      setHoveredDetIndex(null)
                    }
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 14px',
                      background: isHovered
                        ? 'rgba(255, 107, 0, 0.12)'
                        : 'rgba(11, 17, 32, 0.8)',
                      border: isHovered
                        ? '1px solid rgba(255, 107, 0, 0.45)'
                        : '1px solid var(--border-light)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.88rem',
                      transition: 'all 0.2s ease',
                      transform: isHovered
                        ? 'translateX(4px)'
                        : 'none',
                    }}
                  >
                    <div>
                      <strong style={{ color: '#FFFFFF' }}>
                        {det.label || det.class}
                      </strong>

                      {det.bbox && (
                        <div
                          className="font-mono"
                          style={{
                            fontSize: '0.72rem',
                            color: 'var(--text-muted)',
                          }}
                        >
                          BBox: [
                          {det.bbox.x1?.toFixed(0)},{' '}
                          {det.bbox.y1?.toFixed(0)}] - [
                          {det.bbox.x2?.toFixed(0)},{' '}
                          {det.bbox.y2?.toFixed(0)}]
                        </div>
                      )}
                    </div>

                    <span
                      className="badge"
                      style={{
                        background:
                          'rgba(0, 210, 255, 0.12)',
                        color: '#00D2FF',
                        border:
                          '1px solid rgba(0, 210, 255, 0.3)',
                      }}
                    >
                      {(
                        (
                          (
                            det.confidence ??
                            report.confidence ??
                            0
                          ) * 100
                        )
                      ).toFixed(1)}
                      % Conf
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div>

          {/* AI METRICS */}
          <div
            className="card-3d"
            style={{ marginBottom: '24px' }}
          >
            <div className="card-header">
              <div>
                <h3 style={{ fontSize: '1.15rem' }}>
                  AI Severity & Priority Analysis
                </h3>

                <div
                  style={{
                    fontSize: '0.78rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  Mathematical evaluation of structural impact
                </div>
              </div>
            </div>

            <div
              style={{
                background: 'rgba(11, 17, 32, 0.9)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '20px',
                marginBottom: '18px',
              }}
            >
              <div className="flex-between mb-8">

                <div>
                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    EVALUATED SEVERITY
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: '8px',
                      marginTop: '2px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '2.2rem',
                        fontWeight: 800,
                        color: 'var(--primary)',
                      }}
                    >
                      {report.severity_score}
                    </span>

                    <span
                      style={{
                        color: 'var(--text-muted)',
                        fontSize: '0.9rem',
                      }}
                    >
                      / 10.0
                    </span>

                    <SeverityBadge
                      level={report.severity_level}
                    />
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    ASSIGNED PRIORITY
                  </div>

                  <div style={{ marginTop: '4px' }}>
                    <PriorityBadge
                      priority={report.priority}
                    />
                  </div>
                </div>
              </div>

              <div className="progress-bar mb-12">
                <div
                  className="progress-fill"
                  style={{
                    width: `${
                      ((report.severity_score || 0) / 10) * 100
                    }%`,
                    background:
                      report.severity_score >= 8
                        ? 'linear-gradient(90deg, #FF6B00, #FF2E4D)'
                        : report.severity_score >= 6
                        ? 'linear-gradient(90deg, #FFB800, #FF7A00)'
                        : report.severity_score >= 4
                        ? 'linear-gradient(90deg, #00E676, #FFB800)'
                        : '#00E676',
                  }}
                />
              </div>

              <div
                style={{
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)',
                }}
              >
                <strong>
                  Primary Hazard Class:
                </strong>{' '}
                {report.damage_type || 'Unknown'} (
                {(
                  (report.confidence || 0) * 100
                ).toFixed(1)}
                % model confidence)
              </div>
            </div>

            {/* Location */}
            <div style={{ fontSize: '0.88rem' }}>

              <div
                className="flex-between mb-8"
                style={{
                  borderBottom:
                    '1px solid var(--border-light)',
                  paddingBottom: '8px',
                }}
              >
                <span
                  style={{
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                  }}
                >
                  Corridor Address:
                </span>

                <span style={{ color: '#FFFFFF' }}>
                  {report.address || 'Not specified'}
                </span>
              </div>

              <div
                className="flex-between mb-8"
                style={{
                  borderBottom:
                    '1px solid var(--border-light)',
                  paddingBottom: '8px',
                }}
              >
                <span
                  style={{
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                  }}
                >
                  GPS Coordinates:
                </span>

                <span
                  className="font-mono"
                  style={{ color: 'var(--accent)' }}
                >
                  {report.latitude != null &&
                  report.longitude != null
                    ? `${Number(report.latitude).toFixed(
                        6
                      )}, ${Number(report.longitude).toFixed(
                        6
                      )}`
                    : 'No GPS data'}
                </span>
              </div>

              {report.cluster_id && (
                <div className="flex-between mb-8">
                  <span
                    style={{
                      color: 'var(--text-secondary)',
                      fontWeight: 600,
                    }}
                  >
                    Duplicate Grouping:
                  </span>

                  <span
                    className="badge"
                    style={{
                      background:
                        'rgba(0, 210, 255, 0.12)',
                      color: '#00D2FF',
                      border:
                        '1px solid rgba(0, 210, 255, 0.3)',
                    }}
                  >
                    Cluster #{report.cluster_id} (50m Radius)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* MUNICIPAL DISPATCH */}
          {isMunicipalOrAdmin && (
            <div className="card-3d">

              <div className="card-header">
                <div>
                  <h3 style={{ fontSize: '1.15rem' }}>
                    🏛️ Municipal Dispatch & Workflow
                  </h3>

                  <div
                    style={{
                      fontSize: '0.78rem',
                      color: 'var(--text-muted)',
                    }}
                  >
                    Assign field crews and transition status
                    lifecycle
                  </div>
                </div>
              </div>

              {/* STATUS */}
              <div style={{ marginBottom: '22px' }}>
                <label
                  style={{
                    display: 'block',
                    fontWeight: 600,
                    marginBottom: '8px',
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  UPDATE INCIDENT STATUS:
                </label>

                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    flexWrap: 'wrap',
                  }}
                >
                  {[
                    'pending',
                    'assigned',
                    'in_progress',
                    'repaired',
                    'verified',
                  ].map((st) => (
                    <button
                      key={st}
                      type="button"
                      disabled={
                        statusUpdating ||
                        report.status === st
                      }
                      onClick={() =>
                        handleUpdateStatus(st)
                      }
                      className={`btn btn-sm ${
                        report.status === st
                          ? 'btn-primary'
                          : 'btn-outline'
                      }`}
                      style={{
                        fontSize: '0.78rem',
                      }}
                    >
                      {st
                        .replace('_', ' ')
                        .toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* ASSIGNMENT */}
              {report.assignment ? (
                <div
                  style={{
                    background:
                      'rgba(11, 17, 32, 0.9)',
                    padding: '16px',
                    borderRadius: 'var(--radius)',
                    border:
                      '1px solid var(--border)',
                    marginBottom: '18px',
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      color: 'var(--accent)',
                      marginBottom: '6px',
                      fontSize: '0.95rem',
                    }}
                  >
                    📌 Assigned to Municipal Technician #
                    {report.assignment.assigned_to}
                  </div>

                  <div
                    style={{
                      fontSize: '0.85rem',
                      color: 'var(--text-secondary)',
                      marginBottom: '4px',
                    }}
                  >
                    <strong>
                      Dispatch Status:
                    </strong>{' '}
                    {report.assignment.status}
                  </div>

                  {report.assignment.notes && (
                    <div
                      style={{
                        fontSize: '0.85rem',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <strong>
                        Dispatch Notes:
                      </strong>{' '}
                      {report.assignment.notes}
                    </div>
                  )}
                </div>
              ) : (
                <form
                  onSubmit={handleCreateAssignment}
                  style={{ marginBottom: '18px' }}
                >
                  <div className="form-group">
                    <label htmlFor="assigneeId">
                      DISPATCH FIELD WORKER *
                    </label>

                    <select
                      id="assigneeId"
                      required
                      value={assigneeId}
                      onChange={(e) =>
                        setAssigneeId(e.target.value)
                      }
                      disabled={loadingUsers}
                    >
                      <option value="">
                        {loadingUsers
                          ? 'Loading municipal personnel...'
                          : municipalUsers.length === 0
                          ? 'No municipal personnel found'
                          : 'Select municipal personnel'}
                      </option>

                      {municipalUsers.map((u) => (
                        <option
                          key={u.id}
                          value={u.id}
                        >
                          {u.username} — {u.role} (ID: {u.id})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="assignNotes">
                      DISPATCH INSTRUCTIONS / REPAIR PLAN
                    </label>

                    <textarea
                      id="assignNotes"
                      placeholder="e.g. Bituminous cold mix patch and edge sealing required by 2PM"
                      value={assignNotes}
                      onChange={(e) =>
                        setAssignNotes(e.target.value)
                      }
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={
                      assigning ||
                      !assigneeId ||
                      loadingUsers ||
                      municipalUsers.length === 0
                    }
                    className="btn btn-accent"
                    style={{ width: '100%' }}
                  >
                    {assigning
                      ? 'Dispatching...'
                      : 'Dispatch Municipal Crew'}
                  </button>
                </form>
              )}

              {/* REPAIR PORTAL */}
              <Link
                href={`/repairs/${report.id}`}
                className="btn btn-success"
                style={{ width: '100%' }}
              >
                <IconCheckCircle2 size={18} />
                <span>
                  Open Repair Verification Portal
                </span>
              </Link>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}