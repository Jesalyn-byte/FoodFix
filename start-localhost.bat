@echo off
setlocal enabledelayedexpansion
title FoodFix Web Dashboard - Localhost Server (Port 3000)

cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
    if exist "%ProgramFiles%\nodejs\node.exe" (
        set "PATH=%ProgramFiles%\nodejs;%PATH%"
    ) else if exist "%LocalAppData%\Programs\nodejs\node.exe" (
        set "PATH=%LocalAppData%\Programs\nodejs;%PATH%"
    )
)

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js was not found. Please run setup.bat first.
    pause
    exit /b 1
)

if not exist "%CD%\dist\index.html" (
    echo Production build not found in dist\. Building Web Dashboard now...
    if not exist "%CD%\web\node_modules" (
        echo Web modules missing. Installing web dependencies first...
        call npm --prefix web install
    )
    call npm run build:pwa
    if errorlevel 1 (
        echo [ERROR] Failed to build dist\. Run setup.bat first.
        pause
        exit /b 1
    )
)

if "%PORT%"=="" set "PORT=3000"

echo ======================================================================
echo   FOODFIX WEB DASHBOARD - LOCALHOST SERVER
echo   Directory : %CD%
echo   URL       : http://localhost:%PORT%
echo   Press Ctrl+C to stop the server.
echo ======================================================================
echo.

REM Open browser cleanly after server binds
start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 1; Start-Process 'http://localhost:%PORT%'"

node "%CD%\scripts\serve-web.js"
if errorlevel 1 (
    echo.
    echo [ERROR] Localhost server exited unexpectedly (port %PORT% may already be in use).
    pause
    exit /b 1
)

