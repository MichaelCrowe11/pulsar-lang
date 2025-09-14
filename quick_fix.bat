@echo off
echo 🔧 FIXING MISSING DEPENDENCIES...
echo.

echo Installing required packages...
npm install node-fetch

echo.
echo ✅ Dependencies installed!
echo.
echo Continuing deployment...
echo.

deploy_trading_system.bat