use super::{Tool, ToolDefinition, ToolRegistry, ToolResult, create_tool_result_success, create_tool_result_error};
use crate::error::Result;
use async_trait::async_trait;
use serde_json::{json, Value};

pub struct BuiltinTools;

impl BuiltinTools {
    pub async fn register_all(registry: &ToolRegistry) -> Result<()> {
        registry.register(EchoTool);
        registry.register(HttpRequestTool);
        registry.register(FileReadTool);
        registry.register(CalculatorTool);
        Ok(())
    }
}

pub struct EchoTool;

#[async_trait]
impl Tool for EchoTool {
    fn definition(&self) -> ToolDefinition {
        ToolDefinition {
            name: "echo".to_string(),
            description: "Echoes back the provided message".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "message": {
                        "type": "string",
                        "description": "The message to echo back"
                    }
                },
                "required": ["message"]
            }),
            required_permissions: vec![],
        }
    }

    async fn execute(&self, parameters: Value) -> Result<ToolResult> {
        let message = parameters["message"].as_str().unwrap_or("No message provided");
        
        Ok(create_tool_result_success(
            "".to_string(),
            json!({
                "echoed_message": message,
                "timestamp": chrono::Utc::now().to_rfc3339()
            })
        ))
    }

    fn validate_parameters(&self, parameters: &Value) -> Result<()> {
        if parameters["message"].as_str().is_none() {
            return Err(crate::error::ToolError::InvalidParameters(
                "message parameter is required and must be a string".to_string()
            ).into());
        }
        Ok(())
    }
}

pub struct HttpRequestTool;

#[async_trait]
impl Tool for HttpRequestTool {
    fn definition(&self) -> ToolDefinition {
        ToolDefinition {
            name: "http_request".to_string(),
            description: "Makes HTTP requests to external APIs".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "url": {
                        "type": "string",
                        "description": "The URL to make the request to"
                    },
                    "method": {
                        "type": "string",
                        "enum": ["GET", "POST", "PUT", "DELETE", "PATCH"],
                        "default": "GET",
                        "description": "HTTP method"
                    },
                    "headers": {
                        "type": "object",
                        "description": "HTTP headers to send"
                    },
                    "body": {
                        "description": "Request body (for POST/PUT/PATCH)"
                    }
                },
                "required": ["url"]
            }),
            required_permissions: vec!["http".to_string()],
        }
    }

    async fn execute(&self, parameters: Value) -> Result<ToolResult> {
        let url = parameters["url"].as_str().ok_or_else(|| {
            crate::error::ToolError::InvalidParameters("url is required".to_string())
        })?;

        let method = parameters["method"].as_str().unwrap_or("GET");
        let client = reqwest::Client::new();
        
        let mut request = match method.to_uppercase().as_str() {
            "GET" => client.get(url),
            "POST" => client.post(url),
            "PUT" => client.put(url),
            "DELETE" => client.delete(url),
            "PATCH" => client.patch(url),
            _ => return Err(crate::error::ToolError::InvalidParameters(
                format!("Unsupported HTTP method: {}", method)
            ).into()),
        };

        if let Some(headers) = parameters["headers"].as_object() {
            for (key, value) in headers {
                if let Some(value_str) = value.as_str() {
                    request = request.header(key, value_str);
                }
            }
        }

        if let Some(body) = parameters.get("body") {
            if body.is_object() || body.is_array() {
                request = request.json(body);
            } else if let Some(body_str) = body.as_str() {
                request = request.body(body_str.to_string());
            }
        }

        match request.send().await {
            Ok(response) => {
                let status = response.status().as_u16();
                let headers = response.headers().clone();
                
                match response.text().await {
                    Ok(body) => Ok(create_tool_result_success(
                        "".to_string(),
                        json!({
                            "status": status,
                            "body": body,
                            "headers": headers.iter()
                                .map(|(k, v)| (k.as_str(), v.to_str().unwrap_or("")))
                                .collect::<std::collections::HashMap<_, _>>()
                        })
                    )),
                    Err(e) => Ok(create_tool_result_error(
                        "".to_string(),
                        format!("Failed to read response body: {}", e)
                    ))
                }
            },
            Err(e) => Ok(create_tool_result_error(
                "".to_string(),
                format!("HTTP request failed: {}", e)
            ))
        }
    }

    fn validate_parameters(&self, parameters: &Value) -> Result<()> {
        if parameters["url"].as_str().is_none() {
            return Err(crate::error::ToolError::InvalidParameters(
                "url parameter is required".to_string()
            ).into());
        }
        Ok(())
    }
}

pub struct FileReadTool;

#[async_trait]
impl Tool for FileReadTool {
    fn definition(&self) -> ToolDefinition {
        ToolDefinition {
            name: "file_read".to_string(),
            description: "Reads the contents of a file".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Path to the file to read"
                    }
                },
                "required": ["path"]
            }),
            required_permissions: vec!["filesystem".to_string()],
        }
    }

    async fn execute(&self, parameters: Value) -> Result<ToolResult> {
        let path = parameters["path"].as_str().ok_or_else(|| {
            crate::error::ToolError::InvalidParameters("path is required".to_string())
        })?;

        match tokio::fs::read_to_string(path).await {
            Ok(contents) => Ok(create_tool_result_success(
                "".to_string(),
                json!({
                    "path": path,
                    "contents": contents,
                    "size": contents.len()
                })
            )),
            Err(e) => Ok(create_tool_result_error(
                "".to_string(),
                format!("Failed to read file: {}", e)
            ))
        }
    }

    fn validate_parameters(&self, parameters: &Value) -> Result<()> {
        if parameters["path"].as_str().is_none() {
            return Err(crate::error::ToolError::InvalidParameters(
                "path parameter is required".to_string()
            ).into());
        }
        Ok(())
    }
}

pub struct CalculatorTool;

#[async_trait]
impl Tool for CalculatorTool {
    fn definition(&self) -> ToolDefinition {
        ToolDefinition {
            name: "calculator".to_string(),
            description: "Performs basic mathematical calculations".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "expression": {
                        "type": "string",
                        "description": "Mathematical expression to evaluate (e.g., '2 + 3 * 4')"
                    }
                },
                "required": ["expression"]
            }),
            required_permissions: vec![],
        }
    }

    async fn execute(&self, parameters: Value) -> Result<ToolResult> {
        let expression = parameters["expression"].as_str().ok_or_else(|| {
            crate::error::ToolError::InvalidParameters("expression is required".to_string())
        })?;

        // Simple calculator - in production this would use a proper math parser
        let result = match self.evaluate_simple_expression(expression) {
            Ok(value) => create_tool_result_success(
                "".to_string(),
                json!({
                    "expression": expression,
                    "result": value
                })
            ),
            Err(e) => create_tool_result_error(
                "".to_string(),
                format!("Calculation error: {}", e)
            )
        };

        Ok(result)
    }

    fn validate_parameters(&self, parameters: &Value) -> Result<()> {
        if parameters["expression"].as_str().is_none() {
            return Err(crate::error::ToolError::InvalidParameters(
                "expression parameter is required".to_string()
            ).into());
        }
        Ok(())
    }
}

impl CalculatorTool {
    fn evaluate_simple_expression(&self, expr: &str) -> std::result::Result<f64, String> {
        // Very basic calculator - just handles simple operations
        // In production, use a proper expression parser
        let expr = expr.replace(" ", "");
        
        if let Ok(num) = expr.parse::<f64>() {
            return Ok(num);
        }

        if let Some(pos) = expr.find('+') {
            let left = expr[..pos].parse::<f64>().map_err(|e| e.to_string())?;
            let right = expr[pos+1..].parse::<f64>().map_err(|e| e.to_string())?;
            return Ok(left + right);
        }

        if let Some(pos) = expr.find('-') {
            if pos > 0 { // Not a negative number
                let left = expr[..pos].parse::<f64>().map_err(|e| e.to_string())?;
                let right = expr[pos+1..].parse::<f64>().map_err(|e| e.to_string())?;
                return Ok(left - right);
            }
        }

        if let Some(pos) = expr.find('*') {
            let left = expr[..pos].parse::<f64>().map_err(|e| e.to_string())?;
            let right = expr[pos+1..].parse::<f64>().map_err(|e| e.to_string())?;
            return Ok(left * right);
        }

        if let Some(pos) = expr.find('/') {
            let left = expr[..pos].parse::<f64>().map_err(|e| e.to_string())?;
            let right = expr[pos+1..].parse::<f64>().map_err(|e| e.to_string())?;
            if right == 0.0 {
                return Err("Division by zero".to_string());
            }
            return Ok(left / right);
        }

        Err(format!("Unable to parse expression: {}", expr))
    }
}