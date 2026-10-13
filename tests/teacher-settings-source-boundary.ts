import assert from 'node:assert/strict';
import edits from './fixtures/teacher-settings-page-edits.json';
// Undo exactly the reviewed settings edits, then verify the original Q-05 hash.
// Original hashes, content/asset fixtures and runtime expectations stay intact.
export function withoutTeacherSettingsEdits(path: string, source: string): string {
  if (path !== 'src/components/MyAITeacherPage.tsx') return source;
  for (const edit of [...edits].reverse()) {
    assert.equal(source.split(edit.after).length - 1, 1, `settings edit must match uniquely: ${edit.after.slice(0, 65)}`);
    source = source.replace(edit.after, edit.before);
  }
  return source;
}
