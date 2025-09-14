use crate::{
    agent::{Agent, AgentManager},
    error::{Result, WorkflowError},
    memory::MemoryManager,
    tools::ToolRegistry,
};
use petgraph::{Graph, Directed};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

pub mod engine;
pub mod planner;

pub use engine::WorkflowEngine;
pub use planner::WorkflowPlanner;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Workflow {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub version: String,
    pub steps: Vec<WorkflowStep>,
    pub dependencies: Vec<WorkflowDependency>,
    pub variables: HashMap<String, serde_json::Value>,
    pub timeout_seconds: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowStep {
    pub id: String,
    pub name: String,
    pub step_type: WorkflowStepType,
    pub condition: Option<String>,
    pub retry_config: Option<RetryConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum WorkflowStepType {
    Agent {
        agent_id: String,
        prompt: String,
        input_mapping: HashMap<String, String>,
        output_mapping: HashMap<String, String>,
    },
    Tool {
        tool_name: String,
        parameters: serde_json::Value,
        input_mapping: HashMap<String, String>,
        output_mapping: HashMap<String, String>,
    },
    Conditional {
        condition: String,
        then_step: String,
        else_step: Option<String>,
    },
    Loop {
        condition: String,
        steps: Vec<String>,
        max_iterations: Option<u32>,
    },
    Parallel {
        steps: Vec<String>,
        wait_for: ParallelWaitMode,
    },
    SubWorkflow {
        workflow_id: String,
        input_mapping: HashMap<String, String>,
        output_mapping: HashMap<String, String>,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ParallelWaitMode {
    All,
    Any,
    Count(u32),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowDependency {
    pub from_step: String,
    pub to_step: String,
    pub condition: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RetryConfig {
    pub max_attempts: u32,
    pub delay_seconds: u64,
    pub backoff_multiplier: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowExecution {
    pub id: String,
    pub workflow_id: String,
    pub status: WorkflowStatus,
    pub start_time: chrono::DateTime<chrono::Utc>,
    pub end_time: Option<chrono::DateTime<chrono::Utc>>,
    pub step_results: HashMap<String, StepResult>,
    pub variables: HashMap<String, serde_json::Value>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum WorkflowStatus {
    Pending,
    Running,
    Completed,
    Failed,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StepResult {
    pub step_id: String,
    pub status: StepStatus,
    pub start_time: chrono::DateTime<chrono::Utc>,
    pub end_time: Option<chrono::DateTime<chrono::Utc>>,
    pub output: Option<serde_json::Value>,
    pub error: Option<String>,
    pub retry_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum StepStatus {
    Pending,
    Running,
    Completed,
    Failed,
    Skipped,
}

impl Workflow {
    pub fn new(name: String, description: Option<String>) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            name,
            description,
            version: "1.0.0".to_string(),
            steps: Vec::new(),
            dependencies: Vec::new(),
            variables: HashMap::new(),
            timeout_seconds: None,
        }
    }

    pub async fn from_file<P: AsRef<std::path::Path>>(path: P) -> Result<Self> {
        let contents = tokio::fs::read_to_string(&path)
            .await
            .map_err(|e| WorkflowError::NotFound(format!("Failed to read workflow file: {}", e)))?;
        
        let workflow: Workflow = if path.as_ref().extension().and_then(|s| s.to_str()) == Some("json") {
            serde_json::from_str(&contents)?
        } else {
            toml::from_str(&contents)
                .map_err(|e| WorkflowError::InvalidDefinition(format!("Invalid TOML: {}", e)))?
        };

        workflow.validate()?;
        Ok(workflow)
    }

    pub async fn save_to_file<P: AsRef<std::path::Path>>(&self, path: P) -> Result<()> {
        let contents = if path.as_ref().extension().and_then(|s| s.to_str()) == Some("json") {
            serde_json::to_string_pretty(self)?
        } else {
            toml::to_string_pretty(self)
                .map_err(|e| WorkflowError::InvalidDefinition(format!("Failed to serialize: {}", e)))?
        };

        tokio::fs::write(path, contents).await?;
        Ok(())
    }

    pub fn add_step(&mut self, step: WorkflowStep) {
        self.steps.push(step);
    }

    pub fn add_dependency(&mut self, from_step: String, to_step: String, condition: Option<String>) {
        self.dependencies.push(WorkflowDependency {
            from_step,
            to_step,
            condition,
        });
    }

    pub fn validate(&self) -> Result<()> {
        // Check for duplicate step IDs
        let mut step_ids = std::collections::HashSet::new();
        for step in &self.steps {
            if !step_ids.insert(&step.id) {
                return Err(WorkflowError::InvalidDefinition(
                    format!("Duplicate step ID: {}", step.id)
                ).into());
            }
        }

        // Check dependency references
        for dep in &self.dependencies {
            if !step_ids.contains(&dep.from_step) {
                return Err(WorkflowError::InvalidDefinition(
                    format!("Dependency references unknown step: {}", dep.from_step)
                ).into());
            }
            if !step_ids.contains(&dep.to_step) {
                return Err(WorkflowError::InvalidDefinition(
                    format!("Dependency references unknown step: {}", dep.to_step)
                ).into());
            }
        }

        // Check for circular dependencies
        self.check_circular_dependencies()?;

        Ok(())
    }

    fn check_circular_dependencies(&self) -> Result<()> {
        let mut graph = Graph::<String, (), Directed>::new();
        let mut node_indices = HashMap::new();

        // Add nodes
        for step in &self.steps {
            let index = graph.add_node(step.id.clone());
            node_indices.insert(step.id.clone(), index);
        }

        // Add edges
        for dep in &self.dependencies {
            if let (Some(&from_idx), Some(&to_idx)) = (
                node_indices.get(&dep.from_step),
                node_indices.get(&dep.to_step)
            ) {
                graph.add_edge(from_idx, to_idx, ());
            }
        }

        // Check for cycles using DFS
        if petgraph::algo::is_cyclic_directed(&graph) {
            return Err(WorkflowError::CircularDependency(
                "Workflow contains circular dependencies".to_string()
            ).into());
        }

        Ok(())
    }

    pub fn get_step(&self, step_id: &str) -> Option<&WorkflowStep> {
        self.steps.iter().find(|step| step.id == step_id)
    }

    pub fn get_next_steps(&self, current_step: &str) -> Vec<&WorkflowStep> {
        let next_step_ids: Vec<&str> = self.dependencies
            .iter()
            .filter(|dep| dep.from_step == current_step)
            .map(|dep| dep.to_step.as_str())
            .collect();

        self.steps
            .iter()
            .filter(|step| next_step_ids.contains(&step.id.as_str()))
            .collect()
    }

    pub fn get_entry_steps(&self) -> Vec<&WorkflowStep> {
        let dependent_steps: std::collections::HashSet<&str> = self.dependencies
            .iter()
            .map(|dep| dep.to_step.as_str())
            .collect();

        self.steps
            .iter()
            .filter(|step| !dependent_steps.contains(step.id.as_str()))
            .collect()
    }
}