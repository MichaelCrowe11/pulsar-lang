import * as vscode from 'vscode';

export class SynapseTaskProvider implements vscode.TaskProvider {
    
    provideTasks(): Thenable<vscode.Task[]> | vscode.Task[] {
        const tasks: vscode.Task[] = [];
        
        // Run current file task
        const runFileTask = new vscode.Task(
            { type: 'synapse', task: 'run-file' },
            vscode.TaskScope.Workspace,
            'Run Current File',
            'synapse',
            new vscode.ShellExecution('synapse', ['${file}'])
        );
        runFileTask.group = vscode.TaskGroup.Build;
        tasks.push(runFileTask);
        
        // Install dependencies task
        const installTask = new vscode.Task(
            { type: 'synapse', task: 'install' },
            vscode.TaskScope.Workspace,
            'Install Synapse',
            'synapse',
            new vscode.ShellExecution('pip', ['install', 'synapse-lang'])
        );
        installTask.group = vscode.TaskGroup.Build;
        tasks.push(installTask);
        
        // Create new project task
        const newProjectTask = new vscode.Task(
            { type: 'synapse', task: 'new-project' },
            vscode.TaskScope.Workspace,
            'New Synapse Project',
            'synapse',
            new vscode.ShellExecution('mkdir', ['${input:projectName}'])
        );
        tasks.push(newProjectTask);
        
        return tasks;
    }
    
    resolveTask(task: vscode.Task): vscode.Task | undefined {
        const definition = task.definition;
        
        if (definition.type === 'synapse') {
            return task;
        }
        
        return undefined;
    }
}