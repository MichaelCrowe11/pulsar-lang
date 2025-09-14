// QAOA for Max-Cut Problem - Synapse Qubit Flow
qaoa {
    problem: graph {
        nodes: [0, 1, 2, 3],
        edges: [
            (0, 1, 1.0),
            (1, 2, 1.5),
            (2, 3, 1.2),
            (3, 0, 0.8)
        ]
    },
    layers: 3
}

backend {
    provider: IonQ,
    device: "ionq_simulator",
    shots: 4096
}