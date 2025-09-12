"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
function activate(context) {
    console.log('Mycelium-EI-Lang extension is now active!');
    // Register the run command
    let runCommand = vscode.commands.registerCommand('mycelium.run', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }
        const document = editor.document;
        if (document.languageId !== 'mycelium') {
            vscode.window.showErrorMessage('This is not a Mycelium file');
            return;
        }
        // Save the document first
        document.save().then(() => {
            const filePath = document.fileName;
            const pythonPath = vscode.workspace.getConfiguration('mycelium').get('pythonPath', 'python');
            // Create output channel
            const outputChannel = vscode.window.createOutputChannel('Mycelium-EI');
            outputChannel.show();
            outputChannel.clear();
            // Run the file
            const command = `${pythonPath} -m mycelium_ei "${filePath}"`;
            outputChannel.appendLine(`Running: ${command}\n`);
            (0, child_process_1.exec)(command, { cwd: path.dirname(filePath) }, (error, stdout, stderr) => {
                if (error) {
                    outputChannel.appendLine(`Error: ${error.message}`);
                    vscode.window.showErrorMessage(`Execution failed: ${error.message}`);
                    return;
                }
                if (stderr) {
                    outputChannel.appendLine(`Stderr: ${stderr}`);
                }
                outputChannel.appendLine(stdout);
                vscode.window.showInformationMessage('Mycelium program executed successfully');
            });
        });
    });
    // Register the optimize command
    let optimizeCommand = vscode.commands.registerCommand('mycelium.optimize', async () => {
        const algorithms = ['Genetic Algorithm', 'Particle Swarm', 'Ant Colony', 'All'];
        const selected = await vscode.window.showQuickPick(algorithms, {
            placeHolder: 'Select optimization algorithm'
        });
        if (selected) {
            vscode.window.showInformationMessage(`Running ${selected} optimization...`);
            // Implementation would call the actual optimization
        }
    });
    // Register hover provider for documentation
    const hoverProvider = vscode.languages.registerHoverProvider('mycelium', {
        provideHover(document, position, token) {
            const range = document.getWordRangeAtPosition(position);
            const word = document.getText(range);
            // Provide documentation for built-in functions
            const docs = {
                'genetic_optimize': 'Run genetic algorithm optimization\n\nParameters:\n- fitness_function: Function to optimize\n- dimensions: Number of parameters\n- population_size: Size of population\n- generations: Number of generations',
                'swarm_optimize': 'Run particle swarm optimization\n\nParameters:\n- fitness_function: Function to optimize\n- dimensions: Number of parameters\n- num_particles: Number of particles\n- iterations: Number of iterations',
                'ant_optimize': 'Run ant colony optimization\n\nParameters:\n- fitness_function: Function to optimize\n- dimensions: Number of parameters\n- num_ants: Number of ants\n- iterations: Number of iterations',
                'create_bio_network': 'Create a biological neural network\n\nParameters:\n- network_id: Unique identifier\n- input_size: Number of inputs\n- hidden_size: Hidden layer size\n- output_size: Number of outputs',
                'create_cultivation': 'Create cultivation monitoring system\n\nParameters:\n- cultivation_id: Unique identifier',
                'print': 'Print output to console\n\nParameters:\n- *args: Values to print'
            };
            if (docs[word]) {
                return new vscode.Hover(new vscode.MarkdownString(docs[word]));
            }
        }
    });
    // Register completion provider for IntelliSense
    const completionProvider = vscode.languages.registerCompletionItemProvider('mycelium', {
        provideCompletionItems(document, position, token, context) {
            const completions = [];
            // Built-in functions
            const functions = [
                { label: 'genetic_optimize', detail: 'Run genetic algorithm', kind: vscode.CompletionItemKind.Function },
                { label: 'swarm_optimize', detail: 'Run particle swarm optimization', kind: vscode.CompletionItemKind.Function },
                { label: 'ant_optimize', detail: 'Run ant colony optimization', kind: vscode.CompletionItemKind.Function },
                { label: 'create_bio_network', detail: 'Create biological neural network', kind: vscode.CompletionItemKind.Function },
                { label: 'train_bio_network', detail: 'Train biological neural network', kind: vscode.CompletionItemKind.Function },
                { label: 'create_cultivation', detail: 'Create cultivation system', kind: vscode.CompletionItemKind.Function },
                { label: 'monitor_cultivation', detail: 'Monitor cultivation', kind: vscode.CompletionItemKind.Function },
                { label: 'quantum_entangle', detail: 'Create quantum entanglement', kind: vscode.CompletionItemKind.Function },
                { label: 'print', detail: 'Print to console', kind: vscode.CompletionItemKind.Function },
                { label: 'len', detail: 'Get length', kind: vscode.CompletionItemKind.Function },
                { label: 'range', detail: 'Create range', kind: vscode.CompletionItemKind.Function }
            ];
            // Keywords
            const keywords = [
                { label: 'function', kind: vscode.CompletionItemKind.Keyword },
                { label: 'let', kind: vscode.CompletionItemKind.Keyword },
                { label: 'if', kind: vscode.CompletionItemKind.Keyword },
                { label: 'else', kind: vscode.CompletionItemKind.Keyword },
                { label: 'while', kind: vscode.CompletionItemKind.Keyword },
                { label: 'for', kind: vscode.CompletionItemKind.Keyword },
                { label: 'return', kind: vscode.CompletionItemKind.Keyword },
                { label: 'environment', kind: vscode.CompletionItemKind.Keyword },
                { label: 'mycelium', kind: vscode.CompletionItemKind.Keyword },
                { label: 'quantum', kind: vscode.CompletionItemKind.Keyword }
            ];
            // Add all completions
            functions.forEach(f => {
                const item = new vscode.CompletionItem(f.label, f.kind);
                item.detail = f.detail;
                completions.push(item);
            });
            keywords.forEach(k => {
                completions.push(new vscode.CompletionItem(k.label, k.kind));
            });
            return completions;
        }
    });
    // Register diagnostic provider for error checking
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('mycelium');
    const updateDiagnostics = (document) => {
        if (document.languageId !== 'mycelium') {
            return;
        }
        const diagnostics = [];
        const text = document.getText();
        // Simple syntax checks
        const lines = text.split('\n');
        lines.forEach((line, i) => {
            // Check for unmatched brackets
            const openBrackets = (line.match(/\{/g) || []).length;
            const closeBrackets = (line.match(/\}/g) || []).length;
            if (openBrackets !== closeBrackets) {
                const range = new vscode.Range(i, 0, i, line.length);
                const diagnostic = new vscode.Diagnostic(range, 'Unmatched brackets', vscode.DiagnosticSeverity.Error);
                diagnostics.push(diagnostic);
            }
            // Check for missing semicolons (if required)
            // Add more syntax checks as needed
        });
        diagnosticCollection.set(document.uri, diagnostics);
    };
    // Update diagnostics on document change
    vscode.workspace.onDidChangeTextDocument(event => {
        updateDiagnostics(event.document);
    });
    // Update diagnostics on document open
    vscode.workspace.onDidOpenTextDocument(document => {
        updateDiagnostics(document);
    });
    // Register all providers
    context.subscriptions.push(runCommand, optimizeCommand, hoverProvider, completionProvider, diagnosticCollection);
    // Show welcome message
    vscode.window.showInformationMessage('Mycelium-EI-Lang extension loaded successfully!');
}
exports.activate = activate;
function deactivate() {
    console.log('Mycelium-EI-Lang extension deactivated');
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map