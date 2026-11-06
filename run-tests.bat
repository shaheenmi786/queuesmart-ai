@echo off
echo Running QueueSmart AI Automated Pytest Suite...
cd /d %~dp0server
..\server_venv\Scripts\python.exe -m pytest tests -v
pause
