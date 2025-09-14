"""
E91 Quantum Key Distribution Protocol Implementation
Ekert 1991 protocol using entangled photon pairs and Bell's theorem
"""

import numpy as np
import random
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from enum import Enum
import math

class MeasurementBasis(Enum):
    """Measurement angles for E91 protocol"""
    ALICE_0 = 0        # 0°
    ALICE_45 = 45      # 45° 
    ALICE_90 = 90      # 90°
    BOB_45 = 45        # 45°
    BOB_90 = 90        # 90°
    BOB_135 = 135      # 135°

@dataclass
class EntangledPair:
    """Bell state entangled photon pair"""
    state: str = "phi_plus"  # |Φ+⟩ = (|00⟩ + |11⟩)/√2
    creation_time: float = 0.0
    fidelity: float = 1.0

@dataclass
class Measurement:
    """Single photon measurement result"""
    basis_angle: float  # degrees
    result: int         # 0 or 1
    timestamp: float
    detected: bool = True

@dataclass
class E91Parameters:
    """E91 protocol parameters"""
    pair_generation_rate_hz: float = 1e6
    duration_seconds: float = 1.0
    detection_efficiency: float = 0.8
    dark_count_rate: float = 1e-6
    bell_test_fraction: float = 0.1  # Fraction of pairs for Bell test
    timing_window_ns: float = 1.0    # Coincidence window
    
    # Security parameters
    bell_violation_threshold: float = 2.0  # Minimum S parameter
    error_correction_efficiency: float = 1.2
    privacy_amplification_factor: float = 2.0

@dataclass
class ChannelParameters:
    """Quantum channel parameters for both arms"""
    loss_db_per_km: float = 0.2
    alice_distance_km: float = 25.0
    bob_distance_km: float = 25.0
    depolarization_rate: float = 0.001
    timing_jitter_ns: float = 100.0

class E91Protocol:
    """Complete E91 QKD implementation with Bell test"""
    
    def __init__(self, params: E91Parameters, channel: ChannelParameters):
        self.params = params
        self.channel = channel
        
        # Measurement records
        self.alice_measurements: List[Measurement] = []
        self.bob_measurements: List[Measurement] = []
        self.bell_test_pairs: List[Tuple[Measurement, Measurement]] = []
        self.key_pairs: List[Tuple[Measurement, Measurement]] = []
        
        # Results
        self.bell_parameter: float = 0.0
        self.sifted_key: List[int] = []
        self.final_key: List[int] = []
        
        # Calculate transmission probabilities
        self.alice_transmission = self._calculate_transmission(channel.alice_distance_km)
        self.bob_transmission = self._calculate_transmission(channel.bob_distance_km)
    
    def _calculate_transmission(self, distance_km: float) -> float:
        """Calculate photon transmission probability"""
        loss_linear = 10 ** (-self.channel.loss_db_per_km * distance_km / 10)
        return loss_linear * self.params.detection_efficiency
    
    def generate_entangled_pairs(self) -> List[EntangledPair]:
        """Generate entangled photon pairs"""
        num_pairs = int(self.params.pair_generation_rate_hz * self.params.duration_seconds)
        pairs = []
        
        for i in range(num_pairs):
            # Perfect |Φ+⟩ state with possible decoherence
            fidelity = 1.0 - random.random() * self.channel.depolarization_rate
            
            pair = EntangledPair(
                state="phi_plus",
                creation_time=i * self.params.duration_seconds / num_pairs,
                fidelity=max(0.5, fidelity)  # Minimum fidelity for entanglement
            )
            pairs.append(pair)
        
        print(f"Generated {len(pairs)} entangled pairs")
        return pairs
    
    def alice_measure(self, pairs: List[EntangledPair]) -> List[Optional[Measurement]]:
        """Alice measures her photons"""
        measurements = []
        
        for pair in pairs:
            # Check if photon reaches Alice
            if random.random() > self.alice_transmission:
                measurements.append(None)
                continue
            
            # Choose measurement basis
            # E91 uses specific angles: 0°, 45°, 90° for Alice
            basis_choice = random.choice([0, 45, 90])
            
            # Calculate measurement result based on quantum mechanics
            result = self._calculate_measurement_result(pair, basis_choice, "alice")
            
            if result is not None:
                measurement = Measurement(
                    basis_angle=basis_choice,
                    result=result,
                    timestamp=pair.creation_time,
                    detected=True
                )
                measurements.append(measurement)
                self.alice_measurements.append(measurement)
            else:
                measurements.append(None)
        
        detected = sum(1 for m in measurements if m is not None)
        print(f"Alice detected {detected}/{len(pairs)} photons ({100*detected/len(pairs):.1f}%)")
        
        return measurements
    
    def bob_measure(self, pairs: List[EntangledPair]) -> List[Optional[Measurement]]:
        """Bob measures his photons"""
        measurements = []
        
        for pair in pairs:
            # Check if photon reaches Bob
            if random.random() > self.bob_transmission:
                measurements.append(None)
                continue
            
            # Choose measurement basis
            # E91 uses specific angles: 45°, 90°, 135° for Bob
            basis_choice = random.choice([45, 90, 135])
            
            # Calculate measurement result
            result = self._calculate_measurement_result(pair, basis_choice, "bob")
            
            if result is not None:
                measurement = Measurement(
                    basis_angle=basis_choice,
                    result=result,
                    timestamp=pair.creation_time,
                    detected=True
                )
                measurements.append(measurement)
                self.bob_measurements.append(measurement)
            else:
                measurements.append(None)
        
        detected = sum(1 for m in measurements if m is not None)
        print(f"Bob detected {detected}/{len(pairs)} photons ({100*detected/len(pairs):.1f}%)")
        
        return measurements
    
    def _calculate_measurement_result(self, pair: EntangledPair, angle: float, party: str) -> Optional[int]:
        """Calculate measurement result based on quantum mechanics"""
        # For |Φ+⟩ = (|00⟩ + |11⟩)/√2 state
        # Correlation depends on angle difference
        
        # Add some randomness for imperfect detectors
        if random.random() > 0.95:  # 5% detector noise
            return random.randint(0, 1)
        
        # Quantum mechanical correlation for Bell state
        # This is simplified - real implementation would use full density matrix
        
        # For demonstration, use classical correlation with quantum statistics
        if pair.state == "phi_plus":
            # Perfect anti-correlation for same angles
            # |Φ+⟩ gives same results for same measurement angles
            base_result = random.randint(0, 1)
            
            # Add angle-dependent correlation
            if angle in [0, 90]:
                return base_result
            elif angle == 45:
                # 45° measurements have specific correlation pattern
                return base_result if random.random() < pair.fidelity else 1 - base_result
            elif angle == 135:
                # 135° has different correlation
                return 1 - base_result if random.random() < pair.fidelity else base_result
        
        return random.randint(0, 1)
    
    def coincidence_filtering(self, alice_measurements: List[Optional[Measurement]], 
                            bob_measurements: List[Optional[Measurement]]) -> List[Tuple[Measurement, Measurement]]:
        """Find coincident detections within timing window"""
        coincidences = []
        
        for i, (alice_m, bob_m) in enumerate(zip(alice_measurements, bob_measurements)):
            if alice_m is not None and bob_m is not None:
                # Check timing window
                time_diff = abs(alice_m.timestamp - bob_m.timestamp)
                if time_diff <= self.params.timing_window_ns * 1e-9:
                    coincidences.append((alice_m, bob_m))
        
        print(f"Found {len(coincidences)} coincident detections")
        return coincidences
    
    def basis_selection(self, coincidences: List[Tuple[Measurement, Measurement]]) -> Tuple[List[Tuple[Measurement, Measurement]], List[Tuple[Measurement, Measurement]]]:
        """Separate coincidences for Bell test and key generation"""
        
        # Reserve fraction for Bell test
        num_bell_test = int(len(coincidences) * self.params.bell_test_fraction)
        
        # Randomly select pairs for Bell test
        bell_test_indices = random.sample(range(len(coincidences)), num_bell_test)
        
        bell_test_pairs = []
        key_pairs = []
        
        for i, pair in enumerate(coincidences):
            alice_m, bob_m = pair
            
            if i in bell_test_indices:
                bell_test_pairs.append(pair)
            else:
                # For key generation, use only compatible basis pairs
                # In E91: Alice(0°) with Bob(45°), Alice(45°) with Bob(90°), etc.
                if self._is_key_compatible(alice_m.basis_angle, bob_m.basis_angle):
                    key_pairs.append(pair)
        
        self.bell_test_pairs = bell_test_pairs
        self.key_pairs = key_pairs
        
        print(f"Bell test pairs: {len(bell_test_pairs)}")
        print(f"Key generation pairs: {len(key_pairs)}")
        
        return bell_test_pairs, key_pairs
    
    def _is_key_compatible(self, alice_angle: float, bob_angle: float) -> bool:
        """Check if measurement angles are compatible for key generation"""
        # For key generation, use parallel/anti-parallel measurements
        # Alice 0° with Bob 45°, Alice 45° with Bob 90°, etc.
        compatible_pairs = [
            (0, 45), (45, 90), (90, 135),
            (45, 45), (90, 90)  # Same angle measurements
        ]
        
        return (alice_angle, bob_angle) in compatible_pairs
    
    def bell_test(self, bell_pairs: List[Tuple[Measurement, Measurement]]) -> float:
        """Perform CHSH Bell inequality test"""
        if len(bell_pairs) < 4:
            print("Warning: Insufficient data for Bell test")
            return 0.0
        
        # Count correlations for different angle combinations
        correlations = {}
        
        for alice_m, bob_m in bell_pairs:
            key = (alice_m.basis_angle, bob_m.basis_angle)
            if key not in correlations:
                correlations[key] = []
            
            # Calculate correlation value: +1 for same, -1 for different
            correlation = 1 if alice_m.result == bob_m.result else -1
            correlations[key].append(correlation)
        
        # Calculate average correlations
        avg_correlations = {}
        for key, values in correlations.items():
            avg_correlations[key] = sum(values) / len(values)
        
        # CHSH parameter S = |E(a,b) - E(a,b') + E(a',b) + E(a',b')|
        # where E(a,b) is correlation between Alice angle a and Bob angle b
        
        # Get correlations for CHSH test (if available)
        E_00_45 = avg_correlations.get((0, 45), 0)
        E_00_135 = avg_correlations.get((0, 135), 0)
        E_45_45 = avg_correlations.get((45, 45), 0)
        E_45_135 = avg_correlations.get((45, 135), 0)
        
        # Calculate S parameter
        S = abs(E_00_45 - E_00_135 + E_45_45 + E_45_135)
        
        self.bell_parameter = S
        
        print(f"Bell parameter S = {S:.3f}")
        print(f"Classical limit: S ≤ 2.0")
        print(f"Quantum maximum: S ≤ 2√2 ≈ 2.828")
        
        if S > self.params.bell_violation_threshold:
            print("✓ Bell inequality violated - quantum correlations confirmed")
        else:
            print("✗ No significant Bell violation detected")
        
        return S
    
    def key_sifting(self, key_pairs: List[Tuple[Measurement, Measurement]]) -> List[int]:
        """Extract raw key from measurement correlations"""
        raw_key = []
        
        for alice_m, bob_m in key_pairs:
            # Use Alice's measurement result as key bit
            # Bob's result provides error check
            raw_key.append(alice_m.result)
        
        self.sifted_key = raw_key
        print(f"Raw key length: {len(raw_key)} bits")
        
        return raw_key
    
    def error_estimation(self, key_pairs: List[Tuple[Measurement, Measurement]]) -> float:
        """Estimate quantum bit error rate"""
        if not key_pairs:
            return 1.0
        
        errors = 0
        total = 0
        
        for alice_m, bob_m in key_pairs:
            # For compatible measurements, results should be correlated
            expected_correlation = self._expected_correlation(alice_m.basis_angle, bob_m.basis_angle)
            
            if expected_correlation > 0:  # Same result expected
                if alice_m.result != bob_m.result:
                    errors += 1
            else:  # Different result expected
                if alice_m.result == bob_m.result:
                    errors += 1
            
            total += 1
        
        qber = errors / total if total > 0 else 1.0
        print(f"QBER: {qber:.4f} ({100*qber:.2f}%)")
        
        return qber
    
    def _expected_correlation(self, alice_angle: float, bob_angle: float) -> float:
        """Expected correlation for given measurement angles"""
        # Quantum mechanical prediction for |Φ+⟩ state
        angle_diff = abs(alice_angle - bob_angle)
        return math.cos(math.radians(angle_diff))
    
    def security_analysis(self, bell_parameter: float, qber: float) -> Dict[str, any]:
        """Analyze security based on Bell test and error rate"""
        
        # Security depends on Bell violation and QBER
        secure = (bell_parameter > self.params.bell_violation_threshold and 
                 qber < 0.11)  # Typical QBER threshold
        
        metrics = {
            'bell_parameter': bell_parameter,
            'qber': qber,
            'secure': secure,
            'eavesdropper_detected': bell_parameter < 2.0,
            'raw_key_rate_bps': len(self.sifted_key) / self.params.duration_seconds
        }
        
        if secure:
            # Estimate secure key rate (simplified)
            h2 = lambda x: -x * np.log2(x) - (1-x) * np.log2(1-x) if 0 < x < 1 else 0
            secure_fraction = max(0, 1 - self.params.error_correction_efficiency * h2(qber) - h2(qber))
            metrics['secure_key_rate_bps'] = metrics['raw_key_rate_bps'] * secure_fraction
        else:
            metrics['secure_key_rate_bps'] = 0.0
        
        return metrics
    
    def run_protocol(self) -> Dict[str, any]:
        """Execute complete E91 protocol"""
        print("=== E91 Quantum Key Distribution Protocol ===")
        print(f"Alice distance: {self.channel.alice_distance_km} km")
        print(f"Bob distance: {self.channel.bob_distance_km} km")
        print(f"Duration: {self.params.duration_seconds} s")
        
        # Step 1: Generate entangled pairs
        pairs = self.generate_entangled_pairs()
        
        # Step 2: Alice and Bob measure
        alice_measurements = self.alice_measure(pairs)
        bob_measurements = self.bob_measure(pairs)
        
        # Step 3: Find coincidences
        coincidences = self.coincidence_filtering(alice_measurements, bob_measurements)
        
        if len(coincidences) == 0:
            return {"error": "No coincident detections", "success": False}
        
        # Step 4: Separate for Bell test and key generation
        bell_pairs, key_pairs = self.basis_selection(coincidences)
        
        # Step 5: Bell test for security
        bell_parameter = self.bell_test(bell_pairs)
        
        # Step 6: Key sifting
        raw_key = self.key_sifting(key_pairs)
        
        if len(raw_key) == 0:
            return {"error": "No key material generated", "success": False}
        
        # Step 7: Error estimation
        qber = self.error_estimation(key_pairs)
        
        # Step 8: Security analysis
        security_metrics = self.security_analysis(bell_parameter, qber)
        
        # Step 9: Error correction and privacy amplification (simplified)
        if security_metrics['secure']:
            # Simplified post-processing
            corrected_length = max(0, int(len(raw_key) * 0.8))  # Account for error correction
            final_length = max(0, int(corrected_length * 0.7))  # Account for privacy amplification
            
            self.final_key = raw_key[:final_length]
            
            return {
                "success": True,
                "final_key_bits": len(self.final_key),
                "metrics": security_metrics,
                "bell_parameter": bell_parameter,
                "efficiency": len(self.final_key) / len(pairs) if pairs else 0
            }
        else:
            return {
                "error": "Security conditions not met",
                "success": False,
                "metrics": security_metrics,
                "bell_parameter": bell_parameter
            }

def main():
    """Demo E91 protocol"""
    params = E91Parameters(
        pair_generation_rate_hz=1e5,  # 100 kHz
        duration_seconds=0.1,         # 100ms
        detection_efficiency=0.8,
        bell_test_fraction=0.2        # 20% for Bell test
    )
    
    channel = ChannelParameters(
        alice_distance_km=25,
        bob_distance_km=25,
        loss_db_per_km=0.2
    )
    
    e91 = E91Protocol(params, channel)
    result = e91.run_protocol()
    
    print("\n=== Results ===")
    if result["success"]:
        print(f"✓ Secure key generated: {result['final_key_bits']} bits")
        print(f"✓ Bell parameter: {result['bell_parameter']:.3f}")
        print(f"✓ Efficiency: {100*result['efficiency']:.3f}%")
        
        metrics = result["metrics"]
        print(f"  QBER: {100*metrics['qber']:.2f}%")
        print(f"  Secure rate: {metrics['secure_key_rate_bps']:.1f} bps")
    else:
        print(f"✗ Protocol failed: {result['error']}")
        if 'bell_parameter' in result:
            print(f"  Bell parameter: {result['bell_parameter']:.3f}")

if __name__ == "__main__":
    main()