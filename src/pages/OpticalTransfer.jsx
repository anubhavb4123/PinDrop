import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Upload, Type, Pause, Play, X, Download, Camera, QrCode, Radio, Shield, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { hapticLight, hapticMedium, hapticHeavy, hapticSuccess, hapticError } from '../utils/haptic';
import { SenderSession, ReceiverSession, PacketType, encodePacket, decodePacket, deriveKey, base64ToUint8Array } from '../utils/opticalProtocol';
import { generateQRDataUrl } from '../utils/qrEncoder';
import { CameraScanner, isCameraAvailable } from '../utils/qrScanner';
import QRDisplay from '../components/optical/QRDisplay';
import CameraPreview from '../components/optical/CameraPreview';
import TransferStats from '../components/optical/TransferStats';
import PacketGrid from '../components/optical/PacketGrid';

export default function OpticalTransfer() {
  // Setup state
  const [phase, setPhase] = useState('setup'); // setup | sending | receiving | done
  const [role, setRole] = useState('send');
  const [inputMode, setInputMode] = useState('file');
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [encrypted, setEncrypted] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [cameraAvailable, setCameraAvailable] = useState(true);

  // Transfer state
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [currentPacket, setCurrentPacket] = useState(null);
  const [progress, setProgress] = useState(0);
  const [frameCount, setFrameCount] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [errors, setErrors] = useState(0);
  const [fps, setFps] = useState(6);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [receivedChunks, setReceivedChunks] = useState(new Set());
  const [errorChunks, setErrorChunks] = useState(new Set());
  const [totalChunks, setTotalChunks] = useState(0);
  const [currentChunk, setCurrentChunk] = useState(-1);
  const [lastDecodeSuccess, setLastDecodeSuccess] = useState(null);
  const [resultData, setResultData] = useState(null);
  const [resultMeta, setResultMeta] = useState(null);

  // Refs
  const videoRef = useRef(null);
  const sessionRef = useRef(null);
  const scannerRef = useRef(null);
  const timerRef = useRef(null);
  const frameTimerRef = useRef(null);
  const elapsedRef = useRef(null);
  const responseQueueRef = useRef([]);
  const needsCameraRef = useRef(false);
  const phaseRef = useRef(phase);
  const roleRef = useRef(role);

  // Keep refs in sync with state
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { roleRef.current = role; }, [role]);

  useEffect(() => {
    isCameraAvailable().then(setCameraAvailable);
    return () => cleanup();
  }, []);

  // Start camera AFTER React renders the video element for the transfer phase
  useEffect(() => {
    if ((phase === 'sending' || phase === 'receiving') && needsCameraRef.current) {
      needsCameraRef.current = false;
      // Small delay to ensure video element is mounted
      const t = setTimeout(() => startCamera(), 100);
      return () => clearTimeout(t);
    }
  }, [phase]);

  const cleanup = useCallback(() => {
    scannerRef.current?.stop();
    clearInterval(timerRef.current);
    clearTimeout(frameTimerRef.current);
    clearInterval(elapsedRef.current);
  }, []);

  // ── SENDER FLOW ──
  const startSending = async () => {
    hapticHeavy();
    try {
      let data, fileName, dataType;
      if (inputMode === 'text') {
        data = new TextEncoder().encode(text);
        fileName = 'text-transfer.txt';
        dataType = 'text';
      } else {
        if (!file) return;
        const buf = await file.arrayBuffer();
        data = new Uint8Array(buf);
        fileName = file.name;
        dataType = 'file';
      }

      let encKey = null;
      if (encrypted && passphrase) {
        encKey = await deriveKey(passphrase);
      }

      const session = new SenderSession({ data, fileName, dataType, encrypted, encryptionKey: encKey });
      await session.prepare();
      sessionRef.current = session;
      setTotalChunks(session.totalChunks);
      needsCameraRef.current = true;
      setPhase('sending');
      toast.success(`Ready! ${session.totalChunks} chunks to send`);

      startElapsedTimer();
      sendNextFrame();
    } catch (err) {
      hapticError();
      toast.error('Failed to prepare: ' + err.message);
    }
  };

  const sendNextFrame = async () => {
    const session = sessionRef.current;
    if (!session || paused) return;

    // Check if we should show a response QR (ACK to receiver)
    const resp = responseQueueRef.current.shift();
    let packet;
    if (resp) {
      packet = resp;
    } else {
      packet = session.getCurrentPacket();
    }

    if (!packet) return;

    try {
      const url = await generateQRDataUrl(packet);
      setQrDataUrl(url);
      setCurrentPacket(packet);
      setFrameCount(f => f + 1);
      setProgress(session.getProgress());
      setSpeed(session.getSpeed());
      setErrors(session.stats.errors);
      setFps(session.adaptiveFps.getFps());
      setCurrentChunk(packet.chunkIndex);

      if (packet.type === PacketType.DATA) {
        session.advanceFrame();
      }

      if (session.isComplete()) {
        setPhase('done');
        hapticSuccess();
        toast.success('Transfer complete!');
        cleanup();
        return;
      }
    } catch (err) {
      console.error('Frame gen error:', err);
    }

    frameTimerRef.current = setTimeout(sendNextFrame, session.adaptiveFps.getInterval());
  };

  // ── RECEIVER FLOW ──
  const startReceiving = async () => {
    hapticHeavy();
    const session = new ReceiverSession();
    sessionRef.current = session;
    needsCameraRef.current = true;
    setPhase('receiving');
    toast('Scanning for sender...', { icon: '📡' });

    startElapsedTimer();
  };

  // ── CAMERA ──
  const startCamera = () => {
    if (!videoRef.current) {
      console.warn('[Optical] Video element not ready, retrying...');
      setTimeout(() => startCamera(), 200);
      return;
    }
    const scanner = new CameraScanner({
      onPacketDecoded: (packet, qrResult) => handleScannedPacket(packet),
      onScanResult: (success) => {
        if (success) setLastDecodeSuccess(Date.now());
      },
      facingMode: 'user',
    });
    scannerRef.current = scanner;
    scanner.start(videoRef.current).catch(err => {
      toast.error('Camera error: ' + err.message);
    });
  };

  const handleScannedPacket = useCallback((packet) => {
    const session = sessionRef.current;
    if (!session) return;

    // Use refs to avoid stale closure
    const currentPhase = phaseRef.current;
    const currentRole = roleRef.current;

    if (currentPhase === 'sending' || currentRole === 'send') {
      // Sender scanning ACKs/NACKs from receiver
      if (packet.type === PacketType.ACK) {
        session.handleAck(packet.chunkIndex);
        setReceivedChunks(prev => new Set([...prev, packet.chunkIndex]));
      } else if (packet.type === PacketType.NACK) {
        session.handleNack(packet.chunkIndex);
        setErrorChunks(prev => new Set([...prev, packet.chunkIndex]));
      } else if (packet.type === PacketType.RESEND_REQUEST) {
        try {
          const missing = JSON.parse(packet.payload);
          session.handleResendRequest(missing);
        } catch {}
      }
    } else {
      // Receiver scanning data from sender
      const response = session.handlePacket(packet);
      if (response) {
        responseQueueRef.current.push(response);
      }

      if (session.metadata) {
        setTotalChunks(session.totalChunks);
        setResultMeta(session.metadata);
      }
      setReceivedChunks(new Set(session.receivedChunks.keys()));
      setProgress(session.getProgress());
      setSpeed(session.getSpeed());
      setErrors(session.stats.errors);
      setCurrentChunk(packet.chunkIndex);

      // Show response QR
      showResponseQR();

      if (session.isComplete()) {
        finishReceiving();
      }
    }
  }, []);

  const showResponseQR = async () => {
    const resp = responseQueueRef.current.shift();
    if (!resp) return;
    try {
      const url = await generateQRDataUrl(resp);
      setQrDataUrl(url);
      setCurrentPacket(resp);
      setFrameCount(f => f + 1);
    } catch {}
  };

  const finishReceiving = async () => {
    const session = sessionRef.current;
    try {
      let encKey = null;
      if (session.metadata?.encrypted && passphrase) {
        encKey = await deriveKey(passphrase);
      }
      const data = await session.reconstruct(encKey);
      if (data) {
        setResultData(data);
        setPhase('done');
        hapticSuccess();
        toast.success('Transfer complete!');
        cleanup();
      }
    } catch (err) {
      hapticError();
      toast.error('Reconstruction failed: ' + err.message);
    }
  };

  const startElapsedTimer = () => {
    const start = Date.now();
    elapsedRef.current = setInterval(() => {
      setElapsed((Date.now() - start) / 1000);
    }, 1000);
  };

  const togglePause = () => {
    const newPaused = !paused;
    setPaused(newPaused);
    hapticMedium();
    if (newPaused) {
      scannerRef.current?.pause();
      sessionRef.current?.pause?.();
      clearTimeout(frameTimerRef.current);
    } else {
      scannerRef.current?.resume();
      sessionRef.current?.resume?.();
      if (role === 'send') sendNextFrame();
    }
  };

  const handleCancel = () => {
    hapticMedium();
    cleanup();
    setPhase('setup');
    setProgress(0);
    setFrameCount(0);
    setQrDataUrl(null);
    setReceivedChunks(new Set());
    setErrorChunks(new Set());
    setTotalChunks(0);
    setElapsed(0);
    setResultData(null);
    setResultMeta(null);
    responseQueueRef.current = [];
  };

  const downloadResult = () => {
    if (!resultData || !resultMeta) return;
    hapticHeavy();
    const blob = new Blob([resultData], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = resultMeta.fileName || 'received-file';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ═══ SETUP PHASE ═══
  if (phase === 'setup') {
    return (
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="max-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 1.5rem', minHeight: 'calc(100vh - 200px)' }}>
          {/* Header */}
          <div className="animate-fade-in-up" style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 1rem', borderRadius: '100px', background: 'rgba(0,255,204,0.06)', border: '1px solid rgba(0,255,204,0.12)', marginBottom: '1.25rem', fontSize: '0.8rem', color: '#00ffcc', fontWeight: 500 }}>
              <Radio size={13} />
              <span>Offline Optical Transfer</span>
            </div>
            <h1 style={{ fontSize: 'clamp(1.6rem, 5vw, 2.2rem)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.6rem' }}>
              <span className="gradient-text">QR</span> Optical Transfer
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', maxWidth: '400px' }}>
              Transfer files between devices using animated QR codes — no internet required.
            </p>
          </div>

          {/* Role Selector */}
          <div className="glass-card-static animate-fade-in-up delay-100" style={{ width: '100%', maxWidth: '480px', padding: '1.5rem', opacity: 0 }}>
            <div className="tab-switcher" style={{ marginBottom: '1.25rem' }}>
              <button className={`tab-btn ${role === 'send' ? 'active' : ''}`} onClick={() => { hapticLight(); setRole('send'); }}>
                <QrCode size={15} /><span>Send</span>
              </button>
              <button className={`tab-btn ${role === 'receive' ? 'active' : ''}`} onClick={() => { hapticLight(); setRole('receive'); }}>
                <Camera size={15} /><span>Receive</span>
              </button>
            </div>

            {role === 'send' ? (
              <>
                {/* Input Mode */}
                <div className="tab-switcher" style={{ marginBottom: '1rem' }}>
                  <button className={`tab-btn ${inputMode === 'text' ? 'active' : ''}`} onClick={() => { hapticLight(); setInputMode('text'); }} style={{ fontSize: '0.85rem', padding: '0.6rem' }}>
                    <Type size={14} /><span>Text</span>
                  </button>
                  <button className={`tab-btn ${inputMode === 'file' ? 'active' : ''}`} onClick={() => { hapticLight(); setInputMode('file'); }} style={{ fontSize: '0.85rem', padding: '0.6rem' }}>
                    <Upload size={14} /><span>File</span>
                  </button>
                </div>

                {inputMode === 'text' ? (
                  <textarea className="input-field" value={text} onChange={e => setText(e.target.value)} placeholder="Paste text to transfer..." style={{ minHeight: '120px', marginBottom: '1rem', fontSize: '0.9rem' }} />
                ) : (
                  <div style={{ marginBottom: '1rem' }}>
                    <label className="dropzone" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '2rem', cursor: 'pointer' }}>
                      <input type="file" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0])} />
                      <Upload size={28} color="var(--color-text-muted)" />
                      {file ? (
                        <div style={{ textAlign: 'center' }}>
                          <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>{file.name}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                      ) : (
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Tap to select a file (recommended &lt;500KB)</p>
                      )}
                    </label>
                    {file && file.size > 512000 && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-warning)', marginTop: '0.5rem', textAlign: 'center' }}>
                        ⚠️ Large files will take longer via optical transfer
                      </p>
                    )}
                  </div>
                )}

                {/* Encryption Toggle */}
                <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                      <Shield size={14} color={encrypted ? '#00ffcc' : 'var(--color-text-muted)'} />
                      <span>Encrypt transfer</span>
                    </div>
                    <div onClick={() => { hapticLight(); setEncrypted(!encrypted); }} style={{ width: '40px', height: '22px', borderRadius: '11px', background: encrypted ? '#00ffcc' : 'rgba(255,255,255,0.1)', padding: '2px', cursor: 'pointer', transition: 'background 0.2s' }}>
                      <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'white', transform: encrypted ? 'translateX(18px)' : 'translateX(0)', transition: 'transform 0.2s' }} />
                    </div>
                  </label>
                  {encrypted && (
                    <input className="input-field" type="password" value={passphrase} onChange={e => setPassphrase(e.target.value)} placeholder="Shared passphrase" style={{ marginTop: '0.75rem', fontSize: '0.85rem', padding: '0.6rem 1rem' }} />
                  )}
                </div>

                <button className="btn-primary" onClick={startSending} disabled={inputMode === 'text' ? !text.trim() : !file} style={{ width: '100%', fontSize: '1rem', padding: '0.875rem' }}>
                  <QrCode size={18} /><span>Start Sending</span>
                </button>
              </>
            ) : (
              <>
                <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(0,255,204,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                    <Camera size={28} color="#00ffcc" />
                  </div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>Point your camera at the sender's QR code</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Make sure both devices can see each other</p>
                </div>

                {encrypted && (
                  <input className="input-field" type="password" value={passphrase} onChange={e => setPassphrase(e.target.value)} placeholder="Enter shared passphrase" style={{ marginBottom: '1rem', fontSize: '0.85rem', padding: '0.6rem 1rem' }} />
                )}

                <button className="btn-primary" onClick={startReceiving} style={{ width: '100%', fontSize: '1rem', padding: '0.875rem' }}>
                  <Camera size={18} /><span>Start Receiving</span>
                </button>
              </>
            )}
          </div>

          <Link to="/" className="animate-fade-in delay-300" style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem', opacity: 0 }}>
            <ArrowLeft size={14} /> Back to home
          </Link>
        </div>
      </div>
    );
  }

  // ═══ TRANSFER PHASE ═══
  if (phase === 'sending' || phase === 'receiving') {
    return (
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="max-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1rem 1rem', minHeight: 'calc(100vh - 200px)', gap: '0.75rem' }}>
          {/* Title */}
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.25rem' }}>
              <span style={{ color: '#00ffcc' }}>●</span> {role === 'send' ? 'Sending' : 'Receiving'} via Optical QR
            </h2>
            <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
              {paused ? 'PAUSED' : 'ACTIVE'} — Half-duplex mode
            </p>
          </div>

          {/* Side-by-side on desktop: QR left, Camera right */}
          <div className="optical-split-view" style={{
            display: 'flex',
            gap: '1.5rem',
            width: '100%',
            maxWidth: '900px',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {/* QR Display — LEFT on desktop */}
            <div className="optical-qr-panel" style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <QRDisplay qrDataUrl={qrDataUrl} packet={currentPacket} progress={progress} frameCount={frameCount} />
            </div>

            {/* Camera Preview — RIGHT on desktop */}
            <div className="optical-camera-panel" style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <CameraPreview videoRef={videoRef} active={!paused} lastDecodeSuccess={lastDecodeSuccess} />
            </div>
          </div>

          {/* Stats */}
          <div style={{ width: '100%', maxWidth: '900px' }}>
            <TransferStats progress={progress} speed={speed} chunksReceived={receivedChunks.size} totalChunks={totalChunks} errors={errors} fps={fps} elapsed={elapsed} mode={role} />
          </div>

          {/* Packet Grid */}
          <div style={{ width: '100%', maxWidth: '900px' }}>
            <PacketGrid totalChunks={totalChunks} receivedChunks={receivedChunks} errorChunks={errorChunks} currentChunk={currentChunk} />
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', gap: '0.75rem', width: '100%', maxWidth: '400px' }}>
            <button className="btn-secondary" onClick={togglePause} style={{ flex: 1, justifyContent: 'center' }}>
              {paused ? <Play size={16} /> : <Pause size={16} />}
              <span>{paused ? 'Resume' : 'Pause'}</span>
            </button>
            <button className="btn-secondary" onClick={handleCancel} style={{ borderColor: 'rgba(239,68,68,0.3)', color: 'var(--color-error)' }}>
              <X size={16} /><span>Cancel</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══ DONE PHASE ═══
  return (
    <div style={{ position: 'relative', zIndex: 1 }}>
      <div className="max-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 1.5rem', minHeight: 'calc(100vh - 200px)' }}>
        <div className="glass-card-static animate-scale-in" style={{ width: '100%', maxWidth: '480px', overflow: 'hidden' }}>
          {/* Success Header */}
          <div style={{ padding: '2rem', textAlign: 'center', background: 'linear-gradient(135deg, rgba(0,255,204,0.06), rgba(168,85,247,0.06))', borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(0,255,204,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', border: '2px solid rgba(0,255,204,0.2)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00ffcc" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.3rem' }}>Transfer Complete!</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
              {receivedChunks.size}/{totalChunks} chunks • {Math.round(elapsed)}s • {errors} errors
            </p>
          </div>

          <div style={{ padding: '1.5rem' }}>
            {/* Summary Stats */}
            <TransferStats progress={1} speed={speed} chunksReceived={receivedChunks.size} totalChunks={totalChunks} errors={errors} fps={fps} elapsed={elapsed} mode={role} />

            {/* Download / View Result */}
            {role === 'receive' && resultData && (
              <div style={{ marginTop: '1.25rem' }}>
                {resultMeta?.dataType === 'text' ? (
                  <>
                    <div style={{ background: 'var(--color-bg-primary)', borderRadius: '8px', padding: '1rem', maxHeight: '200px', overflow: 'auto', border: '1px solid var(--color-border)', marginBottom: '0.75rem' }}>
                      <pre style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--color-text-primary)', margin: 0 }}>
                        {new TextDecoder().decode(resultData)}
                      </pre>
                    </div>
                    <button className="btn-secondary" onClick={() => { navigator.clipboard.writeText(new TextDecoder().decode(resultData)); hapticMedium(); toast.success('Copied!'); }} style={{ width: '100%' }}>
                      <span>Copy Text</span>
                    </button>
                  </>
                ) : (
                  <button className="btn-primary" onClick={downloadResult} style={{ width: '100%', fontSize: '1rem', padding: '0.875rem' }}>
                    <Download size={18} /><span>Download {resultMeta?.fileName}</span>
                  </button>
                )}
              </div>
            )}

            {role === 'send' && (
              <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                All chunks acknowledged by receiver ✓
              </p>
            )}
          </div>
        </div>

        <button className="btn-secondary" onClick={handleCancel} style={{ marginTop: '1.5rem' }}>
          <ArrowLeft size={16} /><span>New Transfer</span>
        </button>
      </div>
    </div>
  );
}
