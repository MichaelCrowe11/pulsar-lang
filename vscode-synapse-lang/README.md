# Synapse Language for VS Code

The official VS Code extension for Synapse Language - the revolutionary programming language for scientific computing with parallel execution, uncertainty quantification, and quantum computing support.

## ✨ Features

- **Syntax Highlighting** - Full syntax highlighting for Synapse language constructs
- **IntelliSense** - Code completion for keywords, functions, and quantum gates
- **Code Snippets** - Pre-built snippets for common patterns
- **Hover Information** - Detailed documentation on hover
- **Code Lens** - Run buttons and quick actions
- **Custom Themes** - Dark and light themes optimized for Synapse
- **Task Integration** - Built-in tasks for running Synapse files
- **Project Templates** - Quick project scaffolding

## 🚀 Quick Start

1. **Install the extension** from VS Code Marketplace
2. **Install Synapse Language**:
   ```bash
   pip install synapse-lang
   ```
3. **Create a new file** with `.syn` or `.synapse` extension
4. **Start coding** with quantum-enhanced scientific computing!

## 📝 Language Features

### Parallel Execution
```synapse
parallel climate_scenarios:
    branch high_temp:
        temp = 35.0 ± 2.0
        simulate_heat_stress()
    
    branch low_temp:
        temp = 20.0 ± 1.5
        simulate_normal_conditions()
    
    merge with ensemble_average
```

### Uncertainty Quantification
```synapse
uncertain measurement = 42.3 ± 0.5
uncertain background = 1.2 ± 0.1

result = measurement - background
propagate uncertainty:
    method = "monte_carlo"
    samples = 10000
```

### Quantum Computing
```synapse
quantum circuit bell_state:
    qubits: 2
    h 0          # Hadamard on qubit 0
    cx 0, 1      # CNOT gate
    measure all  # Measure both qubits
```

### Scientific Reasoning
```synapse
hypothesis drug_efficacy:
    premise: "New drug shows 80% success rate"
    test: clinical_trial_results > 0.75
    conclude: recommend_approval()
```

## 🎯 Extension Commands

- `Synapse: Run File` (Ctrl+F5) - Execute current Synapse file
- `Synapse: Run Selection` (F5) - Execute selected code
- `Synapse: Show Documentation` - Open Synapse documentation
- `Synapse: New Project` - Create new Synapse project

## ⚙️ Configuration

Configure the extension in VS Code settings:

```json
{
    "synapse.interpreter.path": "synapse",
    "synapse.linting.enabled": true,
    "synapse.formatting.enabled": true,
    "synapse.intellisense.enabled": true
}
```

## 🎨 Themes

The extension includes custom themes optimized for Synapse:

- **Synapse Dark** - Dark theme with quantum-inspired colors
- **Synapse Light** - Clean light theme for scientific work

## 📚 Code Snippets

Type these prefixes and press Tab:

- `hypothesis` - Create hypothesis block
- `experiment` - Create experiment structure  
- `parallel` - Parallel execution branches
- `quantum` - Quantum circuit definition
- `uncertain` - Uncertain value declaration
- `pipeline` - Processing pipeline
- `montecarlo` - Monte Carlo simulation

## 🔧 Requirements

- VS Code 1.60.0 or higher
- Python 3.8+
- Synapse Language: `pip install synapse-lang`

## 🌟 Example Projects

### Climate Modeling
```synapse
# Climate uncertainty analysis
uncertain global_temp = 14.5 ± 0.3
uncertain co2_levels = 415 ± 5

parallel scenarios:
    branch optimistic:
        temp_rise = 1.5 ± 0.2
    branch pessimistic:
        temp_rise = 3.5 ± 0.5
```

### Quantum Algorithm
```synapse
# Quantum phase estimation
quantum circuit qpe:
    qubits: 4
    # Prepare eigenstate
    x 0
    # Apply controlled unitaries
    for i in range(3):
        cu1(2*π/2^(i+1)) i+1, 0
    # Inverse QFT
    qft_inverse(1, 3)
    measure all
```

### Drug Discovery
```synapse
# Molecular simulation with uncertainty
experiment drug_binding:
    setup:
        uncertain binding_affinity = 8.5 ± 0.3
        uncertain selectivity = 0.85 ± 0.05
    
    run:
        docking_score = simulate_docking()
        toxicity = predict_toxicity()
    
    analyze:
        if docking_score > 7.0 and toxicity < 0.1:
            conclusion = "promising_candidate"
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](https://github.com/MichaelCrowe11/vscode-synapse-lang/blob/main/CONTRIBUTING.md).

## 📖 Documentation

- [Synapse Language Website](https://synapse-lang.com)
- [Language Specification](https://github.com/MichaelCrowe11/synapse-lang/blob/master/LANGUAGE_SPEC.md)
- [API Reference](https://github.com/MichaelCrowe11/synapse-lang#api-reference)
- [Examples](https://github.com/MichaelCrowe11/synapse-lang/tree/master/examples)

## 📄 License

This extension is licensed under the MIT License. The Synapse Language itself is proprietary - see [synapse-lang.com](https://synapse-lang.com) for licensing information.

## 🚀 What's New

### Version 1.0.0
- Initial release
- Full syntax highlighting
- IntelliSense support
- Code snippets
- Custom themes
- Task integration
- Project templates

---

**Enjoy quantum-enhanced scientific computing with Synapse! ⚛️🧠🌟**

[Report Issues](https://github.com/MichaelCrowe11/vscode-synapse-lang/issues) | [Request Features](https://github.com/MichaelCrowe11/vscode-synapse-lang/issues) | [Join Discord](https://discord.gg/synapse-lang)