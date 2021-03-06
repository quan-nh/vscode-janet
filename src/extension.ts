import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

const janetCommand: string = 'janet';
const terminalName: string = 'Janet REPL';

const windows: boolean = os.platform() == 'win32';
const linux: boolean = os.platform() == 'linux';
const pathSeparator: string = windows ? ';' : ':';

function janetExists(): boolean {
	return process.env['PATH'].split(pathSeparator)
		.some((x) => fs.existsSync(path.resolve(x, janetCommand + (windows ? '.exe' : ''))));
}

function newREPL(): vscode.Terminal {
	let terminal = vscode.window.createTerminal(terminalName);
	terminal.sendText(janetCommand, true);

	vscode.window.withProgress({
		location: vscode.ProgressLocation.Notification,
		title: "Running Janet REPL...",
		cancellable: false
	}, (progress, token) => {
		var p = new Promise(resolve => {
			setTimeout(() => {
				terminal.show();
				thenFocusTextEditor();
				resolve();
			}, 2000);
		});

		return p;
	});

	return terminal;
}

function getREPL(show: boolean): vscode.Terminal {
	let terminal: vscode.Terminal = (<any>vscode.window).terminals.find(x => x._name === terminalName);

	if (terminal == null) {
		newREPL();
		return null;
	}

	if (show) terminal.show();

	return terminal;
}

function prep(input: string): string {
	// I don't know why, multiline send broken on Linux. Make 'em one liners!
	if (linux) return input.replace(/(\r\n\t|\n|\r\t)/gm, ' ').replace(/ +/gm, ' ');
	return input;
}

function thenFocusTextEditor() {
	setTimeout(() => vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup'), 250);
}

export function activate(context: vscode.ExtensionContext) {

	console.log('Extension "vscode-janet" is now active!');

	if (!janetExists()) {
		vscode.window.showErrorMessage('Can\'t find Janet language on your computer! Check your PATH variable.')
		return;
	}

	context.subscriptions.push(vscode.commands.registerCommand(
		'janet.startREPL',
		() => {
			getREPL(true);
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'janet.eval',
		() => {
			let editor = vscode.window.activeTextEditor;
			if (editor == null) return;

			let terminal = getREPL(true);
			if (terminal == null) return;

			function send(terminal: vscode.Terminal) {
				terminal.sendText(prep(editor.document.getText(editor.selection)), true);
				thenFocusTextEditor();
			}
			if (editor.selection.isEmpty)
				vscode.commands.executeCommand('editor.action.selectToBracket').then(() => send(terminal));
			else
				send(terminal);
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'janet.evalFile',
		() => {
			let editor = vscode.window.activeTextEditor;
			if (editor == null) return;

			let terminal = getREPL(true);
			if (terminal == null) return;

			terminal.sendText(prep(editor.document.getText()), true);
			thenFocusTextEditor();
		}
	));
}

export function deactivate() { }
