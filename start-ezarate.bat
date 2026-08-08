@echo off
setlocal enabledelayedexpansion
REM ============================================================
REM  start-ezarate.bat
REM  One-click launcher: starts Postgres (Docker), the Spring
REM  Boot backend, and the Vite frontend, each in its own window.
REM
REM  SETUP: place this file directly inside the EMR-Project folder,
REM  as a sibling of docker-compose.yml, ezarate-hospital-backend,
REM  and ezarate-hospital. No path editing needed - it finds
REM  everything relative to its own location, so it works the same
REM  whether the repo lives on F:\, C:\, or anywhere else.
REM ============================================================

REM %~dp0 = the folder this .bat file is actually sitting in
set ROOT_DIR=%~dp0
set BACKEND_DIR=%ROOT_DIR%ezarate-hospital-backend
set FRONTEND_DIR=%ROOT_DIR%ezarate-hospital

REM Change to "npm run build && npm run preview" instead of
REM "npm run dev" if you want the faster, production-style build
REM (dev mode can feel slow over a tunnel/slow connection).
set FRONTEND_CMD=npm run dev
set FRONTEND_PORT=5173

echo ============================================================
echo  Starting E. Zarate Hospital System
echo ============================================================

echo.
echo Checking project folders...
if not exist "%BACKEND_DIR%\pom.xml" (
    echo.
    echo ERROR: Backend folder not found at:
    echo   %BACKEND_DIR%
    echo Make sure this .bat file is placed directly inside the
    echo EMR-Project folder, next to ezarate-hospital-backend.
    pause
    exit /b 1
)
if not exist "%FRONTEND_DIR%\package.json" (
    echo.
    echo ERROR: Frontend folder not found at:
    echo   %FRONTEND_DIR%
    echo Make sure this .bat file is placed directly inside the
    echo EMR-Project folder, next to ezarate-hospital.
    pause
    exit /b 1
)
echo Found backend and frontend folders.

echo.
echo [1/3] Checking Docker Desktop...
docker info >nul 2>&1
if errorlevel 1 (
    echo Docker Desktop isn't running yet. Starting it now...

    set DOCKER_EXE=
    if exist "%LOCALAPPDATA%\Programs\DockerDesktop\Docker Desktop.exe" (
        set DOCKER_EXE=%LOCALAPPDATA%\Programs\DockerDesktop\Docker Desktop.exe
    ) else if exist "%ProgramFiles%\Docker\Docker\Docker Desktop.exe" (
        set DOCKER_EXE=%ProgramFiles%\Docker\Docker\Docker Desktop.exe
    )

    if "!DOCKER_EXE!"=="" (
        echo.
        echo ERROR: Couldn't find Docker Desktop in any of the usual
        echo install locations. Please open Docker Desktop manually,
        echo wait for it to fully start, then run this script again.
        pause
        exit /b 1
    )

    start "" "!DOCKER_EXE!"
    echo Waiting for Docker to finish starting - this can take up to a
    echo minute the first time...
    :wait_docker_daemon
    timeout /t 3 >nul
    docker info >nul 2>&1
    if errorlevel 1 goto wait_docker_daemon
    echo Docker Desktop is ready.
)

echo.
echo Starting Postgres...
cd /d "%ROOT_DIR%"
docker compose up -d
if errorlevel 1 (
    echo.
    echo ERROR: docker compose failed to start Postgres. Check the
    echo output above for details.
    pause
    exit /b 1
)

echo.
echo [2/3] Waiting for Postgres to be healthy...
:wait_loop
docker inspect --format="{{.State.Health.Status}}" ezarate-postgres 2>nul | findstr "healthy" >nul
if errorlevel 1 (
    timeout /t 2 >nul
    goto wait_loop
)
echo Postgres is healthy.

echo.
echo [3/3] Starting backend and frontend in new windows...
start "Ezarate Backend" cmd /k "cd /d "%BACKEND_DIR%" && mvn spring-boot:run"
start "Ezarate Frontend" cmd /k "cd /d "%FRONTEND_DIR%" && %FRONTEND_CMD%"

echo.
echo ============================================================
echo  All services launching. Backend and frontend windows are
echo  now open separately - watch those for startup errors.
echo  Opening the browser in 15 seconds (gives the backend time
echo  to finish starting up)...
echo ============================================================
timeout /t 15 >nul
start http://localhost:%FRONTEND_PORT%

echo.
echo Done. You can close this window - the backend and frontend
echo windows must stay open to keep the app running.
pause