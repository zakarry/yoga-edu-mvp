/**
 * importYogaKnowledge.ts
 *
 * Imports the formal K2.6 Yoga Knowledge master data into Supabase.
 *
 * Reads:
 *   - scripts/data/yoga_knowledge_master_k2_6_formal.json  (entries)
 *   - scripts/data/yoga_knowledge_master_k2_6_source_mappings.csv (source mappings)
 *
 * Writes (upsert, idempotent):
 *   - knowledge_entries  (keyed by master_id via slug upsert + master_id reconciliation)
 *   - knowledge_sources  (keyed by entry_id + source_type + source_file)
 *
 * Environment variables (set in your shell, NOT VITE_ prefixed):
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *
 * Run:
 *   npx tsx scripts/importYogaKnowledge.ts
 *   # or: npx ts-node --esm scripts/importYogaKnowledge.ts
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ============================================================
// Types — mirror the DB schema (only the fields we touch)
// ============================================================

interface MasterEntry {
  master_id: string;
  chapter_no: string | number | null;
  chapter_title: string | null;
  section_no: string | number | null;
  section_title: string | null;
  entry_title: string;
  entry_title_en: string | null;
  category: string;
  subcategory: string | null;
  content_type: string;
  ai_use_scope: string;
  practice_candidate: string | number | boolean | null;
  teacher_candidate: string | number | boolean | null;
  safety_sensitive: string | number | boolean | null;
  db_ready: string | number | boolean | null;
  editorial_status: string;
  review_reason: string | null;
  source_file: string | null;
  source_status: string | null;
}

interface SourceMapping {
  master_id: string;
  chapter_no: string;
  chapter_title: string;
  section_no: string;
  section_title: string;
  source_entry_title: string;
  source_file: string;
  source_status: string;
}

interface KnowledgeEntryRow {
  master_id: string;
  slug: string;
  title_ja: string;
  title_en: string | null;
  category: string;
  subcategory: string | null;
  content_type: string;
  ai_use_scope: string;
  chapter_no: number | null;
  chapter_title: string | null;
  item_no: number | null;
  editorial_status: 'candidate_ready' | 'review_needed';
  review_reason: string | null;
  practice_candidate: boolean;
  teacher_candidate: boolean;
  safety_sensitive: boolean;
  is_published: boolean;
  language: string;
  summary: string | null;
  content: string | null;
  difficulty: string | null;
  audience: string[];
}

interface KnowledgeSourceRow {
  entry_id: string;
  source_type: 'yoga_zukan';
  source_title: string;
  source_section: string | null;
  source_chapter: string | null;
  source_file: string | null;
  source_status: 'checked' | 'final' | 'review_required' | 'draft';
  source_section_no: string | null;
  source_entry_title: string | null;
  is_primary: boolean;
}

// ============================================================
// Allowed value sets (must match DB CHECK constraints)
// ============================================================

const ALLOWED_CATEGORIES = new Set([
  'asana', 'pranayama', 'dhyana', 'philosophy',
  'anatomy', 'physiology', 'wellness', 'stress_management',
  'teaching', 'communication', 'breathing', 'yoga_history',
]);

const ALLOWED_CONTENT_TYPES = new Set([
  'knowledge', 'practice', 'definition',
  'technique', 'concept', 'teaching',
]);

const ALLOWED_AI_USE_SCOPES = new Set([
  'reference_only',
  'ai_teacher_explanation',
  'ai_teacher_practice',
  'teacher_education',
  'guru_future',
]);

const ALLOWED_EDITORIAL_STATUSES = new Set(['candidate_ready', 'review_needed']);

const ALLOWED_SOURCE_STATUSES = new Set(['checked', 'final', 'review_required', 'draft']);

// ============================================================
// Helpers
// ============================================================

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseBool(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  if (v == null) return false;
  const s = String(v).trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes' || s === 't';
}

function parseIntOrNull(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? Math.trunc(v) : null;
  const s = String(v).trim();
  if (s === '') return null;
  // Extract the leading integer part (handles "3", "3.1", "第3章", "3-2" -> 3)
  const m = s.match(/-?\d+/);
  if (!m) return null;
  const n = parseInt(m[0], 10);
  return Number.isFinite(n) ? n : null;
}

function parseStringOrNull(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

/**
 * Minimal CSV parser that handles quoted fields, embedded commas,
 * embedded newlines inside quotes, and doubled quotes ("").
 * Assumes the first line is a header row.
 */
function parseCSV(text: string): { header: string[]; rows: string[][] } {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field);
        field = '';
      } else if (ch === '\r') {
        // ignore — handled by \n
      } else if (ch === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else {
        field += ch;
      }
    }
  }
  // flush trailing field/row if any content remains
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Drop trailing empty line if present
  if (rows.length > 0) {
    const last = rows[rows.length - 1];
    if (last.length === 1 && last[0] === '') rows.pop();
  }

  if (rows.length === 0) return { header: [], rows: [] };
  const header = rows[0].map((h) => h.trim());
  return { header, rows: rows.slice(1) };
}

function csvRowToObject(header: string[], row: string[]): Record<string, string> {
  const obj: Record<string, string> = {};
  for (let i = 0; i < header.length; i++) {
    obj[header[i]] = row[i] ?? '';
  }
  return obj;
}

// ============================================================
// Validation
// ============================================================

interface ValidationError {
  master_id: string;
  field: string;
  message: string;
}

function validateEntry(entry: MasterEntry): ValidationError[] {
  const errs: ValidationError[] = [];
  const id = entry.master_id ?? '<missing>';

  if (!entry.master_id || String(entry.master_id).trim() === '') {
    errs.push({ master_id: '<missing>', field: 'master_id', message: 'master_id is empty' });
    return errs; // can't continue without an id
  }

  if (!entry.entry_title || String(entry.entry_title).trim() === '') {
    errs.push({ master_id: id, field: 'entry_title', message: 'entry_title is empty' });
  }

  if (!entry.category || !ALLOWED_CATEGORIES.has(entry.category)) {
    errs.push({
      master_id: id,
      field: 'category',
      message: `category "${entry.category}" is not in allowed set`,
    });
  }

  if (!entry.content_type || !ALLOWED_CONTENT_TYPES.has(entry.content_type)) {
    errs.push({
      master_id: id,
      field: 'content_type',
      message: `content_type "${entry.content_type}" is not in allowed set`,
    });
  }

  if (!entry.ai_use_scope || !ALLOWED_AI_USE_SCOPES.has(entry.ai_use_scope)) {
    errs.push({
      master_id: id,
      field: 'ai_use_scope',
      message: `ai_use_scope "${entry.ai_use_scope}" is not in allowed set`,
    });
  }

  // ai_teacher_practice must NOT appear in ai_use_scope for this import
  // (per spec — these entries are not cleared for AI teacher practice yet)
  if (entry.ai_use_scope === 'ai_teacher_practice') {
    errs.push({
      master_id: id,
      field: 'ai_use_scope',
      message: 'ai_use_scope must NOT be "ai_teacher_practice" for this import batch',
    });
  }

  if (!entry.editorial_status || !ALLOWED_EDITORIAL_STATUSES.has(entry.editorial_status)) {
    errs.push({
      master_id: id,
      field: 'editorial_status',
      message: `editorial_status "${entry.editorial_status}" must be candidate_ready or review_needed`,
    });
  }

  // review_needed entries must NOT be published. We force is_published=false
  // for ALL entries in this import, so this is structurally enforced — but we
  // still surface a warning if the source data implies a publish intent.
  if (entry.editorial_status === 'review_needed') {
    const dbReady = parseBool(entry.db_ready);
    if (dbReady) {
      errs.push({
        master_id: id,
        field: 'is_published',
        message: 'review_needed entries must not be published (db_ready=true conflicts)',
      });
    }
  }

  return errs;
}

// ============================================================
// Mapping
// ============================================================

function mapToEntryRow(entry: MasterEntry): KnowledgeEntryRow {
  const masterId = String(entry.master_id).trim();
  return {
    master_id: masterId,
    slug: masterId.toLowerCase(),
    title_ja: String(entry.entry_title).trim(),
    title_en: parseStringOrNull(entry.entry_title_en),
    category: entry.category,
    subcategory: parseStringOrNull(entry.subcategory),
    content_type: entry.content_type,
    ai_use_scope: entry.ai_use_scope,
    chapter_no: parseIntOrNull(entry.chapter_no),
    chapter_title: parseStringOrNull(entry.chapter_title),
    item_no: parseIntOrNull(entry.section_no),
    editorial_status: entry.editorial_status as 'candidate_ready' | 'review_needed',
    review_reason: parseStringOrNull(entry.review_reason),
    practice_candidate: parseBool(entry.practice_candidate),
    teacher_candidate: parseBool(entry.teacher_candidate),
    safety_sensitive: parseBool(entry.safety_sensitive),
    is_published: false, // all entries unpublished for now
    language: 'ja',
    summary: null,
    content: null,
    difficulty: null,
    audience: [],
  };
}

function mapToSourceRow(
  entryId: string,
  sm: SourceMapping,
  isPrimary: boolean,
): KnowledgeSourceRow | null {
  const sourceStatus = parseStringOrNull(sm.source_status) ?? 'checked';
  if (!ALLOWED_SOURCE_STATUSES.has(sourceStatus)) {
    return null; // will be reported as a skipped source
  }
  return {
    entry_id: entryId,
    source_type: 'yoga_zukan',
    source_title: parseStringOrNull(sm.chapter_title) ?? 'ヨガ図鑑',
    source_section: parseStringOrNull(sm.section_title),
    source_chapter: parseStringOrNull(sm.chapter_no),
    source_file: parseStringOrNull(sm.source_file),
    source_status: sourceStatus as 'checked' | 'final' | 'review_required' | 'draft',
    source_section_no: parseStringOrNull(sm.section_no),
    source_entry_title: parseStringOrNull(sm.source_entry_title),
    is_primary: isPrimary,
  };
}

// ============================================================
// Main
// ============================================================

async function main() {
  // ---- 1. Env + client ----
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required.');
    console.error('Set them in your shell before running:');
    console.error('  export SUPABASE_URL=...');
    console.error('  export SUPABASE_SERVICE_ROLE_KEY=...');
    process.exit(1);
  }

  const supabase: SupabaseClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ---- 2. Read input files ----
  const jsonPath = resolve(__dirname, 'data/yoga_knowledge_master_k2_6_formal.json');
  const csvPath = resolve(__dirname, 'data/yoga_knowledge_master_k2_6_source_mappings.csv');

  let rawEntries: unknown[] = [];
  try {
    const raw = readFileSync(jsonPath, 'utf-8');
    rawEntries = JSON.parse(raw) as unknown[];
  } catch (e) {
    console.error(`ERROR: Failed to read/parse entries JSON at ${jsonPath}:`, e);
    process.exit(1);
  }

  if (!Array.isArray(rawEntries)) {
    console.error('ERROR: entries JSON is not an array');
    process.exit(1);
  }

  let sourceMappings: SourceMapping[] = [];
  try {
    const csvText = readFileSync(csvPath, 'utf-8');
    const { header, rows } = parseCSV(csvText);
    const byMasterId = new Map<string, SourceMapping>();
    for (const row of rows) {
      const obj = csvRowToObject(header, row);
      const masterId = (obj.master_id ?? '').trim();
      if (!masterId) continue;
      byMasterId.set(masterId, {
        master_id: masterId,
        chapter_no: obj.chapter_no ?? '',
        chapter_title: obj.chapter_title ?? '',
        section_no: obj.section_no ?? '',
        section_title: obj.section_title ?? '',
        source_entry_title: obj.source_entry_title ?? '',
        source_file: obj.source_file ?? '',
        source_status: obj.source_status ?? '',
      });
    }
    sourceMappings = Array.from(byMasterId.values());
  } catch (e) {
    console.error(`WARNING: Failed to read/parse source mappings CSV at ${csvPath}:`, e);
    console.error('Proceeding without source mappings (knowledge_sources will be skipped).');
  }

  // ---- 3. Validate ----
  const entries = rawEntries as MasterEntry[];
  const validationErrors: ValidationError[] = [];
  const seenMasterIds = new Set<string>();
  const duplicateMasterIds = new Set<string>();

  for (const entry of entries) {
    const id = entry.master_id ? String(entry.master_id).trim() : '';
    if (id) {
      if (seenMasterIds.has(id)) {
        duplicateMasterIds.add(id);
      }
      seenMasterIds.add(id);
    }
    validationErrors.push(...validateEntry(entry));
  }

  for (const dup of duplicateMasterIds) {
    validationErrors.push({
      master_id: dup,
      field: 'master_id',
      message: 'master_id is duplicated within the source file',
    });
  }

  if (validationErrors.length > 0) {
    console.error(`\n❌ Validation failed with ${validationErrors.length} error(s):`);
    for (const e of validationErrors) {
      console.error(`  [${e.master_id}] ${e.field}: ${e.message}`);
    }
    console.error('\nAborting import. Fix the source data and re-run.');
    process.exit(1);
  }

  // ---- 4. Build entry rows ----
  const entryRows = entries.map(mapToEntryRow);
  const masterIdToRow = new Map<string, KnowledgeEntryRow>();
  for (const row of entryRows) masterIdToRow.set(row.master_id, row);

  // ---- 5. Upsert knowledge_entries ----
  // We upsert on the unique `slug` column. Because slug = lower(master_id)
  // and master_id is also UNIQUE, slug uniquely identifies the row across runs.
  console.log(`\n⏫ Upserting ${entryRows.length} knowledge_entries (on conflict: slug)...`);
  const { data: upserted, error: upsertError } = await supabase
    .from('knowledge_entries')
    .upsert(entryRows, { onConflict: 'slug' })
    .select('id, master_id, slug, created_at, updated_at');

  if (upsertError) {
    console.error('ERROR: knowledge_entries upsert failed:', upsertError);
    process.exit(1);
  }

  if (!upserted || upserted.length !== entryRows.length) {
    console.error(
      `ERROR: expected ${entryRows.length} upserted rows, got ${upserted?.length ?? 0}`,
    );
    process.exit(1);
  }
  const upsertedRows: { id: string; master_id: string; slug: string; created_at: string; updated_at: string }[] =
    upserted as unknown as typeof upsertedRows;

  // Determine inserted vs updated by comparing created_at vs updated_at.
  // On INSERT both default to now() and are ~equal. On UPDATE, updated_at is bumped.
  // We treat "inserted" as rows where created_at and updated_at are within 2s.
  let insertedCount = 0;
  let updatedCount = 0;
  const masterIdToDbId = new Map<string, string>();
  for (const row of upsertedRows) {
    masterIdToDbId.set(row.master_id, row.id);
    const created = new Date(row.created_at).getTime();
    const updated = new Date(row.updated_at).getTime();
    if (Number.isFinite(created) && Number.isFinite(updated)) {
      const ageMs = Math.abs(updated - created);
      if (ageMs < 2000) insertedCount++;
      else updatedCount++;
    } else {
      insertedCount++;
    }
  }

  console.log(`   ✓ ${upsertedRows.length} rows upserted (inserted ≈ ${insertedCount}, updated ≈ ${updatedCount})`);

  // ---- 6. Build + upsert knowledge_sources ----
  const sourceRows: KnowledgeSourceRow[] = [];
  const skippedSources: { master_id: string; reason: string }[] = [];

  for (const sm of sourceMappings) {
    const dbId = masterIdToDbId.get(sm.master_id);
    if (!dbId) {
      skippedSources.push({
        master_id: sm.master_id,
        reason: 'no matching knowledge_entry for master_id',
      });
      continue;
    }
    // First source per entry is primary. We process sourceMappings in order;
    // since there is one mapping per master_id in this dataset, the first
    // (and only) one is primary.
    const isPrimary = true;
    const sourceRow = mapToSourceRow(dbId, sm, isPrimary);
    if (!sourceRow) {
      skippedSources.push({
        master_id: sm.master_id,
        reason: `invalid source_status "${sm.source_status}"`,
      });
      continue;
    }
    sourceRows.push(sourceRow);
  }

  // For entries with NO source mapping at all, we still create a primary
  // yoga_zukan source with whatever chapter info is on the entry itself,
  // so that every entry has at least one source row.
  const sourceMasterIds = new Set(sourceMappings.map((s) => s.master_id));
  for (const [masterId, entryRow] of masterIdToRow) {
    if (sourceMasterIds.has(masterId)) continue;
    const dbId = masterIdToDbId.get(masterId);
    if (!dbId) continue;
    sourceRows.push({
      entry_id: dbId,
      source_type: 'yoga_zukan',
      source_title: entryRow.chapter_title ?? 'ヨガ図鑑',
      source_section: null,
      source_chapter: entryRow.chapter_no != null ? String(entryRow.chapter_no) : null,
      source_file: null,
      source_status: 'checked',
      source_section_no: null,
      source_entry_title: null,
      is_primary: true,
    });
  }

  let sourcesInserted = 0;
  if (sourceRows.length > 0) {
    console.log(`\n⏫ Upserting ${sourceRows.length} knowledge_sources...`);

    // Upsert in batches to avoid payload limits. We use a composite identity
    // (entry_id + source_type + source_file) for idempotency. The table has no
    // unique constraint on those columns by default, so we dedupe in-app and
    // delete-then-insert per entry to stay idempotent across re-runs.
    const BATCH_SIZE = 200;
    for (let i = 0; i < sourceRows.length; i += BATCH_SIZE) {
      const batch = sourceRows.slice(i, i + BATCH_SIZE);

      // Gather entry_ids in this batch and clear their existing yoga_zukan
      // sources so the upsert is a clean replace (idempotent re-runs).
      const entryIds = Array.from(new Set(batch.map((b) => b.entry_id)));
      const { error: delError } = await supabase
        .from('knowledge_sources')
        .delete()
        .in('entry_id', entryIds)
        .eq('source_type', 'yoga_zukan');

      if (delError) {
        console.error(`ERROR: failed to clear existing sources for batch:`, delError);
        process.exit(1);
      }

      const { data: inserted, error: insError } = await supabase
        .from('knowledge_sources')
        .insert(batch)
        .select('id');

      if (insError) {
        console.error(`ERROR: knowledge_sources insert failed on batch ${i}:`, insError);
        process.exit(1);
      }
      sourcesInserted += inserted?.length ?? 0;
    }
    console.log(`   ✓ ${sourcesInserted} source rows inserted`);
  } else {
    console.log('\nℹ️  No source mappings to insert.');
  }

  if (skippedSources.length > 0) {
    console.warn(`\n⚠️  Skipped ${skippedSources.length} source mapping(s):`);
    for (const s of skippedSources) {
      console.warn(`   [${s.master_id}] ${s.reason}`);
    }
  }

  // ---- 7. Summary report ----
  const byEditorialStatus = new Map<string, number>();
  const bySafetySensitive = { true: 0, false: 0 };
  const byPracticeCandidate = { true: 0, false: 0 };
  const byTeacherCandidate = { true: 0, false: 0 };

  for (const row of entryRows) {
    byEditorialStatus.set(
      row.editorial_status,
      (byEditorialStatus.get(row.editorial_status) ?? 0) + 1,
    );
    if (row.safety_sensitive) bySafetySensitive.true++;
    else bySafetySensitive.false++;
    if (row.practice_candidate) byPracticeCandidate.true++;
    else byPracticeCandidate.false++;
    if (row.teacher_candidate) byTeacherCandidate.true++;
    else byTeacherCandidate.false++;
  }

  const errorCount = validationErrors.length + skippedSources.length;

  console.log('\n' + '═'.repeat(60));
  console.log('  IMPORT SUMMARY — Yoga Knowledge (K2.6 Formal Master)');
  console.log('═'.repeat(60));
  console.log(`  Total entries read          : ${entries.length}`);
  console.log(`  Entries inserted (new)      : ${insertedCount}`);
  console.log(`  Entries updated (existing)  : ${updatedCount}`);
  console.log(`  Source mappings read (CSV)  : ${sourceMappings.length}`);
  console.log(`  Source rows inserted         : ${sourcesInserted}`);
  console.log(`  Sources skipped             : ${skippedSources.length}`);
  console.log(`  Validation errors           : ${validationErrors.length}`);
  console.log(`  Total error count           : ${errorCount}`);
  console.log('─'.repeat(60));
  console.log('  By editorial_status:');
  for (const [k, v] of byEditorialStatus) {
    console.log(`    ${k.padEnd(20)} : ${v}`);
  }
  console.log('  By safety_sensitive:');
  console.log(`    true              : ${bySafetySensitive.true}`);
  console.log(`    false             : ${bySafetySensitive.false}`);
  console.log('  By practice_candidate:');
  console.log(`    true              : ${byPracticeCandidate.true}`);
  console.log(`    false             : ${byPracticeCandidate.false}`);
  console.log('  By teacher_candidate:');
  console.log(`    true              : ${byTeacherCandidate.true}`);
  console.log(`    false             : ${byTeacherCandidate.false}`);
  console.log('═'.repeat(60));

  if (validationErrors.length > 0) {
    process.exit(1); // shouldn't reach here (we exit earlier), kept for safety
  }
  console.log('\n✅ Import complete.\n');
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
