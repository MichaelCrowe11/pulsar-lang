use genesis_lang::{
    agent::{Agent, AgentConfig},
    memory::{MemoryManager, BasicMemoryStore},
    tools::{ToolRegistry, BuiltinTools},
};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("🤖 GenesisLang Simple Agent Example");

    // Initialize components
    let memory = MemoryManager::new(BasicMemoryStore::new());
    let tools = ToolRegistry::new();
    
    // Register built-in tools
    BuiltinTools::register_all(&tools).await?;

    // Create agent configuration
    let config = AgentConfig::default()
        .with_system_prompt(
            "You are a helpful assistant that can use tools to help users. \
            Be concise and friendly in your responses.".to_string()
        );

    // Create and configure agent
    let mut agent = Agent::new(config, memory, tools);
    
    println!("Agent '{}' created successfully!", agent.name);
    println!("Agent ID: {}", agent.id);

    // Example interactions
    let examples = vec![
        "Hello! What can you help me with?",
        "What's 15 + 25?",
        "Can you echo back 'GenesisLang is awesome!'?",
    ];

    for (i, prompt) in examples.iter().enumerate() {
        println!("\n--- Example {} ---", i + 1);
        println!("User: {}", prompt);
        
        match agent.process(prompt).await {
            Ok(response) => println!("Agent: {}", response),
            Err(e) => println!("Error: {}", e),
        }
    }

    println!("\n✅ Simple agent example completed!");
    Ok(())
}