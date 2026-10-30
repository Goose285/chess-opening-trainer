// Haptic feedback. Android / Chrome: navigator.vibrate. iPhone Safari has no vibrate API, but iOS 18+ plays a small
// haptic tick whenever an <input type="checkbox" switch> is toggled by a (programmatic) label click, so we use that as
// a fallback. Whether iOS allows that click outside a user gesture is up to WebKit (see the "Try it" button in the
// settings panel, which tests exactly that). Saved choice: localStorage 'rt1500-haptics'.
const KEY = 'rt1500-haptics';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; } };
let on = load().on !== false; // default: on
export const hapticsOn = () => on;
export function setHaptics(v) { on = !!v; try { localStorage.setItem(KEY, JSON.stringify({ on })); } catch {} }

export const isIOS = () => /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
/** 'vibrate' (navigator.vibrate exists) | 'ios' (switch-checkbox tick) | 'none' (desktop etc.) */
export const hapticMode = () => (typeof navigator.vibrate === 'function' ? 'vibrate' : isIOS() ? 'ios' : 'none');

// patterns for navigator.vibrate (ms): light tap after your move, strong double buzz when a piece of yours is taken
const PATTERNS = { move: 14, capture: [38, 55, 62], celebrate: [30, 40, 60], wrong: [16, 50, 16] };
// iOS has one fixed tick strength, so "stronger" = several ticks close together
const TICKS = { move: [0], capture: [0, 85, 170], celebrate: [0, 90], wrong: [0, 110] };

let iosLabel = null;
function iosTick() {
  if (!iosLabel) {
    iosLabel = document.createElement('label'); iosLabel.setAttribute('aria-hidden', 'true'); iosLabel.style.display = 'none';
    const input = document.createElement('input'); input.type = 'checkbox'; input.setAttribute('switch', ''); input.tabIndex = -1;
    iosLabel.appendChild(input); document.head.appendChild(iosLabel);
  }
  iosLabel.click();
}
/** kind: 'move' | 'capture' | 'celebrate' | 'wrong'. Never throws. Returns false when nothing was attempted. */
export function haptic(kind, { force = false } = {}) {
  if (!on && !force) return false;
  try {
    const mode = hapticMode();
    if (mode === 'vibrate') return navigator.vibrate(PATTERNS[kind] || 14);
    if (mode === 'ios') { (TICKS[kind] || [0]).forEach((d) => (d ? setTimeout(iosTick, d) : iosTick())); return true; }
  } catch {}
  return false;
}
