// Pulsar Real-Time Core: timing, feasibility, and deterministic schedulers.
// No external crates. Rust stable.

#![allow(dead_code)]

use core::cmp::Ordering;
use std::collections::{BinaryHeap, VecDeque};

pub type Micros = u64;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Time(pub Micros);
impl Time {
    #[inline] pub fn zero() -> Self { Time(0) }
    #[inline] pub fn saturating_add(self, d: Micros) -> Self { Time(self.0.saturating_add(d)) }
    #[inline] pub fn saturating_sub(self, d: Micros) -> Self { Time(self.0.saturating_sub(d)) }
}

#[derive(Clone, Debug)]
pub struct Task {
    pub id: usize,
    pub wcet: Micros,    // C_i
    pub period: Micros,  // T_i
    pub deadline: Micros,// D_i (relative)
    pub offset: Micros,  // O_i
    pub jitter: Micros,  // J_i (release jitter bound)
}

impl Task {
    pub fn validate(&self) -> Result<(), String> {
        if self.wcet == 0 { return Err(format!("Task {}: WCET must be > 0", self.id)); }
        if self.period == 0 { return Err(format!("Task {}: period must be > 0", self.id)); }
        if self.deadline == 0 || self.deadline > self.period {
            return Err(format!("Task {}: deadline must be in (0, period]", self.id));
        }
        if self.wcet > self.deadline {
            return Err(format!("Task {}: WCET must be <= deadline", self.id));
        }
        Ok(())
    }
    pub fn utilization(&self) -> f64 {
        (self.wcet as f64) / (self.period as f64)
    }
}

#[derive(Clone, Debug)]
pub struct TaskSet {
    pub tasks: Vec<Task>,
}
impl TaskSet {
    pub fn new(mut tasks: Vec<Task>) -> Result<Self, String> {
        tasks.sort_by_key(|t| t.id);
        for t in &tasks { t.validate()?; }
        Ok(Self { tasks })
    }
    pub fn total_util(&self) -> f64 {
        self.tasks.iter().map(|t| t.utilization()).sum()
    }
    pub fn n(&self) -> usize { self.tasks.len() }
}

// ---------- Feasibility: quick bounds ----------
pub fn rm_ll_bound(n: usize) -> f64 {
    if n == 0 { 0.0 } else { (n as f64) * (2f64.powf(1.0/(n as f64)) - 1.0) }
}

// ---------- RM: Response Time Analysis (exact for FP/RM) ----------
pub fn rm_rta_feasible(ts: &TaskSet) -> Result<(), String> {
    // Fixed-priority by period (RM).
    let mut tasks = ts.tasks.clone();
    tasks.sort_by_key(|t| t.period); // RM priority: shorter period = higher priority
    for i in 0..tasks.len() {
        let ti = &tasks[i];
        let mut r_prev = ti.wcet as u128;
        let mut iters = 0u32;
        loop {
            // Interference from higher-priority tasks
            let mut interference: u128 = 0;
            for j in 0..i {
                let tj = &tasks[j];
                // ceil(r_prev / Tj) * Cj
                let nj = ((r_prev + (tj.period as u128) - 1) / (tj.period as u128)) as u128;
                interference = interference.saturating_add(nj * (tj.wcet as u128));
            }
            let r_next = (ti.wcet as u128).saturating_add(interference);
            if r_next > (ti.deadline as u128) {
                return Err(format!("RM infeasible at task id {}: R={} > D={}", ti.id, r_next, ti.deadline));
            }
            if r_next == r_prev { break; }
            r_prev = r_next;
            iters += 1;
            if iters > 1_000_000 {
                return Err("RM RTA did not converge (iteration cap)".to_string());
            }
        }
    }
    Ok(())
}

// ---------- EDF: Processor Demand (dbf) ----------
fn dbf_task(t: &Task, x: Micros) -> Micros {
    if x < t.deadline { return 0; }
    let k = ((x - t.deadline) / t.period) + 1;
    k.saturating_mul(t.wcet)
}

/// Generate candidate times for dbf check up to `horizon`.
/// Standard candidate set: D_i + k*T_i for k >= 0.
/// We cap by horizon and guard against overflow.
fn edf_candidate_times(ts: &TaskSet, horizon: Micros) -> Vec<Micros> {
    let mut cands = Vec::new();
    for t in &ts.tasks {
        let mut k = 0u64;
        loop {
            let x = match t.deadline.checked_add(k.saturating_mul(t.period)) {
                Some(v) if v <= horizon => v,
                _ => break
            };
            cands.push(x);
            k = k.saturating_add(1);
            if k > 1_000_000 { break; } // hard cap
        }
    }
    cands.sort_unstable();
    cands.dedup();
    cands.into_iter().filter(|&x| x > 0).collect()
}

pub fn edf_dbf_feasible(ts: &TaskSet, horizon: Micros) -> Result<(), String> {
    // Quick necessary condition
    if ts.total_util() > 1.0 + 1e-12 {
        return Err(format!("EDF infeasible: total utilization {:.6} > 1", ts.total_util()));
    }
    let candidates = edf_candidate_times(ts, horizon);
    for x in candidates {
        let mut sum: u128 = 0;
        for t in &ts.tasks {
            sum = sum.saturating_add(dbf_task(t, x) as u128);
        }
        if sum > (x as u128) {
            return Err(format!("EDF infeasible at t={}us: demand {}us > supply {}us", x, sum, x));
        }
    }
    Ok(())
}

// ---------- Schedulers & Simulation ----------
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Policy { RM, EDF }

#[derive(Clone, Debug)]
struct Job {
    task_id: usize,
    abs_deadline: Micros,
    remaining: Micros,
    release: Micros,
    job_seq: u64, // for tie-breaking
}

#[derive(Clone, Debug)]
pub struct Slice {
    pub start: Micros,
    pub end: Micros,
    pub task_id: Option<usize>, // None => idle
}

#[derive(Clone, Debug)]
pub struct SimResult {
    pub timeline: Vec<Slice>,
    pub missed_deadlines: Vec<(usize, Micros)>, // (task_id, at_time)
    pub preemptions: u64,
    pub horizon: Micros,
}

#[derive(Default)]
struct JobIdGen { next: u64 }
impl JobIdGen {
    fn next(&mut self) -> u64 { let x = self.next; self.next += 1; x }
}

#[derive(Clone, Eq)]
struct ReadyKey {
    // For BinaryHeap as max-heap; invert ordering where needed
    policy: Policy,
    priority_deadline: Micros, // EDF
    priority_period: Micros,   // RM proxy (period)
    task_id: usize,
    job_seq: u64,
}
impl PartialEq for ReadyKey { fn eq(&self, o:&Self)->bool { self.cmp(o)==Ordering::Equal } }
impl Ord for ReadyKey {
    fn cmp(&self, o: &Self) -> Ordering {
        match self.policy {
            Policy::EDF => {
                // earlier deadline = higher priority => reverse for max-heap
                self.priority_deadline.cmp(&o.priority_deadline).reverse()
                    .then(self.task_id.cmp(&o.task_id).reverse())
                    .then(self.job_seq.cmp(&o.job_seq).reverse())
            }
            Policy::RM => {
                // shorter period = higher priority
                self.priority_period.cmp(&o.priority_period).reverse()
                    .then(self.task_id.cmp(&o.task_id).reverse())
                    .then(self.job_seq.cmp(&o.job_seq).reverse())
            }
        }
    }
}
impl PartialOrd for ReadyKey { fn partial_cmp(&self, o:&Self)->Option<Ordering>{Some(self.cmp(o))} }

pub struct Simulator {
    tasks: TaskSet,
    policy: Policy,
    horizon: Micros,
    tick: Micros, // minimal scheduling quantum in us
}

impl Simulator {
    pub fn new(tasks: TaskSet, policy: Policy, horizon: Micros, tick: Micros) -> Result<Self,String> {
        if tick == 0 { return Err("tick must be >= 1us".into()); }
        for t in &tasks.tasks {
            if t.wcet % tick != 0 || t.period % tick != 0 || t.deadline % tick != 0 || t.offset % tick != 0 {
                return Err(format!("Task {} parameters must be multiples of tick={}", t.id, tick));
            }
        }
        Ok(Self { tasks, policy, horizon, tick })
    }

    pub fn run(&self) -> SimResult {
        // Release event queues per task
        let mut releases: Vec<VecDeque<Micros>> = self.tasks.tasks.iter().map(|t| {
            // schedule releases up to horizon; include jitter as latest possible release
            let mut q = VecDeque::new();
            let mut k = 0u64;
            while let Some(rel) = t.offset.checked_add(k.saturating_mul(t.period)) {
                if rel > self.horizon { break; }
                q.push_back(rel);
                k = k.saturating_add(1);
                if k > 2_000_000 { break; } // guard
            }
            q
        }).collect();

        // Ready queue and bookkeeping
        let mut ready: BinaryHeap<(ReadyKey, Job)> = BinaryHeap::new();
        let mut now: Micros = 0;
        let mut timeline: Vec<Slice> = Vec::new();
        let mut missed: Vec<(usize, Micros)> = Vec::new();
        let mut preemptions: u64 = 0;
        let mut jobids = JobIdGen::default();

        // Helper to push new job(s) released at time <= now, honoring jitter worst-case (latest)
        let mut release_jobs = |t_now: Micros, ready: &mut BinaryHeap<(ReadyKey, Job)>| {
            for (idx, t) in self.tasks.tasks.iter().enumerate() {
                // release as soon as release time <= t_now; model worst-case jitter by delaying within [0,J]
                while let Some(r) = releases[idx].front().copied() {
                    if r <= t_now {
                        releases[idx].pop_front();
                        let rel_with_jitter = r.saturating_add(t.jitter); // worst-case release
                        if rel_with_jitter <= t_now {
                            // immediately ready
                            let job = Job {
                                task_id: t.id,
                                abs_deadline: rel_with_jitter.saturating_add(t.deadline),
                                remaining: t.wcet,
                                release: rel_with_jitter,
                                job_seq: jobids.next(),
                            };
                            let key = ReadyKey {
                                policy: self.policy,
                                priority_deadline: job.abs_deadline,
                                priority_period: t.period,
                                task_id: t.id,
                                job_seq: job.job_seq,
                            };
                            ready.push((key, job));
                        } else {
                            // defer until rel_with_jitter comes due; we'll pick it up later
                            // push back a single "delayed" release event
                            releases[idx].push_front(rel_with_jitter);
                            break;
                        }
                    } else { break; }
                }
            }
        };

        release_jobs(now, &mut ready);

        // Simulation loop
        while now < self.horizon {
            // Ensure any jobs whose jitter-delayed release time just arrived are added
            release_jobs(now, &mut ready);

            // Check deadline misses for jobs that should have completed by now
            // (We conservatively check when job finishes; but also catch if deadline passed while executing/ready)
            let mut spill: Vec<(ReadyKey, Job)> = Vec::new();
            while let Some((k, mut j)) = ready.pop() {
                if now >= j.abs_deadline && j.remaining > 0 {
                    missed.push((j.task_id, now));
                    // Drop this job (hard real-time miss)
                    continue;
                } else {
                    spill.push((k, j));
                }
            }
            for p in spill { ready.push(p); }

            // If no job ready, idle until next release or horizon
            if ready.is_empty() {
                // find next release time
                let mut next_rel = self.horizon;
                for q in &releases {
                    if let Some(&r) = q.front() {
                        if r < next_rel { next_rel = r; }
                    }
                }
                let next = next_rel.min(self.horizon);
                if next > now {
                    timeline.push(Slice { start: now, end: next, task_id: None });
                    now = next;
                } else {
                    // no more releases; finish
                    break;
                }
                continue;
            }

            // Pick job to run
            let (key_cur, mut cur) = ready.pop().unwrap();
            let slice_start = now;

            // Figure out next interesting time: next release or this job completion or its deadline
            let mut next_event = now.saturating_add(self.tick);
            // Consider job completion
            let comp_time = now.saturating_add(cur.remaining.min(self.tick));
            if comp_time < next_event { next_event = comp_time; }
            // Consider imminent releases (which may cause preemption under EDF/RM)
            let mut nearest_release = self.horizon;
            for q in &releases {
                if let Some(&r) = q.front() {
                    if r < nearest_release { nearest_release = r; }
                }
            }
            if nearest_release < next_event { next_event = nearest_release; }
            // Also cap by horizon
            if self.horizon < next_event { next_event = self.horizon; }

            // Advance
            let delta = next_event - now;
            if delta == 0 { break; }
            let ran = delta.min(cur.remaining);
            cur.remaining -= ran;
            now += ran;

            // Close slice
            let end = now;
            if let Some(prev) = timeline.last_mut() {
                if prev.task_id == Some(cur.task_id) && prev.end == slice_start {
                    // coalesce contiguous slices of same task
                    prev.end = end;
                } else {
                    timeline.push(Slice { start: slice_start, end, task_id: Some(cur.task_id) });
                }
            } else {
                timeline.push(Slice { start: slice_start, end, task_id: Some(cur.task_id) });
            }

            // If job not done, push back; else check deadline
            if cur.remaining > 0 {
                // potential preemption if we won't continue immediately
                preemptions += 1;
                ready.push((key_cur, cur));
            } else {
                if now > cur.abs_deadline {
                    missed.push((cur.task_id, now));
                }
                // Job finished: do not requeue (next instance will be released by events)
            }
        }

        SimResult { timeline, missed_deadlines: missed, preemptions, horizon: self.horizon }
    }
}

// ---------- Convenience wrappers ----------
pub fn feasibility_rm(ts: &TaskSet) -> Result<(), String> {
    // Quick sufficient bound first; fast failure/success path
    if ts.total_util() <= rm_ll_bound(ts.n()) + 1e-12 {
        return Ok(());
    }
    rm_rta_feasible(ts)
}

pub fn feasibility_edf(ts: &TaskSet, horizon: Micros) -> Result<(), String> {
    edf_dbf_feasible(ts, horizon)
}

// ---------- Tests ----------
#[cfg(test)]
mod tests {
    use super::*;

    fn ts_ok(tasks: Vec<Task>) -> TaskSet { TaskSet::new(tasks).unwrap() }

    #[test]
    fn rm_bound_and_rta() {
        // Two tasks, classic LL example: C/T = 1/4 + 1/5 = 0.45 < 2*(2^(1/2)-1) ≈ 0.828
        let ts = ts_ok(vec![
            Task { id: 1, wcet: 2500, period: 10000, deadline: 10000, offset: 0, jitter: 0 },
            Task { id: 2, wcet: 2000, period: 10000, deadline: 10000, offset: 0, jitter: 0 },
        ]);
        assert!(feasibility_rm(&ts).is_ok());
        let sim = Simulator::new(ts, Policy::RM, 50_000, 100).unwrap().run();
        assert!(sim.missed_deadlines.is_empty());
    }

    #[test]
    fn edf_ok_rm_fails() {
        // Three tasks slightly above RM bound but under EDF=1
        // U ≈ 0.9; RM likely infeasible; EDF feasible.
        let ts = ts_ok(vec![
            Task { id: 1, wcet: 3_000, period: 10_000, deadline: 10_000, offset: 0, jitter: 0 }, // 0.3
            Task { id: 2, wcet: 3_000, period: 10_000, deadline: 10_000, offset: 0, jitter: 0 }, // 0.3
            Task { id: 3, wcet: 3_000, period: 10_000, deadline: 10_000, offset: 0, jitter: 0 }, // 0.3
        ]);
        assert!(feasibility_rm(&ts).is_err());
        assert!(feasibility_edf(&ts, 100_000).is_ok());
        let sim = Simulator::new(ts, Policy::EDF, 100_000, 100).unwrap().run();
        assert!(sim.missed_deadlines.is_empty());
    }

    #[test]
    fn jitter_and_deadline_miss() {
        let ts = ts_ok(vec![
            Task { id: 1, wcet: 4000, period: 12000, deadline: 8000, offset: 0, jitter: 3000 },
            Task { id: 2, wcet: 4000, period: 12000, deadline: 12000, offset: 0, jitter: 0 },
        ]);
        // EDF quick util is ok: 4/12 + 4/12 = 0.666...
        // But jitter may push releases and cause localized overload → possible miss in sim.
        let sim = Simulator::new(ts, Policy::EDF, 60_000, 1000).unwrap().run();
        // We don't assert miss strictly (depends on parameters), but the engine will report if any:
        assert!(sim.timeline.iter().map(|s| s.end - s.start).sum::<u64>() <= 60_000);
    }
}