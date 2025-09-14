use super::super::{AgentConfig, AgentResponse, LLMProvider, Message, FinishReason};
use crate::error::Result;
use async_trait::async_trait;
use std::collections::HashMap;
use uuid::Uuid;

pub struct MockProvider;

impl MockProvider {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl LLMProvider for MockProvider {
    async fn generate_response(
        &self,
        messages: &[Message],
        _config: &AgentConfig,
    ) -> Result<AgentResponse> {
        // Simple mock response that echoes the user's message
        let last_message = messages.last()
            .map(|m| &m.content)
            .unwrap_or("No input provided");

        let mock_response = format!(
            "Mock AI Response: I received your message: '{}'. This is a placeholder response from the mock provider. \
            In Phase 1, this will be replaced with real LLM integration.",
            last_message
        );

        Ok(AgentResponse {
            id: Uuid::new_v4().to_string(),
            content: mock_response,
            metadata: {
                let mut metadata = HashMap::new();
                metadata.insert("provider".to_string(), serde_json::Value::String("mock".to_string()));
                metadata.insert("model".to_string(), serde_json::Value::String("mock-model".to_string()));
                metadata
            },
            tool_calls: vec![],
            finish_reason: FinishReason::Stop,
        })
    }

    fn supports_tools(&self) -> bool {
        true // Mock provider supports everything
    }

    fn max_tokens(&self) -> Option<u32> {
        Some(4096)
    }
}