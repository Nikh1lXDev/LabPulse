# LabPulse PowerShell One-Command Launcher
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  LabPulse - Starting Fullstack Application" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

if (Get-Command npm -ErrorAction SilentlyContinue) {
    npm start
} elseif (Get-Command node -ErrorAction SilentlyContinue) {
    node scripts/start.js
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
    python run.py
} else {
    Write-Host "[ERROR] Could not find npm, node, or python in PATH." -ForegroundColor Red
}

