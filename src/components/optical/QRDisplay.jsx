import { useEffect, useRef, useState } from 'react';
import { PacketType, PacketTypeName } from '../../utils/opticalProtocol';

const GLOW_COLORS = {
  [PacketType.HANDSHAKE]: '#f59e0b',
  [PacketType.DATA]:      '#00ffcc',
  [PacketType.ACK]:       '#22c55e',
  [PacketType.NACK]:      '#ef4444',
  [PacketType.COMPLETE]:  '#a855f7',
  [PacketType.RESEND_REQUEST]: '#3b82f6',
};

export default function QRDisplay({ qrDataUrl, packet, progress = 0, frameCount = 0 }) {
  const glowColor = packet ? (GLOW_COLORS[packet.type] || '#00ffcc') : '#00ffcc';
  const [flash, setFlash] = useState(false);
  const prevFrameRef = useRef(0);

  // Flash effect on frame change
  useEffect(() => {
    if (frameCount !== prevFrameRef.current) {
      setFlash(true);
      prevFrameRef.current = frameCount;
      const t = setTimeout(() => setFlash(false), 150);
      return () => clearTimeout(t);
    }
  }, [frameCount]);

  // Progress ring sized to wrap the large QR
  const SIZE = 380;
  const CENTER = SIZE / 2;
  const ringRadius = CENTER - 8;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - progress);
  const innerSize = SIZE - 32;
  const imgSize = innerSize - 16;

  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '0.75rem',
      width: '100%',
    }}>
      {/* QR Container with glow + progress ring */}
      <div className="qr-glow" style={{
        position: 'relative',
        width: `${SIZE}px`,
        height: `${SIZE}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        '--glow-color': glowColor,
        borderRadius: '20px',
      }}>
        {/* SVG progress ring */}
        <svg
          width={SIZE} height={SIZE}
          style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}
        >
          <rect
            x="4" y="4" width={SIZE - 8} height={SIZE - 8} rx="16"
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="3"
          />
          <circle
            cx={CENTER} cy={CENTER} r={ringRadius}
            fill="none"
            stroke={glowColor}
            strokeWidth="3"
            strokeDasharray={ringCircumference}
            strokeDashoffset={ringOffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.3s ease, stroke 0.3s ease' }}
          />
        </svg>

        {/* QR Image */}
        <div style={{
          width: `${innerSize}px`,
          height: `${innerSize}px`,
          borderRadius: '14px',
          overflow: 'hidden',
          background: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: `2px solid ${flash ? glowColor : 'rgba(255,255,255,0.12)'}`,
          transition: 'border-color 0.15s ease',
          boxShadow: flash
            ? `0 0 30px ${glowColor}50, inset 0 0 15px ${glowColor}20`
            : '0 0 20px rgba(0,0,0,0.5)',
        }}>
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="QR Transfer Frame"
              style={{
                width: `${imgSize}px`,
                height: `${imgSize}px`,
                imageRendering: 'pixelated',
              }}
            />
          ) : (
            <div style={{
              color: '#666',
              fontSize: '0.85rem',
              textAlign: 'center',
              padding: '1rem',
            }}>
              Waiting...
            </div>
          )}
        </div>
      </div>

      {/* Frame Info */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        fontSize: '0.75rem',
        color: 'var(--color-text-muted)',
        fontFamily: 'var(--font-mono)',
      }}>
        <span style={{ color: glowColor, fontWeight: 600 }}>
          {packet ? PacketTypeName[packet.type] || 'UNKNOWN' : '---'}
        </span>
        <span>FRM #{frameCount}</span>
        <span>{Math.round(progress * 100)}%</span>
      </div>
    </div>
  );
}
