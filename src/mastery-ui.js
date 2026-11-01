// Gambit mastery map screen: every gambit in the app as a card, grouped by side and first move, coloured by mastery level.
// Gold appears ONLY on mastered gambits (and the mastered count). Tapping a gambit hands its id to the caller (opens it in Openings, ready to train).
import { OPENINGS } from './openings.js';
import { getProgress } from './progress-ui.js';
import { LEVELS, LEVEL_LABEL, LEVEL_RULE, groupGambits, cellOf, summary } from './mastery.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ICON = { unseen: '○', learning: '◐', solid: '✓', mastered: '★' };

function cell(c) {
  const pct = c.lines ? Math.round((100 * c.linesDone) / c.lines) : 0;
  return `<button type="button" class="mm-cell lv-${c.level}" data-train="${esc(c.id)}" aria-label="${esc(c.name)}: ${LEVEL_LABEL[c.level]}, ${c.linesDone} of ${c.lines} lines practised. Tap to train.">
    <span class="mm-name">${esc(c.name)}</span>
    <span class="mm-lv"><i aria-hidden="true">${ICON[c.level]}</i>${LEVEL_LABEL[c.level]}${c.best ? `<em>${c.best}%</em>` : ''}</span>
    <span class="mm-bar" aria-hidden="true"><b style="width:${pct}%"></b></span>
    <span class="mm-lines">${c.linesDone}/${c.lines} lines</span></button>`;
}

export function renderMastery() {
  const state = getProgress(), sm = summary(OPENINGS, state);
  const seg = LEVELS.map((l) => (sm.counts[l] ? `<i class="lv-${l}" style="flex:${sm.counts[l]}" title="${LEVEL_LABEL[l]}: ${sm.counts[l]}"></i>` : '')).join('');
  const groups = groupGambits(OPENINGS).map((g) => `<section class="mm-group"><h2>${esc(g.title)}<span>${g.items.filter((o) => cellOf(o, state).level === 'mastered').length}/${g.items.length} mastered</span></h2><div class="mm-grid">${g.items.map((o) => cell(cellOf(o, state))).join('')}</div></section>`).join('');
  $('#mastery-body').innerHTML = `
    <div class="mm-sum"><div class="mm-sum-top"><span><b class="mm-mastered-n">${sm.counts.mastered}</b> of ${sm.total} gambits mastered</span><span class="mm-started">${sm.started} started</span></div>
      <div class="mm-stack" role="img" aria-label="${LEVELS.map((l) => `${sm.counts[l]} ${LEVEL_LABEL[l].toLowerCase()}`).join(', ')}">${seg}</div></div>
    <ul class="mm-legend" aria-label="Levels">${LEVELS.map((l) => `<li class="lv-${l}"><b><i>${ICON[l]}</i>${LEVEL_LABEL[l]}</b></li>`).join('')}</ul>
    <details class="mm-how"><summary>How mastery works</summary><ul>${LEVELS.map((l) => `<li class="lv-${l}"><b>${LEVEL_LABEL[l]}</b> ${LEVEL_RULE[l]}</li>`).join('')}</ul><p>Mastered matches the gold star on each opening. Lines counts the different lines you have finished.</p></details>
    ${groups}`;
}

/** Wire once: onTrain(id) opens that gambit, onBack() returns home. */
export function initMastery({ onTrain, onBack }) {
  $('#mastery-body').addEventListener('click', (e) => { const c = e.target.closest('[data-train]'); if (c) onTrain(c.dataset.train); });
  $('#mastery-back').addEventListener('click', onBack);
}

/** The Home entry card (count of mastered gambits, gold only when there is something mastered). */
export function homeMasteryHtml() {
  const sm = summary(OPENINGS, getProgress());
  return `<button type="button" class="mm-entry" data-mastery-open aria-label="Open the gambit mastery map. ${sm.counts.mastered} of ${sm.total} mastered, ${sm.started} started.">
    <span class="mm-entry-ico" aria-hidden="true">🗺</span>
    <span class="mm-entry-copy"><b>Gambit mastery map</b><span><em class="${sm.counts.mastered ? 'gold' : ''}">${sm.counts.mastered}</em> of ${sm.total} mastered · ${sm.started} started</span></span><span class="mm-entry-go" aria-hidden="true">›</span></button>`;
}
