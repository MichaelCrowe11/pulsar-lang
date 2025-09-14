use crate::error::{ConfigError, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub project: ProjectConfig,
    pub agents: AgentConfig,
    pub memory: MemoryConfig,
    pub tools: ToolConfig,
    pub observability: ObservabilityConfig,
    pub enterprise: Option<EnterpriseConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectConfig {
    pub name: String,
    pub version: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentConfig {
    pub default_provider: String,
    pub providers: HashMap<String, ProviderConfig>,
    pub max_concurrent_agents: usize,
    pub timeout_seconds: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderConfig {
    pub api_key: Option<String>,
    pub base_url: Option<String>,
    pub model: String,
    pub max_tokens: Option<u32>,
    pub temperature: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryConfig {
    pub store_type: String,
    pub connection_string: Option<String>,
    pub vector_dimensions: usize,
    pub max_memory_size: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolConfig {
    pub enabled_tools: Vec<String>,
    pub custom_tools_path: Option<PathBuf>,
    pub tool_timeout_seconds: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ObservabilityConfig {
    pub enabled: bool,
    pub metrics_endpoint: Option<String>,
    pub tracing_endpoint: Option<String>,
    pub log_level: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnterpriseConfig {
    pub sso_enabled: bool,
    pub saml_config: Option<SamlConfig>,
    pub rbac_enabled: bool,
    pub audit_logging: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SamlConfig {
    pub entity_id: String,
    pub sso_url: String,
    pub certificate_path: PathBuf,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            project: ProjectConfig {
                name: "genesis-project".to_string(),
                version: "0.1.0".to_string(),
                description: None,
            },
            agents: AgentConfig {
                default_provider: "openai".to_string(),
                providers: {
                    let mut providers = HashMap::new();
                    providers.insert("openai".to_string(), ProviderConfig {
                        api_key: None,
                        base_url: Some("https://api.openai.com/v1".to_string()),
                        model: "gpt-4".to_string(),
                        max_tokens: Some(4096),
                        temperature: Some(0.7),
                    });
                    providers
                },
                max_concurrent_agents: 10,
                timeout_seconds: 300,
            },
            memory: MemoryConfig {
                store_type: "basic".to_string(),
                connection_string: None,
                vector_dimensions: 1536,
                max_memory_size: 10000,
            },
            tools: ToolConfig {
                enabled_tools: vec![
                    "http_request".to_string(),
                    "file_operations".to_string(),
                    "search_web".to_string(),
                    "code_execution".to_string(),
                ],
                custom_tools_path: None,
                tool_timeout_seconds: 60,
            },
            observability: ObservabilityConfig {
                enabled: false,
                metrics_endpoint: None,
                tracing_endpoint: None,
                log_level: "info".to_string(),
            },
            enterprise: None,
        }
    }
}

impl Config {
    pub async fn from_file<P: AsRef<std::path::Path>>(path: P) -> Result<Self> {
        let contents = tokio::fs::read_to_string(&path)
            .await
            .map_err(|_| ConfigError::FileNotFound(path.as_ref().display().to_string()))?;
        
        // Try TOML first, then JSON, then YAML
        if let Ok(config) = toml::from_str(&contents) {
            return Ok(config);
        }
        
        if let Ok(config) = serde_json::from_str(&contents) {
            return Ok(config);
        }
        
        // For now, we'll skip YAML support to keep dependencies minimal
        Err(ConfigError::InvalidFormat("Unsupported format. Use TOML or JSON.".to_string()).into())
    }

    pub async fn save_to_file<P: AsRef<std::path::Path>>(&self, path: P) -> Result<()> {
        let contents = toml::to_string_pretty(self)
            .map_err(|e| ConfigError::InvalidFormat(e.to_string()))?;
        
        tokio::fs::write(path, contents).await?;
        Ok(())
    }

    pub fn validate(&self) -> Result<()> {
        if self.project.name.is_empty() {
            return Err(ConfigError::MissingRequired("project.name".to_string()).into());
        }

        if self.agents.providers.is_empty() {
            return Err(ConfigError::MissingRequired("agents.providers".to_string()).into());
        }

        if !self.agents.providers.contains_key(&self.agents.default_provider) {
            return Err(ConfigError::InvalidFormat(
                format!("Default provider '{}' not found in providers", self.agents.default_provider)
            ).into());
        }

        Ok(())
    }
}