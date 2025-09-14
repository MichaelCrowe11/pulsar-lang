use genesis_lang::{
    agent::{AgentManager},
    workflow::{Workflow, WorkflowEngine, WorkflowPlanner},
    memory::{MemoryManager, BasicMemoryStore},
    tools::{ToolRegistry, BuiltinTools},
};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("🔄 GenesisLang Multi-Agent Workflow Example");

    // Initialize shared components
    let memory = MemoryManager::new(BasicMemoryStore::new());
    let tools = ToolRegistry::new();
    let agent_manager = AgentManager::new();

    // Register built-in tools
    BuiltinTools::register_all(&tools).await?;

    // Create specialized agents
    let research_agent = agent_manager.create_research_agent(
        memory.clone(),
        tools.clone(),
    );
    println!("✅ Created research agent: {}", research_agent);

    let planning_agent = agent_manager.create_planning_agent(
        memory.clone(),
        tools.clone(),
    );
    println!("✅ Created planning agent: {}", planning_agent);

    let coding_agent = agent_manager.create_coding_agent(
        memory.clone(),
        tools.clone(),
    );
    println!("✅ Created coding agent: {}", coding_agent);

    // Create workflow planner
    let planner = WorkflowPlanner::new();

    // Example 1: Research workflow
    println!("\n--- Research Workflow Example ---");
    let research_workflow = planner.create_research_workflow(
        "AI Research Project".to_string(),
        "artificial intelligence trends 2024".to_string(),
    );

    let engine = WorkflowEngine::new(agent_manager.clone(), memory.clone(), tools.clone());
    
    match engine.execute(research_workflow, None).await {
        Ok(result) => {
            println!("Research workflow completed!");
            println!("Status: {:?}", result.status);
            println!("Steps executed: {}", result.step_results.len());
        }
        Err(e) => println!("Research workflow failed: {}", e),
    }

    // Example 2: Agent chain workflow
    println!("\n--- Agent Chain Workflow Example ---");
    let chain_workflow = planner.create_agent_tool_chain(
        "Analysis Chain".to_string(),
        research_agent,
        "Analyze the input data and provide insights: {input}".to_string(),
        "calculator".to_string(),
    );

    match engine.execute(chain_workflow, Some("Market data: [100, 150, 200, 175, 225]".to_string())).await {
        Ok(result) => {
            println!("Chain workflow completed!");
            println!("Status: {:?}", result.status);
            if let Some(final_output) = result.variables.get("final_result") {
                println!("Final result: {:?}", final_output);
            }
        }
        Err(e) => println!("Chain workflow failed: {}", e),
    }

    // Example 3: Custom workflow
    println!("\n--- Custom Workflow Example ---");
    let mut custom_workflow = Workflow::new(
        "Custom Multi-Agent Flow".to_string(),
        Some("A custom workflow demonstrating agent coordination".to_string()),
    );

    // This would normally have proper step definitions
    println!("Custom workflow created with ID: {}", custom_workflow.id);

    println!("\n🎯 Multi-agent workflow examples completed!");
    println!("📊 Agent Manager Stats:");
    println!("  Total agents: {}", agent_manager.agent_count());
    
    for stats in agent_manager.list_agents() {
        println!("  - {}: {} ({})", stats.name, stats.id, stats.provider);
    }

    Ok(())
}