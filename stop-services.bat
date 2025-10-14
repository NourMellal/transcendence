@echo off
echo Stopping all Transcendence services...
echo.

REM Kill processes on specific ports
for %%p in (3000 3001 3002 3003 3004) do (
    echo Checking port %%p...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%%p"') do (
        echo Killing process %%a on port %%p
        taskkill /F /PID %%a 2>nul
    )
)

echo.
echo All services stopped!
pause
