/**
 * QR Code Encoder — High-performance QR generation for optical transfer.
 * Generates QR codes to an offscreen canvas using the `qrcode` library.
 * Supports pre-rendering frame queues and dynamic error correction.
 */

import QRCode from 'qrcode';
import { encodePacket } from './opticalProtocol';

// ─── QR Generation Options ──────────────────────────────────────
const BASE_OPTIONS = {
  errorCorrectionLevel: 'L', // Max capacity — most data per frame
  margin: 2,
  width: 400,
  color: {
    dark: '#000000',   // Standard black modules — best for scanning
    light: '#ffffff',  // White background — maximum contrast
  },
};

/**
 * Generate a QR code data URL from a packet object.
 * @param {Object} packet - Protocol packet to encode
 * @param {Object} [opts] - Override QR options
 * @returns {Promise<string>} - Data URL of the QR code image
 */
export async function generateQRDataUrl(packet, opts = {}) {
  const data = encodePacket(packet);
  const options = { ...BASE_OPTIONS, ...opts };

  try {
    return await QRCode.toDataURL(data, options);
  } catch (err) {
    console.error('[QR Encoder] Generation failed:', err);
    // Fallback with medium error correction (smaller capacity but more robust)
    return await QRCode.toDataURL(data, { ...options, errorCorrectionLevel: 'M' });
  }
}

/**
 * Generate a QR code and render it to a canvas element.
 * @param {HTMLCanvasElement} canvas - Target canvas
 * @param {Object} packet - Protocol packet to encode
 * @param {Object} [opts] - Override QR options
 */
export async function renderQRToCanvas(canvas, packet, opts = {}) {
  const data = encodePacket(packet);
  const options = {
    ...BASE_OPTIONS,
    width: canvas.width || 280,
    ...opts,
  };

  try {
    await QRCode.toCanvas(canvas, data, options);
  } catch (err) {
    console.error('[QR Encoder] Canvas render failed:', err);
    await QRCode.toCanvas(canvas, data, { ...options, errorCorrectionLevel: 'M' });
  }
}

/**
 * Pre-render a batch of QR frames as data URLs for smooth animation.
 * @param {Array<Object>} packets - Array of protocol packets
 * @param {Object} [opts] - QR options
 * @returns {Promise<string[]>} - Array of data URLs
 */
export async function preRenderFrames(packets, opts = {}) {
  const urls = [];
  for (const packet of packets) {
    const url = await generateQRDataUrl(packet, opts);
    urls.push(url);
  }
  return urls;
}

/**
 * Frame Queue Manager — pre-renders upcoming QR frames for smooth display.
 */
export class FrameQueue {
  constructor(bufferSize = 3) {
    this.buffer = [];
    this.bufferSize = bufferSize;
    this.rendering = false;
  }

  /**
   * Fill the buffer with pre-rendered frames.
   * @param {Function} getNextPacket - Function returning the next packet to render
   */
  async fill(getNextPacket) {
    if (this.rendering) return;
    this.rendering = true;

    while (this.buffer.length < this.bufferSize) {
      const packet = getNextPacket();
      if (!packet) break;
      const url = await generateQRDataUrl(packet);
      this.buffer.push({ url, packet });
    }

    this.rendering = false;
  }

  /**
   * Get the next pre-rendered frame.
   * @returns {{ url: string, packet: Object }|null}
   */
  next() {
    return this.buffer.shift() || null;
  }

  get size() {
    return this.buffer.length;
  }

  clear() {
    this.buffer = [];
  }
}

/**
 * Get the estimated data capacity for current QR settings.
 * @param {string} errorCorrectionLevel - 'L', 'M', 'Q', 'H'
 * @returns {number} - Approximate byte capacity
 */
export function getQRCapacity(errorCorrectionLevel = 'L') {
  // QR Version 40 alphanumeric capacity (approximate after base64 encoding)
  const capacities = {
    'L': 2953,
    'M': 2331,
    'Q': 1663,
    'H': 1273,
  };
  return capacities[errorCorrectionLevel] || capacities['L'];
}
