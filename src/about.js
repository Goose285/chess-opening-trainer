// "About & licenses" screen (opened from Home footer, Profile and the theme picker). Content: src/licenses.js.
import { COMPONENTS, STATEMENTS, REPO_URL } from './licenses.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let lastFocus = null;
export const isAboutOpen = () => !!$('#about') && !$('#about').classList.contains('hidden');

function render() {
  let group = '';
  const rows = COMPONENTS.map((c) => {
    const head = c.group !== group ? `<h3 class="ab-h">${esc(c.group)}</h3>` : '';
    group = c.group;
    return `${head}<article class="ab-item"><div class="ab-top"><b>${esc(c.name)}</b><span class="ab-lic">${esc(c.license)}</span></div>
      <div class="ab-notice">${esc(c.notice)}</div><div class="ab-note">${esc(c.note)}</div>
      <div class="ab-links"><a href="${esc(c.url)}" target="_blank" rel="noopener">Source</a> · <a href="${esc(c.licenseUrl)}" target="_blank" rel="noopener">Licence text</a></div></article>`;
  }).join('');
  $('#about-body').innerHTML = `
    <p class="ab-lead">Road to 1500 is free software released under the <b>GNU General Public License v3 or later</b>. You can read, copy, change and share it under that licence. It comes with <b>no warranty</b>.</p>
    <p class="ab-src"><a class="btn primary" href="${esc(REPO_URL)}" target="_blank" rel="noopener" id="about-source">Get the complete source code</a>
    <a class="btn" href="${esc(REPO_URL)}/blob/main/LICENSE" target="_blank" rel="noopener">Read the GPL</a></p>
    ${rows}
    <h3 class="ab-h">Also</h3>
    ${STATEMENTS.map((t) => `<p class="ab-st">${esc(t)}</p>`).join('')}
    <p class="ab-st">Full notices and licence texts: <a href="${esc(REPO_URL)}/tree/main/THIRD_PARTY" target="_blank" rel="noopener">THIRD_PARTY/</a> in the source repository.</p>`;
}

export function openAbout() {
  lastFocus = document.activeElement;
  render();
  $('#about').classList.remove('hidden'); document.body.classList.add('noscroll');
  $('#about-body').scrollTop = 0; $('#about-close').focus({ preventScroll: true });
}
export function closeAbout() {
  if (!isAboutOpen()) return;
  $('#about').classList.add('hidden');
  // stay locked if the profile or theme sheet underneath is still open
  if ($('#theme').classList.contains('hidden') && $('#profile').classList.contains('hidden')) document.body.classList.remove('noscroll');
  if (lastFocus && lastFocus.isConnected) lastFocus.focus({ preventScroll: true });
  lastFocus = null;
}

export function initAbout() {
  document.addEventListener('click', (e) => { if (e.target.closest('[data-open-about]')) { e.preventDefault(); openAbout(); } });
  $('#about-x').addEventListener('click', closeAbout);
  $('#about-close').addEventListener('click', closeAbout);
  $('#about').addEventListener('click', (e) => { if (e.target.id === 'about') closeAbout(); });
  document.addEventListener('keydown', (e) => {
    if (!isAboutOpen()) return;
    if (e.key === 'Escape') { e.stopImmediatePropagation(); closeAbout(); }
    else if (e.key === 'Tab') {
      const f = [...$('#about').querySelectorAll('button:not(.hidden), a[href]')];
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, true);
}
