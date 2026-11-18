#!/bin/sh
# Blank: Project on your PC. Needs Node.js (https://nodejs.org). Run: sh start-mac-linux.sh
cd "$(dirname "$0")"
[ -d node_modules ] || npm install
npm run dev -- --open
