@echo off
setlocal

echo Updating MedSync backend...

REM 1. Pull latest image
set IMAGE_NAME=ghcr.io/dharshankumar988/medsync-backend:latest
echo Pulling latest image: %IMAGE_NAME%...
docker pull %IMAGE_NAME%

REM 2. Restart using start script
echo Restarting container...
call start-medsync.bat

echo Update complete!
