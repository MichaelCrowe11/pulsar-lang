use super::{Workflow, WorkflowStep, WorkflowStepType};
use crate::error::Result;
use serde_json::json;

pub struct WorkflowPlanner;

impl WorkflowPlanner {
    pub fn new() -> Self {
        Self
    }

    pub fn create_simple_agent_workflow(
        &self,
        name: String,
        agent_id: String,
        prompt: String,
    ) -> Workflow {
        let mut workflow = Workflow::new(name, Some("Simple agent workflow".to_string()));

        let step = WorkflowStep {
            id: "agent_step".to_string(),
            name: "Execute Agent".to_string(),
            step_type: WorkflowStepType::Agent {
                agent_id,
                prompt,
                input_mapping: std::collections::HashMap::new(),
                output_mapping: {
                    let mut mapping = std::collections::HashMap::new();
                    mapping.insert("response".to_string(), "agent_response".to_string());
                    mapping
                },
            },
            condition: None,
            retry_config: None,
        };

        workflow.add_step(step);
        workflow
    }

    pub fn create_tool_workflow(
        &self,
        name: String,
        tool_name: String,
        parameters: serde_json::Value,
    ) -> Workflow {
        let mut workflow = Workflow::new(name, Some("Simple tool workflow".to_string()));

        let step = WorkflowStep {
            id: "tool_step".to_string(),
            name: format!("Execute {}", tool_name),
            step_type: WorkflowStepType::Tool {
                tool_name,
                parameters,
                input_mapping: std::collections::HashMap::new(),
                output_mapping: {
                    let mut mapping = std::collections::HashMap::new();
                    mapping.insert("result".to_string(), "tool_result".to_string());
                    mapping
                },
            },
            condition: None,
            retry_config: None,
        };

        workflow.add_step(step);
        workflow
    }

    pub fn create_agent_tool_chain(
        &self,
        name: String,
        agent_id: String,
        agent_prompt: String,
        tool_name: String,
    ) -> Workflow {
        let mut workflow = Workflow::new(name, Some("Agent -> Tool chain workflow".to_string()));

        // Step 1: Agent processes input
        let agent_step = WorkflowStep {
            id: "agent_step".to_string(),
            name: "Analyze with Agent".to_string(),
            step_type: WorkflowStepType::Agent {
                agent_id,
                prompt: agent_prompt,
                input_mapping: {
                    let mut mapping = std::collections::HashMap::new();
                    mapping.insert("input".to_string(), "input".to_string());
                    mapping
                },
                output_mapping: {
                    let mut mapping = std::collections::HashMap::new();
                    mapping.insert("response".to_string(), "agent_analysis".to_string());
                    mapping
                },
            },
            condition: None,
            retry_config: None,
        };

        // Step 2: Tool processes agent output
        let tool_step = WorkflowStep {
            id: "tool_step".to_string(),
            name: format!("Process with {}", tool_name),
            step_type: WorkflowStepType::Tool {
                tool_name,
                parameters: json!({}),
                input_mapping: {
                    let mut mapping = std::collections::HashMap::new();
                    mapping.insert("data".to_string(), "agent_analysis".to_string());
                    mapping
                },
                output_mapping: {
                    let mut mapping = std::collections::HashMap::new();
                    mapping.insert("result".to_string(), "final_result".to_string());
                    mapping
                },
            },
            condition: None,
            retry_config: None,
        };

        workflow.add_step(agent_step);
        workflow.add_step(tool_step);
        workflow.add_dependency("agent_step".to_string(), "tool_step".to_string(), None);

        workflow
    }

    pub fn create_research_workflow(&self, name: String, research_query: String) -> Workflow {
        let mut workflow = Workflow::new(name, Some("Research workflow with multiple tools".to_string()));

        // Step 1: Web search
        let search_step = WorkflowStep {
            id: "web_search".to_string(),
            name: "Search Web".to_string(),
            step_type: WorkflowStepType::Tool {
                tool_name: "web_search".to_string(),
                parameters: json!({
                    "query": research_query
                }),
                input_mapping: std::collections::HashMap::new(),
                output_mapping: {
                    let mut mapping = std::collections::HashMap::new();
                    mapping.insert("results".to_string(), "search_results".to_string());
                    mapping
                },
            },
            condition: None,
            retry_config: None,
        };

        // Step 2: Analyze results with agent
        let analysis_step = WorkflowStep {
            id: "analyze_results".to_string(),
            name: "Analyze Search Results".to_string(),
            step_type: WorkflowStepType::Agent {
                agent_id: "research_agent".to_string(),
                prompt: "Analyze the following search results and provide a summary: {search_results}".to_string(),
                input_mapping: {
                    let mut mapping = std::collections::HashMap::new();
                    mapping.insert("search_results".to_string(), "search_results".to_string());
                    mapping
                },
                output_mapping: {
                    let mut mapping = std::collections::HashMap::new();
                    mapping.insert("response".to_string(), "analysis".to_string());
                    mapping
                },
            },
            condition: None,
            retry_config: None,
        };

        // Step 3: Generate final report
        let report_step = WorkflowStep {
            id: "generate_report".to_string(),
            name: "Generate Report".to_string(),
            step_type: WorkflowStepType::Agent {
                agent_id: "report_agent".to_string(),
                prompt: "Generate a comprehensive report based on this analysis: {analysis}".to_string(),
                input_mapping: {
                    let mut mapping = std::collections::HashMap::new();
                    mapping.insert("analysis".to_string(), "analysis".to_string());
                    mapping
                },
                output_mapping: {
                    let mut mapping = std::collections::HashMap::new();
                    mapping.insert("response".to_string(), "final_report".to_string());
                    mapping
                },
            },
            condition: None,
            retry_config: None,
        };

        workflow.add_step(search_step);
        workflow.add_step(analysis_step);
        workflow.add_step(report_step);

        workflow.add_dependency("web_search".to_string(), "analyze_results".to_string(), None);
        workflow.add_dependency("analyze_results".to_string(), "generate_report".to_string(), None);

        workflow
    }
}

impl Default for WorkflowPlanner {
    fn default() -> Self {
        Self::new()
    }
}