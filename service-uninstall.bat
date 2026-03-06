@echo off
:: Node Connector — Windows Auto-Start Uninstaller
:: Removes the scheduled task created by service-install.bat

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

echo.
echo   Node Connector — Auto-Start Uninstaller
echo   =========================================
echo.

:: Check if task exists
schtasks /query /tn "%TASK_NAME%" >nul 2>&1
if %errorlevel% neq 0 (
    echo   [INFO] Task "%TASK_NAME%" not found. Nothing to remove.
    echo.
    pause
    exit /b 0
)

:: Stop the task if running
echo   [INFO] Stopping task if running...
schtasks /end /tn "%TASK_NAME%" >nul 2>&1

:: Delete the task
echo   [INFO] Removing scheduled task "%TASK_NAME%"...
schtasks /delete /tn "%TASK_NAME%" /f

if %errorlevel% equ 0 (
    echo.
    echo   [OK] Task "%TASK_NAME%" removed successfully.
    echo   Node Connector will no longer start on boot.
    echo.
) else (
    echo.
    echo   [ERROR] Failed to remove scheduled task.
    echo.
)

pause
