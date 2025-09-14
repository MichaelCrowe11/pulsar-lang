@echo off
cls
echo ============================================================
echo           OLLAMA ACCOUNT CONNECTION SETUP
echo ============================================================
echo.
echo This script will help you connect to your Ollama account
echo.
echo Step 1: First, let's check if Ollama is installed...
echo.

where ollama >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Ollama command not found in PATH
    echo.
    echo Trying to find Ollama installation...
    
    if exist "%LOCALAPPDATA%\Programs\Ollama\ollama.exe" (
        echo [OK] Found Ollama at %LOCALAPPDATA%\Programs\Ollama\
        set "PATH=%PATH%;%LOCALAPPDATA%\Programs\Ollama"
        "%LOCALAPPDATA%\Programs\Ollama\ollama.exe" --version
    ) else if exist "%USERPROFILE%\AppData\Local\Ollama\ollama.exe" (
        echo [OK] Found Ollama at %USERPROFILE%\AppData\Local\Ollama\
        set "PATH=%PATH%;%USERPROFILE%\AppData\Local\Ollama"
        "%USERPROFILE%\AppData\Local\Ollama\ollama.exe" --version
    ) else (
        echo [ERROR] Could not find Ollama installation
        echo.
        echo Please install Ollama from: https://ollama.ai/download/windows
        echo.
        pause
        exit /b
    )
) else (
    echo [OK] Ollama is installed
    ollama --version
)

echo.
echo Step 2: Connect to your Ollama account
echo.
echo To connect to your account, you need to:
echo 1. Get your API token from https://ollama.ai/settings/keys
echo 2. Run: ollama login
echo 3. Enter your token when prompted
echo.
echo Press any key to open the Ollama settings page in your browser...
pause >nul
start https://ollama.ai/settings/keys

echo.
echo Once you have your token, press any key to login...
pause >nul

echo.
echo Running: ollama login
echo Enter your token when prompted:
echo.
ollama login

echo.
echo Step 3: Start Ollama service
echo.
echo Starting Ollama server...
start /min cmd /k "ollama serve"
timeout /t 3 >nul

echo.
echo Step 4: Pull required models
echo.
echo Pulling models for Deep Parallel Synthesis...
echo.

echo [1/3] Pulling Qwen2.5:7b...
ollama pull qwen2.5:7b

echo.
echo [2/3] Pulling Llama3.2:3b...
ollama pull llama3.2:3b

echo.
echo [3/3] Pulling Phi3:mini...
ollama pull phi3:mini

echo.
echo ============================================================
echo           OLLAMA SETUP COMPLETE!
echo ============================================================
echo.
echo Your Ollama account is connected and models are downloaded.
echo.
echo You can now:
echo - Run: ollama list     (to see your models)
echo - Run: ollama run qwen2.5:7b   (to test a model)
echo.
pause