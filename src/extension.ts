// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { findCorrespondingLine, isFileEditor, isGitEditor } from './utils/editorUtilts';

/**
 * Handles jumping between editors in a diff view
 * @param direction 'left', 'right', or 'auto' - the direction to jump
 * @param fileType 'original', 'modified', or null (for auto) - the file type to use for mapping
 * @param focusCommand The command to execute to focus the target editor, or null for auto
 * @param isTargetGit Whether the target editor is the git editor, or null for auto
 */
function handleJump(
	direction: 'left' | 'right' | 'auto',
	fileType: 'original' | 'modified' | null,
	focusCommand: string | null,
	isTargetGit: boolean | null
) {
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

	// Handle auto mode - determine target and file type based on current editor
	let actualTargetGit = isTargetGit;
	let actualFileType: 'original' | 'modified' = fileType as 'original' | 'modified';
	let actualFocusCommand = focusCommand;

	if (direction === 'auto') {
		// If we're in auto mode, target the opposite editor
		actualTargetGit = !isCurrentGit;
		actualFileType = isCurrentGit ? 'original' : 'modified';
		actualFocusCommand = isCurrentGit
			? 'workbench.action.compareEditor.focusPrimarySide'
			: 'workbench.action.compareEditor.focusSecondarySide';
	}

	// Skip if already in the target editor
	if ((actualTargetGit && isCurrentGit) || (!actualTargetGit && !isCurrentGit)) {
		console.log(`Skipping ${direction} jump - already in the target editor`);
		return;
	}

	const currentLine = currentEditor.selection.active.line;
	const changes = (gitEditor as any).diffInformation[0].changes;

	const lineToJump = findCorrespondingLine(currentLine + 1, actualFileType, changes);
	console.log('lineToJump', lineToJump);

	// Convert from 1-based to 0-based indexing for VSCode Position
	const zeroBasedLine = lineToJump - 1;
	const range = new vscode.Range(new vscode.Position(zeroBasedLine, 0), new vscode.Position(zeroBasedLine, 0));

	// Focus the target editor
	if (actualFocusCommand) {
		vscode.commands.executeCommand(actualFocusCommand);
	}

	// Set selection and reveal range in the target editor
	const targetEditor = actualTargetGit ? gitEditor : fileEditor;
	targetEditor.selection = new vscode.Selection(range.start, range.start);
	targetEditor.revealRange(range, vscode.TextEditorRevealType.InCenter);
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "compare-editor-jump" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const jumpLeftCommand = vscode.commands.registerCommand('compare-editor-jump.left', () => {
		handleJump(
			'left',
			'modified',
			'workbench.action.compareEditor.focusSecondarySide',
			true
		);
	});

	const jumpRightCommand = vscode.commands.registerCommand('compare-editor-jump.right', () => {
		handleJump(
			'right',
			'original',
			'workbench.action.compareEditor.focusPrimarySide',
			false
		);
	});

	const jumpAutoCommand = vscode.commands.registerCommand('compare-editor-jump.auto', () => {
		handleJump(
			'auto',
			null,
			null,
			null
		);
	});

	context.subscriptions.push(jumpLeftCommand, jumpRightCommand, jumpAutoCommand);
}

// This method is called when your extension is deactivated
export function deactivate() { }
