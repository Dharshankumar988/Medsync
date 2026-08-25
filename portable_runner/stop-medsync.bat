@echo off
setlocal

set CONTAINER_NAME=medsync-backend

echo Stopping MedSync backend...

FOR /F "tokens=*" %%i IN ('docker ps -a -q -f "name=^/%CONTAINER_NAME%$"') DO set existing=%%i
if defined existing (
    docker stop %CONTAINER_NAME% >nul
    echo Container stopped successfully.
    echo Note: Your environment configuration and persistent data have not been deleted.
) else (
    echo No MedSync backend container is currently running.
)
