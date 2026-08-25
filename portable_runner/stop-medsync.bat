@echo off
REM MedSync Backend Stop Wrapper
powershell -ExecutionPolicy Bypass -File "%~dp0stop-medsync.ps1"
pause
