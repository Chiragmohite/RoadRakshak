'use client';

export function PriorityBadge({ priority }) {
  const p = (priority || 'P4').toUpperCase();
  const map = {
    P1: { class: 'badge-p1', label: 'P1 • Critical (<24h)', dot: 'pulse-dot-red' },
    P2: { class: 'badge-p2', label: 'P2 • High (<48h)', dot: 'pulse-dot-orange' },
    P3: { class: 'badge-p3', label: 'P3 • Medium (<7d)', dot: 'pulse-dot-orange' },
    P4: { class: 'badge-p4', label: 'P4 • Low (Scheduled)', dot: 'pulse-dot-green' },
  };
  const item = map[p] || map.P4;

  return (
    <span className={`badge ${item.class}`}>
      <span className={`pulse-dot ${item.dot}`} />
      {item.label}
    </span>
  );
}

export function StatusBadge({ status }) {
  const s = (status || 'pending').toLowerCase();
  const labelMap = {
    pending: 'Pending Triage',
    assigned: 'Worker Assigned',
    in_progress: 'Repair In Progress',
    repaired: 'Repair Completed',
    verified: '✓ VERIFIED FIXED',
  };
  const classMap = {
    pending: 'badge-pending',
    assigned: 'badge-assigned',
    in_progress: 'badge-in_progress',
    repaired: 'badge-repaired',
    verified: 'badge-verified',
  };
  return (
    <span className={`badge ${classMap[s] || 'badge-pending'}`}>
      {labelMap[s] || s}
    </span>
  );
}

export function SeverityBadge({ level }) {
  const l = (level || 'low').toLowerCase();
  const classMap = {
    critical: 'badge-critical',
    high: 'badge-high',
    medium: 'badge-medium',
    low: 'badge-low',
  };
  return (
    <span className={`badge ${classMap[l] || 'badge-low'}`}>
      {l}
    </span>
  );
}

export function EngineBadge({ isDemo, engine }) {
  if (isDemo || engine === 'demo') {
    return (
      <span className="badge badge-demo" title="Running in simulated fallback mode">
        <span className="pulse-dot pulse-dot-orange" />
        DEMO MODE (FALLBACK)
      </span>
    );
  }
  return (
    <span className="badge badge-real" title="Ultralytics YOLO inference model (best.pt)">
      <span className="pulse-dot pulse-dot-green" />
      REAL AI (YOLO INFERENCE)
    </span>
  );
}
