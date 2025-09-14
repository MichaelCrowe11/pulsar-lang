import * as vscode from 'vscode';

export class SynapseHoverProvider implements vscode.HoverProvider {
    
    provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Hover> {
        
        const wordRange = document.getWordRangeAtPosition(position);
        const word = document.getText(wordRange);
        
        if (!word) {
            return;
        }
        
        const hoverInfo = this.getHoverInfo(word);
        if (hoverInfo) {
            return new vscode.Hover(hoverInfo, wordRange);
        }
        
        return;
    }
    
    private getHoverInfo(word: string): vscode.MarkdownString | undefined {
        const keywords = this.getKeywordInfo();
        const functions = this.getFunctionInfo();
        const quantumGates = this.getQuantumGateInfo();
        
        const allInfo = { ...keywords, ...functions, ...quantumGates };
        
        if (word in allInfo) {
            return new vscode.MarkdownString(allInfo[word]);
        }
        
        return undefined;
    }
    
    private getKeywordInfo(): Record<string, string> {
        return {
            'hypothesis': '**Hypothesis Block**\\n\\nDefines a scientific hypothesis for testing.\\n\\n```synapse\\nhypothesis name:\\n    premise: condition\\n    test: validation\\n    conclude: result\\n```',
            'experiment': '**Experiment Block**\\n\\nStructures a scientific experiment.\\n\\n```synapse\\nexperiment name:\\n    setup:\\n        # preparation code\\n    run:\\n        # execution code\\n    analyze:\\n        # analysis code\\n```',
            'parallel': '**Parallel Execution**\\n\\nExecutes multiple branches simultaneously.\\n\\n```synapse\\nparallel name:\\n    branch a: code_a()\\n    branch b: code_b()\\n    merge with strategy\\n```',
            'uncertain': '**Uncertain Value**\\n\\nRepresents a value with uncertainty.\\n\\n```synapse\\nuncertain x = 42.3 ± 0.5\\n```',
            'quantum': '**Quantum Computing**\\n\\nQuantum circuit definition and execution.\\n\\n```synapse\\nquantum circuit name:\\n    qubits: 2\\n    h 0\\n    cx 0, 1\\n    measure all\\n```',
            'pipeline': '**Processing Pipeline**\\n\\nDefines a multi-stage processing pipeline.\\n\\n```synapse\\npipeline name:\\n    stage input: load_data()\\n    stage process: transform()\\n    stage output: save_results()\\n```',
            'propagate': '**Uncertainty Propagation**\\n\\nPropagates uncertainty through calculations.\\n\\n```synapse\\npropagate uncertainty:\\n    method = "monte_carlo"\\n    samples = 10000\\n```'
        };
    }
    
    private getFunctionInfo(): Record<string, string> {
        return {
            'print': '**print(message)**\\n\\nOutputs a message to the console.\\n\\n*Built-in function*',
            'len': '**len(object)**\\n\\nReturns the length of an object.\\n\\n*Built-in function*',
            'sum': '**sum(iterable)**\\n\\nReturns the sum of all items in an iterable.\\n\\n*Built-in function*',
            'max': '**max(iterable)**\\n\\nReturns the maximum value.\\n\\n*Built-in function*',
            'min': '**min(iterable)**\\n\\nReturns the minimum value.\\n\\n*Built-in function*',
            'abs': '**abs(x)**\\n\\nReturns the absolute value of x.\\n\\n*Built-in function*',
            'round': '**round(number, digits=0)**\\n\\nRounds a number to the specified digits.\\n\\n*Built-in function*'
        };
    }
    
    private getQuantumGateInfo(): Record<string, string> {
        return {
            'h': '**Hadamard Gate**\\n\\nCreates superposition: |0⟩ → (|0⟩ + |1⟩)/√2\\n\\n```synapse\\nh qubit_index\\n```',
            'x': '**Pauli-X Gate**\\n\\nBit flip: |0⟩ → |1⟩, |1⟩ → |0⟩\\n\\n```synapse\\nx qubit_index\\n```',
            'y': '**Pauli-Y Gate**\\n\\nBit and phase flip.\\n\\n```synapse\\ny qubit_index\\n```',
            'z': '**Pauli-Z Gate**\\n\\nPhase flip: |1⟩ → -|1⟩\\n\\n```synapse\\nz qubit_index\\n```',
            'cx': '**CNOT Gate**\\n\\nControlled-X (controlled NOT).\\n\\n```synapse\\ncx control_qubit, target_qubit\\n```',
            'cz': '**Controlled-Z Gate**\\n\\nControlled phase flip.\\n\\n```synapse\\ncz control_qubit, target_qubit\\n```',
            'swap': '**SWAP Gate**\\n\\nExchanges the states of two qubits.\\n\\n```synapse\\nswap qubit1, qubit2\\n```',
            'rx': '**X-Rotation Gate**\\n\\nRotation around X-axis.\\n\\n```synapse\\nrx(angle) qubit_index\\n```',
            'ry': '**Y-Rotation Gate**\\n\\nRotation around Y-axis.\\n\\n```synapse\\nry(angle) qubit_index\\n```',
            'rz': '**Z-Rotation Gate**\\n\\nRotation around Z-axis.\\n\\n```synapse\\nrz(angle) qubit_index\\n```',
            'measure': '**Measurement**\\n\\nMeasures qubit(s) and collapses superposition.\\n\\n```synapse\\nmeasure qubit_index\\nmeasure all\\n```'
        };
    }
}