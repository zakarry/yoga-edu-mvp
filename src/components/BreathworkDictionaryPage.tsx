import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { PageHeader } from './PageHeader';
import { searchBM5, fetchBM5ById, type BM5SearchResult, type BM5PassageEntry } from '../services/bm5RetrievalService';

interface BM5KnowledgeRow {
  knowledge_id: string;
  title: string;
  answer_short: string | null;
  answer_detail: string | null;
  category_id: string | null;
  tags: string[] | null;
  source_passage_ids: string[] | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  cell_energy: '細胞とエネルギー',
  co2: '二酸化炭素と呼吸調節',
  conditioning: 'コンディショニング',
  gut: '腹圧とお腹の動き',
  lifestyle: '生活習慣と呼吸',
  mind: '心と呼吸',
  observation: '観察と評価',
  performance: 'パフォーマンスと呼吸',
  physiology: '呼吸の生理学',
  safety: '安全・注意',
  sleep: '睡眠と呼吸',
  voice: '声と呼吸',
  yoga_theory: 'ヨガ理論',
};

const CATEGORY_ORDER = [
  'physiology', 'cell_energy', 'co2', 'gut', 'voice',
  'observation', 'performance', 'conditioning',
  'lifestyle', 'sleep', 'mind', 'safety', 'yoga_theory',
];

interface BreathworkDictionaryPageProps {
  onBackHome: () => void;
  onAskAITeacher: (knowledgeTitle: string, knowledgeId: string) => void;
}

export function BreathworkDictionaryPage({ onBackHome, onAskAITeacher }: BreathworkDictionaryPageProps) {
  const [allEntries, setAllEntries] = useState<BM5KnowledgeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BM5SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [detailEntry, setDetailEntry] = useState<BM5SearchResult | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailPassages, setDetailPassages] = useState<BM5PassageEntry[]>([]);

  useEffect(() => {
    if (!supabase) { setError('データベース未接続'); setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('bm5_knowledge_view')
          .select('knowledge_id, title, answer_short, answer_detail, category_id, tags, source_passage_ids')
          .order('knowledge_id');
        if (error) { if (!cancelled) setError(error.message); return; }
        if (!cancelled) setAllEntries((data as BM5KnowledgeRow[]) ?? []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'データ取得エラー');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const categories = useMemo(() => {
    const seen = new Set<string>();
    for (const e of allEntries) {
      if (e.category_id) seen.add(e.category_id);
    }
    return CATEGORY_ORDER.filter((c) => seen.has(c));
  }, [allEntries]);

  const filteredEntries = useMemo(() => {
    if (selectedCategory) {
      return allEntries.filter((e) => e.category_id === selectedCategory);
    }
    return allEntries;
  }, [allEntries, selectedCategory]);

  const doSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q) { setSearchResults(null); return; }
    setSearching(true);
    try {
      const { results } = await searchBM5(q, 30);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  const openDetail = useCallback(async (entry: { knowledge_id: string; title: string; answer_short: string | null; answer_detail: string | null; source_passage_ids?: string[] | null }) => {
    setDetailLoading(true);
    setDetailEntry(null);
    setDetailPassages([]);
    try {
      const full = await fetchBM5ById(entry.knowledge_id);
      setDetailEntry(full);
      if (full?.passages) setDetailPassages(full.passages);
    } catch {
      setDetailEntry({
        entry_id: entry.knowledge_id,
        title: entry.title,
        answer: entry.answer_detail || entry.answer_short || '',
        answer_short: entry.answer_short,
        answer_detail: entry.answer_detail,
        type: 'knowledge',
        score: 0,
        match_type: 'local',
        passages: [],
      });
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const displayList = searchResults ?? filteredEntries;

  return (
    <div className="page-shell breathwork-dictionary-page">
      <PageHeader
        eyebrow="学び・検定"
        title="呼吸図鑑"
        subtitle="呼吸マネージャー検定 第5版をベースにした呼吸の知識ライブラリ。基礎から安全まで、体系的に学べます。"
        onBackHome={onBackHome}
      />

      <section className="panel breathwork-dictionary-search">
        <div className="breathwork-dictionary-search-row">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void doSearch(); }}
            placeholder="呼吸の知識を検索（例：横隔膜、SpO2、腹式呼吸）"
            className="breathwork-dictionary-search-input"
          />
          <button className="primary-button" onClick={() => void doSearch()} disabled={searching}>
            {searching ? '検索中...' : '検索'}
          </button>
          {searchResults && (
            <button className="ghost-button" onClick={() => { setSearchResults(null); setSearchQuery(''); }}>
              クリア
            </button>
          )}
        </div>
      </section>

      {!searchResults && categories.length > 0 && (
        <section className="panel breathwork-dictionary-categories">
          <div className="section-inline-header"><h3>カテゴリ</h3></div>
          <div className="breathwork-dictionary-category-chips">
            <button
              className={`breathwork-dictionary-chip ${selectedCategory === null ? 'active' : ''}`}
              onClick={() => setSelectedCategory(null)}
            >
              すべて
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                className={`breathwork-dictionary-chip ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {CATEGORY_LABELS[cat] ?? cat}
              </button>
            ))}
          </div>
        </section>
      )}

      {loading && <div className="panel" style={{ padding: 24, textAlign: 'center' }}>読み込み中...</div>}
      {error && <div className="panel" style={{ padding: 16, color: '#d32f2f' }}>エラー: {error}</div>}

      {!loading && !error && (
        <section className="panel breathwork-dictionary-list">
          {searchResults && (
            <div className="section-inline-header">
              <h3>検索結果（{displayList.length}件）</h3>
            </div>
          )}
          {!searchResults && selectedCategory && (
            <div className="section-inline-header">
              <h3>{CATEGORY_LABELS[selectedCategory] ?? selectedCategory}（{displayList.length}件）</h3>
            </div>
          )}
          {!searchResults && !selectedCategory && (
            <div className="section-inline-header">
              <h3>すべての知識（{displayList.length}件）</h3>
            </div>
          )}

          <div className="breathwork-dictionary-grid">
            {searchResults
              ? (displayList as BM5SearchResult[]).map((r) => (
                <article key={r.entry_id} className="breathwork-dictionary-card">
                  <span className="breathwork-dictionary-card-id">{r.entry_id}</span>
                  <strong className="breathwork-dictionary-card-title">{r.title}</strong>
                  {r.answer_short && (
                    <p className="breathwork-dictionary-card-answer">{r.answer_short}</p>
                  )}
                  <button
                    className="secondary-button breathwork-dictionary-card-btn"
                    onClick={() => void openDetail({
                      knowledge_id: r.entry_id,
                      title: r.title,
                      answer_short: r.answer_short,
                      answer_detail: r.answer_detail,
                    })}
                  >
                    詳しく見る
                  </button>
                </article>
              ))
              : (displayList as BM5KnowledgeRow[]).map((e) => (
                <article key={e.knowledge_id} className="breathwork-dictionary-card">
                  <span className="breathwork-dictionary-card-id">{e.knowledge_id}</span>
                  <strong className="breathwork-dictionary-card-title">{e.title}</strong>
                  {e.answer_short && (
                    <p className="breathwork-dictionary-card-answer">{e.answer_short}</p>
                  )}
                  {e.category_id && (
                    <span className="breathwork-dictionary-card-category">
                      {CATEGORY_LABELS[e.category_id] ?? e.category_id}
                    </span>
                  )}
                  <button
                    className="secondary-button breathwork-dictionary-card-btn"
                    onClick={() => void openDetail(e)}
                  >
                    詳しく見る
                  </button>
                </article>
              ))
            }
          </div>

          {displayList.length === 0 && !loading && (
            <div style={{ padding: 24, textAlign: 'center', color: '#888' }}>
              該当する知識が見つかりませんでした
            </div>
          )}
        </section>
      )}

      {/* Detail modal */}
      {detailEntry && (
        <div className="breathwork-dictionary-modal-overlay" onClick={() => setDetailEntry(null)}>
          <div className="breathwork-dictionary-modal" onClick={(e) => e.stopPropagation()}>
            <button className="ghost-button breathwork-dictionary-modal-close" onClick={() => setDetailEntry(null)}>閉じる</button>
            <div className="breathwork-dictionary-modal-id">{detailEntry.entry_id}</div>
            <h3 className="breathwork-dictionary-modal-title">{detailEntry.title}</h3>
            {detailEntry.answer_short && (
              <div className="breathwork-dictionary-modal-section">
                <strong>要点</strong>
                <p>{detailEntry.answer_short}</p>
              </div>
            )}
            {detailEntry.answer_detail && (
              <div className="breathwork-dictionary-modal-section">
                <strong>解説</strong>
                <p>{detailEntry.answer_detail}</p>
              </div>
            )}
            {detailPassages.length > 0 && (
              <div className="breathwork-dictionary-modal-section">
                <strong>出典</strong>
                {detailPassages.map((p) => (
                  <div key={p.passage_id} className="breathwork-dictionary-modal-passage">
                    <span className="breathwork-dictionary-modal-passage-label">
                      {p.section_label || p.page_label || p.passage_id}
                    </span>
                    {p.content && <p>{p.content}</p>}
                  </div>
                ))}
              </div>
            )}
            <div className="breathwork-dictionary-modal-source">
              出典：呼吸マネージャー検定 第5版
            </div>
            <button
              className="primary-button breathwork-dictionary-modal-ask-btn"
              onClick={() => {
                onAskAITeacher(detailEntry.title, detailEntry.entry_id);
              }}
            >
              この内容をAI先生に聞く
            </button>
          </div>
        </div>
      )}

      {detailLoading && (
        <div className="breathwork-dictionary-modal-overlay" onClick={() => setDetailLoading(false)}>
          <div className="breathwork-dictionary-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: 24, textAlign: 'center' }}>読み込み中...</div>
          </div>
        </div>
      )}
    </div>
  );
}
