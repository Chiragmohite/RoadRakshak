'use client';

import { IconAlertTriangle } from '@/components/Icons';

export default function DemoBanner({ isDemo, engine, message }) {
  if (!isDemo && engine === 'real') return null;

  return (
    <div className="demo-banner">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <IconAlertTriangle size={22} color="#FF9100" />
      </div>
      <div style={{ fontSize: '0.88rem', lineHeight: '1.45' }}>
        <strong style={{ color: '#FFB800', letterSpacing: '0.5px' }}>DEMO SIMULATION ACTIVE: </strong>
        <span>
          {message || 'Running in demo fallback mode because production AI model weights (backend/models/best.pt) are not yet loaded. Predictions and bounding boxes shown are simulated for development demonstration and must not be considered actual road scans.'}
        </span>
      </div>
    </div>
  );
}
