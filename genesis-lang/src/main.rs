use anyhow::Result;
use clap::{Parser, Subcommand};
use genesis_lang::{
    agent::{Agent, AgentConfig, AgentManager},
    workflow::{Workflow, WorkflowEngine},
    tools::{ToolRegistry, BuiltinTools},
    memory::{MemoryManager, BasicMemoryStore},
    config::Config,
};
use std::path::PathBuf;
use tracing::{info, Level};
use tracing_subscriber;

#[derive(Parser)]
#[command(name = "genesis")]
#[command(about = "GenesisLang: AI/Agent Orchestration System")]
#[command(version = env!("CARGO_PKG_VERSION"))]
pub struct Cli {
    #[arg(short, long, default_value = "info")]
    log_level: String,
    
    #[arg(short, long)]
    config: Option<PathBuf>,
    
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
pub enum Commands {
    /// Run a single agent
    Agent {
        /// Agent configuration file
        #[arg(short, long)]
        config: PathBuf,
        
        /// Prompt to send to the agent
        prompt: String,
    },
    
    /// Execute a workflow
    Workflow {
        /// Workflow definition file
        #[arg(short, long)]
        workflow: PathBuf,
        
        /// Input data for the workflow
        #[arg(short, long)]
        input: Option<String>,
    },
    
    /// Start the Genesis server
    Server {
        /// Port to bind to
        #[arg(short, long, default_value = "3000")]
        port: u16,
        
        /// Host to bind to
        #[arg(long, default_value = "127.0.0.1")]
        host: String,
    },
    
    /// List available tools
    Tools {
        /// Show detailed information
        #[arg(short, long)]
        verbose: bool,
    },
    
    /// Initialize a new Genesis project
    Init {
        /// Project name
        name: String,
        
        /// Project directory
        #[arg(short, long)]
        path: Option<PathBuf>,
    },
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();
    
    // Initialize tracing
    let level = match cli.log_level.as_str() {
        "trace" => Level::TRACE,
        "debug" => Level::DEBUG,
        "info" => Level::INFO,
        "warn" => Level::WARN,
        "error" => Level::ERROR,
        _ => Level::INFO,
    };
    
    tracing_subscriber::fmt()
        .with_max_level(level)
        .init();
    
    info!("Starting GenesisLang v{}", env!("CARGO_PKG_VERSION"));
    
    // Load configuration
    let config = if let Some(config_path) = cli.config {
        Config::from_file(config_path).await?
    } else {
        Config::default()
    };
    
    match cli.command {
        Commands::Agent { config: agent_config, prompt } => {
            run_agent(agent_config, prompt, &config).await?;
        },
        Commands::Workflow { workflow, input } => {
            run_workflow(workflow, input, &config).await?;
        },
        Commands::Server { port, host } => {
            run_server(host, port, &config).await?;
        },
        Commands::Tools { verbose } => {
            list_tools(verbose).await?;
        },
        Commands::Init { name, path } => {
            init_project(name, path).await?;
        },
    }
    
    Ok(())
}

async fn run_agent(config_path: PathBuf, prompt: String, config: &Config) -> Result<()> {
    info!("Running agent with config: {:?}", config_path);
    
    let agent_config = AgentConfig::from_file(&config_path).await?;
    let memory = MemoryManager::new(BasicMemoryStore::new());
    let tools = ToolRegistry::new();
    
    // Register built-in tools
    BuiltinTools::register_all(&tools).await?;
    
    let mut agent = Agent::new(agent_config, memory, tools);
    let response = agent.process(&prompt).await?;
    
    println!("Agent Response:");
    println!("{}", response);
    
    Ok(())
}

async fn run_workflow(workflow_path: PathBuf, input: Option<String>, config: &Config) -> Result<()> {
    info!("Running workflow: {:?}", workflow_path);
    
    let workflow = Workflow::from_file(&workflow_path).await?;
    let memory = MemoryManager::new(BasicMemoryStore::new());
    let tools = ToolRegistry::new();
    let agent_manager = AgentManager::new();
    
    // Register built-in tools
    BuiltinTools::register_all(&tools).await?;
    
    let engine = WorkflowEngine::new(agent_manager, memory, tools);
    let result = engine.execute(workflow, input).await?;
    
    println!("Workflow Result:");
    println!("{:#?}", result);
    
    Ok(())
}

async fn run_server(host: String, port: u16, config: &Config) -> Result<()> {
    info!("Starting Genesis server on {}:{}", host, port);
    
    // This will be implemented in the server module
    println!("Server mode not yet implemented. Coming in Phase 1!");
    println!("Run with --help to see available commands");
    
    Ok(())
}

async fn list_tools(verbose: bool) -> Result<()> {
    let tools = ToolRegistry::new();
    BuiltinTools::register_all(&tools).await?;
    
    println!("Available Tools:");
    for tool in tools.list_tools().await {
        if verbose {
            println!("  {} - {}", tool.name, tool.description);
            println!("    Parameters: {:?}", tool.parameters);
        } else {
            println!("  {}", tool.name);
        }
    }
    
    Ok(())
}

async fn init_project(name: String, path: Option<PathBuf>) -> Result<()> {
    let project_path = path.unwrap_or_else(|| PathBuf::from(&name));
    
    info!("Initializing Genesis project '{}' in {:?}", name, project_path);
    
    // Create project structure
    tokio::fs::create_dir_all(&project_path).await?;
    tokio::fs::create_dir_all(project_path.join("agents")).await?;
    tokio::fs::create_dir_all(project_path.join("workflows")).await?;
    tokio::fs::create_dir_all(project_path.join("tools")).await?;
    
    // Create example files
    let config_content = r#"[project]
name = "{name}"
version = "0.1.0"

[agents]
# Agent configurations will be loaded from the agents/ directory

[memory]
type = "basic"

[tools]
# Custom tools will be loaded from the tools/ directory
"#;
    
    tokio::fs::write(
        project_path.join("genesis.toml"),
        config_content.replace("{name}", &name)
    ).await?;
    
    println!("✅ Genesis project '{}' initialized successfully!", name);
    println!("📁 Project structure:");
    println!("   📂 {}/", name);
    println!("   ├── 📄 genesis.toml");
    println!("   ├── 📂 agents/");
    println!("   ├── 📂 workflows/");
    println!("   └── 📂 tools/");
    
    Ok(())
}