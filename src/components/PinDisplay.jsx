import { useState } from "react";
import { Copy, Check, QrCode, ScanLine } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { formatPin } from "../utils/pinUtils";
import CountdownTimer from "./CountdownTimer";

export default function PinDisplay({ pin, expiresAt, onExpire }) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textArea = document.createElement("textarea");
      textArea.value = pin;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareUrl = `${window.location.origin}/receive?pin=${pin}`;
// For development/testing, you might want to use a localhost URL instead:
  return (
    <div className="animate-scale-in" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '2rem',
      padding: '2.5rem 2rem',
    }}>
      {/* PIN Label */}
      <p style={{
        fontSize: '0.9rem',
        color: 'var(--color-text-secondary)',
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
      }}>
        Your sharing PIN
      </p>

      {/* Large PIN Display */}
      <div className="animate-pulse-glow" style={{
        background: 'var(--color-bg-secondary)',
        border: '2px solid var(--color-accent)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.5rem 3rem',
        position: 'relative',
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'clamp(2.5rem, 8vw, 4rem)',
          fontWeight: 800,
          letterSpacing: '0.5em',
          color: 'var(--color-text-primary)',
        }}>
          {formatPin(pin)}
        </span>
      </div>

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '0.75rem',
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}>
        <button
          className="btn-secondary"
          onClick={handleCopy}
          style={{
            borderColor: copied ? 'var(--color-success)' : undefined,
            color: copied ? 'var(--color-success)' : undefined,
          }}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          <span>{copied ? "Copied!" : "Copy PIN"}</span>
        </button>

        <button
          className="btn-secondary"
          onClick={() => setShowQR(!showQR)}
          style={{
            borderColor: showQR ? 'var(--color-accent)' : undefined,
            color: showQR ? 'var(--color-accent-light)' : undefined,
          }}
        >
          <QrCode size={16} />
          <span>{showQR ? "Hide QR" : "Show QR"}</span>
        </button>
      </div>

      {/* QR Code */}
      {showQR && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.85rem' }}>
          <div className="animate-scale-in" style={{
            background: 'white',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.06)',
          }}>
            <QRCodeSVG
              value={shareUrl}
              size={180}
              bgColor="white"
              fgColor="#0a0a0f"
              level="M"
              includeMargin={false}
            />
          </div>

          {/* Google Lens tip */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.55rem',
            padding: '0.65rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(66, 133, 244, 0.08)',
            border: '1px solid rgba(66, 133, 244, 0.2)',
            maxWidth: '260px',
          }}>
            <ScanLine size={15} style={{ flexShrink: 0, color: '#4285f4', marginTop: '1px' }} />
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              To scan this QR, open <strong style={{ color: '#a8c7fa' }}>Google Lens</strong> and scan it.
            </span>
          </div>
        </div>
      )}

      {/* Countdown Timer */}
      <CountdownTimer expiresAt={expiresAt} onExpire={onExpire} />

      {/* Share URL hint */}
      <p style={{
        fontSize: '0.78rem',
        color: 'var(--color-text-muted)',
        textAlign: 'center',
        maxWidth: '300px',
      }}>
        Share this PIN with others or scan the QR code to retrieve on another device
      </p>
    </div>
  );
}
