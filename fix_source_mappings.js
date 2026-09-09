#!/usr/bin/env node
/**
 * fix_source_mappings.js
 *
 * Reads scripts/data/yoga_knowledge_master_k2_6_source_mappings.csv from disk,
 * parses it (handling quoted fields with commas), looks up entry_id from
 * knowledge_entries by master_id, DELETEs all existing yoga_zukan sources,
 * then INSERTs all 392 rows. is_primary = true only for the first occurrence
 * per master_id (equivalent to ROW_NUMBER() OVER (PARTITION BY master_id) = 1).
 *
 * Idempotent: DELETE then INSERT.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node fix_source_mappings.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// ---------------------------------------------------------------------------
// Config / env
// ---------------------------------------------------------------------------
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars are required.');
  console.error('Set them inline, e.g.:');
  console.error('  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node fix_source_mappings.js');
  process.exit(1);
}

const CSV_PATH = path.join(
  process.cwd(),
  'scripts',
  'data',
  'yoga_knowledge_master_k2_6_source_mappings.csv'
);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------------------------------------------------------------------------
// CSV parser (RFC-4180-ish): handles quoted fields, embedded commas, "" escapes
// ---------------------------------------------------------------------------
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ',') {
      row.push(field);
      field = '';
      i++;
      continue;
    }
    if (ch === '\r') {
      i++;
      continue;
    }
    if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i++;
      continue;
    }
    field += ch;
    i++;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function csvToObjects(text) {
  const all = parseCSV(text);
  const dataRows = all.filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ''));
  if (dataRows.length === 0) return [];
  const header = dataRows[0];
  const objs = [];
  for (let i = 1; i < dataRows.length; i++) {
    const r = dataRows[i];
    const o = {};
    for (let c = 0; c < header.length; c++) {
      o[header[c]] = r[c] !== undefined ? r[c] : '';
    }
    objs.push(o);
  }
  return objs;
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
const VALID_STATUS = new Set(['checked', 'final', 'review_required', 'draft']);

function normalizeStatus(s) {
  if (!s) return 'checked';
  const v = s.trim();
  if (VALID_STATUS.has(v)) return v;
  return 'checked'; // unknown status -> safe default per schema CHECK
}

function nullIfEmpty(v) {
  if (v === undefined || v === null) return null;
  const t = String(v).trim();
  return t === '' ? null : t;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
async function main() {
  // 1. Read CSV from disk
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`ERROR: CSV not found at ${CSV_PATH}`);
    process.exit(1);
  }
  const raw = fs.readFileSync(CSV_PATH, 'utf-8');
  const records = csvToObjects(raw);
  console.log(`Total CSV rows read: ${records.length}`);

  if (records.length === 0) {
    console.error('ERROR: no data rows in CSV.');
    process.exit(1);
  }

  // 2. Collect unique master_ids (preserve first-seen order)
  const masterIds = [];
  const seenMid = new Set();
  for (const r of records) {
    const mid = (r.master_id || '').trim();
    if (!mid) {
      console.error('ERROR: row with empty master_id:', JSON.stringify(r));
      process.exit(1);
    }
    if (!seenMid.has(mid)) {
      seenMid.add(mid);
      masterIds.push(mid);
    }
  }
  console.log(`Unique master_ids in CSV: ${masterIds.length}`);

  // 3. Look up entry_id from knowledge_entries by master_id (batched)
  const entryIdByMasterId = new Map();
  const BATCH = 200;
  for (let i = 0; i < masterIds.length; i += BATCH) {
    const slice = masterIds.slice(i, i + BATCH);
    const { data, error } = await supabase
      .from('knowledge_entries')
      .select('id, master_id')
      .in('master_id', slice);
    if (error) {
      console.error('ERROR fetching knowledge_entries:', error.message);
      process.exit(1);
    }
    for (const row of data || []) {
      if (row.master_id) entryIdByMasterId.set(row.master_id, row.id);
    }
  }

  const missingMasterIds = masterIds.filter((m) => !entryIdByMasterId.has(m));
  if (missingMasterIds.length > 0) {
    console.error(`WARNING: ${missingMasterIds.length} master_id(s) not found in knowledge_entries:`);
    console.error(missingMasterIds.join(', '));
  }

  // 4. Build rows to insert.
  //    is_primary = true ONLY for the first occurrence per master_id
  //    (equivalent to ROW_NUMBER() OVER (PARTITION BY master_id ORDER BY csv order) = 1).
  const firstSeen = new Set();
  const toInsert = [];
  for (const r of records) {
    const mid = (r.master_id || '').trim();
    const entryId = entryIdByMasterId.get(mid);
    if (!entryId) continue; // skip unmatched (reported above)

    const isPrimary = !firstSeen.has(mid);
    if (isPrimary) firstSeen.add(mid);

    toInsert.push({
      entry_id: entryId,
      source_type: 'yoga_zukan',
      source_title: (r.chapter_title || '').trim(), // NOT NULL
      source_section: nullIfEmpty(r.section_title),
      source_chapter: nullIfEmpty(r.chapter_no),
      source_url: null,
      source_order: null,
      is_primary: isPrimary,
      source_status: normalizeStatus(r.source_status),
      source_file: nullIfEmpty(r.source_file),
      source_section_no: nullIfEmpty(r.section_no),
      source_entry_title: nullIfEmpty(r.source_entry_title),
    });
  }

  console.log(`Rows prepared for insert: ${toInsert.length}`);

  // 5. DELETE all existing yoga_zukan sources first (idempotent), batched.
  let deletedTotal = 0;
  for (let i = 0; i < masterIds.length; i += BATCH) {
    const entryIds = masterIds
      .slice(i, i + BATCH)
      .map((m) => entryIdByMasterId.get(m))
      .filter((id) => id !== undefined);
    if (entryIds.length === 0) continue;
    const { data: deleted, error: delErr } = await supabase
      .from('knowledge_sources')
      .delete({ count: 'exact' })
      .eq('source_type', 'yoga_zukan')
      .in('entry_id', entryIds);
    if (delErr) {
      console.error('ERROR deleting existing yoga_zukan sources:', delErr.message);
      process.exit(1);
    }
    deletedTotal += deleted ? deleted.length : 0;
  }
  console.log(`Deleted existing yoga_zukan sources: ${deletedTotal}`);

  // 6. INSERT all rows (batched to stay under PostgREST payload limits).
  let insertedTotal = 0;
  for (let i = 0; i < toInsert.length; i += BATCH) {
    const slice = toInsert.slice(i, i + BATCH);
    const { data: ins, error: insErr } = await supabase
      .from('knowledge_sources')
      .insert(slice, { count: 'exact' })
      .select('id');
    if (insErr) {
      console.error('ERROR inserting rows:', insErr.message);
      console.error('Failed batch (first row):', JSON.stringify(slice[0]));
      process.exit(1);
    }
    insertedTotal += ins ? ins.length : 0;
  }
  console.log(`Total rows inserted: ${insertedTotal}`);

  // 7. Final verification.
  const { count: finalCount, error: countErr } = await supabase
    .from('knowledge_sources')
    .select('id', { count: 'exact', head: true })
    .eq('source_type', 'yoga_zukan');
  if (countErr) {
    console.error('ERROR counting final sources:', countErr.message);
    process.exit(1);
  }
  console.log(`Final yoga_zukan source count in DB: ${finalCount}`);

  // Entries with vs without sources (among the master_ids we touched)
  const entriesWithSources = new Set();
  for (let i = 0; i < masterIds.length; i += BATCH) {
    const entryIds = masterIds
      .slice(i, i + BATCH)
      .map((m) => entryIdByMasterId.get(m))
      .filter((id) => id !== undefined);
    if (entryIds.length === 0) continue;
    const { data, error } = await supabase
      .from('knowledge_sources')
      .select('entry_id')
      .eq('source_type', 'yoga_zukan')
      .in('entry_id', entryIds);
    if (error) {
      console.error('ERROR verifying per-entry sources:', error.message);
      process.exit(1);
    }
    for (const row of data || []) entriesWithSources.add(row.entry_id);
  }

  const resolvedEntryIds = masterIds
    .map((m) => entryIdByMasterId.get(m))
    .filter((id) => id !== undefined);
  const entriesWithoutSources = resolvedEntryIds.filter((id) => !entriesWithSources.has(id));

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log('\n================ SUMMARY ================');
  console.log(`Total CSV rows read         : ${records.length}`);
  console.log(`Unique master_ids in CSV   : ${masterIds.length}`);
  console.log(`Master_ids matched in DB   : ${entryIdByMasterId.size}`);
  console.log(`Master_ids missing in DB   : ${missingMasterIds.length}`);
  console.log(`Rows deleted (old sources) : ${deletedTotal}`);
  console.log(`Total rows inserted        : ${insertedTotal}`);
  console.log(`Final yoga_zukan count in DB: ${finalCount}`);
  console.log(`Entries with sources       : ${entriesWithSources.size}`);
  console.log(`Entries without sources     : ${entriesWithoutSources.length}`);
  if (entriesWithoutSources.length > 0) {
    console.log('  (entry_ids without sources):');
    console.log('  ' + entriesWithoutSources.join(', '));
  }
  console.log('========================================');

  if (insertedTotal !== records.length) {
    console.error(
      `\nNOTE: inserted ${insertedTotal} vs CSV ${records.length} rows. ` +
        (missingMasterIds.length
          ? `Difference is accounted for by ${missingMasterIds.length} unmatched master_id(s).`
          : 'Investigate the discrepancy.')
    );
  }
  if (entriesWithoutSources.length === 0 && missingMasterIds.length === 0) {
    console.log('\n✅ All CSV rows inserted; every matched entry has sources.');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
