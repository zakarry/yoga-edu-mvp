import fs from 'fs';

const data = JSON.parse(fs.readFileSync(new URL('./data/Boltに渡す_呼吸DB第5版.json', import.meta.url), 'utf8'));

function esc(s) {
  if (s == null || s === undefined) return 'NULL';
  return "'" + String(s).replace(/'/g, "''") + "'";
}

function arr(a) {
  if (!a || a.length === 0) return "'{}'";
  return "ARRAY[" + a.map(x => esc(x)).join(',') + "]::text[]";
}

function intarr(a) {
  if (!a || a.length === 0) return "'{}'";
  return "ARRAY[" + a.map(x => parseInt(x)).join(',') + "]::integer[]";
}

function jsonb(v) {
  if (!v || (Array.isArray(v) && v.length === 0) || (typeof v === 'object' && Object.keys(v).length === 0)) return "'[]'::jsonb";
  return "'" + JSON.stringify(v).replace(/'/g, "''") + "'::jsonb";
}

function bool(v) {
  return v ? 'true' : 'false';
}

let sql = '';

// Categories
for (const c of data.data.categories) {
  sql += `INSERT INTO breath_manager_v5.bm5_categories (category_id, name, description) VALUES (${esc(c.category_id)}, ${esc(c.name)}, ${esc(c.description)}) ON CONFLICT (category_id) DO NOTHING;\n`;
}

// Sources — use display_title as title
for (const s of data.data.sources) {
  sql += `INSERT INTO breath_manager_v5.bm5_sources (source_id, title, publisher, edition, source_type) VALUES (${esc(s.source_id)}, ${esc(s.display_title)}, ${esc(s.original_filename)}, ${esc(s.db_version)}, ${esc(s.source_status)}) ON CONFLICT (source_id) DO NOTHING;\n`;
}

// Passages — use text_transcribed as content, printed_label as page_label, region as section_label
for (const p of data.data.passages) {
  sql += `INSERT INTO breath_manager_v5.bm5_passages (passage_id, source_id, chapter, section_label, content, page_label) VALUES (${esc(p.passage_id)}, ${esc(p.source_id)}, NULL, ${esc(p.region)}, ${esc(p.text_transcribed)}, ${esc(p.printed_label)}) ON CONFLICT (passage_id) DO NOTHING;\n`;
}

// Assets — use path as file_ref, passage_ids[0] as passage_id
for (const a of data.data.assets) {
  const pid = a.passage_ids && a.passage_ids.length > 0 ? a.passage_ids[0] : null;
  sql += `INSERT INTO breath_manager_v5.bm5_assets (asset_id, passage_id, asset_type, label, file_ref, connected) VALUES (${esc(a.asset_id)}, ${esc(pid)}, ${esc(a.visual_review_status)}, ${esc(a.transcription_scope)}, ${esc(a.path)}, ${bool(a.full_transcription_verified)}) ON CONFLICT (asset_id) DO NOTHING;\n`;
}

// Knowledge
for (const k of data.data.knowledge) {
  sql += `INSERT INTO breath_manager_v5.bm5_knowledge (knowledge_id, title, category_id, tags, example_questions, answer_short, answer_detail, source_passage_ids, editorial_notes, external_check_ids, related_catalog_ids, review_state, content_kind, preview_allowed, production_ready, clinical_efficacy_verified, issue_ids, chapter_numbers, editorial_correction_ids, answer_constraints, editorial_policy_version) VALUES (${esc(k.knowledge_id)}, ${esc(k.title)}, ${esc(k.category_id)}, ${arr(k.tags)}, ${arr(k.example_questions)}, ${esc(k.answer_short)}, ${esc(k.answer_detail)}, ${arr(k.source_passage_ids)}, ${arr(k.editorial_notes)}, ${arr(k.external_check_ids)}, ${arr(k.related_catalog_ids)}, ${esc(k.review_state)}, ${esc(k.content_kind)}, ${bool(k.preview_allowed)}, ${bool(k.production_ready)}, ${bool(k.clinical_efficacy_verified)}, ${arr(k.issue_ids)}, ${intarr(k.chapter_numbers)}, ${arr(k.editorial_correction_ids)}, ${jsonb(k.answer_constraints)}, ${esc(k.editorial_policy_version)}) ON CONFLICT (knowledge_id) DO NOTHING;\n`;
}

// Catalog — use safety_ids instead of related_safety_ids
for (const c of data.data.catalog) {
  sql += `INSERT INTO breath_manager_v5.bm5_catalog (catalog_id, name, aliases, category_id, tradition_category, curriculum_mode, purpose_in_source, steps_editorial, source_passage_ids, related_knowledge_ids, related_safety_ids, production_ready, overview_only, variants, answer_constraints, editorial_policy_version) VALUES (${esc(c.catalog_id)}, ${esc(c.name)}, ${arr(c.aliases)}, ${esc(c.category_id)}, ${esc(c.tradition_category)}, ${esc(c.curriculum_mode)}, ${esc(c.purpose_in_source)}, ${arr(c.steps_editorial)}, ${arr(c.source_passage_ids)}, ${arr(c.related_knowledge_ids)}, ${arr(c.safety_ids)}, ${bool(c.production_ready)}, ${bool(false)}, ${jsonb(c.variants)}, ${jsonb(c.answer_constraints)}, ${esc(c.editorial_policy_version)}) ON CONFLICT (catalog_id) DO NOTHING;\n`;
}

// Retrieval preview — entry_id is the key, no separate retrieval_id
for (let i = 0; i < data.data.retrieval_preview.length; i++) {
  const r = data.data.retrieval_preview[i];
  const rid = `RP${String(i + 1).padStart(3, '0')}`;
  sql += `INSERT INTO breath_manager_v5.bm5_retrieval_preview (retrieval_id, entry_type, entry_id, title, category_id, answer_preview, source_passage_ids, answer_constraints, safety_ids, related_entry_ids, production_ready, preview_allowed) VALUES (${esc(rid)}, ${esc(r.entry_type)}, ${esc(r.entry_id)}, ${esc(r.title)}, ${esc(r.category_id)}, ${esc(r.answer_text)}, ${arr(r.source_passage_ids)}, ${jsonb(r.answer_constraints)}, ${arr(r.safety_ids)}, ${arr(r.search_terms)}, ${bool(r.production_ready)}, ${bool(true)}) ON CONFLICT (retrieval_id) DO NOTHING;\n`;
}

// Safety — use stop_conditions, do_not, consult_conditions, scope
for (const s of data.data.safety) {
  const desc = JSON.stringify({ stop: s.stop_conditions, do_not: s.do_not, consult: s.consult_conditions, scope: s.scope });
  sql += `INSERT INTO breath_manager_v5.bm5_safety (safety_id, title, description, related_catalog_ids, source_passage_ids) VALUES (${esc(s.safety_id)}, ${esc(s.title)}, ${esc(desc)}, ${arr([])}, ${arr(s.source_passage_ids)}) ON CONFLICT (safety_id) DO NOTHING;\n`;
}

// Issues — use source_statement, editorial_action, proposed_wording
for (const i of data.data.issues) {
  const desc = JSON.stringify({ type: i.type, source_statement: i.source_statement, editorial_action: i.editorial_action, proposed_wording: i.proposed_wording, remaining_work: i.remaining_work });
  sql += `INSERT INTO breath_manager_v5.bm5_issues (issue_id, title, description, status, related_entry_ids) VALUES (${esc(i.issue_id)}, ${esc(i.type)}, ${esc(desc)}, ${esc(i.status)}, ${arr(i.source_passage_ids)}) ON CONFLICT (issue_id) DO NOTHING;\n`;
}

// Editorial corrections — use issue_id as key, approved_editorial_text
for (let i = 0; i < data.data.editorial_corrections.length; i++) {
  const c = data.data.editorial_corrections[i];
  const cid = `EC${String(i + 1).padStart(3, '0')}`;
  sql += `INSERT INTO breath_manager_v5.bm5_editorial_corrections (correction_id, issue_id, description, rule_text, applied) VALUES (${esc(cid)}, ${esc(c.issue_id)}, ${esc(c.approved_editorial_text)}, ${esc(c.approval_basis)}, ${bool(c.author_editorial_approval)}) ON CONFLICT (correction_id) DO NOTHING;\n`;
}

// External checks — use external_check_id
for (const e of data.data.external_checks) {
  sql += `INSERT INTO breath_manager_v5.bm5_external_checks (check_id, title, description, status) VALUES (${esc(e.external_check_id)}, ${esc(e.title)}, ${esc(e.scope)}, ${esc(e.type)}) ON CONFLICT (check_id) DO NOTHING;\n`;
}

// Terminology — use term as both id and term
for (let i = 0; i < data.data.terminology.length; i++) {
  const t = data.data.terminology[i];
  const tid = `T${String(i + 1).padStart(2, '0')}`;
  const def = JSON.stringify({ maps_to: t.maps_to, relation: t.relation, scope: t.scope });
  sql += `INSERT INTO breath_manager_v5.bm5_terminology (term_id, term, definition, source_passage_ids) VALUES (${esc(tid)}, ${esc(t.term)}, ${esc(def)}, ${arr(t.source_passage_ids)}) ON CONFLICT (term_id) DO NOTHING;\n`;
}

// Acceptance tests
for (const t of data.acceptance_tests) {
  sql += `INSERT INTO breath_manager_v5.bm5_acceptance_tests (test_id, question, answer_example, check_point, reference_entry_ids, source_passage_ids, safety_ids, source_links) VALUES (${esc(t.test_id)}, ${esc(t.question)}, ${esc(t.answer_example)}, ${esc(t.check_point)}, ${arr(t.reference_entry_ids)}, ${arr(t.source_passage_ids)}, ${arr(t.safety_ids)}, ${jsonb(t.source_links)}) ON CONFLICT (test_id) DO NOTHING;\n`;
}

fs.writeFileSync(new URL('./data/bm5_import.sql', import.meta.url), sql);
console.log('SQL generated: ' + sql.length + ' bytes');
console.log('Lines: ' + sql.split('\n').filter(l => l.trim()).length);
