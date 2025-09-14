use crate::{
    error::{AgentError, Result},
    memory::MemoryManager,
    tools::ToolRegistry,
};
use async_trait::async_trait;
use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use uuid::Uuid;

pub mod config;
pub mod manager;
pub mod providers;

pub use config::AgentConfig;
pub use manager::AgentManager;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Agent {
    pub id: String,
    pub name: String,
    pub config: AgentConfig,
    pub memory_manager: Arc<MemoryManager>,
    pub tool_registry: Arc<ToolRegistry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentResponse {
    pub id: String,
    pub content: String,
    pub metadata: HashMap<String, serde_json::Value>,
    pub tool_calls: Vec<crate::tools::ToolCall>,
    pub finish_reason: FinishReason,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FinishReason {
    Stop,
    ToolCalls,
    TokenLimit,
    Error(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Conversation {
    pub id: String,
    pub agent_id: String,
    pub messages: Vec<Message>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub id: String,
    pub role: MessageRole,
    pub content: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub metadata: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MessageRole {
    User,
    Assistant,
    System,
    Tool,
}

#[async_trait]
pub trait LLMProvider: Send + Sync {
    async fn generate_response(
        &self,
        messages: &[Message],
        config: &AgentConfig,
    ) -> Result<AgentResponse>;
    
    fn supports_tools(&self) -> bool;
    fn max_tokens(&self) -> Option<u32>;
}

impl Agent {
    pub fn new(
        config: AgentConfig,
        memory_manager: MemoryManager,
        tool_registry: ToolRegistry,
    ) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            name: config.name.clone(),
            config,
            memory_manager: Arc::new(memory_manager),
            tool_registry: Arc::new(tool_registry),
        }
    }

    pub async fn process(&mut self, input: &str) -> Result<String> {
        let conversation_id = Uuid::new_v4().to_string();
        
        // Store input in memory if enabled
        if self.config.memory_enabled {
            let mut metadata = HashMap::new();
            metadata.insert("type".to_string(), serde_json::Value::String("user_input".to_string()));
            metadata.insert("conversation_id".to_string(), serde_json::Value::String(conversation_id.clone()));
            
            self.memory_manager.store_text(
                input.to_string(),
                Some(metadata),
            ).await?;
        }

        // Create user message
        let user_message = Message {
            id: Uuid::new_v4().to_string(),
            role: MessageRole::User,
            content: input.to_string(),
            timestamp: chrono::Utc::now(),
            metadata: HashMap::new(),
        };

        // Add system message if configured
        let mut messages = Vec::new();
        if let Some(system_prompt) = &self.config.system_prompt {
            messages.push(Message {
                id: Uuid::new_v4().to_string(),
                role: MessageRole::System,
                content: system_prompt.clone(),
                timestamp: chrono::Utc::now(),
                metadata: HashMap::new(),
            });
        }

        messages.push(user_message);

        // Generate response using configured provider
        let provider = self.get_provider().await?;
        let response = provider.generate_response(&messages, &self.config).await?;

        // Store response in memory if enabled
        if self.config.memory_enabled {
            let mut metadata = HashMap::new();
            metadata.insert("type".to_string(), serde_json::Value::String("agent_response".to_string()));
            metadata.insert("conversation_id".to_string(), serde_json::Value::String(conversation_id));
            metadata.insert("agent_id".to_string(), serde_json::Value::String(self.id.clone()));
            
            self.memory_manager.store_text(
                response.content.clone(),
                Some(metadata),
            ).await?;
        }

        Ok(response.content)
    }

    async fn get_provider(&self) -> Result<Box<dyn LLMProvider>> {
        match self.config.provider.as_str() {
            "openai" => Ok(Box::new(providers::OpenAIProvider::new(&self.config)?)),
            "mock" => Ok(Box::new(providers::MockProvider::new())),
            _ => Err(AgentError::InvalidConfig(
                format!("Unsupported provider: {}", self.config.provider)
            ).into()),
        }
    }

    pub async fn list_conversations(&self) -> Result<Vec<String>> {
        // In a full implementation, this would query the memory store for conversations
        Ok(vec![])
    }

    pub async fn get_conversation(&self, _conversation_id: &str) -> Result<Option<Conversation>> {
        // In a full implementation, this would retrieve conversation from memory
        Ok(None)
    }

    pub fn get_stats(&self) -> AgentStats {
        AgentStats {
            id: self.id.clone(),
            name: self.name.clone(),
            provider: self.config.provider.clone(),
            memory_enabled: self.config.memory_enabled,
            tools_enabled: self.config.tools_enabled,
            created_at: chrono::Utc::now(), // In a real implementation, this would be stored
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentStats {
    pub id: String,
    pub name: String,
    pub provider: String,
    pub memory_enabled: bool,
    pub tools_enabled: bool,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

impl Message {
    pub fn user(content: String) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            role: MessageRole::User,
            content,
            timestamp: chrono::Utc::now(),
            metadata: HashMap::new(),
        }
    }

    pub fn assistant(content: String) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            role: MessageRole::Assistant,
            content,
            timestamp: chrono::Utc::now(),
            metadata: HashMap::new(),
        }
    }

    pub fn system(content: String) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            role: MessageRole::System,
            content,
            timestamp: chrono::Utc::now(),
            metadata: HashMap::new(),
        }
    }
}