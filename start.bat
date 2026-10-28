@echo off
title LabPulse - Starting Application...
cd /d "%~dp0"

echo ===================================================
echo   LabPulse - Starting Fullstack Application
echo ===================================================
echo.

where npm >nul 2>nul
if %ERRORLEVEL% equ 0 (
    npm start
    goto end
)

where node >nul 2>nul
if %ERRORLEVEL% equ 0 (
    node scripts/start.js
    goto end
)

where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    python run.py
    goto end
)

echo [ERROR] Neither npm, node, nor python was found in PATH.
echo Please install Node.js (https://nodejs.org) and Python (https://python.org).
pause

:end

