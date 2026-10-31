// "Buy me a coffee" tip card (Profile sheet and About screen). One place for the link and the wording.
export const TIP_URL = 'https://buymeacoffee.com/sethcmoynai';
export const TIP_LABEL = 'Buy me a coffee';
export const TIP_LINE = 'Pawnado is free. Tips keep it growing.';
/** full card (Profile) or the quieter inline row (About) */
export const tipHtml = (compact = false) => `<a class="tip-card${compact ? ' tip-compact' : ''}" href="${TIP_URL}" target="_blank" rel="noopener" data-tip>
  <span class="tip-ico" aria-hidden="true">☕</span><span class="tip-text"><b>${TIP_LABEL}</b><small>${TIP_LINE}</small></span><span class="tip-go" aria-hidden="true">›</span></a>`;

// ---- the small ☕ pill that sits top right on every screen: in the header, the board-screen bars and every sheet
export const TIP_PILL_LABEL = 'Buy me a coffee, tip Pawnado (opens in a new tab)';
export const tipPillHtml = () => `<a class="tip-pill" href="${TIP_URL}" target="_blank" rel="noopener" data-tip-pill aria-label="${TIP_PILL_LABEL}" title="${TIP_LABEL}"><span class="tp-ico" aria-hidden="true">☕</span><b class="tp-txt">Tip</b></a>`;
const make = () => { const t = document.createElement('template'); t.innerHTML = tipPillHtml(); return t.content.firstElementChild; };
/** Put a pill next to the top-right control of every screen / sheet (idempotent). Placing it in each bar's own layout means it can never cover another control. */
export function mountTipPills(root = document) {
  const add = (parent, before) => { if (!parent || parent.querySelector(':scope > [data-tip-pill]')) return; parent.insertBefore(make(), before || null); };
  root.querySelectorAll('.top-right').forEach((el) => add(el));                       // Home / Openings / Tactics header
  root.querySelectorAll('.gbar').forEach((el) => add(el));                            // drill, watch-first and puzzle screens
  root.querySelectorAll('.learn-head').forEach((head) => {                           // Learn more, Themes, Profile, About, Feedback
    const x = head.querySelector(':scope > .x-btn'); if (!x || head.querySelector('[data-tip-pill]')) return;
    const box = document.createElement('div'); box.className = 'head-btns';
    head.insertBefore(box, x); box.appendChild(make()); box.appendChild(x);
  });
  root.querySelectorAll('#summary .modal-card').forEach((card) => {                  // line summary has no header bar
    if (card.querySelector(':scope > [data-tip-pill]')) return;
    const p = make(); p.classList.add('tip-pill-abs'); card.insertBefore(p, card.firstChild);
  });
}
