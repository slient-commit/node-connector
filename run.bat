@echo off
echo Stopping existing node-connector containers...
for /f "tokens=*" %%i in ('docker ps -q --filter "ancestor=node-connector"') do docker stop %%i
for /f "tokens=*" %%i in ('docker ps -aq --filter "ancestor=node-connector"') do docker rm %%i

echo Building image...
docker build -t node-connector .
if %errorlevel% neq 0 (
    echo Build failed!
    pause
    exit /b 1
)

echo Starting container...
docker run -d -p 80:80 --name node-connector node-connector

echo Done! App running at http://localhost
pause
