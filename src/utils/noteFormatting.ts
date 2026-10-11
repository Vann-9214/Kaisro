export type NoteFormat = 'bold' | 'italic' | 'heading' | 'list';
export function formatNoteSelection(body: string, selection: { start: number; end: number }, format: NoteFormat) {
  const start = Math.max(0, Math.min(body.length, selection.start));
  const end = Math.max(start, Math.min(body.length, selection.end));
  const selected = body.slice(start, end) || 'text';
  const token = format === 'bold' ? '**' : '*';
  const insertion = format === 'bold' || format === 'italic' ? token + selected + token
    : (start && body[start - 1] !== '\n' ? '\n' : '') + selected.split('\n').map(line => (format === 'heading' ? '# ' : '- ') + line).join('\n') + '\n';
  return { body: body.slice(0, start) + insertion + body.slice(end), selection: { start, end: start + insertion.length } };
}
