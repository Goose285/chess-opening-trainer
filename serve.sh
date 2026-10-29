#!/usr/bin/env bash
# Serves the trainer on http://localhost:8080 (needed for the Stockfish web worker).
cd "$(dirname "$0")"
PORT="${1:-8080}"
echo "Open http://localhost:$PORT/"
exec python3 -m http.server "$PORT"
