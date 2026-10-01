@echo off
echo Starting Preplyx Backend Server in Development Mode...
echo.
cd /d "%~dp0"
echo Starting server with nodemon (auto-restart on file changes)...
call npm run dev
pause
