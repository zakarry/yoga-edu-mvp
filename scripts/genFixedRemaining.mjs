import fs from 'fs';

const data = JSON.parse(fs.readFileSync(new URL('./data/Boltに渡す_呼吸DB第5版.json', import.meta.url), 'utf8'));

function esc(s) {
  if (s == null || s === undefined) return 'NULL';
  return "'" + String(s).replace(/'/g, "''") + "'";
}

function arr(a) {
  if (!a || !Array.isArray(a) || a.length === 0) return "'{}'";
  return 'ARRAY[' + a.map(x => esc(x)).join(',') + ']::text[]';
}

function intarr(a) {
  if (!a || !Array.isArray(a) || a.length === 0) return "'{}'";
  return 'ARRAY[' + a.map(x => parseInt(x)).join(',') + ']::integer[]';
}

function jsonb(v) {
  if (!v || (Array.isArray(v) && v.length === 0) || (typeof v === 'object' && Object.keys(v).length === 0)) return "'[]'::jsonb";
  return "'" + JSON.stringify(v).replace(/'/g, "''") + "'::jsonb";
}

function bool(v) {
  return v ? 'true' : 'false';
}

let sql = '';

// Issues (51 rows)
for (const i of data.data.issues) {
  const desc = JSON.stringify({ type: i.type, source_statement: i.source_statement, editorial_action: i.editorial_action, proposed_wording: i.proposed_wording, remaining_work: i.remaining_work });
  sql += `INSERT INTO breath_manager_v5.bm5_issues (issue_id, title, description, status, related_entry_ids) VALUES (${esc(i.issue_id)}, ${esc(i.type)}, ${esc(desc)}, ${esc(i.status)}, ${arr(i.source_passage_ids)}) ON CONFLICT (issue_id) DO NOTHING;\n`;
}

// Editorial corrections (51 rows)
for (let i = 0; i < data.data.editorial_corrections.length; i++) {
  const c = data.data.editorial_corrections[i];
  const cid = `EC${String(i + 1).padStart(3, '0')}`;
  sql += `INSERT INTO breath_manager_v5.bm5_editorial_corrections (correction_id, issue_id, description, rule_text, applied) VALUES (${esc(cid)}, ${esc(c.issue_id)}, ${esc(c.approved_editorial_text)}, ${esc(c.approval_basis)}, ${bool(c.author_editorial_approval)}) ON CONFLICT (correction_id) DO NOTHING;\n`;
}

// Acceptance tests (20 rows)
for (const t of data.acceptance_tests) {
  const sourceLinks = JSON.stringify(t.source_links || []);
  sql += `INSERT INTO breath_manager_v5.bm5_acceptance_tests (test_id, question, answer_example, check_point, reference_entry_ids, source_passage_ids, safety_ids, source_links) VALUES (${esc(t.test_id)}, ${esc(t.question)}, ${esc(t.answer_example)}, ${esc(t.check_point)}, ${arr(t.reference_entry_ids)}, ${arr(t.source_passage_ids)}, ${arr(t.safety_ids)}, ${esc(sourceLinks)}) ON CONFLICT (test_id) DO NOTHING;\n`;
}

// Knowledge (87 rows)
for (const k of data.data.knowledge) {
  sql += `INSERT INTO breath_manager_v5.bm5_knowledge (knowledge_id, title, category_id, tags, example_questions, answer_short, answer_detail, source_passage_ids, editorial_notes, external_check_ids, related_catalog_ids, review_state, content_kind, preview_allowed, production_ready, clinical_efficacy_verified, issue_ids, chapter_numbers, editorial_correction_ids, answer_constraints, editorial_policy_version) VALUES (${esc(k.knowledge_id)}, ${esc(k.title)}, ${esc(k.category_id)}, ${arr(k.tags)}, ${arr(k.example_questions)}, ${esc(k.answer_short)}, ${esc(k.answer_detail)}, ${arr(k.source_passage_ids)}, ${arr(k.editorial_notes)}, ${arr(k.external_check_ids)}, ${arr(k.related_catalog_ids)}, ${esc(k.review_state)}, ${esc(k.content_kind)}, ${bool(k.preview_allowed)}, ${bool(k.production_ready)}, ${bool(k.clinical_efficacy_verified)}, ${arr(k.issue_ids)}, ${intarr(k.chapter_numbers)}, ${arr(k.editorial_correction_ids)}, ${jsonb(k.answer_constraints)}, ${esc(k.editorial_policy_version)}) ON CONFLICT (knowledge_id) DO NOTHING;\n`;
}

// Catalog (34 rows)
for (const c of data.data.catalog) {
  sql += `INSERT INTO breath_manager_v5.bm5_catalog (catalog_id, name, aliases, category_id, tradition_category, curriculum_mode, purpose_in_source, steps_editorial, source_passage_ids, related_knowledge_ids, related_safety_ids, production_ready, overview_only, variants, answer_constraints, editorial_policy_version) VALUES (${esc(c.catalog_id)}, ${esc(c.name)}, ${arr(c.aliases)}, ${esc(c.category_id)}, ${esc(c.tradition_category)}, ${esc(c.curriculum_mode)}, ${esc(c.purpose_in_source)}, ${arr(c.steps_editorial)}, ${arr(c.source_passage_ids)}, ${arr(c.related_knowledge_ids)}, ${arr(c.safety_ids)}, ${bool(c.production_ready)}, false, ${jsonb(c.variants)}, ${jsonb(c.answer_constraints)}, ${esc(c.editorial_policy_version)}) ON CONFLICT (catalog_id) DO NOTHING;\n`;
}

// Retrieval preview (121 rows)
for (let i = 0; i < data.data.retrieval_preview.length; i++) {
  const r = data.data.retrieval_preview[i];
  const rid = `RP${String(i + 1).padStart(3, '0')}`;
  sql += `INSERT INTO breath_manager_v5.bm5_retrieval_preview (retrieval_id, entry_type, entry_id, title, category_id, answer_preview, source_passage_ids, answer_constraints, safety_ids, related_entry_ids, production_ready, preview_allowed) VALUES (${esc(rid)}, ${esc(r.entry_type)}, ${esc(r.entry_id)}, ${esc(r.title)}, ${esc(r.category_id)}, ${esc(r.answer_text)}, ${arr(r.source_passage_ids)}, ${jsonb(r.answer_constraints)}, ${arr(r.safety_ids)}, ${arr(r.search_terms)}, ${bool(r.production_ready)}, true) ON CONFLICT (retrieval_id) DO NOTHING;\n`;
}

fs.writeFileSync(new URL('./data/bm5_fixed_remaining.sql', import.meta.url), sql);
console.log('Generated: ' + sql.length + ' bytes, ' + sql.split('\n').filter(l => l.trim()).length + ' lines');

// Split by table
const lines = sql.split('\n').filter(l => l.trim());
const tables = {};
for (const line of lines) {
  const m = line.match(/INSERT INTO breath_manager_v5\.(\w+)/);
  if (m) {
    if (!tables[m[1]]) tables[m[1]] = [];
    tables[m[1]].push(line);
  }
}
for (const [t, ts] of Object.entries(tables)) {
  fs.writeFileSync(new URL(`./data/bm5_fixed_${t}.sql`, import.meta.url), ts.join('\n'));
  console.log(t + ': ' + ts.length + ' rows, ' + ts.join('\n').length + ' bytes');
}
