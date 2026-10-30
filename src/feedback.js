// Feedback sheet: type, optional 1-5 rating, message, optional contact. With FEEDBACK_ENDPOINT set it POSTs JSON there
// (Formspree-style). Without one it opens a pre-filled GitHub issue and offers "Copy feedback". Config: src/config.js.
import { FEEDBACK_ENDPOINT, FEEDBACK_REPO, APP_NAME, APP_VERSION } from './config.js';

const $ = (s) => document.querySelector(s);
const TYPES = [
  { id: 'bug', label: 'Bug', gh: 'bug' },
  { id: 'idea', label: 'Idea / what to add', gh: 'enhancement' },
  { id: 'opening', label: 'Opening request', gh: 'enhancement' },
  { id: 'other', label: 'Other', gh: 'question' },
];
export const MAX_MSG = 2000;
let type = 'idea', rating = 0, lastFocus = null, busy = false, failed = false;
const hasEndpoint = () => !!String(FEEDBACK_ENDPOINT || '').trim();
export const isFeedbackOpen = () => !!$('#fbsheet') && !$('#fbsheet').classList.contains('hidden');

const deviceInfo = () => `${navigator.userAgent} | ${window.innerWidth}x${window.innerHeight} @${window.devicePixelRatio || 1}x | ${navigator.language || ''}`;
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

/** Everything the form currently says, as a plain object (also used by the tests). */
export function collect() {
  const msg = $('#fb-msg').value.trim(), contact = $('#fb-contact').value.trim();
  return {
    type, typeLabel: TYPES.find((t) => t.id === type).label, rating: rating || null, message: msg, contact: contact || null,
    app: `${APP_NAME} ${APP_VERSION}`, device: $('#fb-device').checked ? deviceInfo() : null, page: location.hash || '#/', sent: new Date().toISOString(),
  };
}
export function toText(f) {
  return [`Type: ${f.typeLabel}`, f.rating ? `Rating: ${f.rating}/5` : null, '', f.message, '',
    f.contact ? `Contact: ${f.contact}` : null, `App: ${f.app}`, `Screen: ${f.page}`, f.device ? `Device: ${f.device}` : null].filter((l) => l !== null).join('\n');
}
export function issueUrl(f) {
  const t = TYPES.find((x) => x.id === f.type);
  const first = f.message.replace(/\s+/g, ' ').slice(0, 70) + (f.message.length > 70 ? '…' : '');
  const body = [f.message, '', '---', `Type: ${f.typeLabel}`, f.rating ? `Rating: ${f.rating}/5` : null, f.contact ? `Contact: ${f.contact}` : null, `App: ${f.app}`, `Screen: ${f.page}`, f.device ? `Device: ${f.device}` : null, '_Sent from the in-app feedback form._']
    .filter((l) => l !== null).join('\n');
  const q = new URLSearchParams({ title: `[${f.typeLabel}] ${first}`, body, labels: `feedback,${t.gh}` });
  return `https://github.com/${FEEDBACK_REPO}/issues/new?${q.toString()}`;
}

function setStatus(html, kind = '') { const s = $('#fb-status'); s.className = 'fb-status' + (kind ? ' ' + kind : ''); s.innerHTML = html; s.hidden = !html; }
function validate() {
  const f = collect();
  if (f.message.length < 3) { $('#fb-msg').classList.add('bad'); setStatus('Please write a few words first, even one line helps.', 'err'); $('#fb-msg').focus(); return null; }
  $('#fb-msg').classList.remove('bad'); return f;
}
function paintRating() {
  document.querySelectorAll('#fb-stars button').forEach((b) => { const n = +b.dataset.n; b.classList.toggle('on', n <= rating); b.setAttribute('aria-checked', String(n === rating)); });
  $('#fb-rate-note').textContent = rating ? ['', 'Not great', 'So-so', 'Good', 'Great', 'Love it'][rating] : 'Optional';
}
function paintMode() {
  const ep = hasEndpoint();
  $('#fb-fallback').hidden = ep && !failed;
  $('#fb-fallback').innerHTML = failed
    ? '<b>Plan B</b><p>Our feedback inbox could not be reached. You can still send this through a <b>GitHub issue</b> (tap below) or tap <b>Copy feedback</b> and send it any way you like.</p>'
    : '<b>How this reaches me</b><p>There is no feedback inbox connected yet, so this opens a ready-written <b>GitHub issue</b> for you to submit (free GitHub account needed). Don\'t have one, or don\'t want it public? Tap <b>Copy feedback</b> and send it however you like.</p>';
  $('#fb-gh').hidden = !(ep && failed);
  $('#fb-submit').textContent = ep ? 'Send feedback' : 'Open a GitHub issue';
  $('#fb-contact-note').textContent = ep ? 'Optional. Only so we can reply (an email or @handle).' : 'Optional. Careful: a GitHub issue is public, so leave it empty unless you are happy for it to be seen.';
}
function paintCount() { const n = $('#fb-msg').value.length; $('#fb-count').textContent = `${n} / ${MAX_MSG}`; }

async function copy() {
  const f = validate(); if (!f) return;
  const text = toText(f);
  try { await navigator.clipboard.writeText(text); }
  catch { const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch {} ta.remove(); }
  setStatus('Copied. Paste it into a message, an email or an issue — thank you!', 'ok');
}
function openIssue(f) {
  window.open(issueUrl(f), '_blank', 'noopener');
  setStatus('Opened GitHub in a new tab. Press <b>Submit new issue</b> there to send it (you need a free GitHub account). Prefer not to? Use <b>Copy feedback</b> and send it any way you like.', 'ok');
}
async function submit(e) {
  e.preventDefault(); if (busy) return;
  const f = validate(); if (!f) return;
  if (!hasEndpoint()) { openIssue(f); return; }
  busy = true; $('#fb-submit').disabled = true; $('#fb-submit').textContent = 'Sending…'; setStatus('');
  try {
    const payload = { ...f, email: f.contact && isEmail(f.contact) ? f.contact : undefined, _subject: `${APP_NAME} feedback: ${f.typeLabel}` };
    const res = await fetch(String(FEEDBACK_ENDPOINT).trim(), { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    $('#fb-form').hidden = true; $('#fb-done').hidden = false; $('#fb-close').focus({ preventScroll: true });
  } catch (err) {
    setStatus('That did not go through (your message is still here). Check your connection and try again, or use <b>Copy feedback</b> / <b>Open a GitHub issue</b> instead.', 'err');
    failed = true;
  } finally { busy = false; $('#fb-submit').disabled = false; paintMode(); }
}

export function openFeedback(prefType) {
  lastFocus = document.activeElement;
  if (prefType && TYPES.some((t) => t.id === prefType)) type = prefType;
  failed = false; $('#fb-form').hidden = false; $('#fb-done').hidden = true; setStatus('');
  paintTypes(); paintRating(); paintMode(); paintCount(); $('#fb-ver').textContent = `${APP_NAME} ${APP_VERSION}`;
  $('#fbsheet').classList.remove('hidden'); document.body.classList.add('noscroll');
  $('#fb-msg').focus({ preventScroll: true });
}
export function closeFeedback() {
  if (!isFeedbackOpen()) return;
  $('#fbsheet').classList.add('hidden');
  if ($('#theme').classList.contains('hidden') && $('#profile').classList.contains('hidden') && $('#about').classList.contains('hidden')) document.body.classList.remove('noscroll');
  if (lastFocus && lastFocus.isConnected) lastFocus.focus({ preventScroll: true });
  lastFocus = null;
}
function paintTypes() { document.querySelectorAll('#fb-types button').forEach((b) => { const on = b.dataset.type === type; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); }); }

export function initFeedback() {
  $('#fb-types').innerHTML = TYPES.map((t) => `<button type="button" role="radio" class="fb-chip" data-type="${t.id}" aria-checked="false">${t.label}</button>`).join('');
  $('#fb-stars').innerHTML = [1, 2, 3, 4, 5].map((n) => `<button type="button" role="radio" class="fb-star" data-n="${n}" aria-checked="false" aria-label="${n} of 5">★</button>`).join('');
  document.addEventListener('click', (e) => { const o = e.target.closest('[data-open-feedback]'); if (o) { e.preventDefault(); openFeedback(o.dataset.openFeedback || undefined); } });
  $('#fb-types').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { type = b.dataset.type; paintTypes(); } });
  $('#fb-stars').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { rating = rating === +b.dataset.n ? 0 : +b.dataset.n; paintRating(); } });
  $('#fb-msg').addEventListener('input', () => { paintCount(); $('#fb-msg').classList.remove('bad'); if ($('#fb-status').classList.contains('err') && !failed) setStatus(''); });
  $('#fb-form').addEventListener('submit', submit);
  $('#fb-copy').addEventListener('click', copy);
  $('#fb-gh').addEventListener('click', () => { const f = validate(); if (f) openIssue(f); });
  $('#fb-x').addEventListener('click', closeFeedback); $('#fb-close').addEventListener('click', closeFeedback);
  $('#fbsheet').addEventListener('click', (e) => { if (e.target.id === 'feedback') closeFeedback(); });
  $('#fb-another').addEventListener('click', () => { $('#fb-msg').value = ''; $('#fb-contact').value = ''; rating = 0; openFeedback(); });
  document.addEventListener('keydown', (e) => {
    if (!isFeedbackOpen()) return;
    if (e.key === 'Escape') { e.stopImmediatePropagation(); closeFeedback(); }
    else if (e.key === 'Tab') {
      const f = [...$('#fbsheet').querySelectorAll('button:not([hidden]):not(:disabled), input, textarea, a[href]')].filter((x) => x.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, true);
}
