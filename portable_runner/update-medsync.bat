@echo off
REM MedSync Backend Update Wrapper
powershell -ExecutionPolicy Bypass -File "%~dp0update-medsync.ps1"
pause
