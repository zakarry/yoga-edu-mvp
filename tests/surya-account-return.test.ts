import test from 'node:test';
import assert from 'node:assert/strict';
import { readSuryaAccountTarget, rememberSuryaAccountTarget, clearSuryaAccountTarget } from '../src/lib/suryaAccountReturn';

test('account return accepts only fresh local destinations; corrupt/expired storage stays public', () => {
  let stored: string | null = null;
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: {
    getItem: () => stored, setItem: (_key: string, value: string) => { stored = value; }, removeItem: () => { stored = null; },
  } });
  for (const target of ['surya-namaskar', 'ai-teacher', 'my-page'] as const) {
    rememberSuryaAccountTarget(target);
    assert.equal(readSuryaAccountTarget(), target);
    clearSuryaAccountTarget();
    assert.equal(readSuryaAccountTarget(), null);
  }
  for (const invalid of [
    '{broken',
    JSON.stringify({ target: 'https://example.com', at: Date.now() }),
    JSON.stringify({ target: 'admin', at: Date.now() }),
    JSON.stringify({ target: 'ai-teacher', at: Date.now() - 31 * 60_000 }),
    JSON.stringify({ target: 'ai-teacher', at: Date.now() + 60_000 }),
  ]) { stored = invalid; assert.equal(readSuryaAccountTarget(), null); }
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, get() { throw new Error('disabled'); } });
  assert.doesNotThrow(() => rememberSuryaAccountTarget('surya-namaskar'));
  assert.equal(readSuryaAccountTarget(), null);
  assert.doesNotThrow(clearSuryaAccountTarget);
  delete (globalThis as { sessionStorage?: Storage }).sessionStorage;
});
