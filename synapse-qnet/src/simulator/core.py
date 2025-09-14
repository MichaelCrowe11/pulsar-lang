"""
Synapse QNet Core Simulator
Quantum network simulation engine with modular architecture
"""

import numpy as np
import networkx as nx
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field
from abc import ABC, abstractmethod
import json
import time
from enum import Enum

class NodeType(Enum):
    """Types of quantum network nodes"""
    ENDPOINT = "endpoint"
    REPEATER = "quantum_repeater"
    SOURCE = "entanglement_source"
    DETECTOR = "detector"

class ChannelType(Enum):
    """Types of quantum channels"""
    FIBER = "fiber"
    FREE_SPACE = "free_space"
    SATELLITE = "satellite"

@dataclass
class QubitState:
    """Quantum state representation"""
    amplitudes: np.ndarray = field(default_factory=lambda: np.array([1.0, 0.0], dtype=complex))
    creation_time: float = 0.0
    coherence_time: float = float('inf')
    fidelity: float = 1.0
    
    def is_coherent(self, current_time: float) -> bool:
        """Check if qubit is still coherent"""
        return (current_time - self.creation_time) < self.coherence_time

@dataclass
class NetworkNode:
    """Network node with quantum capabilities"""
    node_id: str
    node_type: NodeType
    location: Tuple[float, float] = (0.0, 0.0)  # GPS coordinates
    
    # Quantum memory
    memory_qubits: int = 1
    coherence_time_ms: float = 10.0
    gate_fidelity: float = 0.99
    
    # Detection parameters (for endpoints)
    detection_efficiency: float = 0.8
    dark_count_rate: float = 1e-6
    timing_resolution_ps: float = 100.0
    
    # Internal state
    stored_qubits: List[QubitState] = field(default_factory=list)
    measurement_results: List[Dict] = field(default_factory=list)

@dataclass
class QuantumChannel:
    """Quantum channel between nodes"""
    channel_id: str
    source_node: str
    target_node: str
    channel_type: ChannelType
    
    # Physical parameters
    length_km: float = 0.0
    loss_db_per_km: float = 0.2
    depolarization_rate: float = 0.001
    timing_jitter_ns: float = 100.0
    
    # Calculated properties
    transmission_probability: float = field(init=False)
    propagation_delay_ms: float = field(init=False)
    
    def __post_init__(self):
        """Calculate derived parameters"""
        # Transmission probability from loss
        total_loss_db = self.loss_db_per_km * self.length_km
        self.transmission_probability = 10 ** (-total_loss_db / 10)
        
        # Propagation delay (speed of light in fiber ≈ 200,000 km/s)
        speed_of_light_fiber = 200000  # km/s
        self.propagation_delay_ms = self.length_km / speed_of_light_fiber * 1000

class QuantumProtocol(ABC):
    """Abstract base class for quantum protocols"""
    
    @abstractmethod
    def execute(self, simulator: 'QuantumNetworkSimulator', 
                nodes: List[str], **kwargs) -> Dict[str, Any]:
        """Execute the protocol"""
        pass

class SimulationMetrics:
    """Collect and analyze simulation metrics"""
    
    def __init__(self):
        self.start_time = time.time()
        self.metrics = {
            'photons_generated': 0,
            'photons_transmitted': 0,
            'photons_detected': 0,
            'entangled_pairs_created': 0,
            'bell_tests_performed': 0,
            'key_bits_generated': 0,
            'protocol_successes': 0,
            'protocol_failures': 0,
            'average_fidelity': [],
            'channel_utilization': {},
        }
    
    def record_photon_generation(self, count: int = 1):
        """Record photon generation event"""
        self.metrics['photons_generated'] += count
    
    def record_photon_transmission(self, channel_id: str, count: int = 1):
        """Record successful photon transmission"""
        self.metrics['photons_transmitted'] += count
        if channel_id not in self.metrics['channel_utilization']:
            self.metrics['channel_utilization'][channel_id] = 0
        self.metrics['channel_utilization'][channel_id] += count
    
    def record_photon_detection(self, count: int = 1):
        """Record photon detection event"""
        self.metrics['photons_detected'] += count
    
    def record_entanglement_creation(self, fidelity: float):
        """Record entangled pair creation"""
        self.metrics['entangled_pairs_created'] += 1
        self.metrics['average_fidelity'].append(fidelity)
    
    def record_bell_test(self, s_parameter: float):
        """Record Bell inequality test"""
        self.metrics['bell_tests_performed'] += 1
        if 'bell_violations' not in self.metrics:
            self.metrics['bell_violations'] = []
        self.metrics['bell_violations'].append(s_parameter)
    
    def record_key_generation(self, bits: int):
        """Record key bit generation"""
        self.metrics['key_bits_generated'] += bits
    
    def record_protocol_result(self, success: bool):
        """Record protocol execution result"""
        if success:
            self.metrics['protocol_successes'] += 1
        else:
            self.metrics['protocol_failures'] += 1
    
    def get_summary(self) -> Dict[str, Any]:
        """Get summary statistics"""
        elapsed_time = time.time() - self.start_time
        
        summary = {
            'simulation_duration_s': elapsed_time,
            'total_photons_generated': self.metrics['photons_generated'],
            'transmission_efficiency': (
                self.metrics['photons_transmitted'] / max(1, self.metrics['photons_generated'])
            ),
            'detection_efficiency': (
                self.metrics['photons_detected'] / max(1, self.metrics['photons_transmitted'])
            ),
            'entangled_pairs_created': self.metrics['entangled_pairs_created'],
            'average_entanglement_fidelity': (
                np.mean(self.metrics['average_fidelity']) 
                if self.metrics['average_fidelity'] else 0.0
            ),
            'key_generation_rate_bps': (
                self.metrics['key_bits_generated'] / max(1, elapsed_time)
            ),
            'protocol_success_rate': (
                self.metrics['protocol_successes'] / 
                max(1, self.metrics['protocol_successes'] + self.metrics['protocol_failures'])
            ),
            'bell_tests_performed': self.metrics['bell_tests_performed'],
            'channel_utilization': self.metrics['channel_utilization'],
        }
        
        if 'bell_violations' in self.metrics:
            summary['average_bell_parameter'] = np.mean(self.metrics['bell_violations'])
        
        return summary

class QuantumNetworkSimulator:
    """Main quantum network simulator"""
    
    def __init__(self, simulation_config: Dict[str, Any] = None):
        self.nodes: Dict[str, NetworkNode] = {}
        self.channels: Dict[str, QuantumChannel] = {}
        self.protocols: Dict[str, QuantumProtocol] = {}
        self.topology = nx.Graph()
        
        # Simulation parameters
        self.config = simulation_config or self._default_config()
        self.current_time = 0.0
        self.time_step = self.config.get('time_step_ns', 1.0) * 1e-9  # Convert to seconds
        
        # Metrics collection
        self.metrics = SimulationMetrics()
        
        # Random number generator for reproducibility
        self.rng = np.random.RandomState(self.config.get('random_seed', 42))
    
    def _default_config(self) -> Dict[str, Any]:
        """Default simulation configuration"""
        return {
            'duration_seconds': 1.0,
            'time_step_ns': 1.0,
            'random_seed': 42,
            'enable_decoherence': True,
            'enable_noise': True,
            'output_format': 'json',
            'verbose': True
        }
    
    def add_node(self, node: NetworkNode) -> None:
        """Add a node to the network"""
        self.nodes[node.node_id] = node
        self.topology.add_node(node.node_id, **{
            'type': node.node_type.value,
            'location': node.location,
            'memory_qubits': node.memory_qubits
        })
        
        if self.config.get('verbose'):
            print(f"Added node {node.node_id} ({node.node_type.value})")
    
    def add_channel(self, channel: QuantumChannel) -> None:
        """Add a quantum channel to the network"""
        self.channels[channel.channel_id] = channel
        self.topology.add_edge(channel.source_node, channel.target_node, **{
            'channel_id': channel.channel_id,
            'type': channel.channel_type.value,
            'length_km': channel.length_km,
            'transmission_prob': channel.transmission_probability
        })
        
        if self.config.get('verbose'):
            print(f"Added channel {channel.channel_id}: {channel.source_node} -> {channel.target_node}")
    
    def register_protocol(self, name: str, protocol: QuantumProtocol) -> None:
        """Register a quantum protocol"""
        self.protocols[name] = protocol
        
        if self.config.get('verbose'):
            print(f"Registered protocol: {name}")
    
    def calculate_distance(self, node1_id: str, node2_id: str) -> float:
        """Calculate great circle distance between two nodes"""
        if node1_id not in self.nodes or node2_id not in self.nodes:
            return float('inf')
        
        lat1, lon1 = self.nodes[node1_id].location
        lat2, lon2 = self.nodes[node2_id].location
        
        # Haversine formula for great circle distance
        R = 6371  # Earth's radius in km
        
        lat1_rad, lat2_rad = np.radians(lat1), np.radians(lat2)
        dlat = np.radians(lat2 - lat1)
        dlon = np.radians(lon2 - lon1)
        
        a = (np.sin(dlat/2)**2 + 
             np.cos(lat1_rad) * np.cos(lat2_rad) * np.sin(dlon/2)**2)
        c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1-a))
        
        return R * c
    
    def generate_photon(self, node_id: str, state: QubitState = None) -> QubitState:
        """Generate a photon at a node"""
        if state is None:
            state = QubitState(creation_time=self.current_time)
        
        self.metrics.record_photon_generation()
        
        if self.config.get('verbose'):
            print(f"Photon generated at {node_id} (t={self.current_time:.3f}s)")
        
        return state
    
    def transmit_photon(self, photon: QubitState, channel_id: str) -> Optional[QubitState]:
        """Transmit photon through quantum channel"""
        if channel_id not in self.channels:
            return None
        
        channel = self.channels[channel_id]
        
        # Check transmission probability
        if self.rng.random() > channel.transmission_probability:
            return None  # Photon lost
        
        # Apply channel noise
        if self.config.get('enable_noise'):
            photon = self._apply_channel_noise(photon, channel)
        
        # Update timing
        photon.creation_time += channel.propagation_delay_ms * 1e-3
        
        self.metrics.record_photon_transmission(channel_id)
        
        return photon
    
    def _apply_channel_noise(self, photon: QubitState, channel: QuantumChannel) -> QubitState:
        """Apply noise models to photon during transmission"""
        # Depolarization noise
        if self.rng.random() < channel.depolarization_rate:
            # Randomly flip the state
            photon.fidelity *= 0.5  # Simplified fidelity reduction
            
            # Apply random Pauli operation
            pauli_choice = self.rng.randint(0, 3)
            if pauli_choice == 0:  # Pauli-X
                photon.amplitudes = np.array([photon.amplitudes[1], photon.amplitudes[0]])
            elif pauli_choice == 1:  # Pauli-Y
                photon.amplitudes = np.array([-1j*photon.amplitudes[1], 1j*photon.amplitudes[0]])
            elif pauli_choice == 2:  # Pauli-Z
                photon.amplitudes = np.array([photon.amplitudes[0], -photon.amplitudes[1]])
        
        return photon
    
    def detect_photon(self, photon: QubitState, node_id: str) -> Optional[Dict[str, Any]]:
        """Detect photon at a node"""
        if node_id not in self.nodes:
            return None
        
        node = self.nodes[node_id]
        
        # Check detection efficiency
        if self.rng.random() > node.detection_efficiency:
            return None  # Detection failed
        
        # Check if photon is still coherent
        if (self.config.get('enable_decoherence') and 
            not photon.is_coherent(self.current_time)):
            return None
        
        # Perform measurement (simplified - assumes computational basis)
        prob_0 = abs(photon.amplitudes[0])**2
        result = 0 if self.rng.random() < prob_0 else 1
        
        detection_event = {
            'node_id': node_id,
            'timestamp': self.current_time,
            'result': result,
            'fidelity': photon.fidelity,
            'dark_count': False
        }
        
        node.measurement_results.append(detection_event)
        self.metrics.record_photon_detection()
        
        if self.config.get('verbose'):
            print(f"Photon detected at {node_id}: result={result} (t={self.current_time:.3f}s)")
        
        return detection_event
    
    def create_entangled_pair(self, source_node_id: str) -> Tuple[QubitState, QubitState]:
        """Create an entangled photon pair"""
        # Create |Φ+⟩ = (|00⟩ + |11⟩)/√2 state
        fidelity = 0.98  # Typical SPDC source fidelity
        
        # Simplified representation - in practice would use density matrices
        photon1 = QubitState(
            amplitudes=np.array([1/np.sqrt(2), 0], dtype=complex),
            creation_time=self.current_time,
            fidelity=fidelity
        )
        
        photon2 = QubitState(
            amplitudes=np.array([0, 1/np.sqrt(2)], dtype=complex),
            creation_time=self.current_time,
            fidelity=fidelity
        )
        
        self.metrics.record_entanglement_creation(fidelity)
        
        if self.config.get('verbose'):
            print(f"Entangled pair created at {source_node_id} (t={self.current_time:.3f}s)")
        
        return photon1, photon2
    
    def execute_protocol(self, protocol_name: str, nodes: List[str], **kwargs) -> Dict[str, Any]:
        """Execute a quantum protocol"""
        if protocol_name not in self.protocols:
            raise ValueError(f"Protocol {protocol_name} not registered")
        
        protocol = self.protocols[protocol_name]
        
        if self.config.get('verbose'):
            print(f"Executing protocol {protocol_name} with nodes {nodes}")
        
        try:
            result = protocol.execute(self, nodes, **kwargs)
            self.metrics.record_protocol_result(True)
            return result
        except Exception as e:
            self.metrics.record_protocol_result(False)
            return {'error': str(e), 'success': False}
    
    def run_simulation(self) -> Dict[str, Any]:
        """Run the complete simulation"""
        duration = self.config['duration_seconds']
        total_steps = int(duration / self.time_step)
        
        if self.config.get('verbose'):
            print(f"Starting simulation: {duration}s ({total_steps} steps)")
        
        for step in range(total_steps):
            self.current_time = step * self.time_step
            
            # Update decoherence for all stored qubits
            if self.config.get('enable_decoherence'):
                self._update_decoherence()
            
            # Progress indicator
            if self.config.get('verbose') and step % (total_steps // 10) == 0:
                progress = 100 * step / total_steps
                print(f"Simulation progress: {progress:.0f}%")
        
        # Finalize simulation
        self.current_time = duration
        
        if self.config.get('verbose'):
            print("Simulation completed")
        
        return self.get_results()
    
    def _update_decoherence(self):
        """Update quantum state decoherence"""
        for node in self.nodes.values():
            # Remove decoherent qubits from memory
            node.stored_qubits = [
                qubit for qubit in node.stored_qubits 
                if qubit.is_coherent(self.current_time)
            ]
    
    def get_results(self) -> Dict[str, Any]:
        """Get simulation results"""
        results = {
            'simulation_config': self.config,
            'network_topology': {
                'nodes': len(self.nodes),
                'channels': len(self.channels),
                'protocols_registered': len(self.protocols)
            },
            'metrics': self.metrics.get_summary(),
            'node_results': {},
            'channel_results': {}
        }
        
        # Collect per-node results
        for node_id, node in self.nodes.items():
            results['node_results'][node_id] = {
                'measurements': len(node.measurement_results),
                'stored_qubits': len(node.stored_qubits)
            }
        
        # Collect per-channel results
        for channel_id, channel in self.channels.items():
            utilization = self.metrics.metrics['channel_utilization'].get(channel_id, 0)
            results['channel_results'][channel_id] = {
                'photons_transmitted': utilization,
                'transmission_probability': channel.transmission_probability,
                'length_km': channel.length_km
            }
        
        return results
    
    def export_results(self, filename: str = None) -> str:
        """Export simulation results"""
        results = self.get_results()
        
        if filename is None:
            filename = f"synapse_qnet_results_{int(time.time())}.json"
        
        with open(filename, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        if self.config.get('verbose'):
            print(f"Results exported to {filename}")
        
        return filename

def main():
    """Demo the core simulator"""
    print("=== Synapse QNet Core Simulator Demo ===")
    
    # Create simulator
    config = {
        'duration_seconds': 0.1,
        'time_step_ns': 100.0,
        'verbose': True
    }
    simulator = QuantumNetworkSimulator(config)
    
    # Add nodes
    alice = NetworkNode("Alice", NodeType.ENDPOINT, location=(40.7128, -74.0060))
    bob = NetworkNode("Bob", NodeType.ENDPOINT, location=(51.5074, -0.1278))
    
    simulator.add_node(alice)
    simulator.add_node(bob)
    
    # Calculate distance and add channel
    distance = simulator.calculate_distance("Alice", "Bob")
    channel = QuantumChannel("AliceBob", "Alice", "Bob", ChannelType.FIBER, length_km=distance)
    simulator.add_channel(channel)
    
    # Test photon transmission
    photon = simulator.generate_photon("Alice")
    transmitted_photon = simulator.transmit_photon(photon, "AliceBob")
    
    if transmitted_photon:
        detection = simulator.detect_photon(transmitted_photon, "Bob")
        if detection:
            print(f"Successful transmission: {detection}")
    
    # Run simulation
    results = simulator.run_simulation()
    
    print("\n=== Simulation Results ===")
    metrics = results['metrics']
    print(f"Photons generated: {metrics['total_photons_generated']}")
    print(f"Transmission efficiency: {100*metrics['transmission_efficiency']:.1f}%")
    print(f"Detection efficiency: {100*metrics['detection_efficiency']:.1f}%")
    
    # Export results
    filename = simulator.export_results()
    print(f"Detailed results saved to: {filename}")

if __name__ == "__main__":
    main()