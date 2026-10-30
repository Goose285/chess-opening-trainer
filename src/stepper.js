// Step-through controls for a finished line / solved puzzle: |<  <  >  >|, left/right/home/end keys and swipe.
// The owner supplies what a position looks like (onStep); this only handles the index and the controls.
const ICON = {
  first: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5v14M18 6l-8 6 8 6z"/></svg>',
  prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 6l-8 6 8 6z"/></svg>',
  next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6l8 6-8 6z"/></svg>',
  last: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 5v14M6 6l8 6-8 6z"/></svg>',
};
export function createStepper({ bar, swipe, onStep, label }) {
  let n = 0, i = 0, active = false;
  bar.innerHTML = `<button type="button" class="rv-btn" data-s="first" aria-label="First position (Home)">${ICON.first}</button><button type="button" class="rv-btn" data-s="prev" aria-label="Previous move (Left arrow)">${ICON.prev}</button><span class="rv-pos" aria-live="polite"></span><button type="button" class="rv-btn" data-s="next" aria-label="Next move (Right arrow)">${ICON.next}</button><button type="button" class="rv-btn" data-s="last" aria-label="Last position (End)">${ICON.last}</button>`;
  const pos = bar.querySelector('.rv-pos'), btn = (k) => bar.querySelector(`[data-s="${k}"]`);
  function paint() {
    pos.textContent = label ? label(i, n) : `${i} / ${n}`;
    btn('first').disabled = btn('prev').disabled = i <= 0;
    btn('next').disabled = btn('last').disabled = i >= n;
  }
  function set(k, silent = false) {
    const v = Math.max(0, Math.min(n, k));
    const changed = v !== i; i = v; paint();
    if (!silent) onStep(i, { changed });
  }
  const modalOpen = () => [...document.querySelectorAll('.modal:not(.hidden), .celebrate:not(.hidden)')].some((m) => m.getClientRects().length > 0);
  bar.addEventListener('click', (e) => { const b = e.target.closest('[data-s]'); if (!b || !active) return; const s = b.dataset.s; set(s === 'first' ? 0 : s === 'last' ? n : s === 'prev' ? i - 1 : i + 1); });
  document.addEventListener('keydown', (e) => {
    if (!active || modalOpen() || e.altKey || e.ctrlKey || e.metaKey) return;
    if (/^(INPUT|SELECT|TEXTAREA)$/.test((e.target || {}).tagName || '')) return;
    const k = e.key; const d = k === 'ArrowLeft' ? i - 1 : k === 'ArrowRight' ? i + 1 : k === 'Home' ? 0 : k === 'End' ? n : null;
    if (d === null) return;
    e.preventDefault(); set(d);
  });
  if (swipe) {
    let x0 = 0, y0 = 0, t0 = 0;
    swipe.addEventListener('touchstart', (e) => { const t = e.changedTouches[0]; x0 = t.clientX; y0 = t.clientY; t0 = Date.now(); }, { passive: true });
    swipe.addEventListener('touchend', (e) => {
      if (!active) return; const t = e.changedTouches[0]; const dx = t.clientX - x0, dy = t.clientY - y0;
      if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy) * 1.6 && Date.now() - t0 < 700) set(dx < 0 ? i + 1 : i - 1);
    }, { passive: true });
  }
  return {
    open(count, start = count) { n = count; active = true; bar.classList.remove('hidden'); set(start); },
    close() { active = false; bar.classList.add('hidden'); },
    set, get index() { return i; }, get count() { return n; }, get active() { return active; },
  };
}
