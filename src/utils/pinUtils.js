import { ref, get } from "firebase/database";
import { database } from "../firebase";

/**
 * Generate a random 6-digit PIN string
 */
export function generatePin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Check if a PIN already exists in the database
 */
export async function checkPinUnique(pin) {
  const pinRef = ref(database, `pins/${pin}`);
  const snapshot = await get(pinRef);
  return !snapshot.exists();
}

/**
 * Generate a unique PIN (retries up to 5 times)
 */
export async function generateUniquePin() {
  for (let i = 0; i < 5; i++) {
    const pin = generatePin();
    const isUnique = await checkPinUnique(pin);
    if (isUnique) return pin;
  }
  throw new Error("Failed to generate a unique PIN. Please try again.");
}

/**
 * Check if a PIN has expired
 */
export function isPinExpired(expiresAt) {
  return Date.now() > expiresAt;
}

/**
 * Format PIN as "XXX XXX" for display
 */
export function formatPin(pin) {
  if (!pin || pin.length !== 6) return pin;
  return `${pin.slice(0, 3)} ${pin.slice(3)}`;
}

/**
 * Get remaining time in seconds
 */
export function getRemainingSeconds(expiresAt) {
  const remaining = Math.max(0, expiresAt - Date.now());
  return Math.ceil(remaining / 1000);
}

/**
 * Format seconds as mm:ss
 */
export function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Allowed file types
 */
export const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Validate a file
 */
export function validateFile(file) {
  if (!file) return { valid: false, error: "No file selected" };
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File too large. Maximum size is 10MB (${(file.size / 1024 / 1024).toFixed(1)}MB selected)` };
  }
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return { valid: false, error: "File type not supported. Allowed: images, PDF, ZIP, TXT, DOC" };
  }
  return { valid: true, error: null };
}

/**
 * Format file size
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
