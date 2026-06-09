import { useEffect, useState, useRef } from 'react';

export default function AlignmentGuide({ lastDecodeSuccess = null, active = false, role = 'send' }) {
  const [isScanning, setIsScanning] = useState(false);
  const timeoutRef = useRef(null);

  // Simple binary: scanning (green) or not scanning (red)
  useEffect(() => {
    if (lastDecodeSuccess) {
      setIsScanning(true);
      clearTimeout(timeoutRef.current);
      // If no new decode within 2s, mark as not scanning
      timeoutRef.current = setTimeout(() => {
        setIsScanning(false);
      }, 2000);
    }
    return () => clearTimeout(timeoutRef.current);
  }, [lastDecodeSuccess]);

  const color = isScanning ? '#22c55e' : '#ef4444';
  const bgGlow = isScanning ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)';
  const borderGlow = isScanning ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)';
  const label = isScanning ? 'ALIGNED' : 'NOT ALIGNED';
  const hint = isScanning
    ? 'Devices are synced ✓'
    : role === 'send'
      ? 'Point the other device\'s camera at this QR'
      : 'Aim your camera at the sender\'s QR';

  return (
    <div className="alignment-guide" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.4rem',
      padding: '0.5rem 0.25rem',
      flexShrink: 0,
    }}>

      {/* Top signal line */}
      <div style={{
        width: '2px',
        height: '20px',
        background: `linear-gradient(to bottom, transparent, ${color})`,
        opacity: active ? 0.8 : 0.2,
        transition: 'all 0.4s',
      }} />

      {/* Signal wave dots going down */}
      {active && (
        <div className="alignment-data-flow" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '5px',
        }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: '4px',
              height: '4px',
              borderRadius: '50%',
              background: color,
              animation: `alignDotFlow 1.2s ${i * 0.3}s ease-in-out infinite`,
              boxShadow: `0 0 6px ${color}`,
            }} />
          ))}
        </div>
      )}

      {/* Main crosshair circle */}
      <div style={{
        position: 'relative',
        width: '56px',
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {/* Pulsing outer ring */}
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: `2px solid ${color}`,
          opacity: 0.3,
          animation: active ? (isScanning ? 'alignPulseRing 2s ease-in-out infinite' : 'alignPulseRingSlow 3s ease-in-out infinite') : 'none',
        }} />

        <svg width="56" height="56" viewBox="0 0 56 56" fill="none" style={{
          opacity: active ? 1 : 0.3,
          transition: 'opacity 0.3s',
        }}>
          {/* Spinning dashed ring */}
          <circle cx="28" cy="28" r="24" stroke={color} strokeWidth="1.5" strokeDasharray="5 4"
            opacity="0.4"
            style={{
              animation: active ? 'alignRingSpin 6s linear infinite' : 'none',
              transformOrigin: 'center',
            }}
          />
          {/* Inner solid ring */}
          <circle cx="28" cy="28" r="15" stroke={color} strokeWidth="1.5" opacity="0.6" />
          {/* Center filled circle */}
          <circle cx="28" cy="28" r="5" fill={color}
            style={{
              filter: `drop-shadow(0 0 6px ${color})`,
              animation: isScanning && active ? 'alignCenterPulse 1.5s ease-in-out infinite' : 'none',
            }}
          />
          {/* Crosshair lines */}
          <line x1="28" y1="2" x2="28" y2="13" stroke={color} strokeWidth="1.5" opacity="0.5" strokeLinecap="round" />
          <line x1="28" y1="43" x2="28" y2="54" stroke={color} strokeWidth="1.5" opacity="0.5" strokeLinecap="round" />
          <line x1="2" y1="28" x2="13" y2="28" stroke={color} strokeWidth="1.5" opacity="0.5" strokeLinecap="round" />
          <line x1="43" y1="28" x2="54" y2="28" stroke={color} strokeWidth="1.5" opacity="0.5" strokeLinecap="round" />
        </svg>
      </div>

      {/* Status badge */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 14px',
        borderRadius: '20px',
        background: bgGlow,
        border: `1px solid ${borderGlow}`,
        boxShadow: isScanning ? `0 0 16px rgba(34,197,94,0.3)` : `0 0 10px rgba(239,68,68,0.15)`,
        transition: 'all 0.4s ease',
        whiteSpace: 'nowrap',
      }}>
        {/* Status dot */}
        <div style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          background: color,
          boxShadow: `0 0 8px ${color}`,
          animation: active ? 'pulse-glow-mini 1.5s ease-in-out infinite' : 'none',
          transition: 'all 0.4s',
        }} />
        <span style={{
          fontSize: '0.6rem',
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          color: color,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          transition: 'color 0.4s',
        }}>
          {label}
        </span>
      </div>

      {/* Signal wave dots going up */}
      {active && (
        <div className="alignment-data-flow" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '5px',
        }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: '4px',
              height: '4px',
              borderRadius: '50%',
              background: color,
              animation: `alignDotFlow 1.2s ${i * 0.3 + 0.15}s ease-in-out infinite reverse`,
              boxShadow: `0 0 6px ${color}`,
            }} />
          ))}
        </div>
      )}

      {/* Bottom signal line */}
      <div style={{
        width: '2px',
        height: '20px',
        background: `linear-gradient(to top, transparent, ${color})`,
        opacity: active ? 0.8 : 0.2,
        transition: 'all 0.4s',
      }} />

      {/* Hint text */}
      <p className="alignment-tip" style={{
        fontSize: '0.55rem',
        color: isScanning ? '#22c55e' : 'var(--color-text-muted)',
        fontFamily: 'var(--font-mono)',
        textAlign: 'center',
        lineHeight: 1.4,
        maxWidth: '100px',
        transition: 'color 0.4s',
        animation: !isScanning && active ? 'alignTipPulse 2s ease-in-out infinite' : 'none',
      }}>
        {hint}
      </p>
    </div>
  );
}
