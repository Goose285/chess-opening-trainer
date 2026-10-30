# Lichess puzzle database (tactics puzzles)

The Tactics section of Road to 1500 uses puzzles selected from the **Lichess open puzzle database**
(<https://database.lichess.org/#puzzles>, `lichess_db_puzzle.csv.zst`, downloaded 2026-10-29).

- **Licence:** [Creative Commons CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) (public domain dedication). No attribution is required, but credit is given here and in the app: *"Puzzles: Lichess open database (CC0)"*.
- **What we kept:** for each opening we picked about 20 puzzles whose Lichess opening tag matches that opening (`tools/extract-puzzles.py`), rated 600-1600, with a strong preference for fork, pin, skewer, mate-in-1/2, hanging-piece, trapped-piece and back-rank themes, spread over the rating range. Only the puzzle id, start position (FEN), moves, rating and theme names are stored (`tactics/tactics.json`). Every move is re-checked for legality with chess.js (`tools/build-tactics.mjs`).
- **Hand-made traps** (ids starting `T-`) are original to this project: the lines are well-known opening traps, written out and verified with chess.js (legality, checkmate where claimed) and Stockfish (`tools/traps-src.mjs`, `ENGINE=1 node tools/build-tactics.mjs`).
- Puzzle ids (`id` column in the database) link back to the puzzle on Lichess: `https://lichess.org/training/<id>`.
- Lichess itself is free software (AGPL-3.0); we use none of its code from this dataset, only the CC0 data.
