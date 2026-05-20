/**
 * Optical QR Peer-to-Peer Transfer Protocol Engine
 * 
 * Half-duplex visual modem protocol using QR codes as the communication medium.
 * Supports chunked data transfer, CRC32 validation, ACK/NACK retransmission,
 * compression, optional encryption, and adaptive frame rate.
 */

import pako from 'pako';

// ─── Packet Types ────────────────────────────────────────────────
export const PacketType = {
  HANDSHAKE:      0x01,
  DATA:           0x02,
  ACK:            0x03,
  NACK:           0x04,
  RESEND_REQUEST: 0x05,
  COMPLETE:       0x06,
};

export const PacketTypeName = Object.fromEntries(
  Object.entries(PacketType).map(([k, v]) => [v, k])
);

// ─── Constants ───────────────────────────────────────────────────
export const MAX_PAYLOAD_BYTES = 800;   // ~800B payload per QR frame (conservative for reliability)
export const MIN_PAYLOAD_BYTES = 400;
export const HEADER_SIZE = 19;          // Fixed header: sessionId(4)+frameId(4)+chunkIdx(2)+totalChunks(2)+type(1)+payloadLen(2)+crc(4)
export const DEFAULT_FPS = 6;
export const MIN_FPS = 2;
export const MAX_FPS = 12;
export const FPS_ADAPT_WINDOW = 20;     // Evaluate every N frames
export const FPS_UP_THRESHOLD = 0.90;   // >90% decode success → speed up
export const FPS_DOWN_THRESHOLD = 0.65; // <65% decode success → slow down

// ─── CRC32 ───────────────────────────────────────────────────────
const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  return table;
})();

export function crc32(data) {
  let crc = 0xFFFFFFFF;
  const bytes = typeof data === 'string'
    ? new TextEncoder().encode(data)
    : new Uint8Array(data);
  for (let i = 0; i < bytes.length; i++) {
    crc = crcTable[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// ─── Encryption (optional AES-256-GCM) ──────────────────────────
export async function deriveKey(passphrase) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode('sharejet-optical-v1'), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptData(data, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );
  // Prepend IV to ciphertext
  const result = new Uint8Array(iv.length + encrypted.byteLength);
  result.set(iv);
  result.set(new Uint8Array(encrypted), iv.length);
  return result;
}

export async function decryptData(data, key) {
  const iv = data.slice(0, 12);
  const ciphertext = data.slice(12);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );
  return new Uint8Array(decrypted);
}

// ─── Compression ─────────────────────────────────────────────────
export function compressData(data) {
  return pako.deflate(data);
}

export function decompressData(data) {
  return pako.inflate(data);
}

// ─── Session ID ──────────────────────────────────────────────────
export function generateSessionId() {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}

// ─── Packet Encoding/Decoding ────────────────────────────────────

/**
 * Encode a packet into a base64 string suitable for QR code.
 * Format: JSON object for readability and scan reliability.
 * We use a compact JSON format instead of raw binary for QR text mode
 * which is more reliable at various scan distances.
 */
export function encodePacket(packet) {
  const payload = packet.payload || '';
  const payloadStr = typeof payload === 'string'
    ? payload
    : uint8ArrayToBase64(payload);

  const obj = {
    s: packet.sessionId,
    f: packet.frameId,
    i: packet.chunkIndex,
    t: packet.totalChunks,
    y: packet.type,
    p: payloadStr,
    c: packet.checksum,
  };
  return JSON.stringify(obj);
}

/**
 * Decode a QR code string back into a packet object.
 * Returns null if invalid.
 */
export function decodePacket(qrString) {
  try {
    const obj = JSON.parse(qrString);
    if (obj.s === undefined || obj.y === undefined) return null;

    return {
      sessionId: obj.s,
      frameId: obj.f,
      chunkIndex: obj.i,
      totalChunks: obj.t,
      type: obj.y,
      payload: obj.p || '',
      checksum: obj.c,
    };
  } catch {
    return null;
  }
}

/**
 * Validate a packet's CRC32 checksum.
 */
export function validatePacket(packet) {
  if (!packet || packet.checksum === undefined) return false;
  const payloadBytes = typeof packet.payload === 'string'
    ? new TextEncoder().encode(packet.payload)
    : packet.payload;
  return crc32(payloadBytes) === packet.checksum;
}

// ─── Data Chunking ───────────────────────────────────────────────

/**
 * Split raw data into indexed chunks for transmission.
 * @param {Uint8Array} data - Compressed (and optionally encrypted) data
 * @param {number} chunkSize - Max bytes per chunk payload
 * @returns {Array<{index: number, data: string, checksum: number}>}
 */
export function chunkData(data, chunkSize = MAX_PAYLOAD_BYTES) {
  const chunks = [];
  const totalChunks = Math.ceil(data.length / chunkSize);

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, data.length);
    const slice = data.slice(start, end);
    const b64 = uint8ArrayToBase64(slice);
    chunks.push({
      index: i,
      data: b64,
      checksum: crc32(slice),
    });
  }
  return chunks;
}

/**
 * Reconstruct full data from received chunks.
 * @param {Map<number, string>} chunkMap - Map of chunkIndex → base64 payload
 * @param {number} totalChunks
 * @returns {Uint8Array|null} - null if any chunks are missing
 */
export function reconstructData(chunkMap, totalChunks) {
  if (chunkMap.size < totalChunks) return null;

  const arrays = [];
  for (let i = 0; i < totalChunks; i++) {
    const b64 = chunkMap.get(i);
    if (!b64) return null;
    arrays.push(base64ToUint8Array(b64));
  }

  const totalLength = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

// ─── Handshake Packet ────────────────────────────────────────────

export function createHandshakePacket(sessionId, metadata) {
  const payload = JSON.stringify({
    fileName: metadata.fileName || 'text-transfer',
    fileSize: metadata.fileSize,
    totalChunks: metadata.totalChunks,
    compressed: true,
    encrypted: metadata.encrypted || false,
    dataType: metadata.dataType || 'file', // 'file' or 'text'
  });
  const payloadBytes = new TextEncoder().encode(payload);

  return {
    sessionId,
    frameId: 0,
    chunkIndex: 0,
    totalChunks: metadata.totalChunks,
    type: PacketType.HANDSHAKE,
    payload,
    checksum: crc32(payloadBytes),
  };
}

export function createDataPacket(sessionId, frameId, chunk, totalChunks) {
  return {
    sessionId,
    frameId,
    chunkIndex: chunk.index,
    totalChunks,
    type: PacketType.DATA,
    payload: chunk.data,
    checksum: chunk.checksum,
  };
}

export function createAckPacket(sessionId, chunkIndex) {
  return {
    sessionId,
    frameId: 0,
    chunkIndex,
    totalChunks: 0,
    type: PacketType.ACK,
    payload: '',
    checksum: 0,
  };
}

export function createNackPacket(sessionId, chunkIndex) {
  return {
    sessionId,
    frameId: 0,
    chunkIndex,
    totalChunks: 0,
    type: PacketType.NACK,
    payload: '',
    checksum: 0,
  };
}

export function createResendRequest(sessionId, missingIndices) {
  const payload = JSON.stringify(missingIndices);
  return {
    sessionId,
    frameId: 0,
    chunkIndex: 0,
    totalChunks: 0,
    type: PacketType.RESEND_REQUEST,
    payload,
    checksum: crc32(new TextEncoder().encode(payload)),
  };
}

export function createCompletePacket(sessionId) {
  return {
    sessionId,
    frameId: 0,
    chunkIndex: 0,
    totalChunks: 0,
    type: PacketType.COMPLETE,
    payload: '',
    checksum: 0,
  };
}

// ─── Adaptive Frame Rate ─────────────────────────────────────────

export class AdaptiveFPS {
  constructor(initialFps = DEFAULT_FPS) {
    this.fps = initialFps;
    this.scanResults = [];
  }

  recordScan(success) {
    this.scanResults.push(success);
    if (this.scanResults.length >= FPS_ADAPT_WINDOW) {
      this.adapt();
    }
  }

  adapt() {
    const successRate = this.scanResults.filter(Boolean).length / this.scanResults.length;
    if (successRate >= FPS_UP_THRESHOLD && this.fps < MAX_FPS) {
      this.fps = Math.min(this.fps + 1, MAX_FPS);
    } else if (successRate <= FPS_DOWN_THRESHOLD && this.fps > MIN_FPS) {
      this.fps = Math.max(this.fps - 2, MIN_FPS);
    }
    this.scanResults = [];
  }

  getInterval() {
    return Math.round(1000 / this.fps);
  }

  getFps() {
    return this.fps;
  }

  getSuccessRate() {
    if (this.scanResults.length === 0) return 1;
    return this.scanResults.filter(Boolean).length / this.scanResults.length;
  }
}

// ─── Transfer Session (Sender) ───────────────────────────────────

export class SenderSession {
  constructor({ data, fileName, dataType, encrypted, encryptionKey }) {
    this.raw = data;
    this.fileName = fileName;
    this.dataType = dataType || 'file';
    this.encrypted = encrypted || false;
    this.encryptionKey = encryptionKey;
    this.sessionId = generateSessionId();
    this.chunks = [];
    this.totalChunks = 0;
    this.currentIndex = 0;
    this.ackedChunks = new Set();
    this.paused = false;
    this.phase = 'init'; // init → handshake → sending → completing → done
    this.adaptiveFps = new AdaptiveFPS();
    this.stats = {
      startTime: null,
      bytesSent: 0,
      errors: 0,
      totalFrames: 0,
    };
  }

  async prepare() {
    let processed = this.raw;

    // Compress
    processed = compressData(processed);

    // Encrypt (optional)
    if (this.encrypted && this.encryptionKey) {
      processed = await encryptData(processed, this.encryptionKey);
    }

    this.chunks = chunkData(new Uint8Array(processed), MAX_PAYLOAD_BYTES);
    this.totalChunks = this.chunks.length;
    this.phase = 'handshake';
    this.stats.startTime = Date.now();
  }

  getHandshakePacket() {
    return createHandshakePacket(this.sessionId, {
      fileName: this.fileName,
      fileSize: this.raw.length,
      totalChunks: this.totalChunks,
      encrypted: this.encrypted,
      dataType: this.dataType,
    });
  }

  getCurrentPacket() {
    if (this.phase === 'handshake') {
      return this.getHandshakePacket();
    }

    if (this.phase === 'completing' || this.phase === 'done') {
      return createCompletePacket(this.sessionId);
    }

    if (this.paused || this.currentIndex >= this.totalChunks) {
      // All chunks sent at least once — switch to completing
      this.phase = 'completing';
      return createCompletePacket(this.sessionId);
    }

    const chunk = this.chunks[this.currentIndex];
    const packet = createDataPacket(this.sessionId, this.stats.totalFrames, chunk, this.totalChunks);
    return packet;
  }

  advanceFrame() {
    if (this.phase === 'sending' && !this.paused) {
      this.stats.totalFrames++;
      this.stats.bytesSent += this.chunks[this.currentIndex]?.data.length || 0;
      this.currentIndex++;
    }
  }

  handleAck(chunkIndex) {
    this.ackedChunks.add(chunkIndex);
    this.adaptiveFps.recordScan(true);

    if (this.phase === 'handshake') {
      this.phase = 'sending';
    }
  }

  handleNack(chunkIndex) {
    this.adaptiveFps.recordScan(false);
    this.stats.errors++;
  }

  handleResendRequest(missingIndices) {
    // Re-queue missing chunks
    if (missingIndices.length > 0) {
      this.phase = 'sending';
      // Find the first missing chunk and restart from there
      this.currentIndex = missingIndices[0];
    }
  }

  getProgress() {
    if (this.totalChunks === 0) return 0;
    return this.ackedChunks.size / this.totalChunks;
  }

  getSpeed() {
    if (!this.stats.startTime) return 0;
    const elapsed = (Date.now() - this.stats.startTime) / 1000;
    if (elapsed === 0) return 0;
    return Math.round(this.stats.bytesSent / elapsed);
  }

  isComplete() {
    return this.ackedChunks.size >= this.totalChunks;
  }

  pause() { this.paused = true; }
  resume() { this.paused = false; }
}

// ─── Transfer Session (Receiver) ─────────────────────────────────

export class ReceiverSession {
  constructor() {
    this.sessionId = null;
    this.metadata = null;
    this.receivedChunks = new Map();
    this.totalChunks = 0;
    this.phase = 'waiting'; // waiting → handshake → receiving → reconstructing → done
    this.adaptiveFps = new AdaptiveFPS();
    this.lastSeenFrame = -1;
    this.stats = {
      startTime: null,
      bytesReceived: 0,
      errors: 0,
      duplicates: 0,
    };
  }

  handlePacket(packet) {
    if (!packet) return null;

    switch (packet.type) {
      case PacketType.HANDSHAKE:
        return this.handleHandshake(packet);
      case PacketType.DATA:
        return this.handleData(packet);
      case PacketType.COMPLETE:
        return this.handleComplete(packet);
      default:
        return null;
    }
  }

  handleHandshake(packet) {
    try {
      this.metadata = JSON.parse(packet.payload);
      this.sessionId = packet.sessionId;
      this.totalChunks = this.metadata.totalChunks;
      this.phase = 'receiving';
      this.stats.startTime = Date.now();
      return createAckPacket(this.sessionId, 0);
    } catch {
      return createNackPacket(packet.sessionId, 0);
    }
  }

  handleData(packet) {
    // Validate session
    if (packet.sessionId !== this.sessionId) return null;

    // Validate CRC
    const payloadBytes = typeof packet.payload === 'string'
      ? new TextEncoder().encode(packet.payload)
      : packet.payload;
    const computedCrc = crc32(base64ToUint8Array(packet.payload));

    if (computedCrc !== packet.checksum) {
      this.stats.errors++;
      this.adaptiveFps.recordScan(false);
      return createNackPacket(this.sessionId, packet.chunkIndex);
    }

    // Check duplicate
    if (this.receivedChunks.has(packet.chunkIndex)) {
      this.stats.duplicates++;
      this.adaptiveFps.recordScan(true);
      return createAckPacket(this.sessionId, packet.chunkIndex);
    }

    // Store chunk
    this.receivedChunks.set(packet.chunkIndex, packet.payload);
    this.stats.bytesReceived += packet.payload.length;
    this.adaptiveFps.recordScan(true);
    this.lastSeenFrame = packet.frameId;

    return createAckPacket(this.sessionId, packet.chunkIndex);
  }

  handleComplete(packet) {
    if (packet.sessionId !== this.sessionId) return null;

    const missing = this.getMissingChunks();
    if (missing.length > 0) {
      return createResendRequest(this.sessionId, missing);
    }

    this.phase = 'reconstructing';
    return createAckPacket(this.sessionId, -1); // ACK completion
  }

  getMissingChunks() {
    const missing = [];
    for (let i = 0; i < this.totalChunks; i++) {
      if (!this.receivedChunks.has(i)) {
        missing.push(i);
      }
    }
    return missing;
  }

  async reconstruct(encryptionKey = null) {
    const rawData = reconstructData(this.receivedChunks, this.totalChunks);
    if (!rawData) return null;

    let processed = rawData;

    // Decrypt if needed
    if (this.metadata?.encrypted && encryptionKey) {
      processed = await decryptData(processed, encryptionKey);
    }

    // Decompress
    processed = decompressData(processed);

    this.phase = 'done';
    return processed;
  }

  getProgress() {
    if (this.totalChunks === 0) return 0;
    return this.receivedChunks.size / this.totalChunks;
  }

  getSpeed() {
    if (!this.stats.startTime) return 0;
    const elapsed = (Date.now() - this.stats.startTime) / 1000;
    if (elapsed === 0) return 0;
    return Math.round(this.stats.bytesReceived / elapsed);
  }

  isComplete() {
    return this.receivedChunks.size >= this.totalChunks && this.totalChunks > 0;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────

function uint8ArrayToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export { uint8ArrayToBase64, base64ToUint8Array };
