// GoatCounter page views for the single-page app (privacy-friendly, no cookies, no personal data; see index.html for the script tag).
// The tag in <head> counts the landing page by itself. Every later screen change is counted here with a short path, because the
// URL only changes its #hash. Safe when the script is blocked, offline or not loaded yet: it just does nothing.
const LABEL = { home: null, setup: '/openings', tactics: '/tactics', puzzle: '/tactics/puzzle', train: '/openings/drill', demo: '/openings/watch', profile: '/profile' };
let last, landed = false;
/** screen: a SCREENS id from main.js ('home', 'setup', 'tactics', 'puzzle', 'train', 'demo') or 'profile' */
export function trackScreen(screen) {
  const path = screen === 'home' ? location.pathname : LABEL[screen];
  if (!path) return;
  if (!landed) { landed = true; last = path; return; }   // the first screen is the landing page, already counted by the tag
  if (path === last) return;
  last = path;
  try { const gc = window.goatcounter; if (gc && typeof gc.count === 'function') gc.count({ path, title: 'Pawnado ' + (screen === 'setup' ? 'openings' : screen), event: false }); } catch { /* analytics must never break the app */ }
}
