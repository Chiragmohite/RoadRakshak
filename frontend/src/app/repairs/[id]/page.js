'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createRepair, getReport, verifyRepair } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { PriorityBadge, StatusBadge } from '@/components/StatusBadge';
import {
  IconCheckCircle2,
  IconAlertTriangle,
  IconCamera,
  IconUpload,
  IconShield,
  IconArrowRight,
} from '@/components/Icons';

export default function RepairPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Upload after photo state
  const [afterImageFile, setAfterImageFile] = useState(null);
  const [afterPreview, setAfterPreview] = useState('');
  const [uploading, setUploading] = useState(false);

  // Verification state
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchReportDetails();
  }, [id, user]);

  const fetchReportDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getReport(id);
      setReport(data);
    } catch (err) {
      setError(err.message || 'Failed to load report details');
    } finally {
      setLoading(false);
    }
  };

  const handleAfterImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAfterImageFile(file);
    setAfterPreview(URL.createObjectURL(file));
    setError('');
  };

  const handleUploadAfterRepair = async (e) => {
    e.preventDefault();
    if (!afterImageFile) {
      setError('Please select an after-repair photo.');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('report_id', id);
      formData.append('after_image', afterImageFile);

      await createRepair(formData);
      setSuccess('After-repair photograph uploaded! Status updated to Repaired (Awaiting Official Audit).');
      await fetchReportDetails();
    } catch (err) {
      setError(err.message || 'Failed to upload after-repair photograph');
    } finally {
      setUploading(false);
    }
  };

  const handleManualVerification = async () => {
    if (!report?.repair?.id) return;

    setVerifying(true);
    setError('');
    setSuccess('');

    try {
      await verifyRepair(report.repair.id);
      setSuccess('Repair officially audited and approved! Incident status transitioned to VERIFIED FIXED.');
      await fetchReportDetails();
    } catch (err) {
      setError(err.message || 'Verification audit failed');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">
          <div className="spinner" /> Loading repair verification dossier...
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="container">
        <div className="alert alert-danger">{error || 'Report not found'}</div>
        <Link href="/reports" className="btn btn-outline">
          ← Back to Reports
        </Link>
      </div>
    );
  }

  const isMunicipalOrAdmin = user?.role === 'municipal' || user?.role === 'admin';

  return (
    <div className="container">
      {/* Navigation Breadcrumb */}
      <div style={{ marginBottom: '16px' }}>
        <Link href={`/reports/${id}`} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          ← Back to Incident Dossier #{id}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h1 className="gradient-text-cyan" style={{ margin: 0 }}>
              🛠️ Repair & Verification Audit
            </h1>
            <PriorityBadge priority={report.priority} />
            <StatusBadge status={report.status} />
          </div>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', margin: 0, fontSize: '0.9rem' }}>
            Hazard: <strong>{report.damage_type || 'Road Defect'}</strong> at {report.address || 'Reported Location'}
          </p>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          <IconAlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="alert alert-success">
          <IconCheckCircle2 size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* Verification Status Card */}
      <div className="card-3d" style={{ marginBottom: '32px' }}>
        <div className="card-header">
          <div>
            <h2 style={{ fontSize: '1.25rem' }}>Repair Lifecycle & Certification Status</h2>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Dual-stage verification ensuring complete field road restoration
            </div>
          </div>

          {report.repair?.verified ? (
            <span className="badge badge-verified" style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
              ✓ VERIFIED FIXED
            </span>
          ) : report.repair ? (
            <span className="badge badge-in_progress" style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
              AWAITING MUNICIPAL AUDIT
            </span>
          ) : (
            <span className="badge badge-pending" style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
              FIELD REPAIR IN PROGRESS
            </span>
          )}
        </div>

        <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
          {report.repair?.verified ? (
            <p style={{ margin: 0 }}>
              This road defect was <strong>manually inspected, audited, and certified fixed</strong> by municipal authorities on {new Date(report.repair.verified_at).toLocaleString()}.
            </p>
          ) : report.repair ? (
            <p style={{ margin: 0 }}>
              Post-repair photography has been submitted by the field crew. Municipal supervisors can review the side-by-side visual comparison below and certify closure.
            </p>
          ) : (
            <p style={{ margin: 0 }}>
              Field team has been dispatched. Once asphalt patching and compaction are complete, upload the after-repair photo below to initiate audit verification.
            </p>
          )}
        </div>
      </div>

      {/* Side-by-Side Visual Audit Comparison */}
      <div className="card-3d" style={{ marginBottom: '32px' }}>
        <div className="card-header">
          <div>
            <h2 style={{ fontSize: '1.25rem' }}>Side-by-Side Visual Audit Comparison</h2>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Verification Methodology: <strong>Certified Manual Visual Audit</strong> (Transparent)
            </div>
          </div>
        </div>

        <div className="comparison">
          {/* Before Photo */}
          <div>
            <div className="comparison-label" style={{ color: '#FF6680' }}>
              🔴 BEFORE REPAIR (CITIZEN EVIDENCE)
            </div>
            <div
              style={{
                position: 'relative',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                background: '#0B0F19',
                border: '1px solid rgba(255, 46, 77, 0.35)',
                boxShadow: '0 0 20px rgba(255, 46, 77, 0.1)',
                minHeight: '320px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={`/uploads/${report.image_path}`}
                alt="Before repair"
                style={{ width: '100%', maxHeight: '420px', objectFit: 'contain', display: 'block' }}
              />
            </div>
          </div>

          {/* After Photo */}
          <div>
            <div className="comparison-label" style={{ color: '#00E676' }}>
              🟢 AFTER REPAIR (FIELD COMPLETION)
            </div>
            {report.repair?.after_image_path ? (
              <div
                style={{
                  position: 'relative',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                  background: '#0B0F19',
                  border: '1px solid rgba(0, 230, 118, 0.35)',
                  boxShadow: '0 0 20px rgba(0, 230, 118, 0.1)',
                  minHeight: '320px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={`/uploads/${report.repair.after_image_path}`}
                  alt="After repair"
                  style={{ width: '100%', maxHeight: '420px', objectFit: 'contain', display: 'block' }}
                />
              </div>
            ) : afterPreview ? (
              <div
                style={{
                  position: 'relative',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                  background: '#0B0F19',
                  border: '1px solid rgba(0, 210, 255, 0.35)',
                  minHeight: '320px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={afterPreview}
                  alt="After repair preview"
                  style={{ width: '100%', maxHeight: '420px', objectFit: 'contain', display: 'block' }}
                />
              </div>
            ) : (
              <div
                className="upload-zone-3d"
                style={{
                  minHeight: '320px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📷</div>
                <div style={{ fontWeight: 700, color: '#FFFFFF', marginBottom: '4px' }}>
                  No After-Repair Photo Submitted Yet
                </div>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Submit post-repair photo below to generate audit comparison
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Panels */}
      <div className="grid-2">
        {/* Upload After-Repair Photo */}
        {!report.repair && (
          <div className="card-3d">
            <div className="card-header">
              <h3 style={{ fontSize: '1.15rem' }}>Upload Post-Repair Photography</h3>
            </div>
            <form onSubmit={handleUploadAfterRepair}>
              <div className="form-group">
                <label>SELECT POST-REPAIR PHOTOGRAPH *</label>
                <label className={`upload-zone-3d ${afterImageFile ? 'has-file' : ''}`}>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={handleAfterImageChange}
                    required
                  />
                  <div style={{ fontSize: '2.2rem', marginBottom: '8px' }}>📸</div>
                  <div style={{ fontWeight: 700, color: '#FFFFFF' }}>
                    {afterImageFile ? `Selected: ${afterImageFile.name}` : 'Click to select after-repair photo'}
                  </div>
                </label>
              </div>
              <button
                type="submit"
                disabled={uploading || !afterImageFile}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '12px' }}
              >
                {uploading ? 'Uploading Evidence...' : 'Submit Repair Photo'}
              </button>
            </form>
          </div>
        )}

        {/* Manual Certification Action (Municipal / Admin) */}
        {report.repair && !report.repair.verified && isMunicipalOrAdmin && (
          <div className="card-3d">
            <div className="card-header">
              <h3 style={{ fontSize: '1.15rem' }}>Certify & Verify Road Repair</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '22px', fontSize: '0.92rem', lineHeight: '1.6' }}>
              As an authorized municipal supervisor, inspect the visual before/after evidence above. Certifying completion will archive the complaint and seal the status as <strong>VERIFIED FIXED</strong>.
            </p>
            <button
              onClick={handleManualVerification}
              disabled={verifying}
              className="btn btn-success btn-lg"
              style={{ width: '100%' }}
            >
              {verifying ? 'Certifying...' : '✅ Certify & Verify Fixed'}
            </button>
          </div>
        )}

        {/* Certified Verification Certificate */}
        {report.repair?.verified && (
          <div
            className="card-3d"
            style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              boxShadow: '0 0 30px rgba(16, 185, 129, 0.12)',
            }}
          >
            <div className="card-header">
              <h3 style={{ color: '#6EE7B7', fontSize: '1.15rem' }}>✓ Official Repair Audit Certificate</h3>
            </div>
            <div style={{ fontSize: '0.9rem', color: '#A7F3D0', lineHeight: 1.8 }}>
              <div><strong>Verification Method:</strong> Manual Visual Inspection & Approval</div>
              <div><strong>Audited By:</strong> Municipal Authority ID #{report.repair.verified_by || '1'}</div>
              <div><strong>Audit Timestamp:</strong> {new Date(report.repair.verified_at).toLocaleString()}</div>
              <div><strong>Lifecycle Status:</strong> <span className="badge badge-verified">VERIFIED FIXED</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
