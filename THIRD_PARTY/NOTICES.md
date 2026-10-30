# Third-party notices for Gambiteer

Gambiteer is free software: **GPL-3.0-or-later** (see [`../LICENSE`](../LICENSE)). Copyright © 2026 Seth Moynahan.
This file lists everything we ship that someone else wrote, the licence it comes under, and what we do to comply. It is mirrored in the app
(Home → "About & licenses") from `src/licenses.js`. Last verified against the upstream sources on 2026-10-30.

| Component (shipped file) | Copyright / author | Licence | Commercial use | Our compliance |
|---|---|---|---|---|
| Gambiteer code, opening notes, logo, icons (`src/`, `css/`, `index.html`, `icons/`...) | Seth Moynahan | GPL-3.0-or-later | yes | [`LICENSE`](../LICENSE); source public at <https://github.com/Goose285/chess-opening-trainer> |
| Stockfish.js 19.0.1, "lite single" WebAssembly build (`vendor/stockfish/stockfish-19-lite-single.{js,wasm}`) | Stockfish.js © 2026 Chess.com, LLC (Nathan Rugg); Stockfish © 2004-2026 T. Romstad, M. Costalba, J. Kiiski, G. Linscott and the Stockfish developers | GPL-3.0 ([`licenses/Stockfish.js-Copying-GPL-3.0.txt`](licenses/Stockfish.js-Copying-GPL-3.0.txt)) | yes | Licence shipped in `vendor/stockfish/`; source below; the engine runs as a separate Web Worker, unmodified, and is not renamed or relabelled |
| Stockfish NNUE network `nn-61e7af4bb97d` (embedded in the engine file) | Chris Bao (sscg13), via Stockfish fishtest | CC0 1.0 | yes | none required; credit given. Trained with data from Leela Chess Zero (ODbL) |
| chessground 9.2.1 (bundled in `dist/app.js`) | Thibault Duplessis and lichess.org contributors | GPL-3.0-or-later | yes | Our app is GPL-3.0-or-later as a result; source public |
| chess.js 1.4.0 (bundled in `dist/app.js`) | Jeff Hlywa | BSD-2-Clause ([`licenses/chess.js-BSD-2-Clause.txt`](licenses/chess.js-BSD-2-Clause.txt)) | yes | Copyright notice, conditions and disclaimer reproduced here and in the About screen |
| Piece sets `cburnett`, `merida` | C. M. L. Burnett; A. Hernandez Marroquin | GPL-2.0-or-later (used under GPL-3.0) | yes | see [`PIECE-SET-CREDITS.md`](PIECE-SET-CREDITS.md) |
| Piece set `pixel` | therealqtpi | AGPL-3.0-or-later | yes | source public (this repository) |
| Piece set `kosal` | Kosal Sen (Philatype) | CC BY 4.0 | yes | attribution here and in the app |
| Lichess puzzle data (`tactics/tactics.json`) | lichess.org community | CC0 1.0 | yes | credit given; [`LICHESS-PUZZLES.md`](LICHESS-PUZZLES.md) |
| Opening names / ECO codes (from lichess-org/chess-openings) | lichess.org contributors | CC0 1.0 | yes | credit given |
| Fonts, sounds, photos, emoji | none bundled (system fonts / system emoji) | n/a | n/a | n/a |
| Board colours | original (plain colour pairs) | GPL (ours) | yes | n/a |

Development-only tools that are **not** shipped: esbuild (MIT), playwright-core (Apache-2.0), the `stockfish` npm package (same GPL-3.0 files
as `vendor/`).

## Where to get the source (GPL "corresponding source")

* **This app:** <https://github.com/Goose285/chess-opening-trainer>. It contains every file we ship, including the pre-built engine in
  `vendor/stockfish/` and the build script (`build.sh`, `package.json`). The app bundle `dist/app.js` is built from `src/` with
  `npm install && npm run build`.
* **Stockfish.js 19.0.1:** <https://github.com/nmrugg/stockfish.js> (`src/` holds the complete Stockfish C++ source and the emscripten glue,
  `build.js` builds the WebAssembly files) and the npm package <https://www.npmjs.com/package/stockfish/v/19.0.1>. The original engine:
  <https://github.com/official-stockfish/Stockfish>.
* **Written offer:** if any of these links goes away, write to the repository's issue tracker and we will provide the corresponding source of the
  version you received for as long as we distribute it, and at least three years.

## App-store and paid builds

Any build we sell or give away (web, installable app, App Store, Google Play, desktop) must:
1. include the full `LICENSE` text and this `THIRD_PARTY/` folder (or the in-app "About & licenses" screen, which links to them);
2. offer the complete corresponding source for that exact build (the link above is the offer; for a store build also put the repository URL in
   the store description);
3. not add terms that restrict what the GPL lets recipients do (no "no redistribution", no DRM that blocks installing a modified build, no
   additional non-commercial or no-reverse-engineering clause) - for the App Store this is the part to get legal advice on, see the README.
Charging for the app is allowed. The GPL only requires that the people who receive it can also receive the source and the same rights.

## Trademarks

"Stockfish", "Lichess", "Chess.com" and other names are the property of their owners and are used only to say what we use. Gambiteer is not
affiliated with or endorsed by them.
