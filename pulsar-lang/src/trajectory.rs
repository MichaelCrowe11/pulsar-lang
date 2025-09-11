// Pulsar Trajectory Generation Library
// Real-time motion planning and trajectory optimization for robotics

use crate::rt::{Micros, Time};
use std::f64::consts::PI;

// Trajectory point with position, velocity, acceleration, and timing
#[derive(Clone, Debug)]
pub struct TrajectoryPoint {
    pub position: Vec<f64>,
    pub velocity: Vec<f64>,
    pub acceleration: Vec<f64>,
    pub jerk: Option<Vec<f64>>,
    pub time_us: Micros,
}

// Constraints for trajectory generation
#[derive(Clone, Debug)]
pub struct Constraints {
    pub max_velocity: Vec<f64>,
    pub max_acceleration: Vec<f64>,
    pub max_jerk: Option<Vec<f64>>,
    pub max_torque: Option<Vec<f64>>,
}

// Trajectory types
#[derive(Clone, Debug)]
pub enum TrajectoryType {
    JointSpace,      // Joint angles
    Cartesian,       // End-effector pose
    DualArm,         // Coordinated dual-arm
    MobileBase,      // Mobile robot base
}

// Main trajectory structure
pub struct Trajectory {
    points: Vec<TrajectoryPoint>,
    trajectory_type: TrajectoryType,
    duration_us: Micros,
    dimension: usize,
}

impl Trajectory {
    pub fn new(trajectory_type: TrajectoryType, dimension: usize) -> Self {
        Self {
            points: Vec::new(),
            trajectory_type,
            duration_us: 0,
            dimension,
        }
    }

    pub fn add_point(&mut self, point: TrajectoryPoint) {
        if !self.points.is_empty() {
            self.duration_us = point.time_us;
        }
        self.points.push(point);
    }

    pub fn sample_at(&self, time_us: Micros) -> Option<TrajectoryPoint> {
        if self.points.is_empty() {
            return None;
        }

        // Binary search for the correct segment
        let idx = self.points.binary_search_by_key(&time_us, |p| p.time_us);
        
        match idx {
            Ok(i) => Some(self.points[i].clone()),
            Err(i) if i == 0 => Some(self.points[0].clone()),
            Err(i) if i >= self.points.len() => Some(self.points.last()?.clone()),
            Err(i) => {
                // Interpolate between points[i-1] and points[i]
                let p1 = &self.points[i - 1];
                let p2 = &self.points[i];
                let t = (time_us - p1.time_us) as f64 / (p2.time_us - p1.time_us) as f64;
                Some(Self::interpolate(p1, p2, t))
            }
        }
    }

    fn interpolate(p1: &TrajectoryPoint, p2: &TrajectoryPoint, t: f64) -> TrajectoryPoint {
        let interp = |v1: &[f64], v2: &[f64]| -> Vec<f64> {
            v1.iter()
                .zip(v2.iter())
                .map(|(a, b)| a + t * (b - a))
                .collect()
        };

        TrajectoryPoint {
            position: interp(&p1.position, &p2.position),
            velocity: interp(&p1.velocity, &p2.velocity),
            acceleration: interp(&p1.acceleration, &p2.acceleration),
            jerk: match (&p1.jerk, &p2.jerk) {
                (Some(j1), Some(j2)) => Some(interp(j1, j2)),
                _ => None,
            },
            time_us: p1.time_us + ((t * (p2.time_us - p1.time_us) as f64) as u64),
        }
    }

    pub fn is_valid(&self, constraints: &Constraints) -> Result<(), String> {
        for (i, point) in self.points.iter().enumerate() {
            // Check velocity constraints
            for (j, &v) in point.velocity.iter().enumerate() {
                if v.abs() > constraints.max_velocity[j] {
                    return Err(format!(
                        "Velocity constraint violated at point {}: |{}| > {}",
                        i, v, constraints.max_velocity[j]
                    ));
                }
            }

            // Check acceleration constraints
            for (j, &a) in point.acceleration.iter().enumerate() {
                if a.abs() > constraints.max_acceleration[j] {
                    return Err(format!(
                        "Acceleration constraint violated at point {}: |{}| > {}",
                        i, a, constraints.max_acceleration[j]
                    ));
                }
            }

            // Check jerk constraints if provided
            if let (Some(jerk), Some(max_jerk)) = (&point.jerk, &constraints.max_jerk) {
                for (j, &jrk) in jerk.iter().enumerate() {
                    if jrk.abs() > max_jerk[j] {
                        return Err(format!(
                            "Jerk constraint violated at point {}: |{}| > {}",
                            i, jrk, max_jerk[j]
                        ));
                    }
                }
            }
        }
        Ok(())
    }
}

// Trapezoidal velocity profile generator
pub struct TrapezoidalProfile {
    pub max_vel: f64,
    pub max_acc: f64,
}

impl TrapezoidalProfile {
    pub fn new(max_vel: f64, max_acc: f64) -> Self {
        Self { max_vel, max_acc }
    }

    pub fn generate(
        &self,
        start_pos: f64,
        end_pos: f64,
        sample_period_us: Micros,
    ) -> Trajectory {
        let mut trajectory = Trajectory::new(TrajectoryType::JointSpace, 1);
        
        let distance = (end_pos - start_pos).abs();
        let sign = if end_pos > start_pos { 1.0 } else { -1.0 };
        
        // Calculate phase durations
        let t_acc = self.max_vel / self.max_acc;
        let d_acc = 0.5 * self.max_acc * t_acc * t_acc;
        
        let (t_acc, t_vel, t_dec) = if 2.0 * d_acc > distance {
            // Triangle profile (no constant velocity phase)
            let t_acc = (distance / self.max_acc).sqrt();
            (t_acc, 0.0, t_acc)
        } else {
            // Trapezoidal profile
            let d_vel = distance - 2.0 * d_acc;
            let t_vel = d_vel / self.max_vel;
            (t_acc, t_vel, t_acc)
        };
        
        let total_time = t_acc + t_vel + t_dec;
        let samples = ((total_time * 1e6) / sample_period_us as f64) as usize + 1;
        
        for i in 0..=samples {
            let t = (i as f64) * (sample_period_us as f64) / 1e6;
            let time_us = (t * 1e6) as Micros;
            
            let (pos, vel, acc) = if t <= t_acc {
                // Acceleration phase
                let pos = start_pos + sign * 0.5 * self.max_acc * t * t;
                let vel = sign * self.max_acc * t;
                let acc = sign * self.max_acc;
                (pos, vel, acc)
            } else if t <= t_acc + t_vel {
                // Constant velocity phase
                let t_rel = t - t_acc;
                let pos = start_pos + sign * (d_acc + self.max_vel * t_rel);
                let vel = sign * self.max_vel;
                let acc = 0.0;
                (pos, vel, acc)
            } else if t <= total_time {
                // Deceleration phase
                let t_rel = t - t_acc - t_vel;
                let t_rem = t_dec - t_rel;
                let pos = end_pos - sign * 0.5 * self.max_acc * t_rem * t_rem;
                let vel = sign * self.max_acc * t_rem;
                let acc = -sign * self.max_acc;
                (pos, vel, acc)
            } else {
                // End position
                (end_pos, 0.0, 0.0)
            };
            
            trajectory.add_point(TrajectoryPoint {
                position: vec![pos],
                velocity: vec![vel],
                acceleration: vec![acc],
                jerk: None,
                time_us,
            });
        }
        
        trajectory
    }
}

// S-Curve (7-segment) profile generator for smoother motion
pub struct SCurveProfile {
    pub max_vel: f64,
    pub max_acc: f64,
    pub max_jerk: f64,
}

impl SCurveProfile {
    pub fn new(max_vel: f64, max_acc: f64, max_jerk: f64) -> Self {
        Self {
            max_vel,
            max_acc,
            max_jerk,
        }
    }

    pub fn generate(
        &self,
        start_pos: f64,
        end_pos: f64,
        sample_period_us: Micros,
    ) -> Trajectory {
        let mut trajectory = Trajectory::new(TrajectoryType::JointSpace, 1);
        
        // Simplified S-curve implementation
        // In production, this would include all 7 segments
        let distance = (end_pos - start_pos).abs();
        let sign = if end_pos > start_pos { 1.0 } else { -1.0 };
        
        // Time to reach max acceleration
        let t_j = self.max_acc / self.max_jerk;
        
        // Time at constant acceleration
        let t_a = self.max_vel / self.max_acc - t_j;
        
        // Calculate total time and sample
        let total_time = if t_a > 0.0 {
            // Full S-curve with all phases
            2.0 * t_j + t_a + distance / self.max_vel
        } else {
            // Reduced S-curve
            4.0 * (distance / (2.0 * self.max_jerk)).powf(1.0 / 3.0)
        };
        
        let samples = ((total_time * 1e6) / sample_period_us as f64) as usize + 1;
        
        for i in 0..=samples {
            let t = (i as f64) * (sample_period_us as f64) / 1e6;
            let time_us = (t * 1e6) as Micros;
            
            // Simplified calculation for demo
            let progress = t / total_time;
            let smooth = 0.5 * (1.0 - (progress * PI).cos());
            
            let pos = start_pos + sign * distance * smooth;
            let vel = if progress > 0.0 && progress < 1.0 {
                sign * self.max_vel * (progress * PI).sin()
            } else {
                0.0
            };
            let acc = if progress > 0.0 && progress < 1.0 {
                sign * self.max_acc * (progress * 2.0 * PI).cos()
            } else {
                0.0
            };
            let jerk = if progress > 0.0 && progress < 1.0 {
                -sign * self.max_jerk * (progress * 2.0 * PI).sin()
            } else {
                0.0
            };
            
            trajectory.add_point(TrajectoryPoint {
                position: vec![pos],
                velocity: vec![vel],
                acceleration: vec![acc],
                jerk: Some(vec![jerk]),
                time_us,
            });
        }
        
        trajectory
    }
}

// Cubic spline trajectory generator
pub struct CubicSpline {
    waypoints: Vec<Vec<f64>>,
    times: Vec<f64>,
}

impl CubicSpline {
    pub fn new() -> Self {
        Self {
            waypoints: Vec::new(),
            times: Vec::new(),
        }
    }

    pub fn add_waypoint(&mut self, position: Vec<f64>, time: f64) {
        self.waypoints.push(position);
        self.times.push(time);
    }

    pub fn generate(&self, sample_period_us: Micros) -> Result<Trajectory, String> {
        if self.waypoints.len() < 2 {
            return Err("Need at least 2 waypoints".into());
        }

        let dim = self.waypoints[0].len();
        let mut trajectory = Trajectory::new(TrajectoryType::JointSpace, dim);

        // For each dimension, compute cubic spline coefficients
        for d in 0..dim {
            let points: Vec<f64> = self.waypoints.iter().map(|w| w[d]).collect();
            
            // Compute spline coefficients (simplified)
            // In production, use proper cubic spline interpolation
            for i in 0..self.waypoints.len() - 1 {
                let t0 = self.times[i];
                let t1 = self.times[i + 1];
                let p0 = points[i];
                let p1 = points[i + 1];
                
                let samples = ((t1 - t0) * 1e6 / sample_period_us as f64) as usize;
                
                for j in 0..=samples {
                    let t = t0 + (j as f64) * (t1 - t0) / (samples as f64);
                    let s = (t - t0) / (t1 - t0);
                    
                    // Cubic Hermite spline
                    let h00 = 2.0 * s * s * s - 3.0 * s * s + 1.0;
                    let h10 = s * s * s - 2.0 * s * s + s;
                    let h01 = -2.0 * s * s * s + 3.0 * s * s;
                    let h11 = s * s * s - s * s;
                    
                    let pos = h00 * p0 + h01 * p1;
                    let vel = (p1 - p0) / (t1 - t0);
                    
                    if d == 0 {
                        trajectory.add_point(TrajectoryPoint {
                            position: vec![pos],
                            velocity: vec![vel],
                            acceleration: vec![0.0],
                            jerk: None,
                            time_us: (t * 1e6) as Micros,
                        });
                    } else {
                        if let Some(point) = trajectory.points.last_mut() {
                            point.position.push(pos);
                            point.velocity.push(vel);
                            point.acceleration.push(0.0);
                        }
                    }
                }
            }
        }

        Ok(trajectory)
    }
}

// Minimum jerk trajectory for smooth human-like motion
pub struct MinimumJerkTrajectory;

impl MinimumJerkTrajectory {
    pub fn generate(
        start: Vec<f64>,
        end: Vec<f64>,
        duration_s: f64,
        sample_period_us: Micros,
    ) -> Result<Trajectory, String> {
        if start.len() != end.len() {
            return Err("Start and end dimensions must match".into());
        }

        let dim = start.len();
        let mut trajectory = Trajectory::new(TrajectoryType::Cartesian, dim);
        let samples = ((duration_s * 1e6) / sample_period_us as f64) as usize + 1;

        for i in 0..=samples {
            let t = (i as f64) * (sample_period_us as f64) / 1e6;
            let tau = t / duration_s;
            
            // Minimum jerk polynomial coefficients
            let pos_coeff = 10.0 * tau.powi(3) - 15.0 * tau.powi(4) + 6.0 * tau.powi(5);
            let vel_coeff = (30.0 * tau.powi(2) - 60.0 * tau.powi(3) + 30.0 * tau.powi(4)) / duration_s;
            let acc_coeff = (60.0 * tau - 180.0 * tau.powi(2) + 120.0 * tau.powi(3)) / (duration_s * duration_s);
            let jerk_coeff = (60.0 - 360.0 * tau + 360.0 * tau.powi(2)) / (duration_s * duration_s * duration_s);

            let mut position = Vec::with_capacity(dim);
            let mut velocity = Vec::with_capacity(dim);
            let mut acceleration = Vec::with_capacity(dim);
            let mut jerk = Vec::with_capacity(dim);

            for d in 0..dim {
                let delta = end[d] - start[d];
                position.push(start[d] + delta * pos_coeff);
                velocity.push(delta * vel_coeff);
                acceleration.push(delta * acc_coeff);
                jerk.push(delta * jerk_coeff);
            }

            trajectory.add_point(TrajectoryPoint {
                position,
                velocity,
                acceleration,
                jerk: Some(jerk),
                time_us: (t * 1e6) as Micros,
            });
        }

        Ok(trajectory)
    }
}

// Time-optimal trajectory under constraints
pub struct TimeOptimalTrajectory {
    constraints: Constraints,
}

impl TimeOptimalTrajectory {
    pub fn new(constraints: Constraints) -> Self {
        Self { constraints }
    }

    pub fn generate(
        &self,
        waypoints: Vec<Vec<f64>>,
        sample_period_us: Micros,
    ) -> Result<Trajectory, String> {
        // Simplified time-optimal trajectory
        // In production, use numerical optimization
        
        if waypoints.len() < 2 {
            return Err("Need at least 2 waypoints".into());
        }

        let dim = waypoints[0].len();
        let mut trajectory = Trajectory::new(TrajectoryType::JointSpace, dim);
        
        let mut current_time_us = 0u64;
        
        for i in 0..waypoints.len() - 1 {
            let start = &waypoints[i];
            let end = &waypoints[i + 1];
            
            // Calculate time-optimal duration for this segment
            let mut segment_time = 0.0;
            for d in 0..dim {
                let distance = (end[d] - start[d]).abs();
                let t_vel = distance / self.constraints.max_velocity[d];
                let t_acc = (2.0 * distance / self.constraints.max_acceleration[d]).sqrt();
                segment_time = segment_time.max(t_vel.max(t_acc));
            }
            
            let samples = ((segment_time * 1e6) / sample_period_us as f64) as usize + 1;
            
            for j in 0..=samples {
                let t = (j as f64) / (samples as f64);
                let smooth = 0.5 * (1.0 - (t * PI).cos()); // Smooth interpolation
                
                let mut position = Vec::with_capacity(dim);
                let mut velocity = Vec::with_capacity(dim);
                let mut acceleration = Vec::with_capacity(dim);
                
                for d in 0..dim {
                    let pos = start[d] + (end[d] - start[d]) * smooth;
                    let vel = if t > 0.0 && t < 1.0 {
                        (end[d] - start[d]) * PI * (t * PI).sin() / (2.0 * segment_time)
                    } else {
                        0.0
                    };
                    let acc = if t > 0.0 && t < 1.0 {
                        (end[d] - start[d]) * PI * PI * (t * PI).cos() / (2.0 * segment_time * segment_time)
                    } else {
                        0.0
                    };
                    
                    position.push(pos);
                    velocity.push(vel);
                    acceleration.push(acc);
                }
                
                trajectory.add_point(TrajectoryPoint {
                    position,
                    velocity,
                    acceleration,
                    jerk: None,
                    time_us: current_time_us + ((j as f64) * (segment_time * 1e6) / (samples as f64)) as u64,
                });
            }
            
            current_time_us += (segment_time * 1e6) as u64;
        }
        
        // Validate against constraints
        trajectory.is_valid(&self.constraints)?;
        
        Ok(trajectory)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_trapezoidal_profile() {
        let profile = TrapezoidalProfile::new(1.0, 0.5);
        let trajectory = profile.generate(0.0, 10.0, 1000);
        
        // Check start and end positions
        assert_eq!(trajectory.points.first().unwrap().position[0], 0.0);
        assert!((trajectory.points.last().unwrap().position[0] - 10.0).abs() < 0.01);
        
        // Check velocity and acceleration bounds
        for point in &trajectory.points {
            assert!(point.velocity[0].abs() <= 1.01); // Small tolerance
            assert!(point.acceleration[0].abs() <= 0.51);
        }
    }
    
    #[test]
    fn test_minimum_jerk() {
        let start = vec![0.0, 0.0, 0.0];
        let end = vec![1.0, 2.0, 3.0];
        let trajectory = MinimumJerkTrajectory::generate(start.clone(), end.clone(), 2.0, 10000).unwrap();
        
        // Check dimensions
        assert_eq!(trajectory.dimension, 3);
        
        // Check boundary conditions
        let first = trajectory.points.first().unwrap();
        let last = trajectory.points.last().unwrap();
        
        for d in 0..3 {
            assert!((first.position[d] - start[d]).abs() < 0.01);
            assert!((last.position[d] - end[d]).abs() < 0.01);
            assert!(first.velocity[d].abs() < 0.01);
            assert!(last.velocity[d].abs() < 0.01);
        }
    }
    
    #[test]
    fn test_trajectory_sampling() {
        let mut trajectory = Trajectory::new(TrajectoryType::JointSpace, 1);
        trajectory.add_point(TrajectoryPoint {
            position: vec![0.0],
            velocity: vec![0.0],
            acceleration: vec![0.0],
            jerk: None,
            time_us: 0,
        });
        trajectory.add_point(TrajectoryPoint {
            position: vec![1.0],
            velocity: vec![1.0],
            acceleration: vec![0.0],
            jerk: None,
            time_us: 1000,
        });
        
        // Test exact point
        let p0 = trajectory.sample_at(0).unwrap();
        assert_eq!(p0.position[0], 0.0);
        
        // Test interpolation
        let p_mid = trajectory.sample_at(500).unwrap();
        assert!((p_mid.position[0] - 0.5).abs() < 0.01);
    }
}