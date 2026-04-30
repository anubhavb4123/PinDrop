import { useState, useEffect, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { ref as dbRef, get } from "firebase/database";
import { database } from "../firebase";
import { isPinExpired, formatFileSize } from "../utils/pinUtils";
import {
  Search, Loader2, Copy, Check, Download, FileText,
  Clock, AlertTriangle, ArrowLeft, File
} from "lucide-react";
import toast from "react-hot-toast";

export default function Receive() {
  const [searchParams] = useSearchParams();
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef(null);

  // Auto-fill PIN from URL query param
  useEffect(() => {
    const urlPin = searchParams.get("pin");
    if (urlPin && urlPin.length === 6) {
      setPin(urlPin);
    }
  }, [searchParams]);

  const handlePinChange = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setPin(value);
    setError(null);
    setData(null);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (pin.length !== 6) {
      setError("Please enter a valid 6-digit PIN");
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const pinRef = dbRef(database, `pins/${pin}`);
      const snapshot = await get(pinRef);

      if (!snapshot.exists()) {
        setError("Invalid PIN. No data found for this PIN.");
        toast.error("Invalid PIN");
        return;
      }

      const pinData = snapshot.val();

      // If it's a file, reconstruct blob URL from base64
      if (pinData.type === "file" && pinData.fileData) {
        const byteCharacters = atob(pinData.fileData);
        const byteArray = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteArray[i] = byteCharacters.charCodeAt(i);
        }
        const blob = new Blob([byteArray], {
          type: pinData.fileType || 'application/octet-stream',
        });
        pinData.fileUrl = URL.createObjectURL(blob);
      }

      if (isPinExpired(pinData.expiresAt)) {
        setError("This PIN has expired. PINs are valid for 10 minutes only.");
        toast.error("PIN expired");
        return;
      }

      setData(pinData);
      toast.success("Data retrieved successfully!");

      // Auto-copy text if it's text data
      if (pinData.type === "text") {
        try {
          await navigator.clipboard.writeText(pinData.content);
          toast("Text auto-copied to clipboard!", { icon: "📋" });
        } catch {
          // Clipboard API not available
        }
      }
    } catch (err) {
      console.error("Error:", err);
      setError("Failed to retrieve data. Please check your connection and try again.");
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyText = async () => {
    if (!data?.content) return;
    try {
      await navigator.clipboard.writeText(data.content);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textArea = document.createElement("textarea");
      textArea.value = data.content;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReset = () => {
    setPin("");
    setData(null);
    setError(null);
    inputRef.current?.focus();
  };

  return (
    <div style={{ position: 'relative', zIndex: 1 }}>
      <div className="max-container" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '3rem 1.5rem',
        minHeight: 'calc(100vh - 200px)',
      }}>
        {/* Page Header */}
        <div className="animate-fade-in-up" style={{
          textAlign: 'center',
          marginBottom: '2.5rem',
        }}>
          <h1 style={{
            fontSize: 'clamp(1.8rem, 5vw, 2.5rem)',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            marginBottom: '0.75rem',
          }}>
            <span className="gradient-text">Receive</span> your data
          </h1>
          <p style={{
            color: 'var(--color-text-secondary)',
            fontSize: '1rem',
            maxWidth: '400px',
          }}>
            Enter the 6-digit PIN to retrieve shared text or download a file.
          </p>
        </div>

        {/* PIN Input Card */}
        <div className="glass-card-static animate-fade-in-up delay-100" style={{
          width: '100%',
          maxWidth: '500px',
          padding: '2.5rem 2rem',
          opacity: 0,
        }}>
          <form onSubmit={handleSubmit}>
            {/* PIN Input */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1.5rem',
            }}>
              <label style={{
                fontSize: '0.9rem',
                color: 'var(--color-text-secondary)',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}>
                Enter PIN
              </label>

              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                className={`pin-input ${error ? 'animate-shake' : ''}`}
                value={pin}
                onChange={handlePinChange}
                placeholder="000000"
                maxLength={6}
                autoFocus
                id="pin-input"
                style={error ? {
                  borderColor: 'var(--color-error)',
                  boxShadow: '0 0 0 4px var(--color-error-glow)',
                } : {}}
              />

              <button
                type="submit"
                className="btn-primary"
                disabled={pin.length !== 6 || loading}
                id="get-data-btn"
                style={{ width: '100%', maxWidth: '400px', fontSize: '1.05rem', padding: '1rem' }}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Retrieving...</span>
                  </>
                ) : (
                  <>
                    <Search size={18} />
                    <span>Get Data</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Error State */}
          {error && (
            <div className="animate-scale-in" style={{
              marginTop: '1.5rem',
              padding: '1rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-error-glow)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
            }}>
              {error.includes("expired") ? (
                <Clock size={18} color="var(--color-error)" style={{ flexShrink: 0, marginTop: '1px' }} />
              ) : (
                <AlertTriangle size={18} color="var(--color-error)" style={{ flexShrink: 0, marginTop: '1px' }} />
              )}
              <p style={{
                fontSize: '0.9rem',
                color: 'var(--color-error)',
                lineHeight: 1.5,
              }}>
                {error}
              </p>
            </div>
          )}
        </div>

        {/* Data Result */}
        {data && (
          <div className="glass-card-static animate-scale-in" style={{
            width: '100%',
            maxWidth: '500px',
            marginTop: '1.5rem',
            overflow: 'hidden',
          }}>
            {/* Result Header */}
            <div style={{
              padding: '1rem 1.5rem',
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08), rgba(108, 99, 255, 0.08))',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}>
              {data.type === "text" ? (
                <FileText size={18} color="var(--color-success)" />
              ) : (
                <File size={18} color="var(--color-accent)" />
              )}
              <span style={{
                fontSize: '0.9rem',
                fontWeight: 600,
                color: 'var(--color-success)',
              }}>
                {data.type === "text" ? "Text Retrieved" : "File Ready"}
              </span>
            </div>

            <div style={{ padding: '1.5rem' }}>
              {data.type === "text" ? (
                <>
                  {/* Text Content */}
                  <div style={{
                    background: 'var(--color-bg-primary)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.25rem',
                    maxHeight: '300px',
                    overflow: 'auto',
                    marginBottom: '1rem',
                    border: '1px solid var(--color-border)',
                  }}>
                    <pre style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.88rem',
                      lineHeight: 1.7,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      color: 'var(--color-text-primary)',
                      margin: 0,
                    }}>
                      {data.content}
                    </pre>
                  </div>

                  <button
                    className="btn-secondary"
                    onClick={handleCopyText}
                    style={{
                      width: '100%',
                      borderColor: copied ? 'var(--color-success)' : undefined,
                      color: copied ? 'var(--color-success)' : undefined,
                    }}
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    <span>{copied ? "Copied!" : "Copy Text"}</span>
                  </button>
                </>
              ) : (
                <>
                  {/* File Info */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    marginBottom: '1.25rem',
                    padding: '1rem',
                    background: 'var(--color-bg-primary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                  }}>
                    <div style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--color-accent-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <File size={22} color="var(--color-accent)" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{
                        fontWeight: 600,
                        fontSize: '0.95rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {data.fileName}
                      </p>
                      <p style={{
                        fontSize: '0.8rem',
                        color: 'var(--color-text-muted)',
                        marginTop: '0.15rem',
                      }}>
                        {formatFileSize(data.fileSize)}
                      </p>
                    </div>
                  </div>

                  <a
                    href={data.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={data.fileName}
                    style={{ textDecoration: 'none', display: 'block' }}
                  >
                    <button className="btn-primary" style={{
                      width: '100%',
                      fontSize: '1rem',
                      padding: '0.875rem',
                    }}>
                      <Download size={18} />
                      <span>Download File</span>
                    </button>
                  </a>
                </>
              )}
            </div>
          </div>
        )}

        {/* Reset / Back */}
        {(data || error) && (
          <button
            className="btn-secondary animate-fade-in"
            onClick={handleReset}
            style={{ marginTop: '1.5rem' }}
          >
            <ArrowLeft size={16} />
            <span>Try another PIN</span>
          </button>
        )}

        {/* Bottom Link */}
        {!data && !error && (
          <p className="animate-fade-in delay-300" style={{
            marginTop: '2rem',
            fontSize: '0.85rem',
            color: 'var(--color-text-muted)',
            opacity: 0,
          }}>
            Need to share?{" "}
            <Link to="/send" style={{
              color: 'var(--color-accent)',
              textDecoration: 'none',
              fontWeight: 500,
            }}>
              Send data →
            </Link>
          </p>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
