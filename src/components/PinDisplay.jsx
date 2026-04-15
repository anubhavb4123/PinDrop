import { useState } from "react";
import { Copy, Check, QrCode } from "lucide-react";
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
        <div className="animate-scale-in" style={{
          background: 'white',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
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
