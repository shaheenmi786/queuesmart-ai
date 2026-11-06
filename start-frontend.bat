@echo off
echo Starting QueueSmart AI Frontend Server on http://127.0.0.1:5173...
cd /d %~dp0client
npm run dev -- --open
pause
