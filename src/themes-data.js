// Board colour themes and piece sets (pure data: also imported by tools/ in node).
// Board fields: light/dark = square colours; last/sel = last-move / selected-square overlay; dot = legal-move dot;
// cLight/cDark = coordinate text on light/dark squares; arrows = brush colours for green/red/blue arrows;
// glow = true adds a thin light halo to black pieces (for very dark boards).
export const BOARDS = [
  { id: 'original', name: 'Original', light: '#b58863', dark: '#916d4f', last: 'rgba(205,210,106,.5)', sel: 'rgba(255,213,79,.55)', dot: 'rgba(20,85,30,.5)', cLight: 'rgba(72,72,72,.85)', cDark: 'rgba(255,255,255,.85)', arrows: { green: '#15781b', red: '#b3261e', blue: '#003088' } },
  { id: 'wood', name: 'Classic Wood', light: '#f0d9b5', dark: '#b58863', last: 'rgba(155,199,0,.41)', sel: 'rgba(255,213,79,.6)', dot: 'rgba(20,85,30,.5)', cLight: '#b58863', cDark: '#f0d9b5', arrows: { green: '#15781b', red: '#b3261e', blue: '#003088' } },
  { id: 'green', name: 'Tournament Green', light: '#eeeed2', dark: '#769656', last: 'rgba(246,246,105,.65)', sel: 'rgba(255,213,79,.65)', dot: 'rgba(20,60,20,.45)', cLight: '#769656', cDark: '#eeeed2', arrows: { green: '#15781b', red: '#b3261e', blue: '#003088' } },
  { id: 'ocean', name: 'Ocean Blue', light: '#dee3e6', dark: '#8ca2ad', last: 'rgba(255,214,102,.6)', sel: 'rgba(255,193,7,.62)', dot: 'rgba(10,40,70,.45)', cLight: '#6a8290', cDark: '#f2f5f7', arrows: { green: '#1b7f3a', red: '#c0392b', blue: '#0b3d91' } },
  { id: 'neon', name: 'Midnight Neon', light: '#3a4660', dark: '#1c2333', last: 'rgba(0,229,255,.30)', sel: 'rgba(255,64,200,.42)', dot: 'rgba(0,229,255,.55)', cLight: '#a7bbdd', cDark: '#8da3cc', glow: true, arrows: { green: '#39ff88', red: '#ff4d6d', blue: '#4da3ff' } },
  { id: 'purple', name: 'Royal Purple', light: '#e8dff5', dark: '#8e6fb5', last: 'rgba(255,214,0,.45)', sel: 'rgba(255,196,0,.6)', dot: 'rgba(55,20,90,.45)', cLight: '#8e6fb5', cDark: '#efe8f8', arrows: { green: '#1e8e3e', red: '#c62828', blue: '#1a3fa0' } },
  { id: 'desert', name: 'Desert Sunset', light: '#f6e3c5', dark: '#d2774c', last: 'rgba(66,165,245,.5)', sel: 'rgba(255,235,59,.6)', dot: 'rgba(70,30,0,.42)', cLight: '#b4562d', cDark: '#fbeedb', arrows: { green: '#1b7f3a', red: '#b3261e', blue: '#0b3d91' } },
  { id: 'ice', name: 'Ice & Steel', light: '#e9eef2', dark: '#5d7a91', last: 'rgba(255,214,102,.6)', sel: 'rgba(255,193,7,.62)', dot: 'rgba(10,30,50,.45)', cLight: '#5d7a91', cDark: '#eef3f6', arrows: { green: '#15781b', red: '#b3261e', blue: '#003088' } },
];
export const DEFAULT_BOARD = 'original';

// Only piece sets whose licences allow commercial use are shipped (see THIRD_PARTY/PIECE-SET-CREDITS.md and
// tools/check-licenses.mjs, which fails if a set is added without being on the allow-list).
// Licences come from lichess-org/lila COPYING.md and each set's own repository (checked 2026-10-30).
export const PIECE_SETS = [
  { id: 'cburnett', name: 'Cburnett', author: 'Colin M. L. Burnett', license: 'GPLv2+' },
  { id: 'merida', name: 'Merida', author: 'Armando Hernandez Marroquin', license: 'GPLv2+' },
  { id: 'pixel', name: 'Pixel', author: 'therealqtpi', license: 'AGPLv3+' },
  { id: 'kosal', name: 'Kosal', author: 'Kosal Sen (Philatype)', license: 'CC BY 4.0' },
];
export const DEFAULT_PIECES = 'merida'; // default for new players and for anyone who never picked a set (an explicit pick is kept)
