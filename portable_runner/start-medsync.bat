@echo off
REM MedSync Backend Startup Wrapper
powershell -ExecutionPolicy Bypass -File "%~dp0start-medsync.ps1"
pause
