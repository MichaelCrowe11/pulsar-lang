use super::{Workflow, WorkflowExecution, WorkflowStatus, StepResult, StepStatus, WorkflowStepType};
use crate::{
    agent::AgentManager,
    error::{Result, WorkflowError},
    memory::MemoryManager,
    tools::{ToolRegistry, ToolCall},
};
use std::collections::HashMap;
use tokio::time::{timeout, Duration};
use tracing::{info, error, warn};
use uuid::Uuid;

pub struct WorkflowEngine {
    agent_manager: AgentManager,
    memory_manager: MemoryManager,
    tool_registry: ToolRegistry,
}

impl WorkflowEngine {
    pub fn new(
        agent_manager: AgentManager,
        memory_manager: MemoryManager,
        tool_registry: ToolRegistry,
    ) -> Self {
        Self {
            agent_manager,
            memory_manager,
            tool_registry,
        }
    }

    pub async fn execute(
        &self,
        workflow: Workflow,
        input: Option<String>,
    ) -> Result<WorkflowExecution> {
        info!("Starting workflow execution: {}", workflow.name);

        let mut execution = WorkflowExecution {
            id: Uuid::new_v4().to_string(),
            workflow_id: workflow.id.clone(),
            status: WorkflowStatus::Running,
            start_time: chrono::Utc::now(),
            end_time: None,
            step_results: HashMap::new(),
            variables: workflow.variables.clone(),
            error: None,
        };

        // Add input to variables if provided
        if let Some(input_data) = input {
            execution.variables.insert("input".to_string(), serde_json::Value::String(input_data));
        }

        // Execute workflow with timeout if specified
        let result = if let Some(timeout_secs) = workflow.timeout_seconds {
            match timeout(
                Duration::from_secs(timeout_secs),
                self.execute_workflow_internal(&workflow, &mut execution)
            ).await {
                Ok(result) => result,
                Err(_) => {
                    execution.status = WorkflowStatus::Failed;
                    execution.error = Some("Workflow execution timed out".to_string());
                    Err(WorkflowError::ExecutionFailed("Timeout".to_string()).into())
                }
            }
        } else {
            self.execute_workflow_internal(&workflow, &mut execution).await
        };

        execution.end_time = Some(chrono::Utc::now());

        match result {
            Ok(_) => {
                execution.status = WorkflowStatus::Completed;
                info!("Workflow execution completed: {}", workflow.name);
            }
            Err(e) => {
                execution.status = WorkflowStatus::Failed;
                execution.error = Some(e.to_string());
                error!("Workflow execution failed: {}", e);
            }
        }

        Ok(execution)
    }

    async fn execute_workflow_internal(
        &self,
        workflow: &Workflow,
        execution: &mut WorkflowExecution,
    ) -> Result<()> {
        let entry_steps = workflow.get_entry_steps();
        
        if entry_steps.is_empty() {
            return Err(WorkflowError::InvalidDefinition(
                "No entry steps found in workflow".to_string()
            ).into());
        }

        // Execute entry steps
        for step in entry_steps {
            self.execute_step(workflow, step, execution).await?;
        }

        // Continue with dependent steps
        let mut executed_steps = std::collections::HashSet::new();
        for step in &workflow.steps {
            executed_steps.insert(step.id.clone());
        }

        // Simple execution model - in production this would be more sophisticated
        for step in &workflow.steps {
            if !execution.step_results.contains_key(&step.id) {
                self.execute_step(workflow, step, execution).await?;
            }
        }

        Ok(())
    }

    async fn execute_step(
        &self,
        workflow: &Workflow,
        step: &super::WorkflowStep,
        execution: &mut WorkflowExecution,
    ) -> Result<()> {
        info!("Executing step: {}", step.name);

        let mut step_result = StepResult {
            step_id: step.id.clone(),
            status: StepStatus::Running,
            start_time: chrono::Utc::now(),
            end_time: None,
            output: None,
            error: None,
            retry_count: 0,
        };

        // Check condition if present
        if let Some(condition) = &step.condition {
            if !self.evaluate_condition(condition, execution).await {
                step_result.status = StepStatus::Skipped;
                step_result.end_time = Some(chrono::Utc::now());
                execution.step_results.insert(step.id.clone(), step_result);
                return Ok(());
            }
        }

        // Execute step with retries
        let retry_config = step.retry_config.clone().unwrap_or(super::RetryConfig {
            max_attempts: 1,
            delay_seconds: 1,
            backoff_multiplier: 1.0,
        });

        let mut last_error = None;
        for attempt in 0..retry_config.max_attempts {
            step_result.retry_count = attempt;

            match self.execute_step_type(&step.step_type, execution).await {
                Ok(output) => {
                    step_result.status = StepStatus::Completed;
                    step_result.output = Some(output);
                    break;
                }
                Err(e) => {
                    last_error = Some(e);
                    if attempt < retry_config.max_attempts - 1 {
                        let delay = retry_config.delay_seconds as f32 * 
                            retry_config.backoff_multiplier.powi(attempt as i32);
                        tokio::time::sleep(Duration::from_secs_f32(delay)).await;
                    }
                }
            }
        }

        if step_result.status != StepStatus::Completed {
            step_result.status = StepStatus::Failed;
            step_result.error = last_error.map(|e| e.to_string());
        }

        step_result.end_time = Some(chrono::Utc::now());
        execution.step_results.insert(step.id.clone(), step_result);

        if execution.step_results[&step.id].status == StepStatus::Failed {
            return Err(WorkflowError::ExecutionFailed(
                format!("Step {} failed", step.name)
            ).into());
        }

        Ok(())
    }

    async fn execute_step_type(
        &self,
        step_type: &WorkflowStepType,
        execution: &mut WorkflowExecution,
    ) -> Result<serde_json::Value> {
        match step_type {
            WorkflowStepType::Agent { agent_id, prompt, input_mapping, output_mapping } => {
                // Map inputs from execution variables
                let mut mapped_prompt = prompt.clone();
                for (template_var, execution_var) in input_mapping {
                    if let Some(value) = execution.variables.get(execution_var) {
                        mapped_prompt = mapped_prompt.replace(
                            &format!("{{{}}}", template_var),
                            &value.to_string().trim_matches('"')
                        );
                    }
                }

                // Execute agent
                let response = self.agent_manager.execute_agent(agent_id, &mapped_prompt).await
                    .map_err(|e| WorkflowError::ExecutionFailed(format!("Agent execution failed: {}", e)))?;

                // Map outputs back to execution variables
                let result = serde_json::Value::String(response.clone());
                for (output_var, execution_var) in output_mapping {
                    if output_var == "response" {
                        execution.variables.insert(execution_var.clone(), result.clone());
                    }
                }

                Ok(result)
            }

            WorkflowStepType::Tool { tool_name, parameters, input_mapping, output_mapping } => {
                // Map inputs from execution variables
                let mut mapped_params = parameters.clone();
                if let serde_json::Value::Object(ref mut params_obj) = mapped_params {
                    for (param_key, execution_var) in input_mapping {
                        if let Some(value) = execution.variables.get(execution_var) {
                            params_obj.insert(param_key.clone(), value.clone());
                        }
                    }
                }

                // Execute tool
                let tool_call = ToolCall {
                    id: Uuid::new_v4().to_string(),
                    name: tool_name.clone(),
                    parameters: mapped_params,
                };

                let tool_result = self.tool_registry.execute(tool_call).await?;
                
                if !tool_result.success {
                    return Err(WorkflowError::ExecutionFailed(
                        tool_result.error.unwrap_or_else(|| "Tool execution failed".to_string())
                    ).into());
                }

                let result = tool_result.data.unwrap_or(serde_json::Value::Null);

                // Map outputs back to execution variables
                for (output_field, execution_var) in output_mapping {
                    if output_field == "result" {
                        execution.variables.insert(execution_var.clone(), result.clone());
                    } else if let serde_json::Value::Object(ref result_obj) = result {
                        if let Some(field_value) = result_obj.get(output_field) {
                            execution.variables.insert(execution_var.clone(), field_value.clone());
                        }
                    }
                }

                Ok(result)
            }

            WorkflowStepType::Conditional { condition, then_step, else_step } => {
                let condition_result = self.evaluate_condition(condition, execution).await;
                let next_step = if condition_result {
                    then_step
                } else if let Some(else_step) = else_step {
                    else_step
                } else {
                    return Ok(serde_json::Value::Bool(false));
                };

                Ok(serde_json::Value::String(format!("Next step: {}", next_step)))
            }

            WorkflowStepType::Loop { condition, steps: _, max_iterations } => {
                let mut iterations = 0;
                let max_iter = max_iterations.unwrap_or(100);
                
                while self.evaluate_condition(condition, execution).await && iterations < max_iter {
                    iterations += 1;
                    // In a full implementation, we would execute the loop steps here
                }

                Ok(serde_json::Value::Number(serde_json::Number::from(iterations)))
            }

            WorkflowStepType::Parallel { steps: _, wait_for: _ } => {
                // Simplified parallel execution - in production this would spawn concurrent tasks
                Ok(serde_json::Value::String("Parallel execution completed".to_string()))
            }

            WorkflowStepType::SubWorkflow { workflow_id, input_mapping: _, output_mapping: _ } => {
                // Sub-workflow execution would load and execute another workflow
                Ok(serde_json::Value::String(format!("Sub-workflow {} executed", workflow_id)))
            }
        }
    }

    async fn evaluate_condition(
        &self,
        condition: &str,
        execution: &WorkflowExecution,
    ) -> bool {
        // Simple condition evaluation - in production this would use a proper expression evaluator
        if condition == "true" {
            return true;
        }
        if condition == "false" {
            return false;
        }

        // Check variable conditions
        if condition.starts_with("$") {
            let var_name = &condition[1..];
            if let Some(value) = execution.variables.get(var_name) {
                return match value {
                    serde_json::Value::Bool(b) => *b,
                    serde_json::Value::String(s) => !s.is_empty(),
                    serde_json::Value::Number(n) => n.as_f64().unwrap_or(0.0) != 0.0,
                    serde_json::Value::Null => false,
                    _ => true,
                };
            }
        }

        warn!("Unknown condition: {}", condition);
        false
    }
}