/**
 * QR Code Scanner — Camera-based QR decoding for optical transfer.
 * 
 * Uses getUserMedia for camera access and jsQR for frame-by-frame decoding.
 * Supports front/rear camera, scan quality metrics, and cleanup.
 */

import jsQR from 'jsqr';
import { decodePacket } from './opticalProtocol';

/**
Camera Scanner class — manages video stream and continuous QR decoding.
 */
export class CameraScanner {
  constructor({ onPacketDecoded, onScanResult, facingMode = 'environment' }) {
    this.onPacketDecoded = onPacketDecoded;
    this.onScanResult = onScanResult;
    this.facingMode = facingMode;

    this.videoElement = null;
    this.canvasElement = null;
    this.canvasCtx = null;
    this.stream = null;
    this.animFrameId = null;
    this.running = false;
    this.paused = false;

    // Scan metrics
    this.totalScans = 0;
    this.successfulScans = 0;
    this.lastDecodeTime = 0;
    this.scanInterval = 100; // ms between decode attempts (lower = more CPU)
  }

  /**
   * Initialize camera and start scanning.
   * @param {HTMLVideoElement} videoEl - Video element for preview
   * @returns {Promise<void>}
   */
  async start(videoEl) {
    this.videoElement = videoEl;

    // Create offscreen canvas for frame extraction
    this.canvasElement = document.createElement('canvas');
    this.canvasCtx = this.canvasElement.getContext('2d', { willReadFrequently: true });

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: this.facingMode,
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      });

      this.videoElement.srcObject = this.stream;
      await this.videoElement.play();

      // Set canvas size to match video
      this.canvasElement.width = this.videoElement.videoWidth || 640;
      this.canvasElement.height = this.videoElement.videoHeight || 480;

      this.running = true;
      this.scanLoop();
    } catch (err) {
      console.error('[QR Scanner] Camera init failed:', err);
      throw err;
    }
  }

  /**
   * Main scanning loop — captures frames and attempts QR decode.
   */
  scanLoop() {
    if (!this.running) return;

    const now = performance.now();
    if (now - this.lastDecodeTime >= this.scanInterval && !this.paused) {
      this.lastDecodeTime = now;
      this.attemptDecode();
    }

    this.animFrameId = requestAnimationFrame(() => this.scanLoop());
  }

  /**
   * Attempt to decode a QR code from the current video frame.
   */
  attemptDecode() {
    if (!this.videoElement || this.videoElement.readyState < 2) return;

    const { videoWidth, videoHeight } = this.videoElement;
    if (!videoWidth || !videoHeight) return;

    // Update canvas size if video dimensions changed
    if (this.canvasElement.width !== videoWidth) {
      this.canvasElement.width = videoWidth;
      this.canvasElement.height = videoHeight;
    }

    // Draw current frame
    this.canvasCtx.drawImage(this.videoElement, 0, 0, videoWidth, videoHeight);
    const imageData = this.canvasCtx.getImageData(0, 0, videoWidth, videoHeight);

    // Attempt QR decode
    this.totalScans++;
    const qrResult = jsQR(imageData.data, videoWidth, videoHeight, {
      inversionAttempts: 'dontInvert', // Speed optimization
    });

    if (qrResult && qrResult.data) {
      this.successfulScans++;
      const packet = decodePacket(qrResult.data);

      if (packet) {
        this.onPacketDecoded?.(packet, qrResult);
      }
      this.onScanResult?.(true, qrResult);
    } else {
      this.onScanResult?.(false, null);
    }
  }

  /**
   * Update the scan interval (inverse of FPS).
   * @param {number} intervalMs
   */
  setScanInterval(intervalMs) {
    this.scanInterval = Math.max(33, intervalMs); // Cap at ~30fps
  }

  /**
   * Get scan success rate.
   * @returns {number} 0-1
   */
  getSuccessRate() {
    if (this.totalScans === 0) return 0;
    return this.successfulScans / this.totalScans;
  }

  /**
   * Get scan metrics.
   */
  getMetrics() {
    return {
      totalScans: this.totalScans,
      successfulScans: this.successfulScans,
      successRate: this.getSuccessRate(),
    };
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
  }

  /**
   * Stop scanning and release camera.
   */
  stop() {
    this.running = false;

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
  }
}

/**
 * Check if camera access is available.
 * @returns {Promise<boolean>}
 */
export async function isCameraAvailable() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.some(d => d.kind === 'videoinput');
  } catch {
    return false;
  }
}

/**
 * Request camera permissions explicitly.
 * @returns {Promise<boolean>}
 */
export async function requestCameraPermission() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach(t => t.stop());
    return true;
  } catch {
    return false;
  }
}
