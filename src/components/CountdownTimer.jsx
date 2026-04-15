import { useState, useEffect } from "react";
import { getRemainingSeconds, formatTime } from "../utils/pinUtils";

export default function CountdownTimer({ expiresAt, onExpire }) {
  const [remaining, setRemaining] = useState(() => getRemainingSeconds(expiresAt));

  useEffect(() => {
    if (remaining <= 0) {
      onExpire?.();
      return;
    }

    const interval = setInterval(() => {
      const secs = getRemainingSeconds(expiresAt);
      setRemaining(secs);
      if (secs <= 0) {
        onExpire?.();
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpire, remaining]);

  const totalDuration = 600; // 10 minutes in seconds
  const progress = remaining / totalDuration;
  const circumference = 2 * Math.PI * 45;
  const offset = circumference * (1 - progress);

  const isUrgent = remaining <= 60;
  const color = isUrgent ? "var(--color-error)" : "var(--color-accent)";
  const glowColor = isUrgent ? "var(--color-error-glow)" : "var(--color-accent-glow)";

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '0.5rem',
    }}>
      <div style={{ position: 'relative', width: '120px', height: '120px' }}>
        <svg width="120" height="120" className="countdown-ring">
          <circle
            cx="60"
            cy="60"
            r="45"
            fill="none"
            stroke="var(--color-border)"
            strokeWidth="6"
          />
          <circle
            cx="60"
            cy="60"
            r="45"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              filter: `drop-shadow(0 0 8px ${glowColor})`,
              transition: 'stroke-dashoffset 1s linear, stroke 0.5s',
            }}
          />
        </svg>
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          transform: 'rotate(0deg)',
        }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '1.5rem',
            fontWeight: 700,
            color: color,
            transition: 'color 0.5s',
          }}>
            {formatTime(remaining)}
          </span>
        </div>
      </div>
      <span style={{
        fontSize: '0.8rem',
        color: isUrgent ? 'var(--color-error)' : 'var(--color-text-muted)',
        fontWeight: isUrgent ? 600 : 400,
        transition: 'color 0.5s',
      }}>
        {remaining <= 0 ? "Expired" : isUrgent ? "Expiring soon!" : "Time remaining"}
      </span>
    </div>
  );
}
