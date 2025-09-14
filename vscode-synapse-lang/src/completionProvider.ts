import * as vscode from 'vscode';

export class SynapseCompletionProvider implements vscode.CompletionItemProvider {
    
    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
        
        const linePrefix = document.lineAt(position).text.substr(0, position.character);
        
        // Keywords
        const keywords = this.getKeywordCompletions();
        
        // Functions
        const functions = this.getFunctionCompletions();
        
        // Quantum gates
        const quantumGates = this.getQuantumGateCompletions();
        
        // Uncertainty operations
        const uncertaintyOps = this.getUncertaintyCompletions();
        
        return [...keywords, ...functions, ...quantumGates, ...uncertaintyOps];
    }
    
    private getKeywordCompletions(): vscode.CompletionItem[] {
        const keywords = [
            'hypothesis', 'experiment', 'parallel', 'branch', 'stream', 'reason', 'chain',
            'premise', 'derive', 'conclude', 'uncertain', 'observe', 'propagate', 'constrain',
            'evolve', 'pipeline', 'stage', 'fork', 'path', 'merge', 'explore', 'try',
            'fallback', 'accept', 'reject', 'symbolic', 'let', 'solve', 'prove', 'using'
        ];
        
        return keywords.map(keyword => {
            const item = new vscode.CompletionItem(keyword, vscode.CompletionItemKind.Keyword);
            item.documentation = new vscode.MarkdownString(`Synapse keyword: **${keyword}**`);
            item.insertText = new vscode.SnippetString(`${keyword} `);
            return item;
        });
    }
    
    private getFunctionCompletions(): vscode.CompletionItem[] {
        const functions = [
            { name: 'print', params: 'message', desc: 'Print a message' },
            { name: 'len', params: 'object', desc: 'Get length of object' },
            { name: 'range', params: 'start, stop, step=1', desc: 'Create range of numbers' },
            { name: 'sum', params: 'iterable', desc: 'Sum of all items' },
            { name: 'max', params: 'iterable', desc: 'Maximum value' },
            { name: 'min', params: 'iterable', desc: 'Minimum value' },
            { name: 'abs', params: 'x', desc: 'Absolute value' },
            { name: 'round', params: 'number, digits=0', desc: 'Round number' }
        ];
        
        return functions.map(func => {
            const item = new vscode.CompletionItem(func.name, vscode.CompletionItemKind.Function);
            item.documentation = new vscode.MarkdownString(func.desc);
            item.insertText = new vscode.SnippetString(`${func.name}($1)`);
            item.detail = `${func.name}(${func.params})`;
            return item;
        });
    }
    
    private getQuantumGateCompletions(): vscode.CompletionItem[] {
        const gates = [
            { name: 'h', desc: 'Hadamard gate - creates superposition' },
            { name: 'x', desc: 'Pauli-X gate - bit flip' },
            { name: 'y', desc: 'Pauli-Y gate - bit and phase flip' },
            { name: 'z', desc: 'Pauli-Z gate - phase flip' },
            { name: 'cx', desc: 'CNOT gate - controlled X' },
            { name: 'cz', desc: 'Controlled-Z gate' },
            { name: 'swap', desc: 'SWAP gate - exchanges qubits' },
            { name: 'rx', desc: 'X-rotation gate' },
            { name: 'ry', desc: 'Y-rotation gate' },
            { name: 'rz', desc: 'Z-rotation gate' }
        ];
        
        return gates.map(gate => {
            const item = new vscode.CompletionItem(gate.name, vscode.CompletionItemKind.Method);
            item.documentation = new vscode.MarkdownString(`**Quantum Gate**: ${gate.desc}`);
            item.insertText = new vscode.SnippetString(`${gate.name} $1`);
            return item;
        });
    }
    
    private getUncertaintyCompletions(): vscode.CompletionItem[] {
        const operations = [
            { name: 'uncertain', desc: 'Create uncertain value', snippet: 'uncertain ${1:variable} = ${2:value} ± ${3:uncertainty}' },
            { name: 'propagate', desc: 'Propagate uncertainty', snippet: 'propagate uncertainty:\\n\\tmethod = "${1:monte_carlo}"\\n\\tsamples = ${2:10000}' },
            { name: 'confidence', desc: 'Set confidence interval', snippet: 'confidence = ${1:0.95}' }
        ];
        
        return operations.map(op => {
            const item = new vscode.CompletionItem(op.name, vscode.CompletionItemKind.Operator);
            item.documentation = new vscode.MarkdownString(`**Uncertainty**: ${op.desc}`);
            item.insertText = new vscode.SnippetString(op.snippet);
            return item;
        });
    }
}