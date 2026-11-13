@echo off
setlocal enabledelayedexpansion
title FoodFix / LasangPinoy - One-Time Setup

cd /d "%~dp0"

echo ======================================================================
echo   FOODFIX (LasangPinoy) - One-Time Dependency ^& Environment Setup
echo   Installing into: %CD%
echo ======================================================================
echo.

REM ----------------------------------------------------------------------
REM [1/5] Verify / Repair / Install Node.js
REM ----------------------------------------------------------------------
echo [1/5] Checking Node.js...
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
    echo       Node.js not found on PATH. Attempting winget install...
    where winget >nul 2>&1
    if not errorlevel 1 (
        winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
        set "PATH=%ProgramFiles%\nodejs;%PATH%"
    )
)

where node >nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERROR] Node.js is required. Install LTS from https://nodejs.org/
    echo         Then run setup.bat again.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node --version') do set "NODE_VERSION=%%v"
echo       OK  Node.js !NODE_VERSION!

REM ----------------------------------------------------------------------
REM [2/5] Verify .env Configuration in Extracted Folder
REM ----------------------------------------------------------------------
echo [2/5] Checking environment configuration (.env)...
if not exist "%CD%\.env" (
    if exist "%CD%\.env.demo" (
        copy /Y "%CD%\.env.demo" "%CD%\.env" >nul
        echo       Created .env from .env.demo
    ) else if exist "%CD%\.env.example" (
        copy /Y "%CD%\.env.example" "%CD%\.env" >nul
        echo       [WARN] Created .env from .env.example - please fill in API keys.
    ) else (
        echo       [WARN] No .env template found in %CD%
    )
) else (
    echo       OK  Active .env verified at %CD%\.env
)

REM ----------------------------------------------------------------------
REM [3/5] Install Root Project Modules in Current Directory
REM ----------------------------------------------------------------------
echo [3/5] Installing root dependencies into "%CD%\node_modules"...
call npm install
if errorlevel 1 (
    echo       [WARN] Retrying with --legacy-peer-deps...
    call npm install --legacy-peer-deps
    if errorlevel 1 (
        echo [ERROR] Failed to install root npm packages.
        pause
        exit /b 1
    )
)
echo       OK  Root node_modules installed.

REM ----------------------------------------------------------------------
REM [4/5] Install Web Dashboard Modules in web\node_modules
REM ----------------------------------------------------------------------
echo [4/5] Installing React Web Dashboard dependencies into "%CD%\web\node_modules"...
if exist "%CD%\web\package.json" (
    call npm --prefix web install
    if errorlevel 1 (
        echo [ERROR] Failed to install web dependencies.
        pause
        exit /b 1
    )
    echo       OK  Web node_modules installed.
) else (
    echo       Skipped (web\package.json not present)
)

REM ----------------------------------------------------------------------
REM [5/5] Build Production Web Bundle into dist\
REM ----------------------------------------------------------------------
echo [5/5] Building FoodFix Web Dashboard into "%CD%\dist"...
call npm run build:pwa
if errorlevel 1 (
    echo [ERROR] Web production build failed.
    pause
    exit /b 1
)

echo.
echo ======================================================================
echo   SETUP COMPLETE!
echo   All dependencies and modules are installed in:
echo     %CD%
echo.
echo   Next step: Double-click start-localhost.bat to run http://localhost:3000
echo ======================================================================
echo.
pause

