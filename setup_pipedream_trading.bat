@echo off
echo ========================================
echo Pipedream Autonomous Trading System Setup
echo ========================================
echo.

:: Check if Node.js is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed. Please install Node.js first.
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)

:: Check if npm is installed
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: npm is not installed. Please install npm first.
    pause
    exit /b 1
)

echo Prerequisites checked successfully!
echo.

:: Step 1: Install Pipedream SDK
echo Installing Pipedream SDK...
call npm install @pipedream/sdk
if %errorlevel% neq 0 (
    echo Error: Failed to install Pipedream SDK
    pause
    exit /b 1
)
echo SDK installed successfully!
echo.

:: Step 2: Install additional dependencies
echo Installing additional dependencies...
call npm install dotenv axios technicalindicators
if %errorlevel% neq 0 (
    echo Error: Failed to install dependencies
    pause
    exit /b 1
)
echo Dependencies installed successfully!
echo.

:: Step 3: Create package.json if it doesn't exist
if not exist package.json (
    echo Creating package.json...
    echo {> package.json
    echo   "name": "autonomous-trading-system",>> package.json
    echo   "version": "1.0.0",>> package.json
    echo   "description": "24/7 AI-powered crypto trading system",>> package.json
    echo   "main": "pipedream_sdk_deployment.js",>> package.json
    echo   "scripts": {>> package.json
    echo     "deploy": "node pipedream_sdk_deployment.js",>> package.json
    echo     "test": "node test_connection.js">> package.json
    echo   },>> package.json
    echo   "dependencies": {>> package.json
    echo     "@pipedream/sdk": "latest",>> package.json
    echo     "dotenv": "latest",>> package.json
    echo     "axios": "latest",>> package.json
    echo     "technicalindicators": "latest">> package.json
    echo   }>> package.json
    echo }>> package.json
)

:: Step 4: Get API credentials
echo ========================================
echo API CONFIGURATION
echo ========================================
echo.
echo Please provide your Pipedream API keys:
echo (Get them from: https://pipedream.com/settings/account)
echo.

set /p PD_PUBLIC_KEY="Enter your Pipedream PUBLIC KEY: "
set /p PD_SECRET_KEY="Enter your Pipedream SECRET KEY: "
set /p PD_USERNAME="Enter your Pipedream USERNAME: "
set /p PD_PROJECT_ID="Enter your Pipedream PROJECT ID (press Enter to skip): "

:: Step 5: Create .env file
echo.
echo Creating .env file...
(
echo # Pipedream Configuration
echo PIPEDREAM_PUBLIC_KEY=%PD_PUBLIC_KEY%
echo PIPEDREAM_SECRET_KEY=%PD_SECRET_KEY%
echo PIPEDREAM_USERNAME=%PD_USERNAME%
echo PIPEDREAM_PROJECT_ID=%PD_PROJECT_ID%
echo.
echo # Exchange APIs - Add your keys here
echo COINBASE_API_KEY=
echo COINBASE_SECRET=
echo BINANCE_API_KEY=
echo BINANCE_SECRET=
echo.
echo # AI Services - Add your keys here
echo OPENAI_API_KEY=
echo ANTHROPIC_API_KEY=
echo.
echo # Trading Configuration
echo MAX_POSITION_SIZE=100
echo MAX_DAILY_LOSS=50
echo MAX_DRAWDOWN_PERCENT=10
echo TARGET_SHARPE_RATIO=2.0
echo ENABLE_LIVE_TRADING=false
echo AI_CONFIDENCE_THRESHOLD=0.7
echo.
echo # Database - Add your connection string
echo DATABASE_URL=
echo.
echo # Notifications
echo SLACK_WEBHOOK_URL=
) > .env

echo .env file created successfully!
echo.

:: Step 6: Check if deployment script exists
if not exist pipedream_sdk_deployment.js (
    echo Error: pipedream_sdk_deployment.js not found!
    echo Please ensure the deployment script is in the current directory.
    pause
    exit /b 1
)

:: Step 7: Deploy the workflow
echo ========================================
echo DEPLOYING TO PIPEDREAM
echo ========================================
echo.
echo Deploying trading system to Pipedream...
echo This may take a few minutes...
echo.

node pipedream_sdk_deployment.js

if %errorlevel% neq 0 (
    echo.
    echo Error: Deployment failed. Please check your API keys and try again.
    pause
    exit /b 1
)

:: Success message
echo.
echo ========================================
echo SETUP COMPLETE!
echo ========================================
echo.
echo Next Steps:
echo.
echo 1. Edit .env file and add your API keys:
echo    - Coinbase API credentials
echo    - Binance API credentials (optional)
echo    - OpenAI API key for AI trading signals
echo    - Database connection string
echo.
echo 2. Go to your Pipedream dashboard:
echo    https://pipedream.com/@%PD_USERNAME%
echo.
echo 3. Connect required apps in Pipedream:
echo    - PostgreSQL or MySQL
echo    - Redis for caching
echo    - Slack for notifications
echo.
echo 4. Test the system:
echo    - Run in mock mode for 48 hours
echo    - Monitor performance metrics
echo    - Check circuit breaker functionality
echo.
echo 5. Go live:
echo    - Set ENABLE_LIVE_TRADING=true in .env
echo    - Start with small amounts
echo    - Scale up gradually
echo.
echo Happy Trading!
echo.
pause