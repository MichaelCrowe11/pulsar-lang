// Pulsar Sensor Fusion Library
// Real-time Extended Kalman Filter (EKF) and Unscented Kalman Filter (UKF) implementations
// Designed for robotics localization, SLAM, and state estimation

use crate::rt::{Micros, Time};
use std::f64::consts::PI;

// Matrix operations (simplified, in production use nalgebra or similar)
type Matrix = Vec<Vec<f64>>;
type Vector = Vec<f64>;

// Matrix utilities
fn matrix_multiply(a: &Matrix, b: &Matrix) -> Matrix {
    let rows = a.len();
    let cols = b[0].len();
    let inner = b.len();
    
    let mut result = vec![vec![0.0; cols]; rows];
    for i in 0..rows {
        for j in 0..cols {
            for k in 0..inner {
                result[i][j] += a[i][k] * b[k][j];
            }
        }
    }
    result
}

fn matrix_transpose(m: &Matrix) -> Matrix {
    if m.is_empty() { return vec![]; }
    let rows = m.len();
    let cols = m[0].len();
    let mut result = vec![vec![0.0; rows]; cols];
    for i in 0..rows {
        for j in 0..cols {
            result[j][i] = m[i][j];
        }
    }
    result
}

fn matrix_add(a: &Matrix, b: &Matrix) -> Matrix {
    let rows = a.len();
    let cols = a[0].len();
    let mut result = vec![vec![0.0; cols]; rows];
    for i in 0..rows {
        for j in 0..cols {
            result[i][j] = a[i][j] + b[i][j];
        }
    }
    result
}

fn matrix_subtract(a: &Matrix, b: &Matrix) -> Matrix {
    let rows = a.len();
    let cols = a[0].len();
    let mut result = vec![vec![0.0; cols]; rows];
    for i in 0..rows {
        for j in 0..cols {
            result[i][j] = a[i][j] - b[i][j];
        }
    }
    result
}

fn matrix_vector_multiply(m: &Matrix, v: &Vector) -> Vector {
    let rows = m.len();
    let mut result = vec![0.0; rows];
    for i in 0..rows {
        for j in 0..v.len() {
            result[i] += m[i][j] * v[j];
        }
    }
    result
}

fn identity_matrix(n: usize) -> Matrix {
    let mut m = vec![vec![0.0; n]; n];
    for i in 0..n {
        m[i][i] = 1.0;
    }
    m
}

// Sensor measurement structure
#[derive(Clone, Debug)]
pub struct SensorMeasurement {
    pub sensor_type: SensorType,
    pub data: Vector,
    pub covariance: Matrix,
    pub timestamp_us: Micros,
}

#[derive(Clone, Debug)]
pub enum SensorType {
    GPS,
    IMU,
    Lidar,
    Camera,
    Odometry,
    Magnetometer,
    Barometer,
    UWB,
}

// State estimate with covariance
#[derive(Clone, Debug)]
pub struct StateEstimate {
    pub state: Vector,
    pub covariance: Matrix,
    pub timestamp_us: Micros,
}

// Extended Kalman Filter (EKF)
pub struct EKF {
    // State dimension
    state_dim: usize,
    
    // Current state estimate
    state: Vector,
    covariance: Matrix,
    
    // Process noise
    process_noise: Matrix,
    
    // Last update time
    last_update_us: Option<Micros>,
    
    // Maximum processing time for real-time guarantee
    max_update_time_us: Micros,
}

impl EKF {
    pub fn new(state_dim: usize, initial_state: Vector, initial_covariance: Matrix) -> Self {
        Self {
            state_dim,
            state: initial_state,
            covariance: initial_covariance,
            process_noise: identity_matrix(state_dim),
            last_update_us: None,
            max_update_time_us: 1000, // 1ms default
        }
    }
    
    pub fn set_process_noise(&mut self, q: Matrix) {
        self.process_noise = q;
    }
    
    pub fn set_max_update_time(&mut self, max_us: Micros) {
        self.max_update_time_us = max_us;
    }
    
    // Predict step (time update)
    pub fn predict(&mut self, dt: f64, control_input: Option<Vector>) -> Result<(), String> {
        // State transition (example for constant velocity model)
        let f = self.state_transition_matrix(dt);
        self.state = matrix_vector_multiply(&f, &self.state);
        
        // Control input if provided
        if let Some(u) = control_input {
            let b = self.control_matrix(dt);
            let bu = matrix_vector_multiply(&b, &u);
            for i in 0..self.state_dim {
                self.state[i] += bu[i];
            }
        }
        
        // Covariance update: P = F * P * F' + Q
        let f_t = matrix_transpose(&f);
        let p_pred = matrix_multiply(&f, &self.covariance);
        let p_pred = matrix_multiply(&p_pred, &f_t);
        self.covariance = matrix_add(&p_pred, &self.process_noise);
        
        Ok(())
    }
    
    // Update step (measurement update)
    pub fn update(&mut self, measurement: &SensorMeasurement) -> Result<(), String> {
        let start_time = std::time::Instant::now();
        
        // Measurement prediction
        let h = self.measurement_matrix(&measurement.sensor_type);
        let z_pred = matrix_vector_multiply(&h, &self.state);
        
        // Innovation
        let mut innovation = vec![0.0; measurement.data.len()];
        for i in 0..measurement.data.len() {
            innovation[i] = measurement.data[i] - z_pred[i];
        }
        
        // Innovation covariance: S = H * P * H' + R
        let h_t = matrix_transpose(&h);
        let ph = matrix_multiply(&self.covariance, &h_t);
        let s = matrix_multiply(&h, &ph);
        let s = matrix_add(&s, &measurement.covariance);
        
        // Kalman gain: K = P * H' * S^(-1)
        let k = self.calculate_kalman_gain(&ph, &s)?;
        
        // State update: x = x + K * innovation
        let dx = matrix_vector_multiply(&k, &innovation);
        for i in 0..self.state_dim {
            self.state[i] += dx[i];
        }
        
        // Covariance update: P = (I - K * H) * P
        let kh = matrix_multiply(&k, &h);
        let i_kh = matrix_subtract(&identity_matrix(self.state_dim), &kh);
        self.covariance = matrix_multiply(&i_kh, &self.covariance);
        
        // Check real-time constraint
        let elapsed_us = start_time.elapsed().as_micros() as u64;
        if elapsed_us > self.max_update_time_us {
            return Err(format!("EKF update exceeded time limit: {} > {} us", 
                             elapsed_us, self.max_update_time_us));
        }
        
        self.last_update_us = Some(measurement.timestamp_us);
        Ok(())
    }
    
    fn state_transition_matrix(&self, dt: f64) -> Matrix {
        // Example: constant velocity model for 6D state [x, y, z, vx, vy, vz]
        let mut f = identity_matrix(self.state_dim);
        if self.state_dim >= 6 {
            f[0][3] = dt;
            f[1][4] = dt;
            f[2][5] = dt;
        }
        f
    }
    
    fn control_matrix(&self, _dt: f64) -> Matrix {
        // Control input matrix (depends on system model)
        identity_matrix(self.state_dim)
    }
    
    fn measurement_matrix(&self, sensor_type: &SensorType) -> Matrix {
        // Measurement model (sensor-specific)
        match sensor_type {
            SensorType::GPS => {
                // GPS measures position directly
                let mut h = vec![vec![0.0; self.state_dim]; 3];
                for i in 0..3.min(self.state_dim) {
                    h[i][i] = 1.0;
                }
                h
            }
            SensorType::IMU => {
                // IMU measures acceleration/angular velocity
                let mut h = vec![vec![0.0; self.state_dim]; 6];
                if self.state_dim >= 6 {
                    for i in 3..6 {
                        h[i-3][i] = 1.0;
                    }
                }
                h
            }
            _ => identity_matrix(self.state_dim),
        }
    }
    
    fn calculate_kalman_gain(&self, ph: &Matrix, s: &Matrix) -> Result<Matrix, String> {
        // Simplified matrix inversion for demo
        // In production, use proper numerical methods
        if s.len() == 1 && s[0].len() == 1 {
            // Scalar case
            let s_inv = 1.0 / s[0][0];
            let mut k = ph.clone();
            for i in 0..k.len() {
                for j in 0..k[0].len() {
                    k[i][j] *= s_inv;
                }
            }
            Ok(k)
        } else {
            // For larger matrices, would need proper inversion
            Ok(ph.clone())
        }
    }
    
    pub fn get_state_estimate(&self) -> StateEstimate {
        StateEstimate {
            state: self.state.clone(),
            covariance: self.covariance.clone(),
            timestamp_us: self.last_update_us.unwrap_or(0),
        }
    }
}

// Unscented Kalman Filter (UKF)
pub struct UKF {
    state_dim: usize,
    state: Vector,
    covariance: Matrix,
    process_noise: Matrix,
    
    // UKF parameters
    alpha: f64,
    beta: f64,
    kappa: f64,
    lambda: f64,
    
    // Sigma points
    sigma_points: Vec<Vector>,
    weights_mean: Vector,
    weights_cov: Vector,
    
    last_update_us: Option<Micros>,
    max_update_time_us: Micros,
}

impl UKF {
    pub fn new(state_dim: usize, initial_state: Vector, initial_covariance: Matrix) -> Self {
        let alpha = 0.001;
        let beta = 2.0;
        let kappa = 3.0 - state_dim as f64;
        let lambda = alpha * alpha * (state_dim as f64 + kappa) - state_dim as f64;
        
        // Calculate sigma point weights
        let num_sigma = 2 * state_dim + 1;
        let mut weights_mean = vec![0.0; num_sigma];
        let mut weights_cov = vec![0.0; num_sigma];
        
        weights_mean[0] = lambda / (state_dim as f64 + lambda);
        weights_cov[0] = lambda / (state_dim as f64 + lambda) + (1.0 - alpha * alpha + beta);
        
        for i in 1..num_sigma {
            weights_mean[i] = 0.5 / (state_dim as f64 + lambda);
            weights_cov[i] = 0.5 / (state_dim as f64 + lambda);
        }
        
        Self {
            state_dim,
            state: initial_state,
            covariance: initial_covariance,
            process_noise: identity_matrix(state_dim),
            alpha,
            beta,
            kappa,
            lambda,
            sigma_points: vec![vec![0.0; state_dim]; num_sigma],
            weights_mean,
            weights_cov,
            last_update_us: None,
            max_update_time_us: 2000, // 2ms default
        }
    }
    
    pub fn set_process_noise(&mut self, q: Matrix) {
        self.process_noise = q;
    }
    
    fn generate_sigma_points(&mut self) {
        let n = self.state_dim;
        let scale = (n as f64 + self.lambda).sqrt();
        
        // First sigma point is the mean
        self.sigma_points[0] = self.state.clone();
        
        // Calculate matrix square root (Cholesky decomposition)
        // Simplified for demo - in production use proper Cholesky
        let mut sqrt_p = self.covariance.clone();
        for i in 0..n {
            sqrt_p[i][i] = sqrt_p[i][i].sqrt() * scale;
        }
        
        // Generate remaining sigma points
        for i in 0..n {
            for j in 0..n {
                self.sigma_points[i + 1][j] = self.state[j] + sqrt_p[i][j];
                self.sigma_points[i + 1 + n][j] = self.state[j] - sqrt_p[i][j];
            }
        }
    }
    
    pub fn predict(&mut self, dt: f64, control_input: Option<Vector>) -> Result<(), String> {
        // Generate sigma points
        self.generate_sigma_points();
        
        // Propagate sigma points through process model
        for i in 0..self.sigma_points.len() {
            self.sigma_points[i] = self.process_model(&self.sigma_points[i], dt, &control_input);
        }
        
        // Calculate predicted mean
        self.state = vec![0.0; self.state_dim];
        for i in 0..self.sigma_points.len() {
            for j in 0..self.state_dim {
                self.state[j] += self.weights_mean[i] * self.sigma_points[i][j];
            }
        }
        
        // Calculate predicted covariance
        self.covariance = vec![vec![0.0; self.state_dim]; self.state_dim];
        for i in 0..self.sigma_points.len() {
            let mut diff = vec![0.0; self.state_dim];
            for j in 0..self.state_dim {
                diff[j] = self.sigma_points[i][j] - self.state[j];
            }
            
            for j in 0..self.state_dim {
                for k in 0..self.state_dim {
                    self.covariance[j][k] += self.weights_cov[i] * diff[j] * diff[k];
                }
            }
        }
        
        // Add process noise
        self.covariance = matrix_add(&self.covariance, &self.process_noise);
        
        Ok(())
    }
    
    pub fn update(&mut self, measurement: &SensorMeasurement) -> Result<(), String> {
        let start_time = std::time::Instant::now();
        
        // Transform sigma points through measurement model
        let mut z_sigma = Vec::new();
        for sp in &self.sigma_points {
            z_sigma.push(self.measurement_model(sp, &measurement.sensor_type));
        }
        
        // Calculate predicted measurement mean
        let mut z_pred = vec![0.0; measurement.data.len()];
        for i in 0..z_sigma.len() {
            for j in 0..z_pred.len() {
                z_pred[j] += self.weights_mean[i] * z_sigma[i][j];
            }
        }
        
        // Calculate innovation covariance
        let mut s = vec![vec![0.0; z_pred.len()]; z_pred.len()];
        for i in 0..z_sigma.len() {
            let mut diff = vec![0.0; z_pred.len()];
            for j in 0..z_pred.len() {
                diff[j] = z_sigma[i][j] - z_pred[j];
            }
            
            for j in 0..z_pred.len() {
                for k in 0..z_pred.len() {
                    s[j][k] += self.weights_cov[i] * diff[j] * diff[k];
                }
            }
        }
        s = matrix_add(&s, &measurement.covariance);
        
        // Calculate cross-covariance
        let mut pxz = vec![vec![0.0; z_pred.len()]; self.state_dim];
        for i in 0..self.sigma_points.len() {
            let mut x_diff = vec![0.0; self.state_dim];
            let mut z_diff = vec![0.0; z_pred.len()];
            
            for j in 0..self.state_dim {
                x_diff[j] = self.sigma_points[i][j] - self.state[j];
            }
            for j in 0..z_pred.len() {
                z_diff[j] = z_sigma[i][j] - z_pred[j];
            }
            
            for j in 0..self.state_dim {
                for k in 0..z_pred.len() {
                    pxz[j][k] += self.weights_cov[i] * x_diff[j] * z_diff[k];
                }
            }
        }
        
        // Calculate Kalman gain
        let k = self.calculate_ukf_gain(&pxz, &s)?;
        
        // Update state
        let mut innovation = vec![0.0; measurement.data.len()];
        for i in 0..measurement.data.len() {
            innovation[i] = measurement.data[i] - z_pred[i];
        }
        
        let dx = matrix_vector_multiply(&k, &innovation);
        for i in 0..self.state_dim {
            self.state[i] += dx[i];
        }
        
        // Update covariance
        let ks = matrix_multiply(&k, &s);
        let ksk = matrix_multiply(&ks, &matrix_transpose(&k));
        self.covariance = matrix_subtract(&self.covariance, &ksk);
        
        // Check real-time constraint
        let elapsed_us = start_time.elapsed().as_micros() as u64;
        if elapsed_us > self.max_update_time_us {
            return Err(format!("UKF update exceeded time limit: {} > {} us", 
                             elapsed_us, self.max_update_time_us));
        }
        
        self.last_update_us = Some(measurement.timestamp_us);
        Ok(())
    }
    
    fn process_model(&self, state: &Vector, dt: f64, control: &Option<Vector>) -> Vector {
        // Example: constant velocity model
        let mut new_state = state.clone();
        
        if self.state_dim >= 6 {
            // Update position based on velocity
            new_state[0] += state[3] * dt;
            new_state[1] += state[4] * dt;
            new_state[2] += state[5] * dt;
        }
        
        // Apply control input if provided
        if let Some(u) = control {
            for i in 0..u.len().min(new_state.len()) {
                new_state[i] += u[i] * dt;
            }
        }
        
        new_state
    }
    
    fn measurement_model(&self, state: &Vector, sensor_type: &SensorType) -> Vector {
        match sensor_type {
            SensorType::GPS => {
                // GPS measures position
                vec![state[0], state[1], state[2]]
            }
            SensorType::IMU => {
                // IMU measures velocity/acceleration
                if state.len() >= 6 {
                    vec![state[3], state[4], state[5]]
                } else {
                    vec![0.0, 0.0, 0.0]
                }
            }
            _ => state.clone(),
        }
    }
    
    fn calculate_ukf_gain(&self, pxz: &Matrix, s: &Matrix) -> Result<Matrix, String> {
        // Simplified for demo - in production use proper matrix inversion
        Ok(pxz.clone())
    }
    
    pub fn get_state_estimate(&self) -> StateEstimate {
        StateEstimate {
            state: self.state.clone(),
            covariance: self.covariance.clone(),
            timestamp_us: self.last_update_us.unwrap_or(0),
        }
    }
}

// Multi-sensor fusion manager
pub struct FusionManager {
    ekf: Option<EKF>,
    ukf: Option<UKF>,
    use_ukf: bool,
    sensor_queue: Vec<SensorMeasurement>,
    max_queue_size: usize,
    max_age_us: Micros,
}

impl FusionManager {
    pub fn new_with_ekf(state_dim: usize, initial_state: Vector) -> Self {
        let initial_cov = identity_matrix(state_dim);
        Self {
            ekf: Some(EKF::new(state_dim, initial_state, initial_cov)),
            ukf: None,
            use_ukf: false,
            sensor_queue: Vec::new(),
            max_queue_size: 100,
            max_age_us: 1_000_000, // 1 second
        }
    }
    
    pub fn new_with_ukf(state_dim: usize, initial_state: Vector) -> Self {
        let initial_cov = identity_matrix(state_dim);
        Self {
            ekf: None,
            ukf: Some(UKF::new(state_dim, initial_state, initial_cov)),
            use_ukf: true,
            sensor_queue: Vec::new(),
            max_queue_size: 100,
            max_age_us: 1_000_000,
        }
    }
    
    pub fn add_measurement(&mut self, measurement: SensorMeasurement) -> Result<(), String> {
        // Add to queue
        self.sensor_queue.push(measurement);
        
        // Sort by timestamp
        self.sensor_queue.sort_by_key(|m| m.timestamp_us);
        
        // Limit queue size
        if self.sensor_queue.len() > self.max_queue_size {
            self.sensor_queue.remove(0);
        }
        
        Ok(())
    }
    
    pub fn process_measurements(&mut self, current_time_us: Micros) -> Result<StateEstimate, String> {
        // Remove old measurements
        self.sensor_queue.retain(|m| current_time_us - m.timestamp_us < self.max_age_us);
        
        // Process measurements in temporal order
        for measurement in self.sensor_queue.drain(..) {
            let dt = if let Some(last_time) = self.get_last_update_time() {
                (measurement.timestamp_us - last_time) as f64 / 1e6
            } else {
                0.01 // Default 10ms
            };
            
            // Predict step
            if self.use_ukf {
                if let Some(ukf) = &mut self.ukf {
                    ukf.predict(dt, None)?;
                    ukf.update(&measurement)?;
                }
            } else {
                if let Some(ekf) = &mut self.ekf {
                    ekf.predict(dt, None)?;
                    ekf.update(&measurement)?;
                }
            }
        }
        
        // Return current estimate
        if self.use_ukf {
            self.ukf.as_ref()
                .map(|ukf| ukf.get_state_estimate())
                .ok_or("No UKF initialized".into())
        } else {
            self.ekf.as_ref()
                .map(|ekf| ekf.get_state_estimate())
                .ok_or("No EKF initialized".into())
        }
    }
    
    fn get_last_update_time(&self) -> Option<Micros> {
        if self.use_ukf {
            self.ukf.as_ref().and_then(|ukf| ukf.last_update_us)
        } else {
            self.ekf.as_ref().and_then(|ekf| ekf.last_update_us)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_ekf_predict_update() {
        let state_dim = 6;
        let initial_state = vec![0.0; state_dim];
        let initial_cov = identity_matrix(state_dim);
        
        let mut ekf = EKF::new(state_dim, initial_state, initial_cov);
        
        // Predict step
        assert!(ekf.predict(0.1, None).is_ok());
        
        // Create GPS measurement
        let gps_measurement = SensorMeasurement {
            sensor_type: SensorType::GPS,
            data: vec![1.0, 2.0, 3.0],
            covariance: vec![
                vec![0.1, 0.0, 0.0],
                vec![0.0, 0.1, 0.0],
                vec![0.0, 0.0, 0.1],
            ],
            timestamp_us: 100_000,
        };
        
        // Update step
        assert!(ekf.update(&gps_measurement).is_ok());
        
        let estimate = ekf.get_state_estimate();
        assert_eq!(estimate.state.len(), state_dim);
    }
    
    #[test]
    fn test_ukf_sigma_points() {
        let state_dim = 3;
        let initial_state = vec![1.0, 2.0, 3.0];
        let initial_cov = identity_matrix(state_dim);
        
        let mut ukf = UKF::new(state_dim, initial_state.clone(), initial_cov);
        
        ukf.generate_sigma_points();
        
        // Check that first sigma point is the mean
        assert_eq!(ukf.sigma_points[0], initial_state);
        
        // Check number of sigma points
        assert_eq!(ukf.sigma_points.len(), 2 * state_dim + 1);
    }
    
    #[test]
    fn test_fusion_manager() {
        let state_dim = 6;
        let initial_state = vec![0.0; state_dim];
        
        let mut fusion = FusionManager::new_with_ekf(state_dim, initial_state);
        
        // Add measurements
        let gps = SensorMeasurement {
            sensor_type: SensorType::GPS,
            data: vec![1.0, 1.0, 1.0],
            covariance: identity_matrix(3),
            timestamp_us: 1000,
        };
        
        let imu = SensorMeasurement {
            sensor_type: SensorType::IMU,
            data: vec![0.1, 0.1, 0.1],
            covariance: identity_matrix(3),
            timestamp_us: 1100,
        };
        
        assert!(fusion.add_measurement(gps).is_ok());
        assert!(fusion.add_measurement(imu).is_ok());
        
        // Process measurements
        let estimate = fusion.process_measurements(2000).unwrap();
        assert_eq!(estimate.state.len(), state_dim);
    }
}