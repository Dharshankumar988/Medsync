@echo off
REM MedSync Backend Status Wrapper
powershell -ExecutionPolicy Bypass -File "%~dp0medsync-status.ps1"
pause
