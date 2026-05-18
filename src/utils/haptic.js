/**
 * Haptic feedback utility using the Web Vibration API.
 * Silently no-ops on desktop or unsupported browsers.
 */

const canVibrate = () =>
  typeof navigator !== "undefined" && "vibrate" in navigator;

/** Very short tap — tab switches, minor interactions */
export const hapticLight = () => {
  if (canVibrate()) navigator.vibrate(10);
};

/** Standard tap — primary buttons, copy actions */
export const hapticMedium = () => {
  if (canVibrate()) navigator.vibrate(25);
};

/** Strong tap — generate PIN, form submit */
export const hapticHeavy = () => {
  if (canVibrate()) navigator.vibrate(50);
};

/** Double pulse — success state */
export const hapticSuccess = () => {
  if (canVibrate()) navigator.vibrate([20, 60, 20]);
};

/** Triple pulse — error / validation failure */
export const hapticError = () => {
  if (canVibrate()) navigator.vibrate([30, 40, 30, 40, 30]);
};
