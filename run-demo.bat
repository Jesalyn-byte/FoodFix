@echo off
setlocal enabledelayedexpansion
title FoodFix / LasangPinoy - Complete Client Setup & Technical Demo Launcher

echo ======================================================================
echo   FOODFIX (LasangPinoy) - Automated Setup ^& Technical Demo Launcher
echo ======================================================================
echo.
echo This script automatically handles:
echo   1. Checking / Installing Node.js ^& Git (with PATH auto-repair)
echo   2. Unpacking ZIP archives OR cloning/updating from GitHub
echo   3. Locating and directing to the exact project root path
echo   4. Configuring the .env API keys file automatically
echo   5. Installing npm dependencies
echo   6. Launching the Local Server ^& Lamion AI Technical Debugger
echo.

REM ---------- Resolve starting script folder ----------
set "START_DIR=%~dp0"
cd /d "%START_DIR%"

REM ======================================================================
REM STEP 1: Check / Auto-Repair / Install Node.js
REM ======================================================================
echo [1/5] Checking for Node.js...
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
    echo         [WARN] Node.js not found on PATH. Attempting automatic install via winget...
    where winget >nul 2>&1
    if not errorlevel 1 (
        winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
        set "PATH=%ProgramFiles%\nodejs;%PATH%"
    )
)

where node >nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERROR] Node.js is not installed.
    echo         Please install Node.js LTS from: https://nodejs.org/en/download
    echo         Then re-run this script.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node --version') do set "NODE_VERSION=%%v"
echo         OK  Node.js !NODE_VERSION!

REM ======================================================================
REM STEP 2: Check / Auto-Repair / Install Git
REM ======================================================================
echo [2/5] Checking for Git...
where git >nul 2>&1
if errorlevel 1 (
    if exist "%ProgramFiles%\Git\cmd\git.exe" (
        set "PATH=%ProgramFiles%\Git\cmd;%PATH%"
    ) else if exist "%LocalAppData%\Programs\Git\cmd\git.exe" (
        set "PATH=%LocalAppData%\Programs\Git\cmd;%PATH%"
    )
)

where git >nul 2>&1
if errorlevel 1 (
    echo         [WARN] Git not found on PATH. Attempting automatic install via winget...
    where winget >nul 2>&1
    if not errorlevel 1 (
        winget install Git.Git --accept-package-agreements --accept-source-agreements
        set "PATH=%ProgramFiles%\Git\cmd;%PATH%"
    )
)

REM ======================================================================
REM STEP 3: Unpack ZIP / Clone Repo / Resolve Exact Project Path
REM ======================================================================
echo [3/5] Resolving project files and directory path...
set "REPO_URL=https://github.com/Jesalyn-byte/FoodFix.git"
set "PROJECT_DIR="

REM Case A: Script is already inside the project root
if exist "%START_DIR%package.json" (
    set "PROJECT_DIR=%START_DIR%"
    goto :path_resolved
)

REM Case B: Existing subfolder already has package.json
for %%D in ("FoodFix" "FoodFix-main" "FoodFix-main\FoodFix-main" "PUPLasangpinoy" "PUPLasangpinoy-main") do (
    if exist "%START_DIR%%%~D\package.json" (
        set "PROJECT_DIR=%START_DIR%%%~D\"
        goto :path_resolved
    )
)

REM Case C: Check for a downloaded ZIP archive next to script or in Downloads and unpack it
set "FOUND_ZIP="
for %%Z in ("%START_DIR%FoodFix*.zip" "%START_DIR%PUPLasangpinoy*.zip" "%USERPROFILE%\Downloads\FoodFix*.zip") do (
    if exist "%%~fZ" (
        if not defined FOUND_ZIP set "FOUND_ZIP=%%~fZ"
    )
)

if defined FOUND_ZIP (
    echo         Found archive: "!FOUND_ZIP!"
    echo         Unpacking archive into "%START_DIR%FoodFix_Unpacked"...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -Path '!FOUND_ZIP!' -DestinationPath '%START_DIR%FoodFix_Unpacked' -Force"
    for /f "delims=" %%P in ('powershell -NoProfile -Command "$p = Get-ChildItem -Path '%START_DIR%FoodFix_Unpacked' -Filter 'package.json' -Recurse | Select-Object -First 1; if ($p) { $p.DirectoryName }"') do (
        set "PROJECT_DIR=%%P\"
    )
    if defined PROJECT_DIR goto :path_resolved
)

REM Case D: Clone fresh from GitHub
where git >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Neither an existing project folder/ZIP nor Git was found.
    echo         Please install Git from https://git-scm.com/download/win or place FoodFix.zip in this folder.
    pause
    exit /b 1
)

echo         Cloning repository from %REPO_URL%...
git clone "%REPO_URL%" "%START_DIR%FoodFix"
if errorlevel 1 (
    echo [ERROR] git clone failed. Check your internet connection.
    pause
    exit /b 1
)
set "PROJECT_DIR=%START_DIR%FoodFix\"

:path_resolved
cd /d "%PROJECT_DIR%"
echo         OK  Directed to Project Path: "%CD%"

REM ======================================================================
REM STEP 4: Locate and Configure .env Automatically
REM ======================================================================
echo [4/5] Configuring .env environment variables...
set "ENV_SOURCE="

if exist "%CD%\.env" (
    set "ENV_SOURCE=%CD%\.env"
) else (
    for %%F in (
        "%START_DIR%.env.demo"
        "%START_DIR%.env.demo.txt"
        "%START_DIR%.env"
        "%START_DIR%.env.txt"
        "%START_DIR%env.demo"
        "%START_DIR%env.txt"
        "%CD%\.env.demo"
        "%USERPROFILE%\Desktop\.env.demo"
        "%USERPROFILE%\Desktop\.env.demo.txt"
        "%USERPROFILE%\Desktop\.env"
        "%USERPROFILE%\Downloads\.env.demo"
        "%USERPROFILE%\Downloads\.env.demo.txt"
        "%USERPROFILE%\Downloads\.env"
    ) do (
        if not defined ENV_SOURCE (
            if exist "%%~fF" set "ENV_SOURCE=%%~fF"
        )
    )
)

if defined ENV_SOURCE (
    if /i not "!ENV_SOURCE!"=="%CD%\.env" (
        copy /Y "!ENV_SOURCE!" "%CD%\.env" >nul
        echo         OK  Copied "!ENV_SOURCE!" -^> "%CD%\.env"
    ) else (
        echo         OK  Active .env verified at "%CD%\.env"
    )
) else (
    echo         [WARN] No .env or .env.demo found automatically.
    if exist "%CD%\.env.example" (
        copy /Y "%CD%\.env.example" "%CD%\.env" >nul
        echo         Created "%CD%\.env" from template. Opening Notepad so you can paste your keys...
        notepad "%CD%\.env"
    )
)

REM ======================================================================
REM STEP 5: Install Dependencies
REM ======================================================================
echo [5/5] Checking project dependencies in "%CD%"...
if exist "%CD%\node_modules\expo\package.json" (
    echo         OK  node_modules already installed.
) else (
    echo         Installing npm packages ^(takes 5-15 minutes on first run^)...
    call npm install
    if errorlevel 1 (
        echo         [WARN] Standard npm install had peer conflicts, retrying with --legacy-peer-deps...
        call npm install --legacy-peer-deps
        if errorlevel 1 (
            echo [ERROR] npm install failed. Check your internet connection.
            pause
            exit /b 1
        )
    )
    echo         OK  Dependencies installed successfully.
)

REM ======================================================================
REM STEP 6: Interactive Defense & Technical Debugging Menu
REM ======================================================================
:menu
echo.
echo ======================================================================
echo   FOODFIX READY - TECHNICAL DEMO ^& DEBUGGING MENU
echo   Active Path: %CD%
echo ======================================================================
echo   [1] Start Local Expo Server (Web + Mobile QR Code for Android/iOS)
echo   [2] Start Local Web Server Only (Opens http://localhost:8081)
echo   [3] Launch Lamion AI Live Technical Debugger (Terminal Chat ^& Guardrails)
echo   [4] Run Automated Test Suite (117 Unit Tests: Lamion AI + Guardrails + DB)
echo   [5] Run TypeScript Compiler Verification (npx tsc --noEmit)
echo   [6] Open Project Folder in VS Code / File Explorer
echo   [7] Force Re-install Dependencies (npm install)
echo   [0] Exit
echo ======================================================================
set /p "CHOICE=Select an option [1-7, or 0 to exit] (default=1): "
if "%CHOICE%"=="" set "CHOICE=1"

if "%CHOICE%"=="1" (
    echo.
    echo Starting Expo Dev Server ^(Press 'w' for Web, scan QR for Android, Ctrl+C to stop^)...
    call npx expo start -c
    goto :menu
)
if "%CHOICE%"=="2" (
    echo.
    echo Starting Expo Web Server on http://localhost:8081 ^(Press Ctrl+C to stop^)...
    call npx expo start --web -c
    goto :menu
)
if "%CHOICE%"=="3" (
    echo.
    node scripts/debug-lamion-demo.js
    goto :menu
)
if "%CHOICE%"=="4" (
    echo.
    echo Running all 117 automated unit tests...
    call npm test
    echo.
    pause
    goto :menu
)
if "%CHOICE%"=="5" (
    echo.
    echo Running TypeScript typecheck...
    call npx tsc --noEmit
    if not errorlevel 1 echo         OK  0 TypeScript errors!
    echo.
    pause
    goto :menu
)
if "%CHOICE%"=="6" (
    where code >nul 2>&1
    if not errorlevel 1 (
        call code "%CD%"
    ) else (
        explorer "%CD%"
    )
    goto :menu
)
if "%CHOICE%"=="7" (
    call npm install
    goto :menu
)
if "%CHOICE%"=="0" (
    exit /b 0
)
goto :menu
