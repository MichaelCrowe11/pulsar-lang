// Pulsar WCET (Worst-Case Execution Time) Analysis Tool
// Static timing analysis for real-time safety certification

use crate::rt::{Task, TaskSet, Micros, Policy};
use std::collections::{HashMap, BTreeMap};
use std::fmt;

// Instruction timing database for different architectures
#[derive(Clone, Debug)]
pub struct InstructionTiming {
    pub opcode: String,
    pub min_cycles: u32,
    pub max_cycles: u32,
    pub depends_on_data: bool,
    pub cache_sensitive: bool,
}

// Hardware configuration for WCET analysis
#[derive(Clone, Debug)]
pub struct HardwareConfig {
    pub architecture: Architecture,
    pub cpu_frequency_mhz: u32,
    pub cache_config: CacheConfig,
    pub memory_config: MemoryConfig,
    pub pipeline_stages: u8,
}

#[derive(Clone, Debug)]
pub enum Architecture {
    ARMCortexM4,
    ARMCortexM7,
    ARMCortexA7,
    RiscV32,
    RiscV64,
    X86_64,
    Native,
}

#[derive(Clone, Debug)]
pub struct CacheConfig {
    pub l1_instruction_kb: u32,
    pub l1_data_kb: u32,
    pub l1_associativity: u8,
    pub l1_line_size: u8,
    pub l2_kb: u32,
    pub cache_hit_cycles: u32,
    pub cache_miss_cycles: u32,
}

#[derive(Clone, Debug)]
pub struct MemoryConfig {
    pub ram_access_cycles: u32,
    pub flash_access_cycles: u32,
    pub dma_channels: u8,
}

// Control flow graph representation
#[derive(Clone, Debug)]
pub struct ControlFlowGraph {
    pub basic_blocks: Vec<BasicBlock>,
    pub edges: Vec<CFGEdge>,
    pub entry_block: usize,
    pub exit_blocks: Vec<usize>,
}

#[derive(Clone, Debug)]
pub struct BasicBlock {
    pub id: usize,
    pub instructions: Vec<Instruction>,
    pub loop_info: Option<LoopInfo>,
}

#[derive(Clone, Debug)]
pub struct LoopInfo {
    pub max_iterations: u32,
    pub is_bounded: bool,
    pub nesting_level: u8,
}

#[derive(Clone, Debug)]
pub struct CFGEdge {
    pub from: usize,
    pub to: usize,
    pub condition: EdgeCondition,
}

#[derive(Clone, Debug)]
pub enum EdgeCondition {
    Unconditional,
    True,
    False,
    LoopBack,
    LoopExit,
}

#[derive(Clone, Debug)]
pub struct Instruction {
    pub opcode: String,
    pub operands: Vec<String>,
    pub address: u64,
    pub size_bytes: u8,
}

// WCET analysis results
#[derive(Clone, Debug)]
pub struct WCETAnalysis {
    pub function_name: String,
    pub wcet_cycles: u64,
    pub wcet_microseconds: u64,
    pub analysis_method: AnalysisMethod,
    pub confidence: AnalysisConfidence,
    pub breakdown: WCETBreakdown,
    pub violations: Vec<TimingViolation>,
}

#[derive(Clone, Debug)]
pub enum AnalysisMethod {
    StaticAnalysis,
    MeasurementBased,
    Hybrid,
    ProbabilisticAnalysis,
}

#[derive(Clone, Debug)]
pub enum AnalysisConfidence {
    High,      // > 95% confidence
    Medium,    // 80-95% confidence
    Low,       // < 80% confidence
    Estimated, // Rough estimate
}

#[derive(Clone, Debug)]
pub struct WCETBreakdown {
    pub computation_cycles: u64,
    pub memory_access_cycles: u64,
    pub cache_miss_cycles: u64,
    pub pipeline_stalls: u64,
    pub interrupt_overhead: u64,
}

#[derive(Clone, Debug)]
pub struct TimingViolation {
    pub violation_type: ViolationType,
    pub location: String,
    pub severity: Severity,
    pub description: String,
    pub suggested_fix: String,
}

#[derive(Clone, Debug)]
pub enum ViolationType {
    DeadlineMiss,
    UnboundedLoop,
    RecursiveCall,
    DynamicAllocation,
    BlockingSystemCall,
    InterruptLatency,
    CacheThrashing,
}

impl fmt::Display for ViolationType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ViolationType::DeadlineMiss => write!(f, "DeadlineMiss"),
            ViolationType::UnboundedLoop => write!(f, "UnboundedLoop"),
            ViolationType::RecursiveCall => write!(f, "RecursiveCall"),
            ViolationType::DynamicAllocation => write!(f, "DynamicAllocation"),
            ViolationType::BlockingSystemCall => write!(f, "BlockingSystemCall"),
            ViolationType::InterruptLatency => write!(f, "InterruptLatency"),
            ViolationType::CacheThrashing => write!(f, "CacheThrashing"),
        }
    }
}

#[derive(Clone, Debug)]
pub enum Severity {
    Critical,
    High,
    Medium,
    Low,
    Info,
}

// WCET analyzer engine
pub struct WCETAnalyzer {
    hardware_config: HardwareConfig,
    instruction_timings: HashMap<String, InstructionTiming>,
    safety_margin_percent: u8,
    max_analysis_time_ms: u32,
}

impl WCETAnalyzer {
    pub fn new(hardware_config: HardwareConfig) -> Self {
        let mut analyzer = Self {
            hardware_config: hardware_config.clone(),
            instruction_timings: HashMap::new(),
            safety_margin_percent: 20, // 20% safety margin
            max_analysis_time_ms: 10000, // 10 second timeout
        };
        
        analyzer.load_instruction_timings(&hardware_config.architecture);
        analyzer
    }
    
    pub fn set_safety_margin(&mut self, percent: u8) {
        self.safety_margin_percent = percent;
    }
    
    pub fn analyze_function(&self, cfg: &ControlFlowGraph, function_name: &str) -> Result<WCETAnalysis, String> {
        let start_time = std::time::Instant::now();
        
        // Perform static WCET analysis
        let mut violations = Vec::new();
        
        // Check for timing violations
        self.check_violations(&cfg, &mut violations);
        
        // Calculate WCET using IPET (Implicit Path Enumeration Technique)
        let base_wcet_cycles = self.calculate_ipet_wcet(&cfg)?;
        
        // Apply safety margin
        let safety_factor = 1.0 + (self.safety_margin_percent as f64 / 100.0);
        let wcet_cycles = (base_wcet_cycles as f64 * safety_factor) as u64;
        
        // Convert to microseconds
        let wcet_microseconds = self.cycles_to_microseconds(wcet_cycles);
        
        // Create breakdown
        let breakdown = self.analyze_breakdown(&cfg, wcet_cycles);
        
        // Check analysis timeout
        if start_time.elapsed().as_millis() > self.max_analysis_time_ms as u128 {
            violations.push(TimingViolation {
                violation_type: ViolationType::InterruptLatency,
                location: "Analysis timeout".to_string(),
                severity: Severity::High,
                description: "WCET analysis exceeded time limit".to_string(),
                suggested_fix: "Reduce code complexity or increase analysis timeout".to_string(),
            });
        }
        
        Ok(WCETAnalysis {
            function_name: function_name.to_string(),
            wcet_cycles,
            wcet_microseconds,
            analysis_method: AnalysisMethod::StaticAnalysis,
            confidence: if violations.is_empty() { AnalysisConfidence::High } else { AnalysisConfidence::Medium },
            breakdown,
            violations,
        })
    }
    
    fn load_instruction_timings(&mut self, arch: &Architecture) {
        match arch {
            Architecture::ARMCortexM4 => {
                // ARM Cortex-M4 instruction timings
                self.instruction_timings.insert("add".to_string(), InstructionTiming {
                    opcode: "add".to_string(),
                    min_cycles: 1,
                    max_cycles: 1,
                    depends_on_data: false,
                    cache_sensitive: false,
                });
                self.instruction_timings.insert("mul".to_string(), InstructionTiming {
                    opcode: "mul".to_string(),
                    min_cycles: 1,
                    max_cycles: 1,
                    depends_on_data: false,
                    cache_sensitive: false,
                });
                self.instruction_timings.insert("ldr".to_string(), InstructionTiming {
                    opcode: "ldr".to_string(),
                    min_cycles: 2,
                    max_cycles: 8,
                    depends_on_data: true,
                    cache_sensitive: true,
                });
                self.instruction_timings.insert("str".to_string(), InstructionTiming {
                    opcode: "str".to_string(),
                    min_cycles: 2,
                    max_cycles: 8,
                    depends_on_data: true,
                    cache_sensitive: true,
                });
                self.instruction_timings.insert("b".to_string(), InstructionTiming {
                    opcode: "b".to_string(),
                    min_cycles: 1,
                    max_cycles: 3,
                    depends_on_data: false,
                    cache_sensitive: true,
                });
            },
            Architecture::RiscV32 => {
                // RISC-V instruction timings
                self.instruction_timings.insert("add".to_string(), InstructionTiming {
                    opcode: "add".to_string(),
                    min_cycles: 1,
                    max_cycles: 1,
                    depends_on_data: false,
                    cache_sensitive: false,
                });
                self.instruction_timings.insert("mul".to_string(), InstructionTiming {
                    opcode: "mul".to_string(),
                    min_cycles: 3,
                    max_cycles: 32,
                    depends_on_data: true,
                    cache_sensitive: false,
                });
                self.instruction_timings.insert("lw".to_string(), InstructionTiming {
                    opcode: "lw".to_string(),
                    min_cycles: 1,
                    max_cycles: 10,
                    depends_on_data: true,
                    cache_sensitive: true,
                });
            },
            _ => {
                // Generic timings for other architectures
                self.instruction_timings.insert("generic".to_string(), InstructionTiming {
                    opcode: "generic".to_string(),
                    min_cycles: 1,
                    max_cycles: 10,
                    depends_on_data: true,
                    cache_sensitive: true,
                });
            }
        }
    }
    
    fn check_violations(&self, cfg: &ControlFlowGraph, violations: &mut Vec<TimingViolation>) {
        for block in &cfg.basic_blocks {
            // Check for unbounded loops
            if let Some(loop_info) = &block.loop_info {
                if !loop_info.is_bounded {
                    violations.push(TimingViolation {
                        violation_type: ViolationType::UnboundedLoop,
                        location: format!("Basic block {}", block.id),
                        severity: Severity::Critical,
                        description: "Unbounded loop detected".to_string(),
                        suggested_fix: "Add loop bound annotation or refactor".to_string(),
                    });
                }
                
                if loop_info.max_iterations > 10000 {
                    violations.push(TimingViolation {
                        violation_type: ViolationType::UnboundedLoop,
                        location: format!("Basic block {}", block.id),
                        severity: Severity::High,
                        description: "Very high loop iteration count".to_string(),
                        suggested_fix: "Consider reducing loop iterations".to_string(),
                    });
                }
            }
            
            // Check for problematic instructions
            for instr in &block.instructions {
                if instr.opcode.contains("malloc") || instr.opcode.contains("free") {
                    violations.push(TimingViolation {
                        violation_type: ViolationType::DynamicAllocation,
                        location: format!("Address 0x{:x}", instr.address),
                        severity: Severity::High,
                        description: "Dynamic memory allocation detected".to_string(),
                        suggested_fix: "Use static allocation or memory pools".to_string(),
                    });
                }
                
                if instr.opcode.contains("syscall") || instr.opcode.contains("int") {
                    violations.push(TimingViolation {
                        violation_type: ViolationType::BlockingSystemCall,
                        location: format!("Address 0x{:x}", instr.address),
                        severity: Severity::Medium,
                        description: "Potential blocking system call".to_string(),
                        suggested_fix: "Use non-blocking alternatives".to_string(),
                    });
                }
            }
        }
    }
    
    fn calculate_ipet_wcet(&self, cfg: &ControlFlowGraph) -> Result<u64, String> {
        let mut total_cycles = 0u64;
        
        for block in &cfg.basic_blocks {
            let mut block_cycles = 0u64;
            
            // Calculate basic block execution time
            for instr in &block.instructions {
                let timing = self.instruction_timings.get(&instr.opcode)
                    .or_else(|| self.instruction_timings.get("generic"))
                    .ok_or_else(|| format!("Unknown instruction: {}", instr.opcode))?;
                
                // Use worst-case timing
                block_cycles += timing.max_cycles as u64;
                
                // Add cache miss penalty if applicable
                if timing.cache_sensitive {
                    block_cycles += self.hardware_config.cache_config.cache_miss_cycles as u64;
                }
            }
            
            // Apply loop multiplier
            if let Some(loop_info) = &block.loop_info {
                if loop_info.is_bounded {
                    block_cycles *= loop_info.max_iterations as u64;
                } else {
                    return Err("Unbounded loop in WCET calculation".to_string());
                }
            }
            
            total_cycles += block_cycles;
        }
        
        Ok(total_cycles)
    }
    
    fn analyze_breakdown(&self, cfg: &ControlFlowGraph, total_cycles: u64) -> WCETBreakdown {
        let mut computation = 0u64;
        let mut memory_access = 0u64;
        let mut cache_miss = 0u64;
        let mut pipeline_stalls = 0u64;
        
        for block in &cfg.basic_blocks {
            for instr in &block.instructions {
                if let Some(timing) = self.instruction_timings.get(&instr.opcode) {
                    if timing.cache_sensitive {
                        cache_miss += self.hardware_config.cache_config.cache_miss_cycles as u64;
                    }
                    
                    if instr.opcode.contains("ld") || instr.opcode.contains("st") {
                        memory_access += timing.max_cycles as u64;
                    } else {
                        computation += timing.max_cycles as u64;
                    }
                    
                    if timing.depends_on_data {
                        pipeline_stalls += 1; // Simplified pipeline stall estimation
                    }
                }
            }
        }
        
        WCETBreakdown {
            computation_cycles: computation,
            memory_access_cycles: memory_access,
            cache_miss_cycles: cache_miss,
            pipeline_stalls,
            interrupt_overhead: total_cycles / 20, // Estimate 5% interrupt overhead
        }
    }
    
    fn cycles_to_microseconds(&self, cycles: u64) -> u64 {
        // Convert cycles to microseconds based on CPU frequency
        (cycles * 1_000_000) / (self.hardware_config.cpu_frequency_mhz as u64 * 1_000_000)
    }
    
    pub fn validate_task_set(&self, task_set: &TaskSet, wcet_results: &[WCETAnalysis]) -> Result<(), String> {
        if task_set.tasks.len() != wcet_results.len() {
            return Err("Task set and WCET results count mismatch".to_string());
        }
        
        let mut violations = Vec::new();
        
        for (task, wcet) in task_set.tasks.iter().zip(wcet_results.iter()) {
            // Check if WCET exceeds task's specified WCET
            if wcet.wcet_microseconds > task.wcet {
                violations.push(format!(
                    "Task {} WCET violation: analyzed={} μs > specified={} μs",
                    task.id, wcet.wcet_microseconds, task.wcet
                ));
            }
            
            // Check if WCET exceeds deadline
            if wcet.wcet_microseconds > task.deadline {
                violations.push(format!(
                    "Task {} deadline violation: WCET={} μs > deadline={} μs",
                    task.id, wcet.wcet_microseconds, task.deadline
                ));
            }
            
            // Check for critical timing violations
            for violation in &wcet.violations {
                if matches!(violation.severity, Severity::Critical) {
                    violations.push(format!(
                        "Critical violation in task {}: {}",
                        task.id, violation.description
                    ));
                }
            }
        }
        
        if !violations.is_empty() {
            return Err(format!("WCET validation failed:\n{}", violations.join("\n")));
        }
        
        Ok(())
    }
}

impl fmt::Display for WCETAnalysis {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        writeln!(f, "WCET Analysis Report for '{}'", self.function_name)?;
        writeln!(f, "================================")?;
        writeln!(f, "WCET: {} cycles ({} μs)", self.wcet_cycles, self.wcet_microseconds)?;
        writeln!(f, "Method: {:?}", self.analysis_method)?;
        writeln!(f, "Confidence: {:?}", self.confidence)?;
        writeln!(f, "")?;
        writeln!(f, "Breakdown:")?;
        writeln!(f, "  Computation: {} cycles", self.breakdown.computation_cycles)?;
        writeln!(f, "  Memory Access: {} cycles", self.breakdown.memory_access_cycles)?;
        writeln!(f, "  Cache Misses: {} cycles", self.breakdown.cache_miss_cycles)?;
        writeln!(f, "  Pipeline Stalls: {} cycles", self.breakdown.pipeline_stalls)?;
        writeln!(f, "  Interrupt Overhead: {} cycles", self.breakdown.interrupt_overhead)?;
        
        if !self.violations.is_empty() {
            writeln!(f, "")?;
            writeln!(f, "Violations:")?;
            for violation in &self.violations {
                writeln!(f, "  [{:?}] {} at {}: {}", 
                        violation.severity, 
                        violation.violation_type, 
                        violation.location, 
                        violation.description)?;
            }
        }
        
        Ok(())
    }
}

// Safety certification helper functions
pub fn generate_do178c_report(analyses: &[WCETAnalysis]) -> String {
    let mut report = String::new();
    report.push_str("DO-178C Software Timing Analysis Report\n");
    report.push_str("=====================================\n\n");
    
    for analysis in analyses {
        report.push_str(&format!("Function: {}\n", analysis.function_name));
        report.push_str(&format!("WCET: {} μs\n", analysis.wcet_microseconds));
        report.push_str(&format!("Analysis Method: {:?}\n", analysis.analysis_method));
        report.push_str(&format!("Confidence Level: {:?}\n", analysis.confidence));
        
        if analysis.violations.is_empty() {
            report.push_str("Status: COMPLIANT\n");
        } else {
            report.push_str("Status: NON-COMPLIANT\n");
            for violation in &analysis.violations {
                if matches!(violation.severity, Severity::Critical | Severity::High) {
                    report.push_str(&format!("  CRITICAL: {}\n", violation.description));
                }
            }
        }
        report.push_str("\n");
    }
    
    report
}

#[cfg(test)]
mod tests {
    use super::*;
    
    fn create_test_hardware_config() -> HardwareConfig {
        HardwareConfig {
            architecture: Architecture::ARMCortexM4,
            cpu_frequency_mhz: 168,
            cache_config: CacheConfig {
                l1_instruction_kb: 16,
                l1_data_kb: 16,
                l1_associativity: 4,
                l1_line_size: 32,
                l2_kb: 0,
                cache_hit_cycles: 1,
                cache_miss_cycles: 10,
            },
            memory_config: MemoryConfig {
                ram_access_cycles: 2,
                flash_access_cycles: 5,
                dma_channels: 2,
            },
            pipeline_stages: 3,
        }
    }
    
    fn create_test_cfg() -> ControlFlowGraph {
        ControlFlowGraph {
            basic_blocks: vec![
                BasicBlock {
                    id: 0,
                    instructions: vec![
                        Instruction {
                            opcode: "add".to_string(),
                            operands: vec!["r0".to_string(), "r1".to_string()],
                            address: 0x1000,
                            size_bytes: 4,
                        },
                        Instruction {
                            opcode: "ldr".to_string(),
                            operands: vec!["r2".to_string(), "[r0]".to_string()],
                            address: 0x1004,
                            size_bytes: 4,
                        },
                    ],
                    loop_info: None,
                },
                BasicBlock {
                    id: 1,
                    instructions: vec![
                        Instruction {
                            opcode: "mul".to_string(),
                            operands: vec!["r3".to_string(), "r2".to_string()],
                            address: 0x1008,
                            size_bytes: 4,
                        },
                    ],
                    loop_info: Some(LoopInfo {
                        max_iterations: 10,
                        is_bounded: true,
                        nesting_level: 1,
                    }),
                },
            ],
            edges: vec![
                CFGEdge {
                    from: 0,
                    to: 1,
                    condition: EdgeCondition::Unconditional,
                }
            ],
            entry_block: 0,
            exit_blocks: vec![1],
        }
    }
    
    #[test]
    fn test_wcet_analyzer_creation() {
        let config = create_test_hardware_config();
        let analyzer = WCETAnalyzer::new(config);
        assert!(!analyzer.instruction_timings.is_empty());
    }
    
    #[test]
    fn test_wcet_analysis() {
        let config = create_test_hardware_config();
        let analyzer = WCETAnalyzer::new(config);
        let cfg = create_test_cfg();
        
        let result = analyzer.analyze_function(&cfg, "test_function");
        assert!(result.is_ok());
        
        let analysis = result.unwrap();
        assert_eq!(analysis.function_name, "test_function");
        assert!(analysis.wcet_microseconds > 0);
    }
    
    #[test]
    fn test_violation_detection() {
        let config = create_test_hardware_config();
        let analyzer = WCETAnalyzer::new(config);
        
        let mut cfg = create_test_cfg();
        cfg.basic_blocks[1].loop_info = Some(LoopInfo {
            max_iterations: 0,
            is_bounded: false,
            nesting_level: 1,
        });
        
        let result = analyzer.analyze_function(&cfg, "test_function");
        assert!(result.is_ok());
        
        let analysis = result.unwrap();
        assert!(!analysis.violations.is_empty());
        assert!(analysis.violations.iter().any(|v| matches!(v.violation_type, ViolationType::UnboundedLoop)));
    }
}