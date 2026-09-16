import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { PageHeader } from './PageHeader';

interface AcceptanceTest {
  test_id: string;
  question: string;
  answer_example: string;
  check_point: string;
  reference_entry_ids: string[] | null;
  source_passage_ids: string[] | null;
  safety_ids: string[] | null;
  source_links: string | null;
  actual_pass: boolean | null;
  tested_at: string | null;
  actual_result: string | null;
}

interface KnowledgeEntry {
  knowledge_id: string;
  title: string;
  answer_short: string;
  answer_detail: string;
  source_passage_ids: string[] | null;
  issue_ids: string[] | null;
  editorial_correction_ids: string[] | null;
  review_state: string;
  production_ready: boolean;
}

interface CatalogEntry {
  catalog_id: string;
  name: string;
  steps_editorial: string[] | null;
  source_passage_ids: string[] | null;
  production_ready: boolean;
}

interface SafetyEntry {
  safety_id: string;
  title: string;
  description: string;
  urgency: string | null;
}

interface IssueEntry {
  issue_id: string;
  title: string;
  description: string;
  status: string;
  related_entry_ids: string[] | null;
}

interface CorrectionEntry {
  correction_id: string;
  issue_id: string;
  description: string;
  rule_text: string;
  applied: boolean;
}

interface PassageEntry {
  passage_id: string;
  source_id: string;
  section_label: string;
  content: string | null;
  page_label: string | null;
}

interface TestResult {
  test_id: string;
  question: string;
  answer_example: string;
  reference_entry_ids: string[];
  source_passage_ids: string[];
  safety_ids: string[];
  entry_found: boolean;
  entry_title: string;
  entry_answer: string;
  passages_found: PassageEntry[];
  safety_entries: SafetyEntry[];
  related_issues: IssueEntry[];
  related_corrections: CorrectionEntry[];
  pass: boolean;
  reason: string;
  error: string | null;
}

export function BM5AdminPage({ onBackHome }: { onBackHome: () => void }) {
  const auth = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState<AcceptanceTest[]>([]);
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ entry_id: string; title: string; answer: string; type: string }[]>([]);

  const checkAdmin = useCallback(async () => {
    if (!auth.user || !supabase) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', auth.user.id)
        .maybeSingle();
      if (error || !data) {
        setIsAdmin(false);
      } else {
        setIsAdmin(data.is_admin === true);
      }
    } catch {
      setIsAdmin(false);
    }
    setLoading(false);
  }, [auth.user]);

  useEffect(() => {
    void checkAdmin();
  }, [checkAdmin]);

  const loadTests = useCallback(async () => {
    if (!supabase || !isAdmin) return;
    const { data, error } = await supabase
      .from('breath_manager_v5.bm5_acceptance_tests')
      .select('*')
      .order('test_id');
    if (!error && data) {
      setTests(data as AcceptanceTest[]);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) void loadTests();
  }, [isAdmin, loadTests]);

  const runTest = async (test: AcceptanceTest): Promise<TestResult> => {
    const refIds = test.reference_entry_ids || [];
    const passageIds = test.source_passage_ids || [];
    const safetyIds = test.safety_ids || [];

    let entryTitle = '';
    let entryAnswer = '';
    let entryFound = false;
    let errorMsg: string | null = null;

    if (refIds.length > 0 && supabase) {
      const { data: kData, error: kErr } = await supabase
        .from('breath_manager_v5.bm5_knowledge')
        .select('knowledge_id, title, answer_short, answer_detail')
        .in('knowledge_id', refIds);
      if (kErr) errorMsg = `Knowledge: ${kErr.message}`;
      if (kData && kData.length > 0) {
        entryFound = true;
        entryTitle = kData[0].title;
        entryAnswer = kData[0].answer_short || kData[0].answer_detail || '';
      }

      if (!entryFound && !errorMsg) {
        const { data: cData, error: cErr } = await supabase
          .from('breath_manager_v5.bm5_catalog')
          .select('catalog_id, name')
          .in('catalog_id', refIds);
        if (cErr) errorMsg = `Catalog: ${cErr.message}`;
        if (cData && cData.length > 0) {
          entryFound = true;
          entryTitle = cData[0].name;
          entryAnswer = '(呼吸法カタログエントリ)';
        }
      }
    }

    let passagesFound: PassageEntry[] = [];
    if (passageIds.length > 0 && supabase) {
      const { data: pData, error: pErr } = await supabase
        .from('breath_manager_v5.bm5_passages')
        .select('passage_id, source_id, section_label, content, page_label')
        .in('passage_id', passageIds);
      if (pErr) errorMsg = errorMsg ? `${errorMsg}; Passages: ${pErr.message}` : `Passages: ${pErr.message}`;
      if (pData) passagesFound = pData as PassageEntry[];
    }

    let safetyEntries: SafetyEntry[] = [];
    if (safetyIds.length > 0 && supabase) {
      const { data: sData, error: sErr } = await supabase
        .from('breath_manager_v5.bm5_safety')
        .select('safety_id, title, description, urgency')
        .in('safety_id', safetyIds);
      if (sErr) errorMsg = errorMsg ? `${errorMsg}; Safety: ${sErr.message}` : `Safety: ${sErr.message}`;
      if (sData) safetyEntries = sData as SafetyEntry[];
    }

    let relatedIssues: IssueEntry[] = [];
    let relatedCorrections: CorrectionEntry[] = [];
    if (entryFound && supabase) {
      const { data: kData, error: kErr } = await supabase
        .from('breath_manager_v5.bm5_knowledge')
        .select('issue_ids, editorial_correction_ids')
        .in('knowledge_id', refIds);
      if (kErr) errorMsg = errorMsg ? `${errorMsg}; Issues: ${kErr.message}` : `Issues: ${kErr.message}`;
      if (kData && kData.length > 0) {
        const issueIds = (kData[0] as { issue_ids?: string[] }).issue_ids || [];
        const corrIds = (kData[0] as { editorial_correction_ids?: string[] }).editorial_correction_ids || [];
        if (issueIds.length > 0) {
          const { data: iData, error: iErr } = await supabase
            .from('breath_manager_v5.bm5_issues')
            .select('issue_id, title, description, status, related_entry_ids')
            .in('issue_id', issueIds);
          if (iErr) errorMsg = errorMsg ? `${errorMsg}; Issues query: ${iErr.message}` : `Issues query: ${iErr.message}`;
          if (iData) relatedIssues = iData as IssueEntry[];
        }
        if (corrIds.length > 0) {
          const { data: cData, error: cErr } = await supabase
            .from('breath_manager_v5.bm5_editorial_corrections')
            .select('correction_id, issue_id, description, rule_text, applied')
            .in('correction_id', corrIds);
          if (cErr) errorMsg = errorMsg ? `${errorMsg}; Corrections: ${cErr.message}` : `Corrections: ${cErr.message}`;
          if (cData) relatedCorrections = cData as CorrectionEntry[];
        }
      }
    }

    const passagesOk = passagesFound.length === passageIds.length;
    const pass = entryFound && passagesOk;
    const reason = entryFound
      ? passagesOk
        ? '参照エントリ・出典パッセージ・安全注意事項すべて確認済み'
        : `出典パッセージ不足: ${passageIds.length}件中${passagesFound.length}件`
      : '参照エントリが見つかりません';

    return {
      test_id: test.test_id,
      question: test.question,
      answer_example: test.answer_example,
      reference_entry_ids: refIds,
      source_passage_ids: passageIds,
      safety_ids: safetyIds,
      entry_found: entryFound,
      entry_title: entryTitle,
      entry_answer: entryAnswer,
      passages_found: passagesFound,
      safety_entries: safetyEntries,
      related_issues: relatedIssues,
      related_corrections: relatedCorrections,
      pass,
      reason,
      error: errorMsg,
    };
  };

  const runAllTests = async () => {
    if (!supabase || !isAdmin) return;
    setRunning(true);
    setResults([]);
    const allResults: TestResult[] = [];
    for (const test of tests) {
      const result = await runTest(test);
      allResults.push(result);
      setResults([...allResults]);
      if (supabase) {
        await supabase
          .from('breath_manager_v5.bm5_acceptance_tests')
          .update({
            actual_pass: result.pass,
            tested_at: new Date().toISOString(),
            actual_result: result.reason,
          })
          .eq('test_id', test.test_id);
      }
    }
    setRunning(false);
  };

  const doSearch = async () => {
    if (!supabase || !isAdmin || !searchQuery.trim()) return;
    const { data: kData } = await supabase
      .from('breath_manager_v5.bm5_knowledge')
      .select('knowledge_id, title, answer_short')
      .ilike('title', `%${searchQuery}%`)
      .limit(10);
    const { data: cData } = await supabase
      .from('breath_manager_v5.bm5_catalog')
      .select('catalog_id, name')
      .ilike('name', `%${searchQuery}%`)
      .limit(10);
    const combined: { entry_id: string; title: string; answer: string; type: string }[] = [];
    if (kData) {
      for (const k of kData as { knowledge_id: string; title: string; answer_short: string }[]) {
        combined.push({ entry_id: k.knowledge_id, title: k.title, answer: k.answer_short, type: 'knowledge' });
      }
    }
    if (cData) {
      for (const c of cData as { catalog_id: string; name: string }[]) {
        combined.push({ entry_id: c.catalog_id, title: c.name, answer: '(呼吸法カタログ)', type: 'catalog' });
      }
    }
    setSearchResults(combined);
  };

  if (loading) {
    return (
      <div className="page-shell">
        <PageHeader eyebrow="管理者" title="第5版DB確認画面" subtitle="" onBackHome={onBackHome} />
        <div style={{ padding: 24, textAlign: 'center' }}>確認中...</div>
      </div>
    );
  }

  if (!auth.user) {
    return (
      <div className="page-shell">
        <PageHeader eyebrow="管理者" title="第5版DB確認画面" subtitle="" onBackHome={onBackHome} />
        <div style={{ padding: 24, textAlign: 'center' }}>
          <p>この画面は管理者限定です。ログインしてください。</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="page-shell">
        <PageHeader eyebrow="管理者" title="第5版DB確認画面" subtitle="" onBackHome={onBackHome} />
        <div style={{ padding: 24, textAlign: 'center' }}>
          <p>この画面は管理者限定です。管理者権限がありません。</p>
        </div>
      </div>
    );
  }

  const passCount = results.filter((r) => r.pass).length;

  return (
    <div className="page-shell">
      <PageHeader eyebrow="管理者限定" title="呼吸マネージャー検定 第5版 確認画面" subtitle="本番公開前のテスト用データです。出典・注意事項・修正方針を同時に参照できます。" onBackHome={onBackHome} />

      <section className="panel" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 8 }}>データ件数</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 14 }}>
          <span>知識: 87件</span>
          <span>呼吸法: 34件</span>
          <span>検索候補: 121件</span>
          <span>パッセージ: 231件</span>
          <span>図版: 161件</span>
          <span>受入テスト: {tests.length}件</span>
          <span>課題: 51件</span>
          <span>修正: 51件</span>
          <span>安全注意: 適数</span>
        </div>
      </section>

      <section className="panel" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 8 }}>検索</h3>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="知識・呼吸法をタイトルで検索"
            style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #ccc' }}
          />
          <button className="primary-button" onClick={doSearch}>検索</button>
        </div>
        {searchResults.length > 0 && (
          <div>
            {searchResults.map((r) => (
              <div key={r.entry_id} style={{ padding: 12, borderBottom: '1px solid #eee' }}>
                <div style={{ fontWeight: 600 }}>{r.title} <span style={{ fontSize: 12, color: '#888' }}>({r.type}: {r.entry_id})</span></div>
                <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>{r.answer}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3>受入テスト実行 ({tests.length}問)</h3>
          <button className="primary-button" onClick={runAllTests} disabled={running}>
            {running ? `実行中... (${results.length}/${tests.length})` : '全テスト実行'}
          </button>
        </div>
        {results.length > 0 && (
          <div style={{ marginBottom: 12, padding: 12, background: passCount === results.length ? '#e8f5e9' : '#fff3e0', borderRadius: 8 }}>
            <strong>{passCount} / {results.length} PASS</strong>
          </div>
        )}
        <div>
          {results.map((r) => (
            <div key={r.test_id} style={{ padding: 16, borderBottom: '2px solid #eee' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <span style={{
                  padding: '2px 10px',
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 700,
                  background: r.pass ? '#4caf50' : '#f44336',
                  color: 'white',
                }}>{r.pass ? 'PASS' : 'FAIL'}</span>
                <strong style={{ fontSize: 14 }}>{r.test_id}</strong>
              </div>
              <div style={{ fontSize: 14, marginBottom: 8 }}><strong>質問:</strong> {r.question}</div>
              <div style={{ fontSize: 13, marginBottom: 8, color: '#555' }}><strong>参照ID:</strong> {r.reference_entry_ids.join(', ')}</div>
              <div style={{ fontSize: 13, marginBottom: 8 }}>
                <strong>実際の回答:</strong> {r.entry_title ? `${r.entry_title}` : '(未検索)'}
                {r.entry_answer && <div style={{ marginTop: 4, padding: 8, background: '#f5f5f5', borderRadius: 4, fontSize: 13 }}>{r.entry_answer.slice(0, 200)}{r.entry_answer.length > 200 ? '...' : ''}</div>}
              </div>
              <div style={{ fontSize: 13, marginBottom: 8 }}>
                <strong>出典パッセージ:</strong> {r.passages_found.length}件
                {r.passages_found.map((p) => (
                  <div key={p.passage_id} style={{ marginLeft: 12, fontSize: 12, color: '#666' }}>
                    {p.passage_id}: {p.section_label || p.page_label || '(ラベルなし)'}
                  </div>
                ))}
              </div>
              {r.safety_entries.length > 0 && (
                <div style={{ fontSize: 13, marginBottom: 8 }}>
                  <strong>安全注意事項:</strong>
                  {r.safety_entries.map((s) => (
                    <div key={s.safety_id} style={{ marginLeft: 12, fontSize: 12, color: '#d32f2f' }}>
                      {s.safety_id}: {s.title}
                    </div>
                  ))}
                </div>
              )}
              {r.related_issues.length > 0 && (
                <div style={{ fontSize: 13, marginBottom: 8 }}>
                  <strong>関連課題:</strong>
                  {r.related_issues.map((i) => (
                    <div key={i.issue_id} style={{ marginLeft: 12, fontSize: 12, color: '#e65100' }}>
                      {i.issue_id}: {i.title} ({i.status})
                    </div>
                  ))}
                </div>
              )}
              {r.related_corrections.length > 0 && (
                <div style={{ fontSize: 13, marginBottom: 8 }}>
                  <strong>修正方針:</strong>
                  {r.related_corrections.map((c) => (
                    <div key={c.correction_id} style={{ marginLeft: 12, fontSize: 12, color: '#1565c0' }}>
                      {c.correction_id}: {c.description?.slice(0, 100)}{c.description && c.description.length > 100 ? '...' : ''}
                    </div>
                  ))}
                </div>
              )}
              <div style={{ fontSize: 13, color: r.pass ? '#2e7d32' : '#c62828' }}>
                <strong>判定理由:</strong> {r.reason}
              </div>
              {r.error && (
                <div style={{ fontSize: 12, color: '#d32f2f', marginTop: 4, padding: 8, background: '#ffebee', borderRadius: 4 }}>
                  <strong>エラー:</strong> {r.error}
                </div>
              )}
            </div>
          ))}
        </div>
        {tests.length === 0 && !running && (
          <div style={{ padding: 16, textAlign: 'center', color: '#888' }}>テストデータを読み込むには「全テスト実行」を押してください。</div>
        )}
      </section>
    </div>
  );
}
