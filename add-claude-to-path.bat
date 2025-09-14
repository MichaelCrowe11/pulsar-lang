@echo off
REM Batch script to add Claude CLI to PATH

echo ========================================
echo    Adding Claude CLI to PATH
echo ========================================
echo.

set CLAUDE_PATH=C:\Users\micha\.local\bin

REM Add to user PATH using setx
echo Adding %CLAUDE_PATH% to user PATH...
setx PATH "%PATH%;%CLAUDE_PATH%"

if %ERRORLEVEL% == 0 (
    echo.
    echo [SUCCESS] Claude CLI path has been added!
    echo.
    echo Path added: %CLAUDE_PATH%
    echo.
) else (
    echo.
    echo [ERROR] Failed to add path. You may need to run as Administrator.
    echo.
)

REM Update current session
set PATH=%PATH%;%CLAUDE_PATH%

echo ========================================
echo    Testing Claude CLI
echo ========================================
echo.

claude --version 2>nul
if %ERRORLEVEL% == 0 (
    echo [SUCCESS] Claude CLI is accessible!
) else (
    echo [INFO] Claude CLI not accessible in current session.
    echo        Please restart your terminal.
)

echo.
echo ========================================
echo    Next Steps:
echo ========================================
echo.
echo 1. Close this window
echo 2. Open a NEW Command Prompt or PowerShell
echo 3. Run: claude --help
echo.
echo If it doesn't work, restart your computer.
echo.
pause