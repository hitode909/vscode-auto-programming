'use strict';
import * as vscode from 'vscode';
import { Collector } from './Collector';

export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('autoProgramming.complement', () => {
        const rootPath = vscode.workspace.rootPath;
        if (!rootPath) { return; }
        const collector = new Collector(rootPath);

        const editor = vscode.window.activeTextEditor;
        if (!editor) { return; }
        const selection = editor.selection;
        let lineContent = editor.document.lineAt(selection.anchor.line);
        let line = selection.anchor.line;
        if (!lineContent.text) {
            lineContent = editor.document.lineAt(selection.anchor.line - 1);
            collector.vertical(lineContent.text).then(items => {
                selectItems(items, lineContent, line, collector);
            });
            return;
        }

        collector.horizontal(lineContent.text, 0).then(items => {
            selectItems(items, lineContent, line, collector);
        });
    });

    context.subscriptions.push(disposable);
}

function selectItems(items: { text: string; count: number; }[], lineContent: vscode.TextLine, line: number, collector: Collector) {
    vscode.window.showQuickPick(items.map(i => i.text)).then(item => {
        if (!item) {
            vscode.window.showErrorMessage('No candidate found');
            return;
        }
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        editor.edit(editBuilder => {
            const indentLevel = ((lineContent.text.match(/^\s*/) || '')[0]).length;
            const range = new vscode.Range(new vscode.Position(line, indentLevel), new vscode.Position(line, lineContent.text.length));
            editBuilder.replace(range, item + "\n");
        });
        const next = new vscode.Position(line + 1, 0);
        const newSelection = new vscode.Selection(next, next);
        editor.selection = newSelection;

        collector.vertical(item).then(items => {
            selectItems(items, lineContent, line + 1, collector);
        });
    });
}

// this method is called when your extension is deactivated
export function deactivate() {
}