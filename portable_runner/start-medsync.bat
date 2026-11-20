@echo off
REM MedSync Backend Startup Wrapper
powershell -ExecutionPolicy Bypass -File "%~dp0start-medsync.ps1" %*
REM If the script was interrupted or terminated, run cleanup
if %ERRORLEVEL% NEQ 0 (
    powershell -ExecutionPolicy Bypass -File "%~dp0stop-medsync.ps1" >nul 2>&1
)
