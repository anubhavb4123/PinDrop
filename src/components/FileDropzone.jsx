import { useState, useCallback } from "react";
import { Upload, File, X, AlertCircle } from "lucide-react";
import { validateFile, formatFileSize } from "../utils/pinUtils";

export default function FileDropzone({ onFileSelect, selectedFile, onClear }) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState(null);

  const handleFile = useCallback((file) => {
    setError(null);
    const validation = validateFile(file);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }
    onFileSelect(file);
  }, [onFileSelect]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleInputChange = useCallback((e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  if (selectedFile) {
    return (
      <div className="animate-scale-in" style={{
        background: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-accent)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-accent-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <File size={24} color="var(--color-accent)" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontWeight: 600,
            fontSize: '0.95rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {selectedFile.name}
          </p>
          <p style={{
            fontSize: '0.8rem',
            color: 'var(--color-text-muted)',
            marginTop: '0.2rem',
          }}>
            {formatFileSize(selectedFile.size)}
          </p>
        </div>
        <button
          onClick={onClear}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            border: '1px solid var(--color-border)',
            background: 'transparent',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => { // Change border and icon color to error on hover
            e.currentTarget.style.borderColor = 'var(--color-error)';
            e.currentTarget.style.color = 'var(--color-error)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-border)';
            e.currentTarget.style.color = 'var(--color-text-secondary)';
          }}
          aria-label="Remove file"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        className={`dropzone ${dragOver ? 'drag-over' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => document.getElementById('file-input').click()}
      >
        <input
          id="file-input"
          type="file"
          style={{ display: 'none' }}
          onChange={handleInputChange}
          accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.pdf,.zip,.txt,.doc,.docx"
        />
        <div className={dragOver ? 'animate-float' : ''} style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'var(--color-accent-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Upload size={28} color="var(--color-accent)" />
          </div>
          <div>
            <p style={{
              fontWeight: 600,
              fontSize: '1.05rem',
              marginBottom: '0.4rem',
            }}>
              {dragOver ? "Drop your file here" : "Drag & drop a file here"}
            </p>
            <p style={{
              fontSize: '0.85rem',
              color: 'var(--color-text-muted)',
            }}>
              or <span style={{ color: 'var(--color-accent)', fontWeight: 500 }}>browse files</span>
            </p>
          </div>
          <p style={{
            fontSize: '0.75rem',
            color: 'var(--color-text-muted)',
          }}>
            Images, PDF, ZIP, TXT • Max 10MB
          </p>
        </div>
      </div>

      {error && (
        <div className="animate-shake" style={{
          marginTop: '0.75rem',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-error-glow)',
          border: '1px solid var(--color-error)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.85rem',
          color: 'var(--color-error)',
        }}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}
    </div>
  );
}
