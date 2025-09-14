pub mod agent;
pub mod config;
pub mod error;
pub mod memory;
pub mod tools;
pub mod workflow;

pub use error::{GenesisError, Result};

use std::collections::HashMap;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenesisContext {
    pub session_id: String,
    pub variables: HashMap<String, serde_json::Value>,
    pub metadata: HashMap<String, String>,
}

impl GenesisContext {
    pub fn new(session_id: String) -> Self {
        Self {
            session_id,
            variables: HashMap::new(),
            metadata: HashMap::new(),
        }
    }

    pub fn set_variable(&mut self, name: String, value: serde_json::Value) {
        self.variables.insert(name, value);
    }

    pub fn get_variable(&self, name: &str) -> Option<&serde_json::Value> {
        self.variables.get(name)
    }

    pub fn set_metadata(&mut self, key: String, value: String) {
        self.metadata.insert(key, value);
    }

    pub fn get_metadata(&self, key: &str) -> Option<&String> {
        self.metadata.get(key)
    }
}