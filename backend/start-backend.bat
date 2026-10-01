@echo off
echo Starting Preplyx Backend Server...
echo.
cd /d "%~dp0"
echo Building TypeScript...
call npm run build
if %errorlevel% neq 0 (
    echo Build failed. Please check for TypeScript errors.
    pause
    exit /b %errorlevel%
)
echo.
echo Starting server...
call npm start
pause
