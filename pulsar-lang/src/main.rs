/*!
 * PULSAR Language - Main Entry Point
 * The Real-Time Systems Language
 */

mod rt;
mod ros2;
mod trajectory;
mod fusion;
mod wcet;
mod drivers;

use rt::*;

fn main() {
    println!("\n=== PULSAR Real-Time Scheduling Demo ===\n");
    
    // Example 1: Basic RM-feasible task set
    println!("Example 1: Rate Monotonic (RM) Feasible Task Set");
    println!("-" * 50);
    
    let ts1 = TaskSet::new(vec![
        Task { id: 1, wcet: 2500, period: 10000, deadline: 10000, offset: 0, jitter: 0 },
        Task { id: 2, wcet: 2000, period: 10000, deadline: 10000, offset: 0, jitter: 0 },
    ]).expect("Valid task set");
    
    println!("Tasks:");
    for t in &ts1.tasks {
        println!("  Task {}: C={} μs, T={} μs, D={} μs, U={:.3}", 
                 t.id, t.wcet, t.period, t.deadline, t.utilization());
    }
    println!("Total utilization = {:.3}", ts1.total_util());
    println!("RM bound for n={}: {:.3}", ts1.n(), rm_ll_bound(ts1.n()));
    println!("RM feasibility: {:?}", feasibility_rm(&ts1));
    println!("EDF feasibility (100ms): {:?}", feasibility_edf(&ts1, 100_000));
    
    // Run RM simulation
    let sim1 = Simulator::new(ts1.clone(), Policy::RM, 30_000, 100).unwrap().run();
    println!("\nRM Simulation (30ms horizon):");
    println!("  Missed deadlines: {:?}", sim1.missed_deadlines);
    println!("  Preemptions: {}", sim1.preemptions);
    println!("  Timeline (first 5 slices):");
    for s in sim1.timeline.iter().take(5) {
        println!("    [{:5}, {:5}) -> Task {:?}", s.start, s.end, s.task_id);
    }
    
    // Example 2: EDF-feasible but RM-infeasible
    println!("\n\nExample 2: EDF Feasible, RM Infeasible");
    println!("-" * 50);
    
    let ts2 = TaskSet::new(vec![
        Task { id: 1, wcet: 3_000, period: 10_000, deadline: 10_000, offset: 0, jitter: 0 },
        Task { id: 2, wcet: 3_000, period: 10_000, deadline: 10_000, offset: 0, jitter: 0 },
        Task { id: 3, wcet: 3_000, period: 10_000, deadline: 10_000, offset: 0, jitter: 0 },
    ]).expect("Valid task set");
    
    println!("Tasks:");
    for t in &ts2.tasks {
        println!("  Task {}: C={} μs, T={} μs, D={} μs, U={:.3}", 
                 t.id, t.wcet, t.period, t.deadline, t.utilization());
    }
    println!("Total utilization = {:.3}", ts2.total_util());
    println!("RM bound for n={}: {:.3}", ts2.n(), rm_ll_bound(ts2.n()));
    println!("RM feasibility: {:?}", feasibility_rm(&ts2));
    println!("EDF feasibility (100ms): {:?}", feasibility_edf(&ts2, 100_000));
    
    // Run EDF simulation
    let sim2 = Simulator::new(ts2, Policy::EDF, 30_000, 100).unwrap().run();
    println!("\nEDF Simulation (30ms horizon):");
    println!("  Missed deadlines: {:?}", sim2.missed_deadlines);
    println!("  Preemptions: {}", sim2.preemptions);
    println!("  Timeline (first 5 slices):");
    for s in sim2.timeline.iter().take(5) {
        println!("    [{:5}, {:5}) -> Task {:?}", s.start, s.end, s.task_id);
    }
    
    // Example 3: Task set with jitter
    println!("\n\nExample 3: Task Set with Release Jitter");
    println!("-" * 50);
    
    let ts3 = TaskSet::new(vec![
        Task { id: 1, wcet: 2000, period: 8000, deadline: 6000, offset: 0, jitter: 1000 },
        Task { id: 2, wcet: 3000, period: 12000, deadline: 12000, offset: 0, jitter: 500 },
    ]).expect("Valid task set");
    
    println!("Tasks:");
    for t in &ts3.tasks {
        println!("  Task {}: C={} μs, T={} μs, D={} μs, J={} μs, U={:.3}", 
                 t.id, t.wcet, t.period, t.deadline, t.jitter, t.utilization());
    }
    println!("Total utilization = {:.3}", ts3.total_util());
    
    let sim3 = Simulator::new(ts3, Policy::EDF, 50_000, 100).unwrap().run();
    println!("\nEDF Simulation with Jitter (50ms horizon):");
    println!("  Missed deadlines: {:?}", sim3.missed_deadlines);
    println!("  Preemptions: {}", sim3.preemptions);
    
    println!("\n=== Demo Complete ===\n");
}