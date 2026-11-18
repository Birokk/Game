@echo off
rem Blank: Project on your PC. Needs Node.js (https://nodejs.org). Double-click to start; the game opens in your browser.
cd /d "%~dp0"
if not exist node_modules call npm install
call npm run dev -- --open
