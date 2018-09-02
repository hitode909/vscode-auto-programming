import * as vscode from 'vscode';
import { AutoProgramming } from './AutoPrograming';

export function activate(context: vscode.ExtensionContext) {
  const autoPrograming = new AutoProgramming;
  const disposable = vscode.commands.registerCommand('autoProgramming.complement', () => {
    autoPrograming.complement();
  });
  context.subscriptions.push(disposable);
}

export function deactivate() { }