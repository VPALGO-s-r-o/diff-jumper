import * as assert from 'assert';
import * as vscode from 'vscode';
import { resolveDiffEditors } from '../extension';
import { findCorrespondingLine } from '../utils/editorUtilts';

suite('Extension Test Suite', () => {
	function editorFor(uri: vscode.Uri): vscode.TextEditor {
		return { document: { uri } } as vscode.TextEditor;
	}

	for (const [name, original, modified] of [
		['file comparison', 'file:///original.txt', 'file:///modified.txt'],
		['working tree comparison', 'git:/tracked.txt?ref=HEAD', 'file:///tracked.txt'],
		['staged comparison', 'git:/tracked.txt?ref=HEAD', 'git:/tracked.txt?ref=index']
	]) {
		test(`Resolves the active ${name} without unrelated editors`, () => {
			const originalUri = vscode.Uri.parse(original);
			const modifiedUri = vscode.Uri.parse(modified);
			const originalEditor = editorFor(originalUri);
			const modifiedEditor = editorFor(modifiedUri);
			const result = resolveDiffEditors(new vscode.TabInputTextDiff(originalUri, modifiedUri), [
				editorFor(vscode.Uri.parse('git:/unrelated.txt')),
				editorFor(vscode.Uri.parse('file:///unrelated.txt')),
				modifiedEditor,
				originalEditor
			]);

			assert.strictEqual(result?.originalEditor, originalEditor);
			assert.strictEqual(result?.modifiedEditor, modifiedEditor);
		});
	}

	test('Does not treat an ordinary text tab as a diff', () => {
		assert.strictEqual(resolveDiffEditors(new vscode.TabInputText(vscode.Uri.parse('file:///file.txt')), []), undefined);
		assert.strictEqual(resolveDiffEditors(undefined, []), undefined);
	});

	test('Does not substitute an unrelated editor for a hidden diff side', () => {
		const originalUri = vscode.Uri.parse('file:///original.txt');
		const modifiedUri = vscode.Uri.parse('file:///modified.txt');
		const modifiedEditor = editorFor(modifiedUri);
		const result = resolveDiffEditors(new vscode.TabInputTextDiff(originalUri, modifiedUri), [
			editorFor(vscode.Uri.parse('git:/unrelated.txt')),
			modifiedEditor
		]);

		assert.strictEqual(result?.originalEditor, undefined);
		assert.strictEqual(result?.modifiedEditor, modifiedEditor);
	});

	test('Preserves offsets after additions and deletions in either direction', () => {
		const addition = [{
			original: { startLineNumber: 5, endLineNumberExclusive: 5 },
			modified: { startLineNumber: 5, endLineNumberExclusive: 8 }
		}];
		const deletion = [{ original: addition[0].modified, modified: addition[0].original }];

		assert.strictEqual(findCorrespondingLine(10, 'modified', addition), 7);
		assert.strictEqual(findCorrespondingLine(7, 'original', addition), 10);
		assert.strictEqual(findCorrespondingLine(10, 'original', deletion), 7);
		assert.strictEqual(findCorrespondingLine(7, 'modified', deletion), 10);
		assert.strictEqual(findCorrespondingLine(10, 'original', []), 10);
	});

	for (const { originalSize, modifiedSize, originalTargets, modifiedTargets } of [
		{ originalSize: 2, modifiedSize: 5, originalTargets: [0, 1], modifiedTargets: [0, 1, 1, 1, 1] },
		{ originalSize: 5, modifiedSize: 2, originalTargets: [0, 1, 1, 1, 1], modifiedTargets: [0, 1] },
		{ originalSize: 3, modifiedSize: 3, originalTargets: [0, 1, 2], modifiedTargets: [0, 1, 2] },
		{ originalSize: 4, modifiedSize: 8, originalTargets: [0, 1, 2, 3], modifiedTargets: [0, 1, 2, 3, 3, 3, 3, 3] },
		{ originalSize: 8, modifiedSize: 4, originalTargets: [0, 1, 2, 3, 3, 3, 3, 3], modifiedTargets: [0, 1, 2, 3] },
		{ originalSize: 1, modifiedSize: 4, originalTargets: [0], modifiedTargets: [0, 0, 0, 0] },
		{ originalSize: 4, modifiedSize: 1, originalTargets: [0, 0, 0, 0], modifiedTargets: [0] }
	]) {
		test(`Matches line offsets in a ${originalSize}-to-${modifiedSize} replacement and clamps excess lines`, () => {
			const originalStart = 5;
			const modifiedStart = 8;
			const changes = [{
				original: { startLineNumber: 2, endLineNumberExclusive: 2 },
				modified: { startLineNumber: 2, endLineNumberExclusive: 5 }
			}, {
				original: { startLineNumber: originalStart, endLineNumberExclusive: originalStart + originalSize },
				modified: { startLineNumber: modifiedStart, endLineNumberExclusive: modifiedStart + modifiedSize }
			}];

			for (let lineOffset = 0; lineOffset < originalSize; lineOffset++) {
				assert.strictEqual(
					findCorrespondingLine(originalStart + lineOffset, 'original', changes),
					modifiedStart + originalTargets[lineOffset],
					`Original line offset ${lineOffset}`
				);
			}
			for (let lineOffset = 0; lineOffset < modifiedSize; lineOffset++) {
				assert.strictEqual(
					findCorrespondingLine(modifiedStart + lineOffset, 'modified', changes),
					originalStart + modifiedTargets[lineOffset],
					`Modified line offset ${lineOffset}`
				);
			}

			assert.strictEqual(findCorrespondingLine(originalStart - 1, 'original', changes), modifiedStart - 1);
			assert.strictEqual(findCorrespondingLine(modifiedStart - 1, 'modified', changes), originalStart - 1);
			for (const trailingOffset of [0, 3]) {
				assert.strictEqual(
					findCorrespondingLine(originalStart + originalSize + trailingOffset, 'original', changes),
					modifiedStart + modifiedSize + trailingOffset
				);
				assert.strictEqual(
					findCorrespondingLine(modifiedStart + modifiedSize + trailingOffset, 'modified', changes),
					originalStart + originalSize + trailingOffset
				);
			}
		});
	}
});
