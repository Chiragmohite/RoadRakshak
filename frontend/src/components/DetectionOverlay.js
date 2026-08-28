'use client';

import { useState } from 'react';

/**
 * DetectionOverlay — High-Precision AI Vision Viewport
 *
 * Renders the camera feed / photo with responsive SVG bounding boxes,
 * target reticles, glowing status tags, and two-way hover synchronization.
 */
export default function DetectionOverlay({
  imageSrc,
  detections = [],
  imageWidth = 0,
  imageHeight = 0,
  hoveredIndex = null,
  onHoverDetection = () => {},
  className = '',
}) {
  const [localHover, setLocalHover] = useState(null);
  const activeIndex = hoveredIndex !== null ? hoveredIndex : localHover;

  // Signal colors per defect category
  const getColor = (label = '', isHovered = false) => {
    const l = (label || '').toLowerCase();
    if (l.includes('pothole') || l.includes('d40')) {
      return isHovered ? '#FF1744' : '#FF2E4D';
    }
    if (l.includes('alligator') || l.includes('d20')) {
      return isHovered ? '#FF6D00' : '#FF7A00';
    }
    if (l.includes('longitudinal') || l.includes('d00')) {
      return isHovered ? '#FFEA00' : '#FFB800';
    }
    return isHovered ? '#00F5FF' : '#00D2FF';
  };

  const hasBBoxes = detections && detections.length > 0 && imageWidth > 0 && imageHeight > 0;

  return (
    <div
      className={`detection-viewport-hud ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        background: '#07090E',
        border: '1px solid var(--border-cyan)',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.7), 0 0 20px rgba(0, 210, 255, 0.08)',
      }}
    >
      {/* 4 HUD Target Corner Brackets */}
      <div className="corner-bracket-tl" />
      <div className="corner-bracket-tr" />
      <div className="corner-bracket-bl" />
      <div className="corner-bracket-br" />

      {/* Target Optics / Crosshair Background Grid Lines */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          backgroundImage: 'linear-gradient(to right, rgba(0, 210, 255, 0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 210, 255, 0.03) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          zIndex: 2,
        }}
      />

      {/* Base Image */}
      <img
        src={imageSrc}
        alt="Road hazard AI detection visual"
        style={{
          width: '100%',
          height: 'auto',
          maxHeight: '440px',
          objectFit: 'contain',
          display: 'block',
          margin: '0 auto',
          position: 'relative',
          zIndex: 1,
        }}
      />

      {/* Interactive SVG Bounding Box Engine */}
      {hasBBoxes && (
        <svg
          viewBox={`0 0 ${imageWidth} ${imageHeight}`}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 3,
          }}
        >
          {detections.map((det, idx) => {
            if (!det.bbox) return null;
            const isHovered = activeIndex === idx;
            const color = getColor(det.label || det.class, isHovered);
            const x = Math.min(det.bbox.x1, det.bbox.x2);
            const y = Math.min(det.bbox.y1, det.bbox.y2);
            const width = Math.abs(det.bbox.x2 - det.bbox.x1);
            const height = Math.abs(det.bbox.y2 - det.bbox.y1);

            return (
              <g
                key={idx}
                style={{
                  pointerEvents: 'auto',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={() => {
                  setLocalHover(idx);
                  onHoverDetection(idx);
                }}
                onMouseLeave={() => {
                  setLocalHover(null);
                  onHoverDetection(null);
                }}
              >
                {/* Luminous Glow Fill on hover */}
                {isHovered && (
                  <rect
                    x={x - 3}
                    y={y - 3}
                    width={width + 6}
                    height={height + 6}
                    fill="none"
                    stroke={color}
                    strokeWidth={6}
                    strokeOpacity={0.35}
                    rx={4}
                  />
                )}

                {/* Primary Bounding Box */}
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  fill={isHovered ? color : 'none'}
                  fillOpacity={isHovered ? 0.18 : 0}
                  stroke={color}
                  strokeWidth={isHovered ? 2.5 : 1.8}
                  strokeDasharray={isHovered ? 'none' : '5 3'}
                  rx={2}
                />

                {/* Corner Targeting Accents */}
                <path
                  d={`M ${x} ${y + 8} L ${x} ${y} L ${x + 8} ${y}`}
                  stroke={color}
                  strokeWidth={3}
                  fill="none"
                />
                <path
                  d={`M ${x + width - 8} ${y} L ${x + width} ${y} L ${x + width} ${y + 8}`}
                  stroke={color}
                  strokeWidth={3}
                  fill="none"
                />
                <path
                  d={`M ${x} ${y + height - 8} L ${x} ${y + height} L ${x + 8} ${y + height}`}
                  stroke={color}
                  strokeWidth={3}
                  fill="none"
                />
                <path
                  d={`M ${x + width - 8} ${y + height} L ${x + width} ${y + height} L ${x + width} ${y + height - 8}`}
                  stroke={color}
                  strokeWidth={3}
                  fill="none"
                />

                {/* Floating Tag Readout */}
                <rect
                  x={x}
                  y={Math.max(0, y - 22)}
                  width={Math.max(110, ((det.label || det.class).length * 8) + 44)}
                  height={20}
                  fill="#07090E"
                  fillOpacity={0.92}
                  stroke={color}
                  strokeWidth={1}
                  rx={3}
                />
                <text
                  x={x + 6}
                  y={Math.max(14, y - 8)}
                  fill="#FFFFFF"
                  fontSize="11"
                  fontWeight="700"
                  fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
                >
                  {det.label || det.class} {((det.confidence || 0) * 100).toFixed(0)}%
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
