import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  getMemory, addMemory, editMemory, removeMemory,
} from '../services/aiTeacherMemoryService';
import type { MemoryEntry, MemoryEntryType } from '../types/aiTeacherLayers';

const ENTRY_TYPE_LABELS: Record<string, string> = {
  favorite_practice: '好きな実践',
  disliked_practice: '苦手な実践',
  frequent_practice: 'よく選ぶ実践',
  preferred_duration: '続きやすい時間',
  preferred_time: 'よく実践する時間帯',
  preferred_explanation_style: '好きな説明スタイル',
  preferred_teacher_tone: '好きな先生トーン',
  goal: '目標',
  user_reported_concern: '本人申告の不安',
  practice_history_note: '実践履歴メモ',
  streak_note: '継続メモ',
};

interface AITeacherMemorySectionProps {
  refreshToken?: number;
}

export function AITeacherMemorySection({ refreshToken = 0 }: AITeacherMemorySectionProps) {
  const auth = useAuth();
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newType, setNewType] = useState<MemoryEntryType>('favorite_practice');
  const [newLabel, setNewLabel] = useState('');
  const [newDetail, setNewDetail] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editDetail, setEditDetail] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getMemory(auth.user?.id ?? null);
    setEntries(data);
    setError(null);
    setLoading(false);
  }, [auth.user]);

  useEffect(() => { void load(); }, [load, refreshToken]);

  const handleAdd = useCallback(async () => {
    if (!newLabel.trim()) return;
    setAdding(true);
    await addMemory(auth.user?.id ?? null, {
      type: newType,
      label: newLabel.trim(),
      detail: newDetail.trim() || null,
    });
    setNewLabel('');
    setNewDetail('');
    setAdding(false);
    await load();
  }, [auth.user, newType, newLabel, newDetail, load]);

  const handleToggleActive = useCallback(async (entry: MemoryEntry) => {
    await editMemory(auth.user?.id ?? null, entry.id, { active: !entry.active });
    await load();
  }, [auth.user, load]);

  const handleDelete = useCallback(async (entryId: string) => {
    await removeMemory(auth.user?.id ?? null, entryId);
    await load();
  }, [auth.user, load]);

  const handleSaveEdit = useCallback(async (entryId: string) => {
    await editMemory(auth.user?.id ?? null, entryId, {
      label: editLabel.trim(),
      detail: editDetail.trim() || null,
    });
    setEditingId(null);
    await load();
  }, [auth.user, editLabel, editDetail, load]);

  const startEdit = (entry: MemoryEntry) => {
    setEditingId(entry.id);
    setEditLabel(entry.label);
    setEditDetail(entry.detail ?? '');
  };

  if (!isSupabaseConfigured && !auth.user) {
    return (
      <section className="panel mypage-section ai-teacher-memory-section">
        <div className="section-inline-header tight">
          <div>
            <span className="eyebrow">AI先生の記憶</span>
            <h3>AI先生が覚えていること</h3>
          </div>
        </div>
        <p className="result-section-copy">
          AI先生が長期的に理解しているあなたの好みや不安を確認・編集できます。ログインするとクラウド保存されます。
        </p>
        {loading ? (
          <p className="auth-unavailable-text">読み込み中…</p>
        ) : entries.length === 0 ? (
          <div className="empty-box">まだAI先生に覚えていることはありません。実践を重ねると蓄積されます。</div>
        ) : (
          <div className="ai-teacher-memory-list">
            {entries.map((entry) => (
              <article key={entry.id} className={`ai-teacher-memory-card ${entry.active ? '' : 'inactive'}`}>
                <span className="eyebrow">{ENTRY_TYPE_LABELS[entry.type] ?? entry.type}</span>
                {editingId === entry.id ? (
                  <div className="ai-teacher-memory-edit">
                    <input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} />
                    <input value={editDetail} onChange={(e) => setEditDetail(e.target.value)} placeholder="詳細（任意）" />
                    <button className="secondary-button" onClick={() => handleSaveEdit(entry.id)}>保存</button>
                    <button className="ghost-button" onClick={() => setEditingId(null)}>キャンセル</button>
                  </div>
                ) : (
                  <>
                    <strong>{entry.label}</strong>
                    {entry.detail && <p>{entry.detail}</p>}
                    <span className="ai-teacher-memory-source">
                      {entry.source === 'user_reported' ? '本人申告' : entry.source === 'inferred_from_practice' ? '実践から推測' : '診断から推測'}
                      {!entry.active && '（無効）'}
                    </span>
                    <div className="ai-teacher-memory-actions">
                      <button className="ghost-button" onClick={() => startEdit(entry)}>修正</button>
                      <button className="ghost-button" onClick={() => handleToggleActive(entry)}>
                        {entry.active ? '無効化' : '有効化'}
                      </button>
                      <button className="ghost-button" onClick={() => handleDelete(entry.id)}>削除</button>
                    </div>
                  </>
                )}
              </article>
            ))}
          </div>
        )}
        <details className="mypage-details-panel">
          <summary>新しい記憶を追加</summary>
          <div className="ai-teacher-memory-add">
            <div className="field">
              <label>種類</label>
              <select value={newType} onChange={(e) => setNewType(e.target.value as MemoryEntryType)}>
                {Object.entries(ENTRY_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>内容（例：夜の実践が続けやすい、腰に不安がある）</label>
              <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="短く入力" />
            </div>
            <div className="field">
              <label>詳細（任意）</label>
              <input value={newDetail} onChange={(e) => setNewDetail(e.target.value)} placeholder="補足があれば入力" />
            </div>
            <button className="primary-button" onClick={handleAdd} disabled={adding || !newLabel.trim()}>
              {adding ? '追加中…' : '記憶に追加'}
            </button>
          </div>
        </details>
      </section>
    );
  }

  if (!auth.user) {
    return (
      <section className="panel mypage-section ai-teacher-memory-section">
        <div className="section-inline-header tight">
          <div>
            <span className="eyebrow">AI先生の記憶</span>
            <h3>AI先生が覚えていること</h3>
          </div>
        </div>
        <p className="result-section-copy">
          ログインすると、AI先生があなたの好みや継続傾向を長期的に記憶し、より個別化された提案ができるようになります。
        </p>
        <div className="empty-box">ログインでAI先生の記憶機能が利用できます。</div>
      </section>
    );
  }

  return (
    <section className="panel mypage-section ai-teacher-memory-section">
      <div className="section-inline-header tight">
        <div>
          <span className="eyebrow">AI先生の記憶</span>
          <h3>AI先生が覚えていること</h3>
        </div>
        <span>{entries.filter((e) => e.active).length}件</span>
      </div>
      <p className="result-section-copy">
        AI先生が長期的に理解している好みや不安を確認・編集できます。身体の不安は診断ではなく本人申告として扱われます。
      </p>
      {error && <p className="auth-unavailable-text">{error}</p>}
      {loading ? (
        <p className="auth-unavailable-text">読み込み中…</p>
      ) : entries.length === 0 ? (
        <div className="empty-box">まだAI先生に覚えていることはありません。実践を重ねると蓄積されます。</div>
      ) : (
        <div className="ai-teacher-memory-list">
          {entries.map((entry) => (
            <article key={entry.id} className={`ai-teacher-memory-card ${entry.active ? '' : 'inactive'}`}>
              <span className="eyebrow">{ENTRY_TYPE_LABELS[entry.type] ?? entry.type}</span>
              {editingId === entry.id ? (
                <div className="ai-teacher-memory-edit">
                  <input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} />
                  <input value={editDetail} onChange={(e) => setEditDetail(e.target.value)} placeholder="詳細（任意）" />
                  <button className="secondary-button" onClick={() => handleSaveEdit(entry.id)}>保存</button>
                  <button className="ghost-button" onClick={() => setEditingId(null)}>キャンセル</button>
                </div>
              ) : (
                <>
                  <strong>{entry.label}</strong>
                  {entry.detail && <p>{entry.detail}</p>}
                  <span className="ai-teacher-memory-source">
                    {entry.source === 'user_reported' ? '本人申告' : entry.source === 'inferred_from_practice' ? '実践から推測' : '診断から推測'}
                    {!entry.active && '（無効）'}
                  </span>
                  <div className="ai-teacher-memory-actions">
                    <button className="ghost-button" onClick={() => startEdit(entry)}>修正</button>
                    <button className="ghost-button" onClick={() => handleToggleActive(entry)}>
                      {entry.active ? '無効化' : '有効化'}
                    </button>
                    <button className="ghost-button" onClick={() => handleDelete(entry.id)}>削除</button>
                  </div>
                </>
              )}
            </article>
          ))}
        </div>
      )}
      <details className="mypage-details-panel">
        <summary>新しい記憶を追加</summary>
        <div className="ai-teacher-memory-add">
          <div className="field">
            <label>種類</label>
            <select value={newType} onChange={(e) => setNewType(e.target.value as MemoryEntryType)}>
              {Object.entries(ENTRY_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>内容（例：夜の実践が続けやすい、腰に不安がある）</label>
            <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="短く入力" />
          </div>
          <div className="field">
            <label>詳細（任意）</label>
            <input value={newDetail} onChange={(e) => setNewDetail(e.target.value)} placeholder="補足があれば入力" />
          </div>
          <button className="primary-button" onClick={handleAdd} disabled={adding || !newLabel.trim()}>
            {adding ? '追加中…' : '記憶に追加'}
          </button>
        </div>
      </details>
    </section>
  );
}
