@echo off
echo Running QueueSmart AI Automated Pytest Suite...
cd /d %~dp0server
if exist venv\Scripts\python.exe (
    venv\Scripts\python.exe -m pytest tests -v
) else if exist ..\server_venv\Scripts\python.exe (
    ..\server_venv\Scripts\python.exe -m pytest tests -v
) else (
    python -m pytest tests -v
)
pause
