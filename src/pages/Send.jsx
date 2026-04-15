import { useState } from "react";
import { ref as dbRef, set } from "firebase/database";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { database, storage } from "../firebase";
import { generateUniquePin } from "../utils/pinUtils";
import { Type, FileUp, Loader2, ArrowLeft, Send as SendIcon } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import FileDropzone from "../components/FileDropzone";
import PinDisplay from "../components/PinDisplay";

export default function Send() {
  const [mode, setMode] = useState("text"); // "text" or "file"
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { pin, expiresAt }

  const canSubmit = mode === "text" ? text.trim().length > 0 : file !== null;

  const handleGenerate = async () => {
    if (!canSubmit) return;
    setLoading(true);

    try {
      const pin = await generateUniquePin();
      const now = Date.now();
      const expiresAt = now + 10 * 60 * 1000; // 10 minutes

      if (mode === "text") {
        // Save text to Realtime Database
        await set(dbRef(database, `pins/${pin}`), {
          type: "text",
          content: text.trim(),
          createdAt: now,
          expiresAt: expiresAt,
        });
      } else {
        // Upload file to Firebase Storage
        const fileRef = storageRef(storage, `uploads/${pin}/${file.name}`);
        await uploadBytes(fileRef, file);
        const fileUrl = await getDownloadURL(fileRef);

        // Save file metadata to Realtime Database
        await set(dbRef(database, `pins/${pin}`), {
          type: "file",
          fileName: file.name,
          fileSize: file.size,
          fileUrl: fileUrl,
          createdAt: now,
          expiresAt: expiresAt,
        });
      }

      setResult({ pin, expiresAt });
      toast.success("PIN generated successfully!");
    } catch (error) {
      console.error("Error:", error);
      toast.error(error.message || "Failed to generate PIN. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setText("");
    setFile(null);
    setMode("text");
  };

  const handleExpire = () => {
    toast("Your PIN has expired", { icon: "⏰" });
  };

  // Show result after PIN generation
  if (result) {
    return (
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="max-container" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '3rem 1.5rem',
          minHeight: 'calc(100vh - 200px)',
        }}>
          <div className="glass-card-static" style={{
            width: '100%',
            maxWidth: '500px',
            overflow: 'hidden',
          }}>
            {/* Success Header */}
            <div style={{
              padding: '1.5rem 2rem',
              background: 'linear-gradient(135deg, rgba(108, 99, 255, 0.1), rgba(168, 85, 247, 0.1))',
              borderBottom: '1px solid var(--color-border)',
              textAlign: 'center',
            }}>
              <h2 style={{
                fontSize: '1.15rem',
                fontWeight: 700,
              }}>
                ✨ Ready to share!
              </h2>
              <p style={{
                fontSize: '0.85rem',
                color: 'var(--color-text-secondary)',
                marginTop: '0.3rem',
              }}>
                {mode === 'text' ? 'Text' : 'File'} has been uploaded successfully
              </p>
            </div>

            <PinDisplay
              pin={result.pin}
              expiresAt={result.expiresAt}
              onExpire={handleExpire}
            />
          </div>

          {/* Reset Button */}
          <button
            className="btn-secondary"
            onClick={handleReset}
            style={{ marginTop: '2rem' }}
          >
            <ArrowLeft size={16} />
            <span>Share something else</span>
          </button>
        </div>
      </div>
    );
  }

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
            <span className="gradient-text">Send</span> your data
          </h1>
          <p style={{
            color: 'var(--color-text-secondary)',
            fontSize: '1rem',
            maxWidth: '400px',
          }}>
            Paste text or upload a file. We'll generate a PIN for instant sharing.
          </p>
        </div>

        {/* Main Card */}
        <div className="glass-card-static animate-fade-in-up delay-100" style={{
          width: '100%',
          maxWidth: '560px',
          padding: '2rem',
          opacity: 0,
        }}>
          {/* Mode Switcher */}
          <div className="tab-switcher" style={{ marginBottom: '1.5rem' }}>
            <button
              className={`tab-btn ${mode === 'text' ? 'active' : ''}`}
              onClick={() => { setMode('text'); setFile(null); }}
            >
              <Type size={16} />
              <span>Text</span>
            </button>
            <button
              className={`tab-btn ${mode === 'file' ? 'active' : ''}`}
              onClick={() => { setMode('file'); setText(''); }}
            >
              <FileUp size={16} />
              <span>File</span>
            </button>
          </div>

          {/* Content Area */}
          {mode === "text" ? (
            <div style={{ marginBottom: '1.5rem' }}>
              <textarea
                className="input-field"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste your text, code, notes, links..."
                style={{ minHeight: '200px' }}
                id="text-input"
              />
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginTop: '0.5rem',
              }}>
                <span style={{
                  fontSize: '0.78rem',
                  color: 'var(--color-text-muted)',
                }}>
                  {text.length.toLocaleString()} characters
                </span>
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: '1.5rem' }}>
              <FileDropzone
                onFileSelect={setFile}
                selectedFile={file}
                onClear={() => setFile(null)}
              />
            </div>
          )}

          {/* Generate Button */}
          <button
            className="btn-primary"
            onClick={handleGenerate}
            disabled={!canSubmit || loading}
            id="generate-pin-btn"
            style={{ width: '100%', fontSize: '1.05rem', padding: '1rem' }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                <span>Generating PIN...</span>
              </>
            ) : (
              <>
                <SendIcon size={18} />
                <span>Generate PIN</span>
              </>
            )}
          </button>
        </div>

        {/* Bottom Link */}
        <p className="animate-fade-in delay-400" style={{
          marginTop: '2rem',
          fontSize: '0.85rem',
          color: 'var(--color-text-muted)',
          opacity: 0,
        }}>
          Already have a PIN?{" "}
          <Link to="/receive" style={{
            color: 'var(--color-accent)',
            textDecoration: 'none',
            fontWeight: 500,
          }}>
            Receive data →
          </Link>
        </p>
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
