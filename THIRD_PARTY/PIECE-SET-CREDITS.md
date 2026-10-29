# Piece set credits and licences

Road to 1500 lets players choose between nine chess piece sets. The SVG files in `pieces/<set>/` are **unmodified copies** of
the files in [lichess-org/lila](https://github.com/lichess-org/lila) `public/piece/<set>/` (downloaded 2026-10-29). Licences below are
taken from lila's [COPYING.md](https://github.com/lichess-org/lila/blob/master/COPYING.md) ("Exceptions (free)" and "Exceptions (non-free)"
tables), which is the authoritative record of who made each set and under what terms. The app code itself is GPL-3.0-or-later (see README).

| Set | Author | Licence (per lila COPYING.md) | Commercial use? |
|---|---|---|---|
| `cburnett` | [Colin M. L. Burnett](https://en.wikipedia.org/wiki/User:Cburnett) | [GPLv2+](https://www.gnu.org/licenses/gpl-2.0.txt) | **Yes**, under GPL terms (keep the licence and offer source) |
| `merida` | Armando Hernandez Marroquin | [GPLv2+](https://www.gnu.org/licenses/gpl-2.0.txt) | **Yes**, under GPL terms |
| `pixel` | therealqtpi | AGPLv3+ | **Yes**, under AGPL terms (offer the source of the work) |
| `kosal` | Kosal Sen / [Philatype](https://github.com/philatype/kosal) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | **Yes**, with attribution |
| `alpha` | Eric Bentzen | "free for personal non commercial use" ([zip](http://www.enpassant.dk/chess/downl/alpha.zip)); lila lists it under *non-free* exceptions | **No** (personal, non-commercial only) |
| `california` | [Jerry S.](https://sites.google.com/view/jerrychess/home) | [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) | **No** (NonCommercial) |
| `maestro` | sadsnake1 | [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) | **No** (NonCommercial) |
| `fresca` | sadsnake1 | [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) | **No** (NonCommercial) |
| `horsey` | cham, michael1241 | [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) | **No** (NonCommercial) |

## Summary

* **Free to use commercially (with the stated conditions): cburnett, merida, pixel, kosal.**
* **Personal / non-commercial only: alpha, california, maestro, fresca, horsey.** They are included for Seth's free, non-commercial
  hobby site. If Road to 1500 is ever sold, monetised (ads, paid tiers, subscriptions) or bundled into a commercial product,
  **remove these five sets first** (delete their folders in `pieces/`, their entries in `src/themes-data.js`, then run
  `node tools/gen-piece-css.mjs` and rebuild). The picker already marks them with a ⚠ badge.
* The CC BY-NC-SA files are redistributed unmodified; share-alike applies to the artwork, not to the app code. Attribution is given here
  and in the picker ("Credits" link).
* Notes on sources: lila's current COPYING.md does not have a separate `public/piece/kosal` row; the set's own repository
  ([philatype/kosal](https://github.com/philatype/kosal)) and lichobile's COPYING.md both state CC BY 4.0, which is what is recorded here.
  `alpha` is Eric Bentzen's freeware font set from [enpassant.dk](http://www.enpassant.dk/chess/fonteng.htm); lila hosts it with permission
  for non-commercial use only.

## Board colours

The board colour themes are plain colour pairs chosen for this app (no third-party artwork).

## Other pieces in this project

The classic `cburnett` set also ships as the default look and comes from the chessground distribution (GPL-3.0+). See the README for
chess.js, chessground and Stockfish licences.
