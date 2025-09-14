#!/usr/bin/env python3
"""
Synapse QNet CLI - Quantum Network Simulation Tool
Phase 0 Free Version - Command Line Interface
"""

import argparse
import json
import sys
import os
from pathlib import Path
from typing import Dict, Any

# Add src directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from simulator.core import QuantumNetworkSimulator, NetworkNode, QuantumChannel, NodeType, ChannelType
from protocols.bb84 import BB84Protocol, BB84Parameters, ChannelParameters as BB84ChannelParams
from protocols.e91 import E91Protocol, E91Parameters, ChannelParameters as E91ChannelParams
from lexer import SynapseQLexer

__version__ = "1.0.0-beta"

class SynapseQNetCLI:
    """Main CLI application for Synapse QNet"""
    
    def __init__(self):
        self.simulator = None
        self.verbose = False
    
    def create_parser(self) -> argparse.ArgumentParser:
        """Create argument parser"""
        parser = argparse.ArgumentParser(
            prog='synapse',
            description='Synapse QNet - Quantum Network Simulation Platform',
            formatter_class=argparse.RawDescriptionHelpFormatter,
            epilog='''
Examples:
  synapse run bb84_demo.sqn --duration 1.0 --output results.json
  synapse compile network.sqn --validate
  synapse protocol bb84 --distance 50 --duration 1.0
  synapse protocol e91 --alice-dist 25 --bob-dist 25

For more information, visit: https://synapse-qnet.ai
            '''
        )
        
        parser.add_argument('--version', action='version', version=f'Synapse QNet {__version__}')
        parser.add_argument('-v', '--verbose', action='store_true', help='Enable verbose output')
        
        subparsers = parser.add_subparsers(dest='command', help='Available commands')
        
        # Compile command
        compile_parser = subparsers.add_parser('compile', help='Compile Synapse QNet file')
        compile_parser.add_argument('file', help='Input .sqn file to compile')
        compile_parser.add_argument('--validate', action='store_true', help='Validate syntax only')
        compile_parser.add_argument('--output', '-o', help='Output file for compiled network')
        
        # Run command
        run_parser = subparsers.add_parser('run', help='Run simulation')
        run_parser.add_argument('file', nargs='?', help='Synapse QNet file to run')
        run_parser.add_argument('--duration', type=float, default=1.0, help='Simulation duration (seconds)')
        run_parser.add_argument('--output', '-o', help='Output file for results')
        run_parser.add_argument('--format', choices=['json', 'csv', 'yaml'], default='json', help='Output format')
        
        # Protocol command for direct protocol execution
        protocol_parser = subparsers.add_parser('protocol', help='Run protocol directly')
        protocol_subparsers = protocol_parser.add_subparsers(dest='protocol_type', help='Protocol type')
        
        # BB84 protocol
        bb84_parser = protocol_subparsers.add_parser('bb84', help='Run BB84 QKD protocol')
        bb84_parser.add_argument('--distance', type=float, default=50.0, help='Fiber distance (km)')
        bb84_parser.add_argument('--duration', type=float, default=1.0, help='Protocol duration (s)')
        bb84_parser.add_argument('--pulse-rate', type=float, default=1e6, help='Pulse rate (Hz)')
        bb84_parser.add_argument('--loss', type=float, default=0.2, help='Fiber loss (dB/km)')
        bb84_parser.add_argument('--efficiency', type=float, default=0.8, help='Detector efficiency')
        bb84_parser.add_argument('--output', '-o', help='Output file for results')
        
        # E91 protocol
        e91_parser = protocol_subparsers.add_parser('e91', help='Run E91 QKD protocol')
        e91_parser.add_argument('--alice-dist', type=float, default=25.0, help='Alice distance (km)')
        e91_parser.add_argument('--bob-dist', type=float, default=25.0, help='Bob distance (km)')
        e91_parser.add_argument('--duration', type=float, default=1.0, help='Protocol duration (s)')
        e91_parser.add_argument('--pair-rate', type=float, default=1e5, help='Pair generation rate (Hz)')
        e91_parser.add_argument('--loss', type=float, default=0.2, help='Fiber loss (dB/km)')
        e91_parser.add_argument('--efficiency', type=float, default=0.8, help='Detector efficiency')
        e91_parser.add_argument('--output', '-o', help='Output file for results')
        
        # Info command
        info_parser = subparsers.add_parser('info', help='Show system information')
        info_parser.add_argument('--protocols', action='store_true', help='List available protocols')
        info_parser.add_argument('--examples', action='store_true', help='Show example files')
        
        # Demo command
        demo_parser = subparsers.add_parser('demo', help='Run demonstration simulations')
        demo_parser.add_argument('type', nargs='?', choices=['bb84', 'e91', 'network'], default='bb84',
                               help='Demo type to run')
        
        return parser
    
    def compile_file(self, args) -> int:
        """Compile a Synapse QNet file"""
        if not os.path.exists(args.file):
            print(f"Error: File {args.file} not found", file=sys.stderr)
            return 1
        
        try:
            with open(args.file, 'r') as f:
                content = f.read()
            
            # Tokenize the file
            lexer = SynapseQLexer(content)
            tokens = lexer.tokenize()
            
            if args.validate:
                print(f"✓ Syntax validation passed for {args.file}")
                return 0
            
            # For now, just show tokens (parser not implemented yet)
            print(f"Compiled {args.file}:")
            print(f"  Tokens: {len(tokens)}")
            
            if args.output:
                token_data = [
                    {
                        'type': token.type.name,
                        'value': token.value,
                        'line': token.line,
                        'column': token.column
                    }
                    for token in tokens
                ]
                
                with open(args.output, 'w') as f:
                    json.dump({'tokens': token_data}, f, indent=2)
                
                print(f"  Output saved to: {args.output}")
            
            return 0
            
        except Exception as e:
            print(f"Compilation error: {e}", file=sys.stderr)
            return 1
    
    def run_simulation(self, args) -> int:
        """Run a simulation"""
        if args.file:
            return self.compile_file(args)  # For now, compile instead of run
        
        # Run a basic demonstration
        print("Running basic quantum network simulation...")
        
        config = {
            'duration_seconds': args.duration,
            'verbose': self.verbose
        }
        
        simulator = QuantumNetworkSimulator(config)
        results = simulator.run_simulation()
        
        if args.output:
            self.save_results(results, args.output, args.format)
        else:
            self.print_results(results)
        
        return 0
    
    def run_protocol(self, args) -> int:
        """Run a specific protocol"""
        if args.protocol_type == 'bb84':
            return self.run_bb84(args)
        elif args.protocol_type == 'e91':
            return self.run_e91(args)
        else:
            print("Error: Protocol type required", file=sys.stderr)
            return 1
    
    def run_bb84(self, args) -> int:
        """Run BB84 protocol"""
        print("=== BB84 Quantum Key Distribution ===")
        print(f"Distance: {args.distance} km")
        print(f"Duration: {args.duration} s")
        
        # Set up parameters
        params = BB84Parameters(
            pulse_rate_hz=args.pulse_rate,
            duration_seconds=args.duration
        )
        
        channel = BB84ChannelParams(
            distance_km=args.distance,
            loss_db_per_km=args.loss,
            detector_efficiency=args.efficiency
        )
        
        # Run protocol
        bb84 = BB84Protocol(params, channel)
        result = bb84.run_protocol()
        
        # Display results
        print("\n=== Results ===")
        if result['success']:
            print(f"✓ Protocol succeeded")
            print(f"  Final key: {result['final_key_bits']} bits")
            print(f"  Key rate: {result['key_rate_bps']:.2f} bps")
            print(f"  Efficiency: {100*result['efficiency']:.3f}%")
        else:
            print(f"✗ Protocol failed: {result.get('error', 'Unknown error')}")
        
        # Save results
        if args.output:
            self.save_results(result, args.output, 'json')
        
        return 0 if result['success'] else 1
    
    def run_e91(self, args) -> int:
        """Run E91 protocol"""
        print("=== E91 Quantum Key Distribution ===")
        print(f"Alice distance: {args.alice_dist} km")
        print(f"Bob distance: {args.bob_dist} km")
        print(f"Duration: {args.duration} s")
        
        # Set up parameters
        params = E91Parameters(
            pair_generation_rate_hz=args.pair_rate,
            duration_seconds=args.duration,
            detection_efficiency=args.efficiency
        )
        
        channel = E91ChannelParams(
            alice_distance_km=args.alice_dist,
            bob_distance_km=args.bob_dist,
            loss_db_per_km=args.loss
        )
        
        # Run protocol
        e91 = E91Protocol(params, channel)
        result = e91.run_protocol()
        
        # Display results
        print("\n=== Results ===")
        if result['success']:
            print(f"✓ Protocol succeeded")
            print(f"  Final key: {result['final_key_bits']} bits")
            print(f"  Bell parameter: {result['bell_parameter']:.3f}")
            print(f"  Efficiency: {100*result['efficiency']:.3f}%")
        else:
            print(f"✗ Protocol failed: {result.get('error', 'Unknown error')}")
            if 'bell_parameter' in result:
                print(f"  Bell parameter: {result['bell_parameter']:.3f}")
        
        # Save results
        if args.output:
            self.save_results(result, args.output, 'json')
        
        return 0 if result['success'] else 1
    
    def show_info(self, args) -> int:
        """Show system information"""
        print(f"Synapse QNet {__version__}")
        print("Quantum Network Simulation Platform")
        print()
        
        if args.protocols:
            print("Available Protocols:")
            print("  bb84    - Bennett-Brassard 1984 QKD protocol")
            print("  e91     - Ekert 1991 entanglement-based QKD")
            print()
        
        if args.examples:
            print("Example Commands:")
            print("  synapse protocol bb84 --distance 50 --duration 1.0")
            print("  synapse protocol e91 --alice-dist 25 --bob-dist 25")
            print("  synapse demo bb84")
            print()
        
        print("System Information:")
        print(f"  Python: {sys.version.split()[0]}")
        print(f"  Platform: {sys.platform}")
        
        try:
            import numpy as np
            print(f"  NumPy: {np.__version__}")
        except ImportError:
            print("  NumPy: Not available")
        
        try:
            import networkx as nx
            print(f"  NetworkX: {nx.__version__}")
        except ImportError:
            print("  NetworkX: Not available")
        
        return 0
    
    def run_demo(self, args) -> int:
        """Run demonstration"""
        if args.type == 'bb84':
            print("Running BB84 demonstration...")
            demo_args = argparse.Namespace(
                distance=50.0, duration=0.1, pulse_rate=1e6,
                loss=0.2, efficiency=0.8, output=None, protocol_type='bb84'
            )
            return self.run_bb84(demo_args)
        
        elif args.type == 'e91':
            print("Running E91 demonstration...")
            demo_args = argparse.Namespace(
                alice_dist=25.0, bob_dist=25.0, duration=0.1, pair_rate=1e5,
                loss=0.2, efficiency=0.8, output=None, protocol_type='e91'
            )
            return self.run_e91(demo_args)
        
        elif args.type == 'network':
            print("Running network simulation demonstration...")
            demo_args = argparse.Namespace(
                file=None, duration=0.1, output=None, format='json'
            )
            return self.run_simulation(demo_args)
        
        return 0
    
    def save_results(self, results: Dict[str, Any], filename: str, format: str):
        """Save results to file"""
        if format == 'json':
            with open(filename, 'w') as f:
                json.dump(results, f, indent=2, default=str)
        elif format == 'csv':
            # Simplified CSV export for metrics
            import csv
            with open(filename, 'w', newline='') as f:
                if 'metrics' in results:
                    writer = csv.DictWriter(f, fieldnames=results['metrics'].keys())
                    writer.writeheader()
                    writer.writerow(results['metrics'])
        elif format == 'yaml':
            try:
                import yaml
                with open(filename, 'w') as f:
                    yaml.dump(results, f, default_flow_style=False)
            except ImportError:
                print("Warning: PyYAML not available, saving as JSON")
                with open(filename, 'w') as f:
                    json.dump(results, f, indent=2, default=str)
        
        print(f"Results saved to: {filename}")
    
    def print_results(self, results: Dict[str, Any]):
        """Print results to console"""
        print("\n=== Simulation Results ===")
        
        if 'metrics' in results:
            metrics = results['metrics']
            print(f"Duration: {metrics.get('simulation_duration_s', 0):.3f} s")
            print(f"Photons generated: {metrics.get('total_photons_generated', 0)}")
            print(f"Transmission efficiency: {100*metrics.get('transmission_efficiency', 0):.1f}%")
            print(f"Detection efficiency: {100*metrics.get('detection_efficiency', 0):.1f}%")
            print(f"Key generation rate: {metrics.get('key_generation_rate_bps', 0):.2f} bps")
    
    def run(self) -> int:
        """Main entry point"""
        parser = self.create_parser()
        
        if len(sys.argv) == 1:
            parser.print_help()
            return 0
        
        args = parser.parse_args()
        self.verbose = args.verbose
        
        # Route to appropriate handler
        if args.command == 'compile':
            return self.compile_file(args)
        elif args.command == 'run':
            return self.run_simulation(args)
        elif args.command == 'protocol':
            return self.run_protocol(args)
        elif args.command == 'info':
            return self.show_info(args)
        elif args.command == 'demo':
            return self.run_demo(args)
        else:
            parser.print_help()
            return 1

def main():
    """CLI entry point"""
    try:
        cli = SynapseQNetCLI()
        return cli.run()
    except KeyboardInterrupt:
        print("\nInterrupted by user")
        return 130
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    sys.exit(main())