#!/usr/bin/env bash
# Rebuilds dist/app.js (needs: npm install). Not needed to run the app — dist/ is committed.
set -e
cd "$(dirname "$0")"
npx esbuild src/main.js --bundle --minify --format=iife --target=es2020 --outfile=dist/app.js
