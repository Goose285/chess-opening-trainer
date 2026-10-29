// chess.com-style piece pickup: lifts the selected piece, enlarges it under a finger, shows the
// hovered target square and eases the piece onto its square when released.
// Visuals live in css/app.css (piece::before); this file only toggles classes / CSS variables.
export function attachLift(host, cg) {
  let lastTouch = 0;
  host.classList.remove('touch');
  const hover = document.createElement('div');
  hover.className = 'hover-sq';
  host.appendChild(hover);

  const board = () => host.querySelector('cg-board');
  const bounds = () => board().getBoundingClientRect();
  const isWhitePov = () => cg.state.orientation === 'white';
  const keyAt = (x, y) => {
    const b = bounds();
    if (x < b.left || x > b.right || y < b.top || y > b.bottom) return null;
    const f = Math.min(7, Math.floor(((x - b.left) / b.width) * 8)), r = Math.min(7, Math.floor(((y - b.top) / b.height) * 8));
    return isWhitePov() ? String.fromCharCode(97 + f) + (8 - r) : String.fromCharCode(97 + 7 - f) + (r + 1);
  };
  const pieceEl = (key) => { for (const p of host.querySelectorAll('cg-board piece')) if (p.cgKey === key && !p.classList.contains('ghost')) return p; return null; };
  const translateOf = (el) => { const m = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(el.style.transform || ''); return m ? [+m[1], +m[2]] : null; };

  // -- selected piece "hover"
  function syncLift() {
    const sel = cg.state.selected;
    for (const p of host.querySelectorAll('cg-board piece.lifted')) if (!sel || p.cgKey !== sel) p.classList.remove('lifted');
    if (sel) { const p = pieceEl(sel); if (p && !p.classList.contains('lifted')) p.classList.add('lifted'); }
  }
  const mo = new MutationObserver(syncLift);
  mo.observe(board(), { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

  // -- input type: bigger lift for touch
  const onTouchStart = () => { lastTouch = Date.now(); host.classList.add('touch'); };
  const onMouseDown = () => { if (Date.now() - lastTouch > 800) host.classList.remove('touch'); };
  const onCtx = (e) => e.preventDefault(); // no iOS long-press callout / context menu on the board
  host.addEventListener('touchstart', onTouchStart, { capture: true, passive: true });
  host.addEventListener('mousedown', onMouseDown, { capture: true });
  host.addEventListener('contextmenu', onCtx);

  // -- target-square highlight while dragging
  let pos = null;
  const setHover = (x, y) => {
    const cur = cg.state.draggable.current;
    const k = cur && cur.started ? keyAt(x, y) : null;
    const dests = cg.state.movable.dests;
    const ok = k && cur && k !== cur.orig && dests && (dests.get(cur.orig) || []).includes(k);
    if (!ok) { hover.classList.remove('on'); return; }
    const f = k.charCodeAt(0) - 97, r = +k[1] - 1;
    const col = isWhitePov() ? f : 7 - f, row = isWhitePov() ? 7 - r : r;
    hover.style.transform = `translate(${col * 100}%, ${row * 100}%)`;
    hover.classList.add('on');
  };
  const onMove = (e) => {
    const t = e.touches ? e.touches[0] : e;
    if (!t) return;
    pos = [t.clientX, t.clientY];
    setHover(pos[0], pos[1]);
  };
  document.addEventListener('mousemove', onMove, { passive: true });
  document.addEventListener('touchmove', onMove, { passive: true });

  // -- snap animation on release
  function onEnd() {
    hover.classList.remove('on');
    const cur = cg.state.draggable.current;
    const el = cur && cur.element && typeof cur.element !== 'function' ? cur.element : host.querySelector('cg-board piece.dragging');
    if (!el || !cur || !cur.started) return;
    const from = translateOf(el);
    if (!from) return;
    let tries = 0;
    const settle = () => {
      const to = translateOf(el);
      // chessground re-renders on the next frame: wait until the piece got its resting square
      if ((!to || (to[0] === from[0] && to[1] === from[1])) && ++tries < 6) return requestAnimationFrame(settle);
      if (!to) return;
      const dx = from[0] - to[0], dy = from[1] - to[1];
      if (Math.abs(dx) + Math.abs(dy) < 2) return;
      el.style.setProperty('--sx', dx + 'px'); el.style.setProperty('--sy', dy + 'px');
      el.classList.add('snapfrom', 'snapping');
      void el.offsetWidth; // commit the start state
      el.classList.remove('snapfrom');
      setTimeout(() => { el.classList.remove('snapping'); el.style.removeProperty('--sx'); el.style.removeProperty('--sy'); }, 260);
    };
    requestAnimationFrame(settle);
  }
  // capture phase on document: runs before chessground's own end handlers clear the drag state
  document.addEventListener('mouseup', onEnd, { capture: true });
  document.addEventListener('touchend', onEnd, { capture: true });
  document.addEventListener('touchcancel', () => hover.classList.remove('on'), { capture: true });

  return () => {
    mo.disconnect();
    document.removeEventListener('mousemove', onMove); document.removeEventListener('touchmove', onMove);
    document.removeEventListener('mouseup', onEnd, true); document.removeEventListener('touchend', onEnd, true);
    host.removeEventListener('touchstart', onTouchStart, true); host.removeEventListener('mousedown', onMouseDown, true); host.removeEventListener('contextmenu', onCtx);
    hover.remove();
  };
}
