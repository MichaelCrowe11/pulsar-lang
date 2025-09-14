use thiserror::Error;

pub type Result<T> = std::result::Result<T, GenesisError>;

#[derive(Error, Debug)]
pub enum GenesisError {
    #[error("Agent error: {0}")]
    Agent(#[from] AgentError),

    #[error("Workflow error: {0}")]
    Workflow(#[from] WorkflowError),

    #[error("Tool error: {0}")]
    Tool(#[from] ToolError),

    #[error("Memory error: {0}")]
    Memory(#[from] MemoryError),

    #[error("Configuration error: {0}")]
    Config(#[from] ConfigError),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),

    #[error("Generic error: {0}")]
    Generic(String),
}

#[derive(Error, Debug)]
pub enum AgentError {
    #[error("Agent not found: {0}")]
    NotFound(String),

    #[error("Agent execution failed: {0}")]
    ExecutionFailed(String),

    #[error("Invalid agent configuration: {0}")]
    InvalidConfig(String),

    #[error("Agent timeout")]
    Timeout,
}

#[derive(Error, Debug)]
pub enum WorkflowError {
    #[error("Workflow not found: {0}")]
    NotFound(String),

    #[error("Invalid workflow definition: {0}")]
    InvalidDefinition(String),

    #[error("Workflow execution failed: {0}")]
    ExecutionFailed(String),

    #[error("Circular dependency in workflow: {0}")]
    CircularDependency(String),
}

#[derive(Error, Debug)]
pub enum ToolError {
    #[error("Tool not found: {0}")]
    NotFound(String),

    #[error("Tool execution failed: {0}")]
    ExecutionFailed(String),

    #[error("Invalid tool parameters: {0}")]
    InvalidParameters(String),

    #[error("Tool authentication failed: {0}")]
    AuthenticationFailed(String),
}

#[derive(Error, Debug)]
pub enum MemoryError {
    #[error("Memory store not available")]
    StoreNotAvailable,

    #[error("Memory operation failed: {0}")]
    OperationFailed(String),

    #[error("Invalid memory query: {0}")]
    InvalidQuery(String),
}

#[derive(Error, Debug)]
pub enum ConfigError {
    #[error("Configuration file not found: {0}")]
    FileNotFound(String),

    #[error("Invalid configuration format: {0}")]
    InvalidFormat(String),

    #[error("Missing required configuration: {0}")]
    MissingRequired(String),
}