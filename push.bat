@echo off
setlocal enabledelayedexpansion

echo ==========================================
echo       Automated Git Push Utility
echo ==========================================
echo.

:: Get inputs if not provided as arguments
set REPO_URL=%~1
set COMMIT_MSG=%~2
set BRANCH_NAME=%~3

if "%REPO_URL%"=="" (
    set /p REPO_URL="Enter Git Repository URL: "
)

if "%COMMIT_MSG%"=="" (
    set /p COMMIT_MSG="Enter Commit Message: "
)

if "%BRANCH_NAME%"=="" (
    set /p BRANCH_NAME="Enter Branch Name [default: main]: "
)

if "!BRANCH_NAME!"=="" set BRANCH_NAME=main

echo.
echo ------------------------------------------
echo Status Summary:
echo Target Repo  : !REPO_URL!
echo Target Branch: !BRANCH_NAME!
echo Commit Msg   : "!COMMIT_MSG!"
echo ------------------------------------------
echo.

echo [1/5] Adding all files to staging...
git add .

echo.
echo [2/5] Added files and changes:
echo ------------------------------------------
git status -s
echo ------------------------------------------
echo.

echo [3/5] Committing changes...
git commit -m "!COMMIT_MSG!"

echo.
echo [4/5] Setting up branch and remote...
git branch -M !BRANCH_NAME!
git remote remove origin 2>nul
git remote add origin !REPO_URL!

echo.
echo [5/5] Pushing to remote repository...
git push -u origin !BRANCH_NAME!

echo.
echo ==========================================
echo Push sequence complete!
echo ==========================================
pause
