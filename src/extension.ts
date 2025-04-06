import * as vscode from 'vscode';
import { findCorrespondingLine, getEditorType, isModifiedEditor, isOriginalEditor } from './utils/editorUtilts';

/**
 * Handles jumping between editors in a diff view
 * @param target 'original', 'modified', or 'auto' - the target editor to jump to
 */
function handleJump(target: 'original' | 'modified' | 'auto') {
	console.log('user invoked jump to: ', target);
	const currentEditor = vscode.window.activeTextEditor;
	if (!currentEditor) {
		vscode.window.showInformationMessage('No active editor found');
		return;
	}

	const modifiedEditor = vscode.window.visibleTextEditors.find((editor) => isModifiedEditor(editor));
	const originalEditor = vscode.window.visibleTextEditors.find((editor) => isOriginalEditor(editor));

	if (!modifiedEditor) {
		vscode.window.showInformationMessage('No modified editor found');
		return;
	}

	if (!originalEditor) {
		vscode.window.showInformationMessage('No original editor found');
		return;
	}

	const currentEditorType = getEditorType(currentEditor);

	if (target === 'auto') {
		target = currentEditorType === 'modified' ? 'original' : 'modified';
	}

	if (target === currentEditorType) {
		console.log(`Skipping jump to ${target} - already in the target editor`);
		return;
	}

	const focusCommand = target === 'modified'
		? 'workbench.action.compareEditor.focusPrimarySide'
		: 'workbench.action.compareEditor.focusSecondarySide';

	const currentLine = currentEditor.selection.active.line;
	const changes = (modifiedEditor as any).diffInformation[0].changes;

	const lineToJump = findCorrespondingLine(currentLine + 1, currentEditorType, changes);
	console.log('jumping to line: ', lineToJump);

	const zeroBasedLine = lineToJump - 1;
	const range = new vscode.Range(new vscode.Position(zeroBasedLine, 0), new vscode.Position(zeroBasedLine, 0));

	vscode.commands.executeCommand(focusCommand);

	const targetEditor = target === 'modified' ? modifiedEditor : originalEditor;
	targetEditor.selection = new vscode.Selection(range.start, range.start);
}

export function activate(context: vscode.ExtensionContext) {
	const jumpLeftCommand = vscode.commands.registerCommand('diffJumper.jumpToModified', () => {
		handleJump('modified');
	});

	const jumpRightCommand = vscode.commands.registerCommand('diffJumper.jumpToOriginal', () => {
		handleJump('original');
	});

	const jumpAutoCommand = vscode.commands.registerCommand('diffJumper.jumpToOther', () => {
		handleJump('auto');
	});

	context.subscriptions.push(jumpLeftCommand, jumpRightCommand, jumpAutoCommand);
}

export function deactivate() { }
