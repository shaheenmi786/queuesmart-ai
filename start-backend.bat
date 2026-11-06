@echo off
echo Starting QueueSmart AI Backend Server on http://127.0.0.1:5000...
cd /d %~dp0server
..\server_venv\Scripts\python.exe app.py
pause
