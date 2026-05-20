import { Activity, Zap, AlertTriangle, Clock, Gauge } from 'lucide-react';

export default function TransferStats({
  progress = 0,
  speed = 0,
  chunksReceived = 0,
  totalChunks = 0,
  errors = 0,
  fps = 6,
  elapsed = 0,
  mode = 'send', // 'send' | 'receive'
}) {
  const progressPercent = Math.round(progress * 100);
  const speedKB = (speed / 1024).toFixed(1);
  const errorRate = totalChunks > 0 ? ((errors / Math.max(chunksReceived, 1)) * 100).toFixed(1) : '0.0';
  const errorColor = errorRate < 5 ? '#22c55e' : errorRate < 15 ? '#f59e0b' : '#ef4444';

  // Time formatting
  const elapsedMin = Math.floor(elapsed / 60);
  const elapsedSec = Math.floor(elapsed % 60);
  const elapsedStr = `${elapsedMin}:${String(elapsedSec).padStart(2, '0')}`;

  // ETA
  const eta = progress > 0.01 ? Math.round((elapsed / progress) * (1 - progress)) : 0;
  const etaMin = Math.floor(eta / 60);
  const etaSec = Math.floor(eta % 60);
  const etaStr = progress > 0.01 ? `${etaMin}:${String(etaSec).padStart(2, '0')}` : '--:--';

  return (
    <div className="stats-bar" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '2px',
      background: 'rgba(255,255,255,0.02)',
      borderRadius: '12px',
      border: '1px solid rgba(255,255,255,0.06)',
      overflow: 'hidden',
      width: '100%',
    }}>
      {/* Progress */}
      <StatCell
        icon={<Activity size={13} />}
        label="Progress"
        value={`${chunksReceived}/${totalChunks}`}
        sub={`${progressPercent}%`}
        color="#00ffcc"
      />

      {/* Speed */}
      <StatCell
        icon={<Zap size={13} />}
        label="Speed"
        value={`${speedKB} KB/s`}
        sub={`${fps} FPS`}
        color="#a855f7"
      />

      {/* Errors */}
      <StatCell
        icon={<AlertTriangle size={13} />}
        label="Errors"
        value={String(errors)}
        sub={`${errorRate}%`}
        color={errorColor}
      />

      {/* Elapsed */}
      <StatCell
        icon={<Clock size={13} />}
        label="Elapsed"
        value={elapsedStr}
        color="var(--color-text-secondary)"
      />

      {/* ETA */}
      <StatCell
        icon={<Gauge size={13} />}
        label="ETA"
        value={etaStr}
        color="var(--color-text-secondary)"
      />

      {/* Mode */}
      <StatCell
        icon={mode === 'send' ?
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg> :
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        }
        label="Mode"
        value={mode === 'send' ? 'SENDING' : 'RECEIVING'}
        color={mode === 'send' ? '#3b82f6' : '#22c55e'}
      />

      {/* Full-width progress bar */}
      <div style={{
        gridColumn: '1 / -1',
        height: '3px',
        background: 'rgba(255,255,255,0.04)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          height: '100%',
          width: `${progressPercent}%`,
          background: 'linear-gradient(90deg, #00ffcc, #a855f7)',
          transition: 'width 0.3s ease',
          boxShadow: '0 0 8px #00ffcc40',
        }} />
      </div>
    </div>
  );
}

function StatCell({ icon, label, value, sub, color }) {
  return (
    <div style={{
      padding: '10px 12px',
      background: 'rgba(0,0,0,0.2)',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        fontSize: '0.6rem',
        color: 'var(--color-text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        <span style={{ color, display: 'flex' }}>{icon}</span>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.8rem',
        fontWeight: 700,
        color: color,
        lineHeight: 1,
      }}>
        {value}
      </div>
      {sub && (
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.6rem',
          color: 'var(--color-text-muted)',
        }}>
          {sub}
        </div>
      )}
    </div>
  );
}
