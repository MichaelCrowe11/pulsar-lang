import * as vscode from 'vscode';

export class SynapseCodeLensProvider implements vscode.CodeLensProvider {
    
    provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens[]> {
        const codeLenses: vscode.CodeLens[] = [];
        const text = document.getText();
        const lines = text.split('\\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const range = new vscode.Range(i, 0, i, line.length);
            
            // Add run button for main blocks
            if (this.isExecutableBlock(line)) {
                const runCommand: vscode.Command = {
                    title: "▶️ Run",
                    command: "synapse.runSelection",
                    arguments: [document, range]
                };
                codeLenses.push(new vscode.CodeLens(range, runCommand));
            }
            
            // Add help button for keywords
            if (this.hasKeyword(line)) {
                const helpCommand: vscode.Command = {
                    title: "📚 Help",
                    command: "synapse.showDocs"
                };
                codeLenses.push(new vscode.CodeLens(range, helpCommand));
            }
            
            // Add debug button for complex blocks
            if (this.isComplexBlock(line)) {
                const debugCommand: vscode.Command = {
                    title: "🐛 Debug",
                    command: "synapse.debugBlock",
                    arguments: [document, range]
                };
                codeLenses.push(new vscode.CodeLens(range, debugCommand));
            }
        }
        
        return codeLenses;
    }
    
    private isExecutableBlock(line: string): boolean {
        const executableKeywords = [
            'hypothesis', 'experiment', 'parallel', 'quantum', 'pipeline'
        ];
        return executableKeywords.some(keyword => 
            line.trim().startsWith(keyword + ' ') && line.trim().endsWith(':')
        );
    }
    
    private hasKeyword(line: string): boolean {
        const keywords = [
            'hypothesis', 'experiment', 'parallel', 'uncertain', 'quantum',
            'propagate', 'pipeline', 'symbolic', 'reason'
        ];
        return keywords.some(keyword => line.includes(keyword));
    }
    
    private isComplexBlock(line: string): boolean {
        const complexKeywords = [
            'parallel', 'quantum circuit', 'pipeline', 'reason chain'
        ];
        return complexKeywords.some(keyword => line.includes(keyword));
    }
}