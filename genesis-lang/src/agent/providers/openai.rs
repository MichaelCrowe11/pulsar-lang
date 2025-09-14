use super::super::{AgentConfig, AgentResponse, LLMProvider, Message, MessageRole, FinishReason};
use crate::error::{AgentError, Result};
use async_trait::async_trait;
use std::collections::HashMap;
use uuid::Uuid;

pub struct OpenAIProvider {
    api_key: String,
    base_url: String,
}

impl OpenAIProvider {
    pub fn new(config: &AgentConfig) -> Result<Self> {
        let api_key = config.provider_config
            .get("api_key")
            .and_then(|v| v.as_str())
            .or_else(|| std::env::var("OPENAI_API_KEY").ok().as_deref())
            .ok_or_else(|| AgentError::InvalidConfig(
                "OpenAI API key not found in config or environment".to_string()
            ))?
            .to_string();

        let base_url = config.provider_config
            .get("base_url")
            .and_then(|v| v.as_str())
            .unwrap_or("https://api.openai.com/v1")
            .to_string();

        Ok(Self { api_key, base_url })
    }
}

#[async_trait]
impl LLMProvider for OpenAIProvider {
    async fn generate_response(
        &self,
        messages: &[Message],
        config: &AgentConfig,
    ) -> Result<AgentResponse> {
        // For Phase 0, we'll return a placeholder response
        // In Phase 1, this will implement actual OpenAI API calls
        
        let last_message = messages.last()
            .map(|m| &m.content)
            .unwrap_or("No input provided");

        let placeholder_response = format!(
            "OpenAI Provider (Phase 1): Would process '{}' using model '{}' with temperature {:?}. \
            This is currently a placeholder - real OpenAI integration coming in Phase 1.",
            last_message, 
            config.model,
            config.temperature
        );

        Ok(AgentResponse {
            id: Uuid::new_v4().to_string(),
            content: placeholder_response,
            metadata: {
                let mut metadata = HashMap::new();
                metadata.insert("provider".to_string(), serde_json::Value::String("openai".to_string()));
                metadata.insert("model".to_string(), serde_json::Value::String(config.model.clone()));
                metadata.insert("base_url".to_string(), serde_json::Value::String(self.base_url.clone()));
                metadata
            },
            tool_calls: vec![],
            finish_reason: FinishReason::Stop,
        })
    }

    fn supports_tools(&self) -> bool {
        true
    }

    fn max_tokens(&self) -> Option<u32> {
        Some(4096)
    }
}

// Helper function to convert internal message format to OpenAI format
fn convert_messages_to_openai_format(messages: &[Message]) -> Vec<serde_json::Value> {
    messages.iter().map(|msg| {
        let role = match msg.role {
            MessageRole::User => "user",
            MessageRole::Assistant => "assistant",
            MessageRole::System => "system",
            MessageRole::Tool => "tool",
        };

        serde_json::json!({
            "role": role,
            "content": msg.content
        })
    }).collect()
}