use crate::error::{Result, ToolError};
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Arc;
use dashmap::DashMap;

pub mod builtin;
pub mod http;
pub mod file;
pub mod search;

pub use builtin::BuiltinTools;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolDefinition {
    pub name: String,
    pub description: String,
    pub parameters: Value,
    pub required_permissions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCall {
    pub id: String,
    pub name: String,
    pub parameters: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolResult {
    pub id: String,
    pub success: bool,
    pub data: Option<Value>,
    pub error: Option<String>,
    pub metadata: HashMap<String, Value>,
}

#[async_trait]
pub trait Tool: Send + Sync {
    fn definition(&self) -> ToolDefinition;
    async fn execute(&self, parameters: Value) -> Result<ToolResult>;
    fn validate_parameters(&self, parameters: &Value) -> Result<()>;
}

pub struct ToolRegistry {
    tools: DashMap<String, Arc<dyn Tool>>,
}

impl ToolRegistry {
    pub fn new() -> Self {
        Self {
            tools: DashMap::new(),
        }
    }

    pub fn register<T: Tool + 'static>(&self, tool: T) {
        let definition = tool.definition();
        self.tools.insert(definition.name.clone(), Arc::new(tool));
    }

    pub async fn execute(&self, call: ToolCall) -> Result<ToolResult> {
        let tool = self.tools
            .get(&call.name)
            .ok_or_else(|| ToolError::NotFound(call.name.clone()))?;

        tool.validate_parameters(&call.parameters)?;
        
        let mut result = tool.execute(call.parameters).await?;
        result.id = call.id;
        
        Ok(result)
    }

    pub fn get_tool(&self, name: &str) -> Option<Arc<dyn Tool>> {
        self.tools.get(name).map(|entry| entry.value().clone())
    }

    pub async fn list_tools(&self) -> Vec<ToolDefinition> {
        self.tools
            .iter()
            .map(|entry| entry.value().definition())
            .collect()
    }

    pub fn has_tool(&self, name: &str) -> bool {
        self.tools.contains_key(name)
    }

    pub fn remove_tool(&self, name: &str) -> bool {
        self.tools.remove(name).is_some()
    }
}

impl Default for ToolRegistry {
    fn default() -> Self {
        Self::new()
    }
}

pub fn create_tool_result_success(id: String, data: Value) -> ToolResult {
    ToolResult {
        id,
        success: true,
        data: Some(data),
        error: None,
        metadata: HashMap::new(),
    }
}

pub fn create_tool_result_error(id: String, error: String) -> ToolResult {
    ToolResult {
        id,
        success: false,
        data: None,
        error: Some(error),
        metadata: HashMap::new(),
    }
}