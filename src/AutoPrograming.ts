import * as vscode from 'vscode';
import { Collector } from './Collector';

export class AutoProgramming {
  complement(): void {
    const rootPath = vscode.workspace.rootPath;
    if (!rootPath) { return; }
    const collector = new Collector(rootPath);

    const editor = vscode.window.activeTextEditor;
    if (!editor) { return; }
    const selection = editor.selection;
    let lineContent = editor.document.lineAt(selection.anchor.line);
    let line = selection.anchor.line;
    if (!lineContent.text) {
      if (selection.anchor.line === 0) { return; }
      lineContent = editor.document.lineAt(selection.anchor.line - 1);
      collector.vertical(lineContent.text).then(items => {
        this.selectItems(items, lineContent, line, collector);
      });
      return;
    }

    collector.horizontal(lineContent.text, 0).then(items => {
      this.selectItems(items, lineContent, line, collector);
    });

  }

  selectItems(items: { text: string; count: number; }[], lineContent: vscode.TextLine, line: number, collector: Collector): void {
    if (!items.length) {
      vscode.window.showErrorMessage('No candidates found');
      return;
    }
    vscode.window.showQuickPick(items.map(i => i.text)).then(item => {
      if (!item) {
        return;
      }
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }
      editor.edit(editBuilder => {
        const indentLevel = ((lineContent.text.match(/^\s*/) || '')[0]).length;
        const range = new vscode.Range(new vscode.Position(line, indentLevel), new vscode.Position(line, lineContent.text.length));
        // TODO: newline with indent
        editBuilder.replace(range, item + "\n");
      });
      const next = new vscode.Position(line + 1, 0);
      const newSelection = new vscode.Selection(next, next);
      editor.selection = newSelection;

      collector.vertical(item).then(items => {
        this.selectItems(items, lineContent, line + 1, collector);
      });
    });
  }
}