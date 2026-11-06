@echo off
echo ========================================================
echo  QueueSmart AI - Starting Full Stack Application
echo ========================================================
echo Starting Flask Backend Server (Port 5000)...
start "QueueSmart AI - Backend" cmd /k "cd /d %~dp0server && ..\server_venv\Scripts\python.exe app.py"

echo Starting Vite Frontend Server (Port 5173)...
start "QueueSmart AI - Frontend" cmd /k "cd /d %~dp0client && npm run dev -- --open"

echo.
echo Both servers launched!
echo Frontend: http://127.0.0.1:5173
echo Backend:  http://127.0.0.1:5000
echo ========================================================
