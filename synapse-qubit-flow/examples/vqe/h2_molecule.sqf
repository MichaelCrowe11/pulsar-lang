// VQE for H2 molecule - Synapse Qubit Flow
circuit h2_ansatz(4) (angle theta1, angle theta2) {
    X [0];
    X [1];
    RY [0] (theta1);
    RY [1] (theta2);
    CNOT [0, 1];
    CNOT [2, 3];
    RY [2] (theta1);
    RY [3] (theta2);
}

vqe {
    ansatz: h2_ansatz,
    hamiltonian: -1.0523 I + 0.3979 Z0*Z1 - 0.3979 Z0*Z2 - 0.0113 Z0*Z3,
    optimizer: COBYLA {
        maxIterations: 1000,
        tolerance: 1e-6
    }
}

backend {
    provider: IBM,
    device: "ibmq_qasm_simulator",
    shots: 8192,
    optimization: true
}