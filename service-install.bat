@echo off
:: Node Connector — Windows Auto-Start Installer
:: Creates a Windows Task Scheduler task to run on system startup

setlocal

:: Check for admin privileges
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] This script requires Administrator privileges.
    echo         Right-click and select "Run as administrator".
    pause
    exit /b 1
)

set "TASK_NAME=NodeConnector"
set "PROJECT_DIR=%~dp0"
:: Remove trailing backslash
if "%PROJECT_DIR:~-1%"=="\" set "PROJECT_DIR=%PROJECT_DIR:~0,-1%"

:: Find node.exe path
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    pause
    exit /b 1
)
for /f "delims=" %%i in ('where node') do set "NODE_PATH=%%i"

echo.
echo   Node Connector — Auto-Start Installer
echo   =======================================
echo.
echo   Task Name:    %TASK_NAME%
echo   Project Dir:  %PROJECT_DIR%
echo   Node Path:    %NODE_PATH%
echo.

:: Remove existing task if present
schtasks /query /tn "%TASK_NAME%" >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] Removing existing task "%TASK_NAME%"...
    schtasks /delete /tn "%TASK_NAME%" /f >nul 2>&1
)

:: Create scheduled task that runs at system startup
schtasks /create ^
    /tn "%TASK_NAME%" ^
    /tr "\"%NODE_PATH%\" \"%PROJECT_DIR%\start.js\"" ^
    /sc onstart ^
    /ru SYSTEM ^
    /rl HIGHEST ^
    /f

if %errorlevel% equ 0 (
    echo.
    echo   [OK] Task "%TASK_NAME%" created successfully.
    echo   Node Connector will start automatically on system boot.
    echo.
    echo   To start it now without rebooting:
    echo     schtasks /run /tn "%TASK_NAME%"
    echo.
    echo   To uninstall:
    echo     service-uninstall.bat
    echo.
) else (
    echo.
    echo   [ERROR] Failed to create scheduled task.
    echo.
)

pause
