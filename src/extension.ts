import * as vscode from 'vscode';
import { findCorrespondingLine, getEditorType, isModifiedEditor, isOriginalEditor, jumpToLine } from './utils/editorUtilts';
import { COMMANDS } from './utils/commands';

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
		? COMMANDS.FOCUS_PRIMARY_SIDE
		: COMMANDS.FOCUS_SECONDARY_SIDE;

	const currentLine = currentEditor.selection.active.line;
	const changes = (modifiedEditor as any).diffInformation[0].changes;

	const lineToJump = findCorrespondingLine(currentLine + 1, currentEditorType, changes);
	console.log('jumping to line: ', lineToJump);

	const targetEditor = target === 'modified' ? modifiedEditor : originalEditor;

	jumpToLine(lineToJump, targetEditor);

	vscode.commands.executeCommand(focusCommand);
}

function openDiffOnCurrentLine() {
	const currentEditor = vscode.window.activeTextEditor;
	if (!currentEditor) {
		vscode.window.showInformationMessage('No active editor found');
		return;
	}

	const currentLine = currentEditor.selection.active.line;

	vscode.commands.executeCommand(COMMANDS.GIT_OPEN_CHANGE).then(() => {
		const modifiedEditor = vscode.window.visibleTextEditors.find((editor) => isModifiedEditor(editor));

		if (!modifiedEditor) {
			vscode.window.showInformationMessage('No modified editor found');
			return;
		}

		jumpToLine(currentLine + 1, modifiedEditor, vscode.TextEditorRevealType.InCenter);
	});
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

	const openDiffOnCurrentLineCommand = vscode.commands.registerCommand('diffJumper.openDiffOnCurrentLine', () => {
		openDiffOnCurrentLine();
	});

	context.subscriptions.push(jumpLeftCommand, jumpRightCommand, jumpAutoCommand, openDiffOnCurrentLineCommand);
}

export function deactivate() { }
