// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { findCorrespondingLine, isFileEditor, isGitEditor } from './utils/editorUtilts';

/**
 * Handles jumping between editors in a diff view
 * @param target 'original', 'modified', or 'auto' - the target editor to jump to
 */
function handleJump(target: 'original' | 'modified' | 'auto') {
	const currentEditor = vscode.window.activeTextEditor;
	if (!currentEditor) {
		vscode.window.showInformationMessage('No active editor found');
		return;
	}

	const gitEditor = vscode.window.visibleTextEditors.find((editor) => isGitEditor(editor));
	const fileEditor = vscode.window.visibleTextEditors.find((editor) => isFileEditor(editor));

	if (!gitEditor) {
		vscode.window.showInformationMessage('No git editor found');
		return;
	}

	if (!fileEditor) {
		vscode.window.showInformationMessage('No file editor found');
		return;
	}

	const isCurrentGit = isGitEditor(currentEditor);

	// Determine the actual target based on current editor and target parameter
	let actualTarget = target;
	if (target === 'auto') {
		// If we're in auto mode, target the opposite editor type
		actualTarget = isCurrentGit ? 'original' : 'modified';
	}

	// Determine if we're targeting the git editor
	const isTargetGit = actualTarget === 'modified';

	// Skip if already in the target editor
	if ((isTargetGit && isCurrentGit) || (!isTargetGit && !isCurrentGit)) {
		console.log(`Skipping jump to ${actualTarget} - already in the target editor`);
		return;
	}

	// Determine the file type for mapping (which is the same as the target)
	const fileType = actualTarget === 'auto' ? 'original' : actualTarget as 'original' | 'modified';

	// Determine the focus command based on the target
	const focusCommand = isTargetGit
		? 'workbench.action.compareEditor.focusSecondarySide'
		: 'workbench.action.compareEditor.focusPrimarySide';

	const currentLine = currentEditor.selection.active.line;
	const changes = (gitEditor as any).diffInformation[0].changes;

	const lineToJump = findCorrespondingLine(currentLine + 1, fileType, changes);
	console.log('lineToJump', lineToJump);

	// Convert from 1-based to 0-based indexing for VSCode Position
	const zeroBasedLine = lineToJump - 1;
	const range = new vscode.Range(new vscode.Position(zeroBasedLine, 0), new vscode.Position(zeroBasedLine, 0));

	// Focus the target editor
	vscode.commands.executeCommand(focusCommand);

	// Set selection and reveal range in the target editor
	const targetEditor = isTargetGit ? gitEditor : fileEditor;
	targetEditor.selection = new vscode.Selection(range.start, range.start);
	targetEditor.revealRange(range, vscode.TextEditorRevealType.InCenter);
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const jumpLeftCommand = vscode.commands.registerCommand('compare-editor-jump.left', () => {
		handleJump('modified');
	});

	const jumpRightCommand = vscode.commands.registerCommand('compare-editor-jump.right', () => {
		handleJump('original');
	});

	const jumpAutoCommand = vscode.commands.registerCommand('compare-editor-jump.auto', () => {
		handleJump('auto');
	});

	context.subscriptions.push(jumpLeftCommand, jumpRightCommand, jumpAutoCommand);
}

// This method is called when your extension is deactivated
export function deactivate() { }
