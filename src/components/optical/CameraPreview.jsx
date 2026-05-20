import { useEffect, useRef, useState } from 'react';

export default function CameraPreview({ videoRef, active = false, lastDecodeSuccess = null }) {
  const [flashVisible, setFlashVisible] = useState(false);

  // Flash on successful decode
  useEffect(() => {
    if (lastDecodeSuccess) {
      setFlashVisible(true);
      const t = setTimeout(() => setFlashVisible(false), 200);
      return () => clearTimeout(t);
    }
  }, [lastDecodeSuccess]);

  return (
    <div className="camera-container" style={{
      position: 'relative',
      width: '100%',
      maxWidth: '500px',
      aspectRatio: '4/3',
      borderRadius: '16px',
      overflow: 'hidden',
      background: '#0a0a12',
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: active ? 1 : 0.3,
          transition: 'opacity 0.3s',
        }}
      />

      {/* Scan Line Animation */}
      {active && (
        <div className="scan-line" style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: '2px',
          background: 'linear-gradient(90deg, transparent, #00ffcc, #00ffcc, transparent)',
          boxShadow: '0 0 15px #00ffcc60, 0 0 30px #00ffcc30',
          animation: 'scanSweep 2.5s ease-in-out infinite',
          zIndex: 3,
        }} />
      )}

      {/* Corner Brackets (viewfinder) */}
      <div style={{ position: 'absolute', inset: '12%', zIndex: 2, pointerEvents: 'none' }}>
        {/* Top-left */}
        <div style={{
          position: 'absolute', top: 0, left: 0,
          width: '20px', height: '20px',
          borderTop: '2px solid #00ffcc', borderLeft: '2px solid #00ffcc',
          borderTopLeftRadius: '4px',
        }} />
        {/* Top-right */}
        <div style={{
          position: 'absolute', top: 0, right: 0,
          width: '20px', height: '20px',
          borderTop: '2px solid #00ffcc', borderRight: '2px solid #00ffcc',
          borderTopRightRadius: '4px',
        }} />
        {/* Bottom-left */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0,
          width: '20px', height: '20px',
          borderBottom: '2px solid #00ffcc', borderLeft: '2px solid #00ffcc',
          borderBottomLeftRadius: '4px',
        }} />
        {/* Bottom-right */}
        <div style={{
          position: 'absolute', bottom: 0, right: 0,
          width: '20px', height: '20px',
          borderBottom: '2px solid #00ffcc', borderRight: '2px solid #00ffcc',
          borderBottomRightRadius: '4px',
        }} />
      </div>

      {/* Hex Grid Overlay */}
      {active && (
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          opacity: 0.04,
          backgroundImage: `radial-gradient(circle, #00ffcc 1px, transparent 1px)`,
          backgroundSize: '20px 20px',
          pointerEvents: 'none',
        }} />
      )}

      {/* Decode Flash */}
      {flashVisible && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 255, 204, 0.08)',
          zIndex: 4,
          pointerEvents: 'none',
          animation: 'fadeIn 0.1s ease',
        }} />
      )}

      {/* Status Badge */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        zIndex: 5,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '20px',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
        fontSize: '0.65rem',
        fontFamily: 'var(--font-mono)',
        color: active ? '#00ffcc' : 'var(--color-text-muted)',
      }}>
        <div style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: active ? '#00ffcc' : '#6b7280',
          boxShadow: active ? '0 0 6px #00ffcc' : 'none',
          animation: active ? 'pulse-glow-mini 2s ease-in-out infinite' : 'none',
        }} />
        {active ? 'SCANNING' : 'IDLE'}
      </div>

      {/* Inactive Overlay */}
      {!active && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)',
          zIndex: 6,
        }}>
          <div style={{
            textAlign: 'center',
            color: 'var(--color-text-muted)',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <p style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>Camera inactive</p>
          </div>
        </div>
      )}
    </div>
  );
}
