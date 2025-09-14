use super::{Agent, AgentConfig, AgentStats};
use crate::{
    error::{AgentError, Result},
    memory::MemoryManager,
    tools::ToolRegistry,
};
use dashmap::DashMap;
use std::sync::Arc;
use uuid::Uuid;

pub struct AgentManager {
    agents: DashMap<String, Agent>,
}

impl AgentManager {
    pub fn new() -> Self {
        Self {
            agents: DashMap::new(),
        }
    }

    pub fn create_agent(
        &self,
        config: AgentConfig,
        memory_manager: MemoryManager,
        tool_registry: ToolRegistry,
    ) -> String {
        let agent = Agent::new(config, memory_manager, tool_registry);
        let agent_id = agent.id.clone();
        
        self.agents.insert(agent_id.clone(), agent);
        agent_id
    }

    pub fn get_agent(&self, agent_id: &str) -> Option<Agent> {
        self.agents.get(agent_id).map(|entry| entry.clone())
    }

    pub fn remove_agent(&self, agent_id: &str) -> bool {
        self.agents.remove(agent_id).is_some()
    }

    pub fn list_agents(&self) -> Vec<AgentStats> {
        self.agents
            .iter()
            .map(|entry| entry.value().get_stats())
            .collect()
    }

    pub async fn execute_agent(&self, agent_id: &str, input: &str) -> Result<String> {
        let mut agent = self.agents
            .get_mut(agent_id)
            .ok_or_else(|| AgentError::NotFound(agent_id.to_string()))?;
        
        agent.process(input).await
    }

    pub fn agent_exists(&self, agent_id: &str) -> bool {
        self.agents.contains_key(agent_id)
    }

    pub fn agent_count(&self) -> usize {
        self.agents.len()
    }

    pub async fn create_from_config_file<P: AsRef<std::path::Path>>(
        &self,
        config_path: P,
        memory_manager: MemoryManager,
        tool_registry: ToolRegistry,
    ) -> Result<String> {
        let config = AgentConfig::from_file(config_path).await?;
        Ok(self.create_agent(config, memory_manager, tool_registry))
    }

    pub fn create_simple_agent(
        &self,
        name: String,
        system_prompt: Option<String>,
        memory_manager: MemoryManager,
        tool_registry: ToolRegistry,
    ) -> String {
        let mut config = AgentConfig::default();
        config.name = name;
        config.system_prompt = system_prompt;
        
        self.create_agent(config, memory_manager, tool_registry)
    }

    pub fn create_research_agent(
        &self,
        memory_manager: MemoryManager,
        tool_registry: ToolRegistry,
    ) -> String {
        let config = AgentConfig::default()
            .with_system_prompt(
                "You are a research assistant. Help users find and analyze information. \
                Use available tools to search, gather data, and provide comprehensive answers.".to_string()
            )
            .enable_tools()
            .enable_memory();
        
        let mut agent = Agent::new(config, memory_manager, tool_registry);
        agent.name = "research-assistant".to_string();
        
        let agent_id = agent.id.clone();
        self.agents.insert(agent_id.clone(), agent);
        agent_id
    }

    pub fn create_coding_agent(
        &self,
        memory_manager: MemoryManager,
        tool_registry: ToolRegistry,
    ) -> String {
        let config = AgentConfig::default()
            .with_system_prompt(
                "You are a coding assistant. Help users write, debug, and improve code. \
                You can read files, execute code, and use development tools.".to_string()
            )
            .enable_tools()
            .enable_memory();
        
        let mut agent = Agent::new(config, memory_manager, tool_registry);
        agent.name = "coding-assistant".to_string();
        
        let agent_id = agent.id.clone();
        self.agents.insert(agent_id.clone(), agent);
        agent_id
    }

    pub fn create_planning_agent(
        &self,
        memory_manager: MemoryManager,
        tool_registry: ToolRegistry,
    ) -> String {
        let config = AgentConfig::default()
            .with_system_prompt(
                "You are a planning assistant. Help users break down complex tasks into \
                manageable steps and create workflows. You excel at project management and coordination.".to_string()
            )
            .enable_tools()
            .enable_memory();
        
        let mut agent = Agent::new(config, memory_manager, tool_registry);
        agent.name = "planning-assistant".to_string();
        
        let agent_id = agent.id.clone();
        self.agents.insert(agent_id.clone(), agent);
        agent_id
    }

    pub async fn shutdown_all(&self) -> Result<()> {
        // In a full implementation, this would gracefully shutdown all agents
        // and save any persistent state
        self.agents.clear();
        Ok(())
    }
}

impl Default for AgentManager {
    fn default() -> Self {
        Self::new()
    }
}