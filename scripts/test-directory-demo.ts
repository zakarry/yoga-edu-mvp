import assert from 'node:assert/strict';
import { teachers, schools, events, clubs } from '../src/data';
import { isDemoDirectoryItem, visibleDirectoryItems } from '../src/lib/directoryVisibility';
const samples = [...teachers, ...schools, ...events, ...clubs];
assert.equal(samples.length, 40);
assert(samples.every(item => item.isDemo === true));
assert.equal(visibleDirectoryItems(samples).length, 0);
assert.equal(visibleDirectoryItems(samples, true).length, 40);
// Legacy diagnosis snapshots do not have isDemo and carry ranking fields.
const legacy = samples.map(({ isDemo, ...item }) => ({ ...item, matchScore: 75 }));
assert(legacy.every(isDemoDirectoryItem));
assert.equal(visibleDirectoryItems(legacy).length, 0);
assert.equal(visibleDirectoryItems(legacy, true).length, 40);
const confirmed = { ...schools[0], id: 'confirmed-school', name: '正式掲載テスト', isDemo: false };
assert.equal(visibleDirectoryItems([...samples, confirmed]).length, 1);
assert.equal(visibleDirectoryItems([...samples, confirmed])[0], confirmed);
// Names/IDs alone are never a reason to classify an unverified record as demo.
const unknown = { ...legacy[0], description: '由来が異なる未分類データ' };
assert.equal(isDemoDirectoryItem(unknown), false);
assert.equal(visibleDirectoryItems([unknown]).length, 1);
// Filtering must not mutate stored history or remove original records.
const before = JSON.stringify(legacy);
visibleDirectoryItems(legacy);
assert.equal(JSON.stringify(legacy), before);
console.log('PASS: 40 fixtures; normal/demo; legacy diagnosis snapshots; formal/unknown preservation; non-mutating filters');
