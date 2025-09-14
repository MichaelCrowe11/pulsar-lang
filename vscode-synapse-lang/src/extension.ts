import * as vscode from 'vscode';
import { SynapseLanguageClient } from './languageClient';
import { SynapseCodeLensProvider } from './codeLens';
import { SynapseHoverProvider } from './hoverProvider';
import { SynapseCompletionProvider } from './completionProvider';
import { SynapseTaskProvider } from './taskProvider';

let client: SynapseLanguageClient;

export function activate(context: vscode.ExtensionContext) {
    console.log('Synapse Language extension is now active!');

    // Register language providers
    const selector = { scheme: 'file', language: 'synapse' };
    
    // Code completion
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            selector,
            new SynapseCompletionProvider(),
            '.',  // Trigger on dot
            ' ',  // Trigger on space
            '('   // Trigger on opening parenthesis
        )
    );

    // Hover information
    context.subscriptions.push(
        vscode.languages.registerHoverProvider(selector, new SynapseHoverProvider())
    );

    // Code lens
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider(selector, new SynapseCodeLensProvider())
    );

    // Task provider
    context.subscriptions.push(
        vscode.tasks.registerTaskProvider('synapse', new SynapseTaskProvider())
    );

    // Commands
    context.subscriptions.push(
        vscode.commands.registerCommand('synapse.runFile', runFile),
        vscode.commands.registerCommand('synapse.runSelection', runSelection),
        vscode.commands.registerCommand('synapse.showDocs', showDocumentation),
        vscode.commands.registerCommand('synapse.newProject', newProject)
    );

    // Status bar
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.text = "$(zap) Synapse";
    statusBarItem.tooltip = "Synapse Language Support";
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Language client (for future language server)
    client = new SynapseLanguageClient(context);
    
    vscode.window.showInformationMessage('Synapse Language extension activated! Welcome to quantum-enhanced scientific computing.');
}

export function deactivate(): Thenable<void> | undefined {
    if (!client) {
        return undefined;
    }
    return client.stop();
}

async function runFile() {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
        vscode.window.showErrorMessage('No active Synapse file');
        return;
    }

    const document = activeEditor.document;
    if (document.languageId !== 'synapse') {
        vscode.window.showErrorMessage('Current file is not a Synapse file');
        return;
    }

    await document.save();
    
    const config = vscode.workspace.getConfiguration('synapse');
    const interpreterPath = config.get<string>('interpreter.path', 'synapse');
    const filePath = document.fileName;

    const terminal = vscode.window.createTerminal('Synapse');
    terminal.show();
    terminal.sendText(`${interpreterPath} "${filePath}"`);
}

async function runSelection() {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
        vscode.window.showErrorMessage('No active editor');
        return;
    }

    const selection = activeEditor.selection;
    const selectedText = activeEditor.document.getText(selection);
    
    if (!selectedText) {
        vscode.window.showErrorMessage('No text selected');
        return;
    }

    const config = vscode.workspace.getConfiguration('synapse');
    const interpreterPath = config.get<string>('interpreter.path', 'python -c "import synapse_lang; synapse_lang.execute"');
    
    const terminal = vscode.window.createTerminal('Synapse Selection');
    terminal.show();
    terminal.sendText(`${interpreterPath} '${selectedText.replace(/'/g, "\\'")}'`);
}

function showDocumentation() {
    vscode.env.openExternal(vscode.Uri.parse('https://synapse-lang.com'));
}

async function newProject() {
    const folderUri = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        canSelectFiles: false,
        canSelectMany: false,
        openLabel: 'Select Project Folder'
    });

    if (!folderUri || folderUri.length === 0) {
        return;
    }

    const projectPath = folderUri[0].fsPath;
    const projectName = await vscode.window.showInputBox({
        prompt: 'Enter project name',
        value: 'my-synapse-project'
    });

    if (!projectName) {
        return;
    }

    try {
        const fs = require('fs');
        const path = require('path');
        
        const fullPath = path.join(projectPath, projectName);
        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
        }

        // Create main.syn file
        const mainFile = path.join(fullPath, 'main.syn');
        const template = `# Synapse Language Project: ${projectName}
# Welcome to quantum-enhanced scientific computing!

# Example: Parallel hypothesis testing with uncertainty
hypothesis ${projectName.replace(/-/g, '_')}_analysis:
    uncertain measurement = 42.3 ± 0.5
    uncertain temperature = 300 ± 10
    
    parallel branches:
        branch scenario_a:
            result = measurement * 1.2
            confidence = 0.85
            
        branch scenario_b:
            result = measurement * 0.8
            confidence = 0.75
    
    merge with weighted_average
    propagate uncertainty

# Run the analysis
print("Starting ${projectName} analysis...")
${projectName.replace(/-/g, '_')}_analysis.execute()
print("Analysis complete!")
`;

        fs.writeFileSync(mainFile, template);

        // Create README.md
        const readmeFile = path.join(fullPath, 'README.md');
        const readme = `# ${projectName}

A Synapse Language project for scientific computing.

## Installation

\`\`\`bash
pip install synapse-lang
\`\`\`

## Usage

\`\`\`bash
synapse main.syn
\`\`\`

## Learn More

- [Synapse Language Website](https://synapse-lang.com)
- [Documentation](https://github.com/MichaelCrowe11/synapse-lang)
- [Examples](https://github.com/MichaelCrowe11/synapse-lang/tree/master/examples)
`;

        fs.writeFileSync(readmeFile, readme);

        // Open the project
        const uri = vscode.Uri.file(fullPath);
        await vscode.commands.executeCommand('vscode.openFolder', uri);
        
        vscode.window.showInformationMessage(`Synapse project "${projectName}" created successfully!`);
        
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to create project: ${error}`);
    }
}