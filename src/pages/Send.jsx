import { useState } from "react";
import { ref as dbRef, set } from "firebase/database";
import { database } from "../firebase";
import { generateUniquePin } from "../utils/pinUtils";
import { hapticLight, hapticMedium, hapticHeavy, hapticSuccess, hapticError } from "../utils/haptic";
import { Type, FileUp, Loader2, ArrowLeft, Send as SendIcon, Link2 } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import FileDropzone from "../components/FileDropzone";
import PinDisplay from "../components/PinDisplay";

function isValidUrl(str) {
  try {
    const url = new URL(str.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export default function Send() {
  const [mode, setMode] = useState("text"); // "text" | "file" | "link"
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { pin, mode }

  const canSubmit =
    mode === "text"
      ? text.trim().length > 0
      : mode === "file"
      ? file !== null
      : isValidUrl(link);

  const handleGenerate = async () => {
    if (!canSubmit) return;
    hapticHeavy();
    setLoading(true);

    try {
      const pin = await generateUniquePin();
      const now = Date.now();

      if (mode === "text") {
        await set(dbRef(database, `pins/${pin}`), {
          type: "text",
          content: text.trim(),
          createdAt: now,
        });
      } else if (mode === "link") {
        await set(dbRef(database, `pins/${pin}`), {
          type: "link",
          content: link.trim(),
          createdAt: now,
        });
      } else {
        // Convert file to base64
        const base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result.split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        await set(dbRef(database, `pins/${pin}`), {
          type: "file",
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          fileData: base64Data,
          createdAt: now,
        });
      }

      setResult({ pin, mode });
      hapticSuccess();
      toast.success("PIN generated successfully!");
    } catch (error) {
      console.error("Error:", error);
      hapticError();
      toast.error(error.message || "Failed to generate PIN. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setText("");
    setLink("");
    setFile(null);
    setMode("text");
  };

  const modeLabel = result?.mode === "link" ? "Link" : result?.mode === "file" ? "File" : "Text";

  // Show result after PIN generation
  if (result) {
    return (
      <div style={{ position: "relative", zIndex: 1 }}>
        <div
          className="max-container"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "3rem 1.5rem",
            minHeight: "calc(100vh - 200px)",
          }}
        >
          <div
            className="glass-card-static"
            style={{ width: "100%", maxWidth: "500px", overflow: "hidden" }}
          >
            {/* Success Header */}
            <div
              style={{
                padding: "1.5rem 2rem",
                background:
                  "linear-gradient(135deg, rgba(108, 99, 255, 0.1), rgba(168, 85, 247, 0.1))",
                borderBottom: "1px solid var(--color-border)",
                textAlign: "center",
              }}
            >
              <h2 style={{ fontSize: "1.15rem", fontWeight: 700 }}>
                ✨ Ready to share!
              </h2>
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "var(--color-text-secondary)",
                  marginTop: "0.3rem",
                }}
              >
                {modeLabel} has been uploaded successfully
              </p>
            </div>

            <PinDisplay
              pin={result.pin}
            />
          </div>

          {/* Reset Button */}
          <button
            className="btn-secondary"
            onClick={handleReset}
            style={{ marginTop: "2rem" }}
          >
            <ArrowLeft size={16} />
            <span>Share something else</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", zIndex: 1 }}>
      <div
        className="max-container"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "3rem 1.5rem",
          minHeight: "calc(100vh - 200px)",
        }}
      >
        {/* Page Header */}
        <div
          className="animate-fade-in-up"
          style={{ textAlign: "center", marginBottom: "2.5rem" }}
        >
          <h1
            style={{
              fontSize: "clamp(1.8rem, 5vw, 2.5rem)",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              marginBottom: "0.75rem",
            }}
          >
            <span className="gradient-text">Send</span> your data
          </h1>
          <p
            style={{
              color: "var(--color-text-secondary)",
              fontSize: "1rem",
              maxWidth: "400px",
            }}
          >
            Paste text, share a link, or upload a file. We'll generate a PIN for
            instant sharing.
          </p>
        </div>

        {/* Main Card */}
        <div
          className="glass-card-static animate-fade-in-up delay-100"
          style={{ width: "100%", maxWidth: "560px", padding: "2rem", opacity: 0 }}
        >
          {/* Mode Switcher */}
          <div className="tab-switcher" style={{ marginBottom: "1.5rem" }}>
            <button
              className={`tab-btn ${mode === "text" ? "active" : ""}`}
              onClick={() => { hapticLight(); setMode("text"); setFile(null); setLink(""); }}
            >
              <Type size={16} />
              <span>Text</span>
            </button>
            <button
              className={`tab-btn ${mode === "link" ? "active" : ""}`}
              onClick={() => { hapticLight(); setMode("link"); setFile(null); setText(""); }}
            >
              <Link2 size={16} />
              <span>Link</span>
            </button>
            <button
              className={`tab-btn ${mode === "file" ? "active" : ""}`}
              onClick={() => { hapticLight(); setMode("file"); setText(""); setLink(""); }}
            >
              <FileUp size={16} />
              <span>File</span>
            </button>
          </div>

          {/* Content Area */}
          {mode === "text" ? (
            <div style={{ marginBottom: "1.5rem" }}>
              <textarea
                className="input-field"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste your text, code, notes..."
                style={{ minHeight: "200px" }}
                id="text-input"
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: "0.5rem",
                }}
              >
                <span style={{ fontSize: "0.78rem", color: "var(--color-text-muted)" }}>
                  {text.length.toLocaleString()} characters
                </span>
              </div>
            </div>
          ) : mode === "link" ? (
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ position: "relative" }}>
                {/* Link icon inside input */}
                <div
                  style={{
                    position: "absolute",
                    left: "1rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--color-text-muted)",
                    pointerEvents: "none",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <Link2 size={16} />
                </div>
                <input
                  type="url"
                  className="input-field"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://example.com"
                  id="link-input"
                  style={{ paddingLeft: "2.75rem" }}
                />
              </div>
              {link && !isValidUrl(link) && (
                <p
                  style={{
                    fontSize: "0.78rem",
                    color: "var(--color-error)",
                    marginTop: "0.5rem",
                    paddingLeft: "0.25rem",
                  }}
                >
                  Please enter a valid URL starting with http:// or https://
                </p>
              )}
              {link && isValidUrl(link) && (
                <p
                  style={{
                    fontSize: "0.78rem",
                    color: "var(--color-success)",
                    marginTop: "0.5rem",
                    paddingLeft: "0.25rem",
                  }}
                >
                  ✓ Valid URL
                </p>
              )}
            </div>
          ) : (
            <div style={{ marginBottom: "1.5rem" }}>
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
            style={{ width: "100%", fontSize: "1.05rem", padding: "1rem" }}
          >
            {loading ? (
              <>
                <Loader2
                  size={18}
                  className="animate-spin"
                  style={{ animation: "spin 1s linear infinite" }}
                />
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
        <p
          className="animate-fade-in delay-400"
          style={{
            marginTop: "2rem",
            fontSize: "0.85rem",
            color: "var(--color-text-muted)",
            opacity: 0,
          }}
        >
          Already have a PIN?{" "}
          <Link
            to="/receive"
            style={{ color: "var(--color-accent)", textDecoration: "none", fontWeight: 500 }}
          >
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
