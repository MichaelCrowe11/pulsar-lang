"""
BB84 Quantum Key Distribution Protocol Implementation
Bennett-Brassard 1984 protocol with decoy states
"""

import numpy as np
import random
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from enum import Enum

class Basis(Enum):
    """Measurement bases for BB84"""
    RECTILINEAR = "+"  # {|0⟩, |1⟩} or {H, V}
    DIAGONAL = "×"     # {|+⟩, |−⟩} or {D, A}

class Bit(Enum):
    """Bit values"""
    ZERO = 0
    ONE = 1

@dataclass
class Photon:
    """Single photon with polarization state"""
    bit: Bit
    basis: Basis
    is_decoy: bool = False
    intensity: float = 1.0  # μ parameter for intensity modulation
    
    def __str__(self):
        state_map = {
            (Bit.ZERO, Basis.RECTILINEAR): "|0⟩",
            (Bit.ONE, Basis.RECTILINEAR): "|1⟩", 
            (Bit.ZERO, Basis.DIAGONAL): "|+⟩",
            (Bit.ONE, Basis.DIAGONAL): "|−⟩"
        }
        return state_map.get((self.bit, self.basis), "?")

@dataclass
class Detection:
    """Photon detection event"""
    bit: Optional[Bit]
    basis: Basis
    detected: bool
    dark_count: bool = False
    timestamp: float = 0.0

@dataclass
class ChannelParameters:
    """Quantum channel characteristics"""
    loss_db_per_km: float = 0.2
    distance_km: float = 50.0
    depolarization_rate: float = 0.001
    detector_efficiency: float = 0.8
    dark_count_rate: float = 1e-6  # Hz
    timing_jitter_ns: float = 100.0

@dataclass
class BB84Parameters:
    """BB84 protocol parameters"""
    pulse_rate_hz: float = 1e9
    duration_seconds: float = 1.0
    basis_choice_prob: float = 0.5
    decoy_state_prob: float = 0.5
    weak_intensity: float = 0.2
    decoy_intensity: float = 0.1
    error_correction_efficiency: float = 1.2
    privacy_amplification_factor: float = 2.0
    qber_threshold: float = 0.11

class BB84Protocol:
    """Complete BB84 QKD implementation with security analysis"""
    
    def __init__(self, params: BB84Parameters, channel: ChannelParameters):
        self.params = params
        self.channel = channel
        self.alice_bits: List[Bit] = []
        self.alice_bases: List[Basis] = []
        self.alice_intensities: List[float] = []
        self.bob_measurements: List[Detection] = []
        self.sifted_key: List[Bit] = []
        self.error_rate: float = 0.0
        self.final_key: List[Bit] = []
        
        # Calculate transmission probability
        self.transmission_prob = self._calculate_transmission()
        
    def _calculate_transmission(self) -> float:
        """Calculate photon transmission probability through fiber"""
        loss_linear = 10 ** (-self.channel.loss_db_per_km * self.channel.distance_km / 10)
        return loss_linear * self.channel.detector_efficiency
    
    def _generate_random_basis(self) -> Basis:
        """Generate random measurement basis"""
        return Basis.RECTILINEAR if random.random() < self.params.basis_choice_prob else Basis.DIAGONAL
    
    def _generate_random_bit(self) -> Bit:
        """Generate random bit"""
        return Bit.ZERO if random.random() < 0.5 else Bit.ONE
    
    def _choose_intensity(self) -> Tuple[float, bool]:
        """Choose photon intensity (signal/weak/decoy)"""
        rand = random.random()
        if rand < self.params.decoy_state_prob / 2:
            return self.params.decoy_intensity, True
        elif rand < self.params.decoy_state_prob:
            return self.params.weak_intensity, True
        else:
            return 1.0, False  # Signal state
    
    def alice_prepare(self) -> List[Photon]:
        """Alice prepares quantum states"""
        photons = []
        num_pulses = int(self.params.pulse_rate_hz * self.params.duration_seconds)
        
        for _ in range(num_pulses):
            bit = self._generate_random_bit()
            basis = self._generate_random_basis()
            intensity, is_decoy = self._choose_intensity()
            
            photon = Photon(bit, basis, is_decoy, intensity)
            photons.append(photon)
            
            # Store Alice's choices
            self.alice_bits.append(bit)
            self.alice_bases.append(basis)
            self.alice_intensities.append(intensity)
        
        print(f"Alice prepared {len(photons)} photons")
        return photons
    
    def quantum_channel(self, photons: List[Photon]) -> List[Optional[Photon]]:
        """Simulate quantum channel with loss and noise"""
        received_photons = []
        
        for photon in photons:
            # Apply intensity-dependent transmission
            trans_prob = self.transmission_prob * photon.intensity
            
            if random.random() < trans_prob:
                # Photon transmitted, check for depolarization
                if random.random() < self.channel.depolarization_rate:
                    # Depolarization error - flip basis randomly
                    photon.basis = Basis.DIAGONAL if photon.basis == Basis.RECTILINEAR else Basis.RECTILINEAR
                
                received_photons.append(photon)
            else:
                # Photon lost
                received_photons.append(None)
        
        received_count = sum(1 for p in received_photons if p is not None)
        print(f"Bob received {received_count}/{len(photons)} photons ({100*received_count/len(photons):.1f}%)")
        
        return received_photons
    
    def bob_measure(self, photons: List[Optional[Photon]]) -> List[Detection]:
        """Bob measures received photons"""
        detections = []
        
        for i, photon in enumerate(photons):
            basis = self._generate_random_basis()
            
            if photon is None:
                # Dark count possibility
                if random.random() < self.channel.dark_count_rate * self.params.duration_seconds / len(photons):
                    bit = self._generate_random_bit()
                    detection = Detection(bit, basis, True, True, i * self.params.duration_seconds / len(photons))
                else:
                    detection = Detection(None, basis, False)
            else:
                # Real photon detected
                if photon.basis == basis:
                    # Correct basis - perfect measurement (in ideal case)
                    bit = photon.bit
                else:
                    # Wrong basis - random result
                    bit = self._generate_random_bit()
                
                detection = Detection(bit, basis, True, False, i * self.params.duration_seconds / len(photons))
            
            detections.append(detection)
            self.bob_measurements.append(detection)
        
        detection_count = sum(1 for d in detections if d.detected)
        print(f"Bob detected {detection_count} events")
        
        return detections
    
    def basis_reconciliation(self) -> Tuple[List[Bit], List[Bit]]:
        """Sift key based on matching bases"""
        alice_sifted = []
        bob_sifted = []
        
        for i, (alice_basis, detection) in enumerate(zip(self.alice_bases, self.bob_measurements)):
            if detection.detected and alice_basis == detection.basis:
                # Only include signal states for key (exclude decoys)
                if not (i < len(self.alice_intensities) and 
                       self.alice_intensities[i] < 1.0):
                    alice_sifted.append(self.alice_bits[i])
                    bob_sifted.append(detection.bit)
        
        self.sifted_key = alice_sifted  # Alice's version
        print(f"Sifted key length: {len(alice_sifted)} bits")
        
        return alice_sifted, bob_sifted
    
    def error_estimation(self, alice_sifted: List[Bit], bob_sifted: List[Bit]) -> float:
        """Estimate quantum bit error rate (QBER)"""
        if len(alice_sifted) != len(bob_sifted) or len(alice_sifted) == 0:
            return 1.0
        
        errors = sum(1 for a, b in zip(alice_sifted, bob_sifted) if a != b)
        self.error_rate = errors / len(alice_sifted)
        
        print(f"QBER: {self.error_rate:.4f} ({100*self.error_rate:.2f}%)")
        
        return self.error_rate
    
    def security_analysis(self) -> Dict[str, float]:
        """Perform security analysis using decoy states"""
        # Simplified security analysis
        # In practice, this involves complex calculations of gain and QBER
        # for different intensity states
        
        metrics = {
            'qber': self.error_rate,
            'secure': self.error_rate < self.params.qber_threshold,
            'estimated_eve_information': min(1.0, 2 * self.error_rate) if self.error_rate > 0 else 0.0,
            'transmission_distance_km': self.channel.distance_km,
            'raw_key_rate_bps': len(self.sifted_key) / self.params.duration_seconds
        }
        
        # Estimate secure key rate using simplified bound
        if metrics['secure']:
            h2 = lambda x: -x * np.log2(x) - (1-x) * np.log2(1-x) if 0 < x < 1 else 0
            secure_fraction = max(0, 1 - self.params.error_correction_efficiency * h2(self.error_rate) - h2(self.error_rate))
            metrics['secure_key_rate_bps'] = metrics['raw_key_rate_bps'] * secure_fraction
        else:
            metrics['secure_key_rate_bps'] = 0.0
        
        return metrics
    
    def error_correction(self, alice_key: List[Bit], bob_key: List[Bit]) -> Tuple[List[Bit], List[Bit]]:
        """Simulate error correction (CASCADE protocol)"""
        # Simplified error correction - in practice this involves
        # iterative parity checks and error location/correction
        
        if len(alice_key) != len(bob_key):
            return alice_key, bob_key
        
        corrected_alice = alice_key.copy()
        corrected_bob = bob_key.copy()
        
        # Information leaked during error correction
        info_leaked = int(self.params.error_correction_efficiency * len(alice_key) * self.error_rate * np.log2(2))
        
        # Truncate keys to account for leaked information
        key_length = max(0, len(alice_key) - info_leaked)
        corrected_alice = corrected_alice[:key_length]
        corrected_bob = corrected_bob[:key_length]
        
        print(f"After error correction: {len(corrected_alice)} bits")
        
        return corrected_alice, corrected_bob
    
    def privacy_amplification(self, key: List[Bit]) -> List[Bit]:
        """Apply privacy amplification (Toeplitz hashing)"""
        if len(key) == 0:
            return []
        
        # Estimate information leaked to eavesdropper
        eve_info = min(len(key), int(len(key) * self.error_rate * self.params.privacy_amplification_factor))
        
        # Final key length after privacy amplification
        final_length = max(0, len(key) - eve_info)
        
        # Simulate Toeplitz matrix multiplication (simplified)
        final_key = key[:final_length]  # In practice, this would be proper hashing
        
        self.final_key = final_key
        print(f"Final secure key: {len(final_key)} bits")
        
        return final_key
    
    def run_protocol(self) -> Dict[str, any]:
        """Execute complete BB84 protocol"""
        print("=== BB84 Quantum Key Distribution Protocol ===")
        print(f"Distance: {self.channel.distance_km} km")
        print(f"Duration: {self.params.duration_seconds} s")
        
        # Step 1: Alice prepares states
        photons = self.alice_prepare()
        
        # Step 2: Quantum transmission
        received_photons = self.quantum_channel(photons)
        
        # Step 3: Bob measures
        detections = self.bob_measure(received_photons)
        
        # Step 4: Basis reconciliation
        alice_sifted, bob_sifted = self.basis_reconciliation()
        
        if len(alice_sifted) == 0:
            return {"error": "No sifted key generated", "success": False}
        
        # Step 5: Error estimation
        qber = self.error_estimation(alice_sifted, bob_sifted)
        
        # Step 6: Security check
        security_metrics = self.security_analysis()
        
        if not security_metrics['secure']:
            return {
                "error": f"QBER {qber:.4f} exceeds threshold {self.params.qber_threshold}",
                "success": False,
                "metrics": security_metrics
            }
        
        # Step 7: Error correction
        alice_corrected, bob_corrected = self.error_correction(alice_sifted, bob_sifted)
        
        # Step 8: Privacy amplification
        final_key = self.privacy_amplification(alice_corrected)
        
        return {
            "success": True,
            "final_key_bits": len(final_key),
            "metrics": security_metrics,
            "key_rate_bps": security_metrics['secure_key_rate_bps'],
            "efficiency": len(final_key) / len(photons) if photons else 0
        }

def main():
    """Demo BB84 protocol"""
    # Realistic parameters for 50km fiber link
    params = BB84Parameters(
        pulse_rate_hz=1e6,      # 1 MHz (reduced for demo)
        duration_seconds=0.1,   # 100ms
        qber_threshold=0.11
    )
    
    channel = ChannelParameters(
        distance_km=50,
        loss_db_per_km=0.2,
        detector_efficiency=0.8
    )
    
    bb84 = BB84Protocol(params, channel)
    result = bb84.run_protocol()
    
    print("\n=== Results ===")
    if result["success"]:
        print(f"✓ Secure key generated: {result['final_key_bits']} bits")
        print(f"✓ Key rate: {result['key_rate_bps']:.1f} bps")
        print(f"✓ Efficiency: {100*result['efficiency']:.3f}%")
    else:
        print(f"✗ Protocol failed: {result['error']}")
    
    if "metrics" in result:
        metrics = result["metrics"]
        print(f"  QBER: {100*metrics['qber']:.2f}%")
        print(f"  Raw rate: {metrics['raw_key_rate_bps']:.1f} bps")

if __name__ == "__main__":
    main()