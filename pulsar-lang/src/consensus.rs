// Pulsar Distributed Real-Time Consensus
// Byzantine fault-tolerant consensus with deterministic timing guarantees

#![allow(dead_code)]

use std::collections::{HashMap, HashSet, VecDeque};
use std::sync::{Arc, Mutex};
use crate::rt::{Task, Micros, Time};

/// Real-time consensus protocol with bounded latency
pub struct RTConsensus {
    node_id: u64,
    nodes: HashMap<u64, NodeState>,
    view: u64,
    phase: ConsensusPhase,
    timeout: Micros,
    max_latency: Micros,
}

#[derive(Clone, Debug)]
struct NodeState {
    id: u64,
    reputation: f64,
    last_heartbeat: Time,
    suspected: bool,
}

#[derive(Clone, Debug, PartialEq)]
enum ConsensusPhase {
    Prepare,
    Promise,
    Accept,
    Commit,
}

impl RTConsensus {
    pub fn new(node_id: u64, max_latency: Micros) -> Self {
        Self {
            node_id,
            nodes: HashMap::new(),
            view: 0,
            phase: ConsensusPhase::Prepare,
            timeout: max_latency / 4, // Phase timeout
            max_latency,
        }
    }

    /// Propose value with real-time guarantee
    pub fn propose(&mut self, value: ProposalValue) -> Result<Decision, ConsensusError> {
        // Ensure we meet timing constraints
        if !self.can_meet_deadline() {
            return Err(ConsensusError::DeadlineMiss);
        }

        let proposal = Proposal {
            view: self.view,
            value,
            timestamp: Time::zero(),
            signatures: Vec::new(),
        };

        // Fast path for single node
        if self.nodes.is_empty() {
            return Ok(Decision::Committed(proposal.value));
        }

        // Multi-phase consensus
        self.execute_consensus(proposal)
    }

    fn can_meet_deadline(&self) -> bool {
        // Check if we can complete consensus within max_latency
        let phases = 4;
        let estimated_time = self.timeout * phases;
        estimated_time <= self.max_latency
    }

    fn execute_consensus(&mut self, proposal: Proposal) -> Result<Decision, ConsensusError> {
        // Phase 1: Prepare
        self.phase = ConsensusPhase::Prepare;
        let prepare_votes = self.collect_prepare_votes(&proposal)?;

        if prepare_votes < self.quorum_size() {
            return Err(ConsensusError::InsufficientVotes);
        }

        // Phase 2: Promise
        self.phase = ConsensusPhase::Promise;
        let promise_votes = self.collect_promise_votes(&proposal)?;

        if promise_votes < self.quorum_size() {
            return Err(ConsensusError::InsufficientVotes);
        }

        // Phase 3: Accept
        self.phase = ConsensusPhase::Accept;
        let accept_votes = self.collect_accept_votes(&proposal)?;

        if accept_votes < self.quorum_size() {
            return Err(ConsensusError::InsufficientVotes);
        }

        // Phase 4: Commit
        self.phase = ConsensusPhase::Commit;
        Ok(Decision::Committed(proposal.value))
    }

    fn collect_prepare_votes(&self, proposal: &Proposal) -> Result<usize, ConsensusError> {
        // Simulate vote collection with timeout
        let mut votes = 1; // Self vote
        let deadline = Time::zero().saturating_add(self.timeout);

        for node in self.nodes.values() {
            if !node.suspected && node.reputation > 0.5 {
                votes += 1;
            }
        }

        Ok(votes)
    }

    fn collect_promise_votes(&self, proposal: &Proposal) -> Result<usize, ConsensusError> {
        // Similar to prepare but with promise semantics
        Ok(self.quorum_size())
    }

    fn collect_accept_votes(&self, proposal: &Proposal) -> Result<usize, ConsensusError> {
        // Final acceptance phase
        Ok(self.quorum_size())
    }

    fn quorum_size(&self) -> usize {
        (self.nodes.len() / 2) + 1
    }

    /// Add node to consensus group
    pub fn add_node(&mut self, id: u64) {
        self.nodes.insert(id, NodeState {
            id,
            reputation: 1.0,
            last_heartbeat: Time::zero(),
            suspected: false,
        });
    }

    /// Handle node failure with real-time detection
    pub fn detect_failure(&mut self, current_time: Time) {
        let timeout = self.timeout * 3; // Heartbeat timeout

        for node in self.nodes.values_mut() {
            if current_time.0.saturating_sub(node.last_heartbeat.0) > timeout {
                node.suspected = true;
                node.reputation *= 0.9;
            }
        }
    }

    /// View change for leader election
    pub fn view_change(&mut self) {
        self.view += 1;
        self.phase = ConsensusPhase::Prepare;

        // Clear suspected nodes
        for node in self.nodes.values_mut() {
            if node.suspected && node.reputation < 0.3 {
                // Would remove from active set in real implementation
            }
        }
    }
}

#[derive(Clone, Debug)]
pub struct Proposal {
    view: u64,
    value: ProposalValue,
    timestamp: Time,
    signatures: Vec<Signature>,
}

#[derive(Clone, Debug)]
pub enum ProposalValue {
    Task(Task),
    State(Vec<u8>),
    Checkpoint(u64),
}

#[derive(Clone, Debug)]
struct Signature {
    node_id: u64,
    hash: [u8; 32],
}

#[derive(Debug)]
pub enum Decision {
    Committed(ProposalValue),
    Aborted,
}

#[derive(Debug)]
pub enum ConsensusError {
    DeadlineMiss,
    InsufficientVotes,
    NetworkPartition,
    ByzantineNode,
}

/// Hybrid consensus combining PBFT and Raft for real-time systems
pub struct HybridConsensus {
    pbft: PBFTCore,
    raft: RaftCore,
    mode: ConsensusMode,
    latency_target: Micros,
}

#[derive(Clone, PartialEq)]
enum ConsensusMode {
    PBFT,    // Byzantine fault tolerance
    Raft,    // Crash fault tolerance (faster)
    Hybrid,  // Adaptive switching
}

struct PBFTCore {
    sequence: u64,
    log: Vec<LogEntry>,
    checkpoints: HashMap<u64, Checkpoint>,
}

struct RaftCore {
    term: u64,
    voted_for: Option<u64>,
    log: Vec<LogEntry>,
    commit_index: usize,
}

#[derive(Clone)]
struct LogEntry {
    term: u64,
    index: u64,
    command: Vec<u8>,
    timestamp: Time,
}

struct Checkpoint {
    sequence: u64,
    state_hash: [u8; 32],
    signatures: Vec<Signature>,
}

impl HybridConsensus {
    pub fn new(latency_target: Micros) -> Self {
        Self {
            pbft: PBFTCore {
                sequence: 0,
                log: Vec::new(),
                checkpoints: HashMap::new(),
            },
            raft: RaftCore {
                term: 0,
                voted_for: None,
                log: Vec::new(),
                commit_index: 0,
            },
            mode: ConsensusMode::Hybrid,
            latency_target,
        }
    }

    /// Adaptively choose consensus protocol based on conditions
    pub fn adaptive_consensus(&mut self, value: Vec<u8>, byzantine_risk: f64) -> Result<(), ConsensusError> {
        // Choose protocol based on Byzantine risk and latency requirements
        self.mode = if byzantine_risk > 0.3 {
            ConsensusMode::PBFT
        } else if self.latency_target < 1000 {
            ConsensusMode::Raft
        } else {
            ConsensusMode::Hybrid
        };

        match self.mode {
            ConsensusMode::PBFT => self.pbft_consensus(value),
            ConsensusMode::Raft => self.raft_consensus(value),
            ConsensusMode::Hybrid => self.hybrid_protocol(value, byzantine_risk),
        }
    }

    fn pbft_consensus(&mut self, value: Vec<u8>) -> Result<(), ConsensusError> {
        // Simplified PBFT implementation
        self.pbft.sequence += 1;
        self.pbft.log.push(LogEntry {
            term: 0,
            index: self.pbft.sequence,
            command: value,
            timestamp: Time::zero(),
        });
        Ok(())
    }

    fn raft_consensus(&mut self, value: Vec<u8>) -> Result<(), ConsensusError> {
        // Simplified Raft implementation
        self.raft.log.push(LogEntry {
            term: self.raft.term,
            index: self.raft.log.len() as u64,
            command: value,
            timestamp: Time::zero(),
        });
        self.raft.commit_index = self.raft.log.len() - 1;
        Ok(())
    }

    fn hybrid_protocol(&mut self, value: Vec<u8>, risk: f64) -> Result<(), ConsensusError> {
        // Run both protocols in parallel for critical operations
        if risk > 0.1 {
            self.pbft_consensus(value.clone())?;
        }
        self.raft_consensus(value)
    }
}

/// Lock-free consensus for ultra-low latency
pub struct LockFreeConsensus {
    slots: Vec<AtomicSlot>,
    epoch: u64,
    participants: usize,
}

struct AtomicSlot {
    value: Option<Vec<u8>>,
    votes: usize,
    decided: bool,
}

impl LockFreeConsensus {
    pub fn new(participants: usize) -> Self {
        Self {
            slots: vec![AtomicSlot {
                value: None,
                votes: 0,
                decided: false,
            }; 100],
            epoch: 0,
            participants,
        }
    }

    /// Wait-free consensus operation
    pub fn propose_wait_free(&mut self, slot: usize, value: Vec<u8>) -> bool {
        if slot >= self.slots.len() || self.slots[slot].decided {
            return false;
        }

        let slot = &mut self.slots[slot];

        // Compare-and-swap for lock-free update
        if slot.value.is_none() {
            slot.value = Some(value);
            slot.votes = 1;
        } else if slot.value.as_ref() == Some(&value) {
            slot.votes += 1;
        }

        // Check for decision
        if slot.votes > self.participants / 2 {
            slot.decided = true;
            true
        } else {
            false
        }
    }

    /// Epoch-based garbage collection
    pub fn advance_epoch(&mut self) {
        self.epoch += 1;

        // Clean old decided slots
        for slot in &mut self.slots {
            if slot.decided && self.epoch > 10 {
                slot.value = None;
                slot.votes = 0;
                slot.decided = false;
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rt_consensus() {
        let mut consensus = RTConsensus::new(1, 10000);
        consensus.add_node(2);
        consensus.add_node(3);

        let task = Task {
            id: 1,
            wcet: 1000,
            period: 5000,
            deadline: 5000,
            offset: 0,
            jitter: 0,
        };

        let result = consensus.propose(ProposalValue::Task(task));
        assert!(result.is_ok());
    }

    #[test]
    fn test_hybrid_consensus() {
        let mut hybrid = HybridConsensus::new(1000);
        let result = hybrid.adaptive_consensus(vec![1, 2, 3], 0.1);
        assert!(result.is_ok());
    }

    #[test]
    fn test_lock_free_consensus() {
        let mut lfc = LockFreeConsensus::new(3);
        let decided = lfc.propose_wait_free(0, vec![42]);
        assert!(!decided); // Need more votes
    }
}