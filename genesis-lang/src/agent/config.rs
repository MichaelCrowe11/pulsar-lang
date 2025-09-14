use crate::error::{AgentError, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentConfig {
    pub name: String,
    pub description: Option<String>,
    pub provider: String,
    pub model: String,
    pub system_prompt: Option<String>,
    pub temperature: Option<f32>,
    pub max_tokens: Option<u32>,
    pub tools_enabled: bool,
    pub memory_enabled: bool,
    pub timeout_seconds: u64,
    pub retry_attempts: u32,
    pub provider_config: HashMap<String, serde_json::Value>,
}

impl Default for AgentConfig {
    fn default() -> Self {
        Self {
            name: "default-agent".to_string(),
            description: None,
            provider: "mock".to_string(),
            model: "mock-model".to_string(),
            system_prompt: Some("You are a helpful AI assistant.".to_string()),
            temperature: Some(0.7),
            max_tokens: Some(4096),
            tools_enabled: true,
            memory_enabled: true,
            timeout_seconds: 300,
            retry_attempts: 3,
            provider_config: HashMap::new(),
        }
    }
}

impl AgentConfig {
    pub async fn from_file<P: AsRef<std::path::Path>>(path: P) -> Result<Self> {
        let contents = tokio::fs::read_to_string(&path)
            .await
            .map_err(|e| AgentError::InvalidConfig(format!("Failed to read config file: {}", e)))?;
        
        let config: AgentConfig = if path.as_ref().extension().and_then(|s| s.to_str()) == Some("json") {
            serde_json::from_str(&contents)
                .map_err(|e| AgentError::InvalidConfig(format!("Invalid JSON: {}", e)))?
        } else {
            toml::from_str(&contents)
                .map_err(|e| AgentError::InvalidConfig(format!("Invalid TOML: {}", e)))?
        };

        config.validate()?;
        Ok(config)
    }

    pub async fn save_to_file<P: AsRef<std::path::Path>>(&self, path: P) -> Result<()> {
        let contents = if path.as_ref().extension().and_then(|s| s.to_str()) == Some("json") {
            serde_json::to_string_pretty(self)
                .map_err(|e| AgentError::InvalidConfig(format!("Failed to serialize: {}", e)))?
        } else {
            toml::to_string_pretty(self)
                .map_err(|e| AgentError::InvalidConfig(format!("Failed to serialize: {}", e)))?
        };

        tokio::fs::write(path, contents).await
            .map_err(|e| AgentError::InvalidConfig(format!("Failed to write file: {}", e)))?;
        
        Ok(())
    }

    pub fn validate(&self) -> Result<()> {
        if self.name.is_empty() {
            return Err(AgentError::InvalidConfig("Agent name cannot be empty".to_string()).into());
        }

        if self.provider.is_empty() {
            return Err(AgentError::InvalidConfig("Provider cannot be empty".to_string()).into());
        }

        if self.model.is_empty() {
            return Err(AgentError::InvalidConfig("Model cannot be empty".to_string()).into());
        }

        if let Some(temp) = self.temperature {
            if !(0.0..=2.0).contains(&temp) {
                return Err(AgentError::InvalidConfig("Temperature must be between 0.0 and 2.0".to_string()).into());
            }
        }

        if let Some(max_tokens) = self.max_tokens {
            if max_tokens == 0 {
                return Err(AgentError::InvalidConfig("Max tokens must be greater than 0".to_string()).into());
            }
        }

        if self.timeout_seconds == 0 {
            return Err(AgentError::InvalidConfig("Timeout must be greater than 0".to_string()).into());
        }

        Ok(())
    }

    pub fn with_provider(mut self, provider: String, model: String) -> Self {
        self.provider = provider;
        self.model = model;
        self
    }

    pub fn with_system_prompt(mut self, system_prompt: String) -> Self {
        self.system_prompt = Some(system_prompt);
        self
    }

    pub fn with_temperature(mut self, temperature: f32) -> Self {
        self.temperature = Some(temperature);
        self
    }

    pub fn with_max_tokens(mut self, max_tokens: u32) -> Self {
        self.max_tokens = Some(max_tokens);
        self
    }

    pub fn enable_tools(mut self) -> Self {
        self.tools_enabled = true;
        self
    }

    pub fn disable_tools(mut self) -> Self {
        self.tools_enabled = false;
        self
    }

    pub fn enable_memory(mut self) -> Self {
        self.memory_enabled = true;
        self
    }

    pub fn disable_memory(mut self) -> Self {
        self.memory_enabled = false;
        self
    }

    pub fn set_provider_config(mut self, key: String, value: serde_json::Value) -> Self {
        self.provider_config.insert(key, value);
        self
    }
}