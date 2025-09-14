// Bell State Example - Synapse Qubit Flow
circuit bell_state(2) {
    H [0];
    CNOT [0, 1];
    measure [0, 1] into results;
}

backend {
    provider: Simulator,
    shots: 1000
}