'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getReports, getStats } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import DemoBanner from '@/components/DemoBanner';
import { EngineBadge, PriorityBadge, SeverityBadge, StatusBadge } from '@/components/StatusBadge';
import {
  IconActivity,
  IconRefresh,
  IconAlertTriangle,
  IconCheckCircle2,
  IconLayers,
  IconMapPin,
  IconArrowRight,
} from '@/components/Icons';

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter state
  const [filterPriority, setFilterPriority] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDamage, setFilterDamage] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (user.role !== 'municipal' && user.role !== 'admin') {
      router.push('/reports');
      return;
    }

    fetchDashboardData();
  }, [user, filterPriority, filterStatus, filterDamage]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const [statsData, reportsData] = await Promise.all([
        getStats(),
        getReports({
          priority: filterPriority || undefined,
          status: filterStatus || undefined,
          damage_type: filterDamage || undefined,
          sort: 'priority',
          per_page: 50,
        }),
      ]);
      setStats(statsData);
      setReports(reportsData.reports || []);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  if (!user || (user.role !== 'municipal' && user.role !== 'admin')) {
    return null;
  }

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{ fontSize: '1.8rem' }}>🏛️</span>
            <h1 className="gradient-text-cyan" style={{ margin: 0 }}>
              Municipal Command Center
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            Real-time road safety triage, AI damage verification, spatial clustering, and municipal field crew dispatch
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {stats && <EngineBadge isDemo={stats.engine === 'demo'} engine={stats.engine} />}
          <button onClick={fetchDashboardData} className="btn btn-outline btn-sm">
            <IconRefresh size={14} />
            <span>Refresh Feed</span>
          </button>
        </div>
      </div>

      {/* Demo Banner */}
      {stats?.is_all_demo_data && (
        <DemoBanner
          isDemo={true}
          engine="demo"
          message="All reports currently logged were generated using fallback demo mode. None of these represent production road surveys."
        />
      )}

      {error && (
        <div className="alert alert-danger">
          <IconAlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Futuristic Stat KPI Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.total_reports}</div>
            <div className="stat-label">Total Incidents</div>
          </div>

          <div
            className="stat-card"
            style={{
              borderLeft: '4px solid #FF2E4D',
              boxShadow: '0 0 20px rgba(255, 46, 77, 0.15), var(--shadow-3d)',
            }}
          >
            <div className="stat-value" style={{ color: '#FF6680' }}>
              {stats.priority_counts?.P1 || 0}
            </div>
            <div className="stat-label">P1 Critical (&lt;24h)</div>
          </div>

          <div
            className="stat-card"
            style={{
              borderLeft: '4px solid #FF7A00',
              boxShadow: '0 0 20px rgba(255, 122, 0, 0.15), var(--shadow-3d)',
            }}
          >
            <div className="stat-value" style={{ color: '#FFA34D' }}>
              {stats.priority_counts?.P2 || 0}
            </div>
            <div className="stat-label">P2 High (&lt;48h)</div>
          </div>

          <div
            className="stat-card"
            style={{
              borderLeft: '4px solid #FFB800',
            }}
          >
            <div className="stat-value" style={{ color: '#FFD04D' }}>
              {stats.priority_counts?.P3 || 0}
            </div>
            <div className="stat-label">P3 Medium (&lt;7d)</div>
          </div>

          <div
            className="stat-card"
            style={{
              borderLeft: '4px solid #10B981',
              boxShadow: '0 0 20px rgba(16, 185, 129, 0.15), var(--shadow-3d)',
            }}
          >
            <div className="stat-value" style={{ color: '#6EE7B7' }}>
              {stats.status_counts?.verified || 0}
            </div>
            <div className="stat-label">Verified Fixed</div>
          </div>

          <div
            className="stat-card"
            style={{
              borderLeft: '4px solid #00D2FF',
              boxShadow: '0 0 20px rgba(0, 210, 255, 0.15), var(--shadow-3d)',
            }}
          >
            <div className="stat-value" style={{ color: '#00E5FF' }}>
              {stats.cluster_count || 0}
            </div>
            <div className="stat-label">50m Spatial Clusters</div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="filter-bar">
        <strong style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>FILTER QUEUE:</strong>

        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
        >
          <option value="">All Priorities</option>
          <option value="P1">P1 — Critical (&lt;24h)</option>
          <option value="P2">P2 — High (&lt;48h)</option>
          <option value="P3">P3 — Medium (&lt;7d)</option>
          <option value="P4">P4 — Low (Scheduled)</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">All Workflow Statuses</option>
          <option value="pending">Pending Triage</option>
          <option value="assigned">Worker Assigned</option>
          <option value="in_progress">Repair In Progress</option>
          <option value="repaired">Repaired (Audit Pending)</option>
          <option value="verified">Verified Fixed</option>
        </select>

        <select
          value={filterDamage}
          onChange={(e) => setFilterDamage(e.target.value)}
        >
          <option value="">All Damage Types</option>
          <option value="Pothole">Pothole (D40)</option>
          <option value="Alligator Crack">Alligator Crack (D20)</option>
          <option value="Longitudinal Crack">Longitudinal Crack (D00)</option>
          <option value="Transverse Crack">Transverse Crack (D10)</option>
        </select>

        {(filterPriority || filterStatus || filterDamage) && (
          <button
            onClick={() => {
              setFilterPriority('');
              setFilterStatus('');
              setFilterDamage('');
            }}
            className="btn btn-outline btn-sm"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Triage Dispatch Queue Table */}
      <div className="card-3d">
        <div className="card-header">
          <div>
            <h2 style={{ fontSize: '1.25rem' }}>🚨 Priority Dispatch Queue ({reports.length} incidents)</h2>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Deterministic sorting: P1 Critical → P2 High → P3 Medium → P4 Low
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading">
            <div className="spinner" /> Loading municipal queue...
          </div>
        ) : reports.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎉</div>
            <h3 style={{ color: '#FFFFFF', marginBottom: '4px' }}>Queue All Clear</h3>
            <p>No road damage complaints matching the selected filter criteria.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Priority</th>
                  <th>Damage Class</th>
                  <th>Severity Score</th>
                  <th>Status</th>
                  <th>Spatial Location</th>
                  <th>50m Cluster</th>
                  <th>Reported</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id}>
                    <td className="font-mono">
                      <strong style={{ color: 'var(--primary)' }}>#{r.id}</strong>
                    </td>
                    <td>
                      <PriorityBadge priority={r.priority} />
                    </td>
                    <td>
                      <strong style={{ color: '#FFFFFF' }}>{r.damage_type || 'Unspecified'}</strong>
                      {r.confidence && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {(r.confidence * 100).toFixed(0)}% model conf
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <strong style={{ color: 'var(--primary)', fontSize: '1rem' }}>{r.severity_score}</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ 10</span>
                      </div>
                      <div style={{ marginTop: '2px' }}>
                        <SeverityBadge level={r.severity_level} />
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                    <td style={{ maxWidth: '200px' }}>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.address || (r.latitude ? `${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}` : 'No GPS')}
                      </div>
                    </td>
                    <td>
                      {r.cluster_id ? (
                        <span
                          className="badge"
                          style={{
                            background: 'rgba(0, 210, 255, 0.12)',
                            color: '#00E5FF',
                            border: '1px solid rgba(0, 210, 255, 0.3)',
                          }}
                        >
                          Cluster #{r.cluster_id}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>None</span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <Link href={`/reports/${r.id}`} className="btn btn-outline btn-sm">
                        <span>Inspect & Assign</span>
                        <IconArrowRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
