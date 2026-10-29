# Opening Trainer

Play through chess openings yourself. Pick an opening and a side; the computer answers with a **random book line**, and every move you make is graded:

* **Book move** – it's in the opening line.
* Otherwise **Stockfish 19** (WASM) compares your move with its best move and labels it
  **Best** (≤10 cp loss or the engine's top move) · **Excellent** (≤25) · **Good** (<50) · **Inaccuracy** (50–100) · **Mistake** (100–250) · **Blunder** (>250).
* You always see the expected book move(s), the evaluation, and the engine's best move, and can **Retry**, **Show book move & continue**, or (for sound moves) **Keep my move (leave book)**.
* Score: Book/Best 100 · Excellent 90 · Good 75 · Inaccuracy 40 · Mistake 15 · Blunder 0 per move, based on your *first try*. A hint caps that move at 50. A summary appears at the end of each line.

## Run it

**Best (full Stockfish): a local server**

```bash
./serve.sh            # → http://localhost:8080/   (or: python3 -m http.server 8080)
```

**Or just double-click `index.html`.** Browsers don't allow web workers from `file://`, so the app falls back to a small built-in JS engine (depth-2 search); grading still works but is rougher. The pill in the top-right shows which engine is active.

No internet or build step needed — everything is bundled in this folder.

## Layout

```
index.html            app shell
css/app.css           UI styles          css/chessground.css  board + cburnett pieces
dist/app.js           bundled app (chess.js + chessground + src/*)
src/openings.js       opening library (16 openings, 61 lines) — add your own here
src/book.js           position-graph book, weighted random replies
src/engine.js         Stockfish worker wrapper + fallback engine
src/grading.js        cp-loss → label rules and scoring
src/main.js           UI / game flow
vendor/stockfish/     stockfish-19-lite-single.{js,wasm}
tools/                check-book (legality), audit-book (Stockfish audit of book lines), e2e tests
```

## Editing / rebuilding

```bash
npm install
./build.sh            # rebuilds dist/app.js with esbuild
npm run test:book     # validates every book line is legal
npm run audit         # Stockfish check that no book move drops >70 cp
npm run test:e2e      # headless Chrome tests (needs the server at :8099 or pass a URL)
```

To add a line, append `{ name, moves: 'e4 e5 Nf3 ...' }` (SAN, no move numbers) to an opening in `src/openings.js` and rebuild. Lines merge into a position graph, so shared prefixes and transpositions just work.

## Licences

chess.js (BSD-2), chessground + cburnett pieces (GPL-3.0+), Stockfish.js 19 (GPL-3.0). This project is therefore distributed under GPL-3.0-or-later; see `vendor/stockfish/LICENSE-stockfish-GPLv3.txt`.
