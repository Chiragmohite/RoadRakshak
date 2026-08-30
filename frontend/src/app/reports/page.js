'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getReports, deleteReport } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  PriorityBadge,
  SeverityBadge,
  StatusBadge,
} from '@/components/StatusBadge';

import {
  IconCamera,
  IconLayers,
  IconArrowRight,
  IconAlertTriangle,
} from '@/components/Icons';

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  ''
).replace(/\/$/, '');

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

export default function ReportsPage() {
  const { user } = useAuth();

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters & sorting
  const [filterPriority, setFilterPriority] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDamage, setFilterDamage] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Delete state
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchReports();
  }, [
    filterPriority,
    filterStatus,
    filterDamage,
    sortOrder,
    page,
  ]);

  const fetchReports = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await getReports({
        priority: filterPriority || undefined,
        status: filterStatus || undefined,
        damage_type: filterDamage || undefined,
        sort: sortOrder,
        page: page,
        per_page: 15,
      });

      setReports(data.reports || []);
      setTotalPages(data.pages || 1);
      setTotalCount(data.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReport = async (id) => {
    const confirmed = window.confirm(
      `Delete report #${id}?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingId(id);
    setError('');

    try {
      await deleteReport(id);

      // Remove deleted report from current page immediately
      setReports((currentReports) =>
        currentReports.filter((report) => report.id !== id)
      );

      setTotalCount((count) => Math.max(0, count - 1));
    } catch (err) {
      setError(
        err.message || `Failed to delete report #${id}`
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="container">

      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
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
              gap: '10px',
              marginBottom: '6px',
            }}
          >
            <span style={{ fontSize: '1.8rem' }}>
              📋
            </span>

            <h1
              className="gradient-text-orange"
              style={{ margin: 0 }}
            >
              Road Hazard Network Explorer
            </h1>
          </div>

          <p
            style={{
              color: 'var(--text-secondary)',
              margin: 0,
            }}
          >
            Audit live citizen complaints, AI detection
            results, and certified repair workflows (
            {totalCount} total reports)
          </p>
        </div>

        <Link
          href="/report"
          className="btn btn-primary"
        >
          <IconCamera size={18} />
          <span>Report New Hazard</span>
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div className="alert alert-danger">
          <IconAlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="filter-bar">

        <strong
          style={{
            color: 'var(--text-secondary)',
            fontSize: '0.85rem',
          }}
        >
          FILTER FEED:
        </strong>

        <select
          value={filterPriority}
          onChange={(e) => {
            setFilterPriority(e.target.value);
            setPage(1);
          }}
        >
          <option value="">
            All Priorities
          </option>

          <option value="P1">
            P1 — Critical (&lt;24h)
          </option>

          <option value="P2">
            P2 — High (&lt;48h)
          </option>

          <option value="P3">
            P3 — Medium (&lt;7d)
          </option>

          <option value="P4">
            P4 — Low (Scheduled)
          </option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">
            All Statuses
          </option>

          <option value="pending">
            Pending
          </option>

          <option value="assigned">
            Assigned
          </option>

          <option value="in_progress">
            In Progress
          </option>

          <option value="repaired">
            Repaired
          </option>

          <option value="verified">
            Verified Fixed
          </option>
        </select>

        <select
          value={filterDamage}
          onChange={(e) => {
            setFilterDamage(e.target.value);
            setPage(1);
          }}
        >
          <option value="">
            All Damage Types
          </option>

          <option value="Pothole">
            Pothole (D40)
          </option>

          <option value="Alligator Crack">
            Alligator Crack (D20)
          </option>

          <option value="Longitudinal Crack">
            Longitudinal Crack (D00)
          </option>

          <option value="Transverse Crack">
            Transverse Crack (D10)
          </option>
        </select>

        <select
          value={sortOrder}
          onChange={(e) => {
            setSortOrder(e.target.value);
            setPage(1);
          }}
        >
          <option value="newest">
            Sort: Newest First
          </option>

          <option value="priority">
            Sort: Priority (P1 First)
          </option>

          <option value="severity">
            Sort: Highest Severity
          </option>
        </select>

        {(filterPriority ||
          filterStatus ||
          filterDamage) && (
          <button
            type="button"
            onClick={() => {
              setFilterPriority('');
              setFilterStatus('');
              setFilterDamage('');
              setPage(1);
            }}
            className="btn btn-outline btn-sm"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Reports Table */}
      <div className="card-3d">

        {loading ? (
          <div className="loading">
            <div className="spinner" />
            Loading reports...
          </div>
        ) : reports.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              🔍
            </div>

            <h3
              style={{
                color: '#FFFFFF',
                marginBottom: '4px',
              }}
            >
              No Reports Found
            </h3>

            <p>
              No road damage complaints matching the
              filter criteria.
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>

              <thead>
                <tr>
                  <th>ID</th>
                  <th>Visual</th>
                  <th>Damage Class</th>
                  <th>Priority</th>
                  <th>Severity Score</th>
                  <th>Status</th>
                  <th>Spatial Location</th>
                  <th>Reported Date</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {reports.map((r) => (
                  <tr key={r.id}>

                    {/* ID */}
                    <td className="font-mono">
                      <strong
                        style={{
                          color: 'var(--primary)',
                        }}
                      >
                        #{r.id}
                      </strong>
                    </td>

                    {/* Image */}
                    <td style={{ width: '74px' }}>
                      <div
                        style={{
                          width: '58px',
                          height: '44px',
                          borderRadius:
                            'var(--radius-xs)',
                          overflow: 'hidden',
                          background: '#070B14',
                          border:
                            '1px solid var(--border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent:
                            'center',
                        }}
                      >
                        {r.image_path ? (
                          <img
                            src={getImageUrl(
                              r.image_path
                            )}
                            alt="Damage thumbnail"
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                          />
                        ) : (
                          <span
                            style={{
                              fontSize: '1.1rem',
                            }}
                          >
                            📷
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Damage */}
                    <td>
                      <strong
                        style={{
                          color: '#FFFFFF',
                        }}
                      >
                        {r.damage_type ||
                          'Unspecified'}
                      </strong>

                      {r.confidence && (
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color:
                              'var(--text-muted)',
                          }}
                        >
                          {(r.confidence * 100).toFixed(
                            0
                          )}
                          % conf
                        </div>
                      )}
                    </td>

                    {/* Priority */}
                    <td>
                      <PriorityBadge
                        priority={r.priority}
                      />
                    </td>

                    {/* Severity */}
                    <td>
                      <div
                        style={{
                          display: 'flex',
                          alignItems:
                            'baseline',
                          gap: '4px',
                        }}
                      >
                        <strong
                          style={{
                            color:
                              'var(--primary)',
                          }}
                        >
                          {r.severity_score}
                        </strong>

                        <span
                          style={{
                            fontSize: '0.75rem',
                            color:
                              'var(--text-muted)',
                          }}
                        >
                          / 10
                        </span>
                      </div>

                      <div
                        style={{
                          marginTop: '2px',
                        }}
                      >
                        <SeverityBadge
                          level={
                            r.severity_level
                          }
                        />
                      </div>
                    </td>

                    {/* Status */}
                    <td>
                      <StatusBadge
                        status={r.status}
                      />
                    </td>

                    {/* Location */}
                    <td
                      style={{
                        maxWidth: '200px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.85rem',
                          color:
                            'var(--text-secondary)',
                          whiteSpace:
                            'nowrap',
                          overflow: 'hidden',
                          textOverflow:
                            'ellipsis',
                        }}
                      >
                        {r.address ||
                          (r.latitude
                            ? `${r.latitude.toFixed(
                                4
                              )}, ${r.longitude.toFixed(
                                4
                              )}`
                            : 'No GPS')}
                      </div>
                    </td>

                    {/* Date */}
                    <td
                      style={{
                        fontSize: '0.8rem',
                        color:
                          'var(--text-muted)',
                      }}
                    >
                      {new Date(
                        r.created_at
                      ).toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td>
                      <div
                        style={{
                          display: 'flex',
                          gap: '6px',
                          alignItems:
                            'center',
                          flexWrap: 'wrap',
                        }}
                      >
                        <Link
                          href={`/reports/${r.id}`}
                          className="btn btn-outline btn-sm"
                        >
                          <span>
                            Details
                          </span>

                          <IconArrowRight
                            size={13}
                          />
                        </Link>

                        {user?.role === 'admin' && (
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteReport(
                                r.id
                              )
                            }
                            disabled={
                              deletingId === r.id
                            }
                            className="btn btn-danger btn-sm"
                          >
                            {deletingId === r.id
                              ? 'Deleting...'
                              : 'Delete'}
                          </button>
                        )}
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              justifyContent:
                'center',
              gap: '8px',
              marginTop: '24px',
            }}
          >
            <button
              type="button"
              disabled={page <= 1}
              onClick={() =>
                setPage(page - 1)
              }
              className="btn btn-outline btn-sm"
            >
              ← Previous
            </button>

            <span
              style={{
                display: 'flex',
                alignItems:
                  'center',
                padding: '0 12px',
                fontSize: '0.85rem',
                color:
                  'var(--text-secondary)',
              }}
            >
              Page {page} of {totalPages}
            </span>

            <button
              type="button"
              disabled={
                page >= totalPages
              }
              onClick={() =>
                setPage(page + 1)
              }
              className="btn btn-outline btn-sm"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}