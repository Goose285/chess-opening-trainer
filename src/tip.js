// "Buy me a coffee" tip card (Profile sheet and About screen). One place for the link and the wording.
export const TIP_URL = 'https://buymeacoffee.com/sethcmoynai';
export const TIP_LABEL = 'Buy me a coffee';
export const TIP_LINE = 'Pawnado is free. Tips keep it growing.';
/** full card (Profile) or the quieter inline row (About) */
export const tipHtml = (compact = false) => `<a class="tip-card${compact ? ' tip-compact' : ''}" href="${TIP_URL}" target="_blank" rel="noopener" data-tip>
  <span class="tip-ico" aria-hidden="true">☕</span><span class="tip-text"><b>${TIP_LABEL}</b><small>${TIP_LINE}</small></span><span class="tip-go" aria-hidden="true">›</span></a>`;
