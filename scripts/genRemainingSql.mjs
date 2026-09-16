import fs from 'fs';

const data = JSON.parse(fs.readFileSync(new URL('./data/Boltに渡す_呼吸DB第5版.json', import.meta.url), 'utf8'));

function esc(s) {
  if (s == null || s === undefined) return 'NULL';
  return "'" + String(s).replace(/'/g, "''") + "'";
}

let sql = '';
for (const p of data.data.passages) {
  if (p.passage_id === 'P01' || p.passage_id === 'P02' || p.passage_id === 'P03' || 
      p.passage_id === 'P04' || p.passage_id === 'P05' || p.passage_id === 'P06' ||
      p.passage_id === 'P07' || p.passage_id === 'P08' || p.passage_id === 'P09' ||
      p.passage_id === 'P10' || p.passage_id === 'P11' || p.passage_id === 'P12' ||
      p.passage_id === 'P13' || p.passage_id === 'P14' || p.passage_id === 'P15' ||
      p.passage_id === 'P16' || p.passage_id === 'P17' || p.passage_id === 'P18' ||
      p.passage_id === 'P19' || p.passage_id === 'P20' || p.passage_id === 'P21' ||
      p.passage_id === 'P22' || p.passage_id === 'P23' || p.passage_id === 'P24' ||
      p.passage_id === 'P25' || p.passage_id === 'P26' || p.passage_id === 'P27' ||
      p.passage_id === 'P28' || p.passage_id === 'P29') continue;
  sql += `INSERT INTO breath_manager_v5.bm5_passages (passage_id, source_id, chapter, section_label, content, page_label) VALUES (${esc(p.passage_id)}, ${esc(p.source_id)}, NULL, ${esc(p.region)}, ${esc(p.text_transcribed)}, ${esc(p.printed_label)}) ON CONFLICT (passage_id) DO NOTHING;\n`;
}

// Assets
for (const a of data.data.assets) {
  const pid = a.passage_ids && a.passage_ids.length > 0 ? a.passage_ids[0] : null;
  sql += `INSERT INTO breath_manager_v5.bm5_assets (asset_id, passage_id, asset_type, label, file_ref, connected) VALUES (${esc(a.asset_id)}, ${esc(pid)}, ${esc(a.visual_review_status)}, ${esc(a.transcription_scope)}, ${esc(a.path)}, ${a.full_transcription_verified ? 'true' : 'false'}) ON CONFLICT (asset_id) DO NOTHING;\n`;
}

// Issues
for (const i of data.data.issues) {
  const desc = JSON.stringify({ type: i.type, source_statement: i.source_statement, editorial_action: i.editorial_action, proposed_wording: i.proposed_wording, remaining_work: i.remaining_work });
  sql += `INSERT INTO breath_manager_v5.bm5_issues (issue_id, title, description, status, related_entry_ids) VALUES (${esc(i.issue_id)}, ${esc(i.type)}, ${esc(desc)}, ${esc(i.status)}, ${esc(JSON.stringify(i.source_passage_ids))}) ON CONFLICT (issue_id) DO NOTHING;\n`;
}

// Editorial corrections
for (let i = 0; i < data.data.editorial_corrections.length; i++) {
  const c = data.data.editorial_corrections[i];
  const cid = `EC${String(i + 1).padStart(3, '0')}`;
  sql += `INSERT INTO breath_manager_v5.bm5_editorial_corrections (correction_id, issue_id, description, rule_text, applied) VALUES (${esc(cid)}, ${esc(c.issue_id)}, ${esc(c.approved_editorial_text)}, ${esc(c.approval_basis)}, ${c.author_editorial_approval ? 'true' : 'false'}) ON CONFLICT (correction_id) DO NOTHING;\n`;
}

// Acceptance tests
for (const t of data.acceptance_tests) {
  sql += `INSERT INTO breath_manager_v5.bm5_acceptance_tests (test_id, question, answer_example, check_point, reference_entry_ids, source_passage_ids, safety_ids, source_links) VALUES (${esc(t.test_id)}, ${esc(t.question)}, ${esc(t.answer_example)}, ${esc(t.check_point)}, ${esc(JSON.stringify(t.reference_entry_ids))}, ${esc(JSON.stringify(t.source_passage_ids))}, ${esc(JSON.stringify(t.safety_ids))}, ${esc(JSON.stringify(t.source_links || []))}) ON CONFLICT (test_id) DO NOTHING;\n`;
}

// Knowledge
for (const k of data.data.knowledge) {
  sql += `INSERT INTO breath_manager_v5.bm5_knowledge (knowledge_id, title, category_id, tags, example_questions, answer_short, answer_detail, source_passage_ids, editorial_notes, external_check_ids, related_catalog_ids, review_state, content_kind, preview_allowed, production_ready, clinical_efficacy_verified, issue_ids, chapter_numbers, editorial_correction_ids, answer_constraints, editorial_policy_version) VALUES (${esc(k.knowledge_id)}, ${esc(k.title)}, ${esc(k.category_id)}, ${esc(JSON.stringify(k.tags || []))}, ${esc(JSON.stringify(k.example_questions || []))}, ${esc(k.answer_short)}, ${esc(k.answer_detail)}, ${esc(JSON.stringify(k.source_passage_ids || []))}, ${esc(JSON.stringify(k.editorial_notes || []))}, ${esc(JSON.stringify(k.external_check_ids || []))}, ${esc(JSON.stringify(k.related_catalog_ids || []))}, ${esc(k.review_state)}, ${esc(k.content_kind)}, ${k.preview_allowed ? 'true' : 'false'}, ${k.production_ready ? 'true' : 'false'}, ${k.clinical_efficacy_verified ? 'true' : 'false'}, ${esc(JSON.stringify(k.issue_ids || []))}, ${esc(JSON.stringify(k.chapter_numbers || []))}, ${esc(JSON.stringify(k.editorial_correction_ids || []))}, ${esc(JSON.stringify(k.answer_constraints || []))}, ${esc(k.editorial_policy_version)}) ON CONFLICT (knowledge_id) DO NOTHING;\n`;
}

// Catalog
for (const c of data.data.catalog) {
  sql += `INSERT INTO breath_manager_v5.bm5_catalog (catalog_id, name, aliases, category_id, tradition_category, curriculum_mode, purpose_in_source, steps_editorial, source_passage_ids, related_knowledge_ids, related_safety_ids, production_ready, overview_only, variants, answer_constraints, editorial_policy_version) VALUES (${esc(c.catalog_id)}, ${esc(c.name)}, ${esc(JSON.stringify(c.aliases || []))}, ${esc(c.category_id)}, ${esc(c.tradition_category)}, ${esc(c.curriculum_mode)}, ${esc(c.purpose_in_source)}, ${esc(JSON.stringify(c.steps_editorial || []))}, ${esc(JSON.stringify(c.source_passage_ids || []))}, ${esc(JSON.stringify(c.related_knowledge_ids || []))}, ${esc(JSON.stringify(c.safety_ids || []))}, ${c.production_ready ? 'true' : 'false'}, 'false', ${esc(JSON.stringify(c.variants || []))}, ${esc(JSON.stringify(c.answer_constraints || []))}, ${esc(c.editorial_policy_version)}) ON CONFLICT (catalog_id) DO NOTHING;\n`;
}

// Retrieval preview
for (let i = 0; i < data.data.retrieval_preview.length; i++) {
  const r = data.data.retrieval_preview[i];
  const rid = `RP${String(i + 1).padStart(3, '0')}`;
  sql += `INSERT INTO breath_manager_v5.bm5_retrieval_preview (retrieval_id, entry_type, entry_id, title, category_id, answer_preview, source_passage_ids, answer_constraints, safety_ids, related_entry_ids, production_ready, preview_allowed) VALUES (${esc(rid)}, ${esc(r.entry_type)}, ${esc(r.entry_id)}, ${esc(r.title)}, ${esc(r.category_id)}, ${esc(r.answer_text)}, ${esc(JSON.stringify(r.source_passage_ids || []))}, ${esc(JSON.stringify(r.answer_constraints || []))}, ${esc(JSON.stringify(r.safety_ids || []))}, ${esc(JSON.stringify(r.search_terms || []))}, ${r.production_ready ? 'true' : 'false'}, 'true') ON CONFLICT (retrieval_id) DO NOTHING;\n`;
}

fs.writeFileSync(new URL('./data/bm5_remaining.sql', import.meta.url), sql);
console.log('Generated: ' + sql.length + ' bytes, ' + sql.split('\n').filter(l => l.trim()).length + ' lines');
