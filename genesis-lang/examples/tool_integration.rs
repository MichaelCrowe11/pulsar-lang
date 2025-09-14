use genesis_lang::{
    tools::{ToolRegistry, ToolCall, BuiltinTools},
};
use serde_json::json;
use uuid::Uuid;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("🛠️  GenesisLang Tool Integration Example");

    // Create tool registry and register built-in tools
    let tools = ToolRegistry::new();
    BuiltinTools::register_all(&tools).await?;

    // List available tools
    println!("\n📋 Available Tools:");
    for tool_def in tools.list_tools().await {
        println!("  🔧 {}: {}", tool_def.name, tool_def.description);
    }

    // Example 1: Echo tool
    println!("\n--- Echo Tool Example ---");
    let echo_call = ToolCall {
        id: Uuid::new_v4().to_string(),
        name: "echo".to_string(),
        parameters: json!({
            "message": "Hello from GenesisLang tools!"
        }),
    };

    match tools.execute(echo_call).await {
        Ok(result) => {
            println!("✅ Echo result: {:?}", result.data);
        }
        Err(e) => println!("❌ Echo failed: {}", e),
    }

    // Example 2: Calculator tool
    println!("\n--- Calculator Tool Example ---");
    let calc_examples = vec![
        "42",
        "15 + 25", 
        "100 - 30",
        "7 * 8",
        "144 / 12",
    ];

    for expression in calc_examples {
        let calc_call = ToolCall {
            id: Uuid::new_v4().to_string(),
            name: "calculator".to_string(),
            parameters: json!({
                "expression": expression
            }),
        };

        match tools.execute(calc_call).await {
            Ok(result) => {
                if let Some(data) = result.data {
                    if let Some(calc_result) = data.get("result") {
                        println!("🔢 {} = {}", expression, calc_result);
                    }
                }
            }
            Err(e) => println!("❌ Calculation '{}' failed: {}", expression, e),
        }
    }

    // Example 3: HTTP Request tool
    println!("\n--- HTTP Request Tool Example ---");
    let http_call = ToolCall {
        id: Uuid::new_v4().to_string(),
        name: "http_request".to_string(),
        parameters: json!({
            "url": "https://httpbin.org/json",
            "method": "GET"
        }),
    };

    match tools.execute(http_call).await {
        Ok(result) => {
            if result.success {
                println!("✅ HTTP request successful!");
                if let Some(data) = result.data {
                    if let Some(status) = data.get("status") {
                        println!("   Status: {}", status);
                    }
                }
            } else {
                println!("❌ HTTP request failed: {:?}", result.error);
            }
        }
        Err(e) => println!("❌ HTTP request error: {}", e),
    }

    // Example 4: File operations (will fail in this example, but shows the pattern)
    println!("\n--- File Read Tool Example ---");
    let file_call = ToolCall {
        id: Uuid::new_v4().to_string(),
        name: "file_read".to_string(),
        parameters: json!({
            "path": "README.md"
        }),
    };

    match tools.execute(file_call).await {
        Ok(result) => {
            if result.success {
                println!("✅ File read successful!");
                if let Some(data) = result.data {
                    if let Some(size) = data.get("size") {
                        println!("   File size: {} bytes", size);
                    }
                }
            } else {
                println!("📄 File not found or couldn't be read (this is expected in this example)");
            }
        }
        Err(e) => println!("❌ File read error: {}", e),
    }

    // Tool registry statistics
    println!("\n📊 Tool Registry Statistics:");
    let all_tools = tools.list_tools().await;
    println!("  Total tools registered: {}", all_tools.len());
    
    for tool in all_tools {
        let has_permissions = !tool.required_permissions.is_empty();
        println!("  - {} (permissions: {})", 
            tool.name, 
            if has_permissions { "required" } else { "none" }
        );
    }

    println!("\n🎉 Tool integration examples completed!");
    Ok(())
}