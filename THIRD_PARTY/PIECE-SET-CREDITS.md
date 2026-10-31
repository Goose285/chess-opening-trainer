# Piece set credits and licences

Pawnado ships **four** piece sets. The SVG files in `pieces/<set>/` are **unmodified copies** of the files in
[lichess-org/lila](https://github.com/lichess-org/lila) `public/piece/<set>/` (downloaded 2026-10-29; byte-compared with each set's own
upstream on 2026-10-30). Licences are taken from lila's
[COPYING.md](https://github.com/lichess-org/lila/blob/master/COPYING.md) and each set's own repository. All four allow commercial use.
The default set (new players, and anyone who never picked one) is **`merida`**; a set a player picks is kept.

| Set | Author | Licence | Commercial use? | What you must do |
|---|---|---|---|---|
| `cburnett` | [Colin M. L. Burnett](https://en.wikipedia.org/wiki/User:Cburnett) | [GPL-2.0-or-later](licenses/GPL-2.0.txt) (we use it under [GPL-3.0](licenses/GPL-3.0.txt)) | **Yes** | Keep the licence, offer the source (we do) |
| `merida` | Armando Hernandez Marroquin | [GPL-2.0-or-later](licenses/GPL-2.0.txt) (used under GPL-3.0) | **Yes** | Same |
| `pixel` | therealqtpi | [AGPL-3.0-or-later](licenses/AGPL-3.0.txt) | **Yes** | Offer the source of the work (it is in this repository, and in the app's About screen) |
| `kosal` | Kosal Sen / [Philatype](https://github.com/philatype/kosal) | [CC BY 4.0](licenses/CC-BY-4.0.txt) | **Yes** | Give attribution (About screen and this file) and say if changed |

Compatibility: GPL-2.0-or-later and AGPL-3.0-or-later works can be combined into a GPL-3.0-or-later program (GPLv3 section 13 for the AGPL
part), and the FSF lists CC BY 4.0 as compatible with all GPL versions. The piece artwork stays under its own licence; nothing here adds any
restriction to it.

Provenance notes
* lila's COPYING.md has no separate `kosal` row (only `totoy`, also by Kosal Sen, CC BY 4.0). The set's own repository
  ([philatype/kosal](https://github.com/philatype/kosal)) states CC BY 4.0; our files have the same geometry as that repository but were
  minified (SVGO) by lila. This is a format-only change; the licence text is in [`licenses/kosal-LICENSE-upstream.txt`](licenses/kosal-LICENSE-upstream.txt).
* The pixel set is the only AGPL component. Its "network use" clause is satisfied because the complete source is public.

## Removed (not licensed for commercial use)

These five sets were removed on 2026-10-30 so the app can be sold. They are no longer in `pieces/`, the picker, or the app bundle.
A player whose saved choice was one of them is switched to the default set automatically.

| Set | Author | Licence | Why removed |
|---|---|---|---|
| `alpha` | Eric Bentzen | "free for personal non commercial use" | Non-commercial only |
| `california` | Jerry S. | CC BY-NC-SA 4.0 | NonCommercial |
| `maestro` | sadsnake1 | CC BY-NC-SA 4.0 | NonCommercial |
| `fresca` | sadsnake1 | CC BY-NC-SA 4.0 | NonCommercial |
| `horsey` | cham, michael1241 | CC BY-NC-SA 4.0 | NonCommercial |

`tools/check-licenses.mjs` fails if a piece folder or `PIECE_SETS` entry is added that is not on the approved list above.

## Board colours

The board colour themes are plain colour pairs chosen for this app (no third-party artwork).
