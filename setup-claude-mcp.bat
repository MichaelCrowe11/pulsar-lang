@echo off
echo 🚀 Setting up Claude Desktop MCP connection for Crowe-Lang Stripe integration...

:: Find Claude Desktop config directory
set CLAUDE_CONFIG_DIR=%APPDATA%\Claude

:: Create config directory if it doesn't exist
if not exist "%CLAUDE_CONFIG_DIR%" (
    echo Creating Claude config directory...
    mkdir "%CLAUDE_CONFIG_DIR%"
)

:: Copy the MCP configuration
echo Configuring MCP server connection...
copy "C:\Users\micha\claude-desktop-config.json" "%CLAUDE_CONFIG_DIR%\claude_desktop_config.json"

if %ERRORLEVEL% EQU 0 (
    echo ✅ Successfully configured Claude Desktop MCP connection!
    echo.
    echo 📋 Configuration Details:
    echo    Server Name: crowe-lang-stripe
    echo    MCP Server Path: C:\Users\micha\mcp-server\server.js
    echo    Stripe Integration: Enabled
    echo.
    echo 🔄 Please restart Claude Desktop to load the new configuration.
    echo.
    echo 🛠️  Available MCP Tools:
    echo    - create_checkout_session
    echo    - get_customer_licenses  
    echo    - validate_license
    echo    - get_payment_status
    echo    - list_products
    echo    - create_customer_portal
    echo.
    echo 💡 You can now use these tools in Claude Desktop conversations!
) else (
    echo ❌ Failed to copy configuration file.
    echo Please manually copy claude-desktop-config.json to %CLAUDE_CONFIG_DIR%\claude_desktop_config.json
)

pause