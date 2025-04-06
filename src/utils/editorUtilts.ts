import { TextEditor } from 'vscode'
import { EditorType } from '../types';

const modifiedEditorScheme = 'file';
const originalEditorScheme = 'git';


export function isOriginalEditor(texteditor: TextEditor) {
    return texteditor.document.uri.scheme === originalEditorScheme;
}

export function isModifiedEditor(texteditor: TextEditor) {
    return texteditor.document.uri.scheme === modifiedEditorScheme;
}

export function getEditorType(texteditor: TextEditor): EditorType {
    if (isOriginalEditor(texteditor)) {
        return 'original';
    } else if (isModifiedEditor(texteditor)) {
        return 'modified';
    } else {
        throw new Error('Unknown editor type');
    }
}

/**
 * Finds the corresponding line number in the other file (original or modified)
 * @param currentLine The current line number (1-based)
 * @param currentEditorType The type of editor the current line is in ('original' or 'modified')
 * @param changes The changes array from the diff information
 * @returns The corresponding line number in the other file (1-based)
 */
export function findCorrespondingLine(currentLine: number, currentEditorType: EditorType, changes: any): number {
    // Ensure we're working with the changes array
    const changesArray = Array.isArray(changes) ? changes :
        (changes[0] && changes[0].changes ? changes[0].changes : []);

    // For debugging
    console.log('Current line:', currentLine, 'Editor type:', currentEditorType);

    // Build a direct mapping between original and modified line numbers
    const originalToModified = new Map<number, number>();
    const modifiedToOriginal = new Map<number, number>();

    // First, map all unchanged lines
    let originalLine = 1;
    let modifiedLine = 1;

    // Sort changes by line number
    const sortedChanges = [...changesArray].sort((a, b) =>
        a.original.startLineNumber - b.original.startLineNumber
    );

    for (const change of sortedChanges) {
        const originalStart = change.original.startLineNumber;
        const originalEnd = change.original.endLineNumberExclusive;
        const modifiedStart = change.modified.startLineNumber;
        const modifiedEnd = change.modified.endLineNumberExclusive;

        // Map all lines before this change
        while (originalLine < originalStart && modifiedLine < modifiedStart) {
            originalToModified.set(originalLine, modifiedLine);
            modifiedToOriginal.set(modifiedLine, originalLine);
            originalLine++;
            modifiedLine++;
        }

        // Handle the change block
        const originalSize = originalEnd - originalStart;
        const modifiedSize = modifiedEnd - modifiedStart;

        if (originalSize === 0 && modifiedSize > 0) {
            // Pure addition - all modified lines map to the original line at the start
            for (let i = 0; i < modifiedSize; i++) {
                modifiedToOriginal.set(modifiedStart + i, originalStart);
            }
        } else if (modifiedSize === 0 && originalSize > 0) {
            // Pure deletion - all original lines map to the modified line at the start
            for (let i = 0; i < originalSize; i++) {
                originalToModified.set(originalStart + i, modifiedStart);
            }
        } else if (originalSize > 0 && modifiedSize > 0) {
            // Modification - map proportionally
            for (let i = 0; i < originalSize; i++) {
                const modifiedIndex = Math.floor(i * modifiedSize / originalSize);
                originalToModified.set(originalStart + i, modifiedStart + modifiedIndex);
            }

            for (let i = 0; i < modifiedSize; i++) {
                const originalIndex = Math.floor(i * originalSize / modifiedSize);
                modifiedToOriginal.set(modifiedStart + i, originalStart + originalIndex);
            }
        }

        // Update line counters to after this change
        originalLine = originalEnd;
        modifiedLine = modifiedEnd;
    }

    // Map any remaining lines after the last change
    const maxOriginal = Math.max(...changesArray.map((c: any) => c.original.endLineNumberExclusive), originalLine);
    const maxModified = Math.max(...changesArray.map((c: any) => c.modified.endLineNumberExclusive), modifiedLine);

    while (originalLine <= maxOriginal && modifiedLine <= maxModified) {
        originalToModified.set(originalLine, modifiedLine);
        modifiedToOriginal.set(modifiedLine, originalLine);
        originalLine++;
        modifiedLine++;
    }

    // Look up the corresponding line
    if (currentEditorType === 'original') {
        const targetLine = originalToModified.get(currentLine) || currentLine;
        console.log(`Mapping original line ${currentLine} to modified line ${targetLine}`);
        return targetLine; // Return 1-based line number
    } else {
        const targetLine = modifiedToOriginal.get(currentLine) || currentLine;
        console.log(`Mapping modified line ${currentLine} to original line ${targetLine}`);
        return targetLine; // Return 1-based line number
    }
}
