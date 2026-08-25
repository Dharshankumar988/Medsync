@echo off
REM Tailscale Funnel Wrapper
powershell -ExecutionPolicy Bypass -File "%~dp0start-tailscale-funnel.ps1"
pause
