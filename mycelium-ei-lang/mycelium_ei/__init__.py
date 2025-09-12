"""
Mycelium-EI-Lang: Bio-Inspired Programming Language with Quantum Computing
Copyright (c) 2024 Michael Benjamin Crowe. All Rights Reserved.

This module provides the core functionality for the Mycelium-EI-Lang interpreter.
"""

__version__ = "0.1.0"
__author__ = "Michael Benjamin Crowe"
__license__ = "Proprietary"

import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mycelium_interpreter import Interpreter
from bio_algorithms import BiologicalOptimizer
from bio_ml_integration import BiologicalMLOptimizer
from quantum_bio_computing import QuantumBiologicalProcessor
from cultivation_monitor import CultivationMonitoringPlatform
from network_framework import MyceliumNetwork

# Public API
__all__ = [
    "Interpreter",
    "BiologicalOptimizer",
    "BiologicalMLOptimizer",
    "QuantumBiologicalProcessor",
    "CultivationMonitoringPlatform",
    "MyceliumNetwork",
    "run_file",
    "run_code",
    "main",
]

def run_file(filename: str) -> None:
    """Run a Mycelium-EI-Lang file"""
    with open(filename, 'r') as f:
        source = f.read()
    run_code(source)

def run_code(source: str) -> None:
    """Run Mycelium-EI-Lang code"""
    interpreter = Interpreter()
    interpreter.interpret(source)

def main():
    """Main entry point for command-line usage"""
    if len(sys.argv) < 2:
        print("Mycelium-EI-Lang Interpreter v" + __version__)
        print("Copyright (c) 2024 Michael Benjamin Crowe")
        print("\nUsage: mycelium <file.myc>")
        print("   or: myc <file.myc>")
        sys.exit(1)
    
    filename = sys.argv[1]
    if not os.path.exists(filename):
        print(f"Error: File '{filename}' not found")
        sys.exit(1)
    
    try:
        run_file(filename)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()