/**
 * importYogaKnowledgeContent.ts
 *
 * K4: Imports structured source text into knowledge_contents and
 * knowledge_source_sections tables.
 *
 * Input: scripts/data/yoga_knowledge_content_k4.json
 *
 * Each JSON entry:
 *   master_id          — must exist in knowledge_entries
 *   content_kind       — source_text | editorial_summary | public_content | ai_teacher_content
 *   language           — default 'ja'
 *   content            — manuscript text (NOT NULL)
 *   safety_review_status — not_reviewed | review_required | reviewed_safe | restricted
 *   sections[]         — optional structured sub-sections
 *     section_type, heading, body, source_order
 *
 * Safety rules:
 *   - If the entry's safety_sensitive = true in knowledge_entries,
 *     safety_review_status MUST be 'review_required' or 'restricted'.
 *   - content_kind = 'ai_teacher_content' is rejected in this phase.
 *
 * Idempotent:
 *   - knowledge_contents: upsert by (knowledge_entry_id, content_kind, language)
 *   - knowledge_source_sections: DELETE by entry_id then INSERT
 *
 * Run:
 *   npx tsx scripts/importYogaKnowledgeContent.ts
 *
 * Env:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ============================================================
// Types
// ============================================================

interface K4Section {
  section_type?: string;
  heading?: string;
  body?: string;
  source_order?: number;
}

interface K4ContentEntry {
  master_id: string;
  content_kind: string;
  language?: string;
  content: string;
  safety_review_status?: string;
  sections?: K4Section[];
}

// ============================================================
// Allowed values
// ============================================================

const ALLOWED_CONTENT_KINDS = new Set([
  'source_text',
  'editorial_summary',
  'public_content',
  'ai_teacher_content',
]);

const ALLOWED_SAFETY_STATUSES = new Set([
  'not_reviewed',
  'review_required',
  'reviewed_safe',
  'restricted',
]);

const ALLOWED_SECTION_TYPES = new Set([
  'definition', 'introduction', 'method', 'benefit', 'caution',
  'contraindication', 'note', 'example', 'history', 'concept',
  'teaching', 'other',
]);

// ============================================================
// Main
// ============================================================

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars required.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Read K4 JSON
  const jsonPath = resolve(__dirname, 'data', 'yoga_knowledge_content_k4.json');
  console.log(`Reading K4 content from: ${jsonPath}`);
  const raw = readFileSync(jsonPath, 'utf-8');
  const entries: K4ContentEntry[] = JSON.parse(raw);
  console.log(`K4 entries to import: ${entries.length}`);

  // 2. Collect master_ids and look up knowledge_entries
  const masterIds = [...new Set(entries.map((e) => e.master_id))];
  console.log(`Unique master_ids: ${masterIds.length}`);

  const { data: keRows, error: keError } = await supabase
    .from('knowledge_entries')
    .select('id, master_id, safety_sensitive, editorial_status')
    .in('master_id', masterIds);

  if (keError) {
    console.error('ERROR fetching knowledge_entries:', keError.message);
    process.exit(1);
  }

  const entryMap = new Map<string, { id: string; safety_sensitive: boolean; editorial_status: string }>();
  for (const row of keRows || []) {
    entryMap.set(row.master_id, {
      id: row.id,
      safety_sensitive: row.safety_sensitive,
      editorial_status: row.editorial_status,
    });
  }

  const missingIds = masterIds.filter((m) => !entryMap.has(m));
  if (missingIds.length > 0) {
    console.error(`ERROR: ${missingIds.length} master_id(s) not found in knowledge_entries:`, missingIds.join(', '));
    process.exit(1);
  }

  // 3. Check source mappings exist for all entries
  const entryIds = masterIds.map((m) => entryMap.get(m)!.id);
  const { data: srcRows, error: srcError } = await supabase
    .from('knowledge_sources')
    .select('entry_id')
    .eq('source_type', 'yoga_zukan')
    .in('entry_id', entryIds);

  if (srcError) {
    console.error('ERROR checking source mappings:', srcError.message);
    process.exit(1);
  }

  const entriesWithSources = new Set((srcRows || []).map((r) => r.entry_id));
  const entriesWithoutSources = entryIds.filter((id) => !entriesWithSources.has(id));
  if (entriesWithoutSources.length > 0) {
    console.error(`ERROR: ${entriesWithoutSources.length} entry/entries have no source mappings. Aborting.`);
    process.exit(1);
  }

  // 4. Validate and prepare rows
  const contentRows: Array<Record<string, unknown>> = [];
  const sectionRows: Array<Record<string, unknown>> = [];
  const errors: string[] = [];

  for (const entry of entries) {
    const entryInfo = entryMap.get(entry.master_id);
    if (!entryInfo) continue; // already reported

    // Validate content_kind
    if (!ALLOWED_CONTENT_KINDS.has(entry.content_kind)) {
      errors.push(`${entry.master_id}: invalid content_kind "${entry.content_kind}"`);
      continue;
    }

    // Reject ai_teacher_content in K4
    if (entry.content_kind === 'ai_teacher_content') {
      errors.push(`${entry.master_id}: ai_teacher_content is not allowed in K4 phase`);
      continue;
    }

    // Validate content not empty
    if (!entry.content || entry.content.trim() === '') {
      errors.push(`${entry.master_id}: content is empty`);
      continue;
    }

    // Validate safety_review_status
    const safetyStatus = entry.safety_review_status || 'not_reviewed';
    if (!ALLOWED_SAFETY_STATUSES.has(safetyStatus)) {
      errors.push(`${entry.master_id}: invalid safety_review_status "${safetyStatus}"`);
      continue;
    }

    // If entry is safety_sensitive, force review_required or restricted
    let finalSafetyStatus = safetyStatus;
    if (entryInfo.safety_sensitive && safetyStatus !== 'review_required' && safetyStatus !== 'restricted') {
      console.warn(`WARNING: ${entry.master_id} is safety_sensitive but safety_review_status="${safetyStatus}". Forcing to "review_required".`);
      finalSafetyStatus = 'review_required';
    }

    const language = entry.language || 'ja';

    contentRows.push({
      knowledge_entry_id: entryInfo.id,
      content_kind: entry.content_kind,
      language,
      content: entry.content,
      content_status: 'source_only',
      safety_review_status: finalSafetyStatus,
    });

    // Prepare sections
    if (entry.sections && entry.sections.length > 0) {
      for (let i = 0; i < entry.sections.length; i++) {
        const sec = entry.sections[i];
        const secType = sec.section_type || 'other';
        if (!ALLOWED_SECTION_TYPES.has(secType)) {
          errors.push(`${entry.master_id}: invalid section_type "${secType}"`);
          continue;
        }
        sectionRows.push({
          knowledge_entry_id: entryInfo.id,
          section_type: secType,
          heading: sec.heading || null,
          body: sec.body || null,
          source_order: sec.source_order ?? i + 1,
        });
      }
    }
  }

  if (errors.length > 0) {
    console.error('\nValidation errors:');
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }

  // 5. Upsert knowledge_contents
  console.log(`\nUpserting ${contentRows.length} content rows...`);
  const { data: upserted, error: upsertError } = await supabase
    .from('knowledge_contents')
    .upsert(contentRows, {
      onConflict: 'knowledge_entry_id,content_kind,language',
    })
    .select('id, content_kind, safety_review_status');

  if (upsertError) {
    console.error('ERROR upserting knowledge_contents:', upsertError.message);
    process.exit(1);
  }
  console.log(`Content rows upserted: ${upserted?.length || 0}`);

  // 6. Delete and re-insert sections (idempotent)
  if (sectionRows.length > 0) {
    console.log(`\nProcessing ${sectionRows.length} section rows...`);
    // Delete existing sections for these entry_ids
    const { error: delError } = await supabase
      .from('knowledge_source_sections')
      .delete()
      .in('knowledge_entry_id', entryIds);

    if (delError) {
      console.error('ERROR deleting existing sections:', delError.message);
      process.exit(1);
    }

    const { data: insSections, error: secError } = await supabase
      .from('knowledge_source_sections')
      .insert(sectionRows)
      .select('id');

    if (secError) {
      console.error('ERROR inserting sections:', secError.message);
      process.exit(1);
    }
    console.log(`Section rows inserted: ${insSections?.length || 0}`);
  }

  // 7. Final verification
  console.log('\n=== Import Summary ===');
  console.log(`K4 JSON entries:        ${entries.length}`);
  console.log(`Content rows upserted:  ${upserted?.length || 0}`);
  console.log(`Section rows inserted:  ${sectionRows.length}`);
  console.log(`Errors:                 ${errors.length}`);

  // Count by safety_review_status
  const statusCounts: Record<string, number> = {};
  for (const row of upserted || []) {
    const s = (row as { safety_review_status: string }).safety_review_status;
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  }
  console.log('\nBy safety_review_status:');
  for (const [status, count] of Object.entries(statusCounts)) {
    console.log(`  ${status}: ${count}`);
  }

  // Verify no ai_teacher_content was inserted
  const { data: aiCheck } = await supabase
    .from('knowledge_contents')
    .select('id')
    .eq('content_kind', 'ai_teacher_content');
  console.log(`\nai_teacher_content rows (should be 0): ${aiCheck?.length || 0}`);

  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
