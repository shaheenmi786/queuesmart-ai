@echo off
echo Starting QueueSmart AI Backend Server on http://127.0.0.1:5000...
cd /d %~dp0server
if exist venv\Scripts\python.exe (
    venv\Scripts\python.exe app.py
) else if exist ..\server_venv\Scripts\python.exe (
    ..\server_venv\Scripts\python.exe app.py
) else (
    python app.py
)
pause
