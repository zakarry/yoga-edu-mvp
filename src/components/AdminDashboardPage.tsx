import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../lib/auth';
import { fetchAdminSummary, fetchAdminMembers, type AdminSummary, type AdminMember } from '../services/adminDashboardService';

interface Props {
  onBackHome: () => void;
}

export default function AdminDashboardPage({ onBackHome }: Props) {
  const auth = useAuth();
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [lineFilter, setLineFilter] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = auth.user && auth.profile?.is_admin === true;

  const loadSummary = useCallback(async () => {
    try {
      setError(null);
      const s = await fetchAdminSummary();
      setSummary(s);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown';
      if (msg === 'forbidden') setError('このページを表示する権限がありません');
      else setError('管理データを取得できませんでした');
    }
  }, []);

  const loadMembers = useCallback(async () => {
    try {
      setError(null);
      const res = await fetchAdminMembers({ page, pageSize, search, membershipTier: tierFilter, lineLinked: lineFilter });
      setMembers(res.members);
      setTotal(res.total);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown';
      if (msg === 'forbidden') setError('このページを表示する権限がありません');
      else setError('管理データを取得できませんでした');
    }
  }, [page, pageSize, search, tierFilter, lineFilter]);

  useEffect(() => {
    if (!isAdmin) { setLoading(false); return; }
    setLoading(true);
    Promise.all([loadSummary(), loadMembers()]).finally(() => setLoading(false));
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    loadMembers();
  }, [page, tierFilter, lineFilter]);

  const handleSearch = () => {
    setPage(1);
    loadMembers();
  };

  const totalPages = Math.ceil(total / pageSize);

  if (!auth.authReady) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#667' }}>読み込み中…</div>;
  }

  if (!auth.user) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: '#334', fontSize: 16, marginBottom: 16 }}>ログインが必要です。</p>
        <button className="primary-button" onClick={onBackHome}>TOPへ戻る</button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: '#334', fontSize: 16, marginBottom: 16 }}>このページを表示する権限がありません</p>
        <button className="primary-button" onClick={onBackHome}>TOPへ戻る</button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f4f7fb' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px' }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <button onClick={onBackHome} style={{ background: 'none', border: 'none', color: '#39c', cursor: 'pointer', fontSize: 13, marginBottom: 8 }}>← TOPへ戻る</button>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#102542', margin: 0 }}>Yoga AI 管理ダッシュボード</h1>
          <p style={{ fontSize: 13, color: '#667', marginTop: 4 }}>一般社団法人 全日本ヨガ連盟</p>
        </div>

        {error && (
          <div style={{ background: '#fde', border: '1px solid #e8c', borderRadius: 12, padding: 16, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#933', fontSize: 14 }}>{error}</span>
            <button className="ghost-button" onClick={() => { setError(null); Promise.all([loadSummary(), loadMembers()]); }}>再読み込み</button>
          </div>
        )}

        {loading && !summary ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#667' }}>読み込み中…</div>
        ) : (
          <>
            {/* KPI Cards — 3 groups */}
            {/* 会員 */}
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: '#667', margin: '0 0 8px', letterSpacing: '0.05em' }}>会員</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                <KpiCard label="Yoga AI会員総数" value={summary?.totalMembers ?? 0} highlight />
                <KpiCard label="無料会員" value={summary?.freeMembers ?? 0} />
                <KpiCard label="有料会員" value={summary?.paidMembers ?? 0} />
                <KpiCard label="LINE連携会員" value={summary?.lineLinkedMembers ?? 0} />
              </div>
            </div>

            {/* 新規会員 */}
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: '#667', margin: '0 0 8px', letterSpacing: '0.05em' }}>新規会員</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                <KpiCard label="本日の新規" value={summary?.todayNew ?? 0} />
                <KpiCard label="今週の新規" value={summary?.weekNew ?? 0} />
                <KpiCard label="今月の新規" value={summary?.monthNew ?? 0} />
              </div>
            </div>

            {/* 利用 */}
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: '#667', margin: '0 0 8px', letterSpacing: '0.05em' }}>利用</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                <KpiCard label="AI診断利用者" value={summary?.diagnosisUsers ?? 0} />
                <KpiCard label="AI診断回数" value={summary?.diagnosisCount ?? 0} />
                <KpiCard label="AI先生利用者" value={summary?.aiTeacherUsers ?? 0} />
                <KpiCard label="実践利用者" value={summary?.practiceUsers ?? 0} />
                <KpiCard label="実践回数" value={summary?.practiceCount ?? 0} />
              </div>
            </div>

            {/* Members List */}
            <div style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: '#102542', margin: '0 0 16px' }}>Yoga AI会員一覧</h2>

              {/* Search & Filters */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                <input
                  type="text"
                  placeholder="表示名で検索"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  style={{ flex: '1 1 200px', padding: '8px 12px', border: '1px solid #ccd', borderRadius: 8, fontSize: 14 }}
                />
                <select
                  value={tierFilter}
                  onChange={(e) => { setTierFilter(e.target.value as 'all' | 'free' | 'paid'); setPage(1); }}
                  style={{ padding: '8px 12px', border: '1px solid #ccd', borderRadius: 8, fontSize: 14, background: '#fff' }}
                >
                  <option value="all">すべて</option>
                  <option value="free">無料</option>
                  <option value="paid">有料</option>
                </select>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, color: '#334', cursor: 'pointer' }}>
                  <input type="checkbox" checked={lineFilter} onChange={(e) => { setLineFilter(e.target.checked); setPage(1); }} />
                  LINE連携あり
                </label>
                <button className="primary-button" onClick={handleSearch} style={{ padding: '8px 16px', fontSize: 14 }}>検索</button>
              </div>

              {/* Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #eef' }}>
                      <th style={{ textAlign: 'left', padding: '8px 10px', color: '#667', fontWeight: 600 }}>表示名</th>
                      <th style={{ textAlign: 'center', padding: '8px 10px', color: '#667', fontWeight: 600 }}>種別</th>
                      <th style={{ textAlign: 'left', padding: '8px 10px', color: '#667', fontWeight: 600 }}>登録日</th>
                      <th style={{ textAlign: 'center', padding: '8px 10px', color: '#667', fontWeight: 600 }}>role</th>
                      <th style={{ textAlign: 'left', padding: '8px 10px', color: '#667', fontWeight: 600 }}>エリア</th>
                      <th style={{ textAlign: 'center', padding: '8px 10px', color: '#667', fontWeight: 600 }}>LINE</th>
                      <th style={{ textAlign: 'center', padding: '8px 10px', color: '#667', fontWeight: 600 }}>規約同意</th>
                      <th style={{ textAlign: 'center', padding: '8px 10px', color: '#667', fontWeight: 600 }}>AI診断</th>
                      <th style={{ textAlign: 'center', padding: '8px 10px', color: '#667', fontWeight: 600 }}>実践</th>
                      <th style={{ textAlign: 'center', padding: '8px 10px', color: '#667', fontWeight: 600 }}>AI先生</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.length === 0 ? (
                      <tr><td colSpan={10} style={{ padding: 24, textAlign: 'center', color: '#889' }}>該当する会員がいません</td></tr>
                    ) : (
                      members.map((m) => (
                        <tr key={m.id} style={{ borderBottom: '1px solid #f0f3f7' }}>
                          <td style={{ padding: '8px 10px', color: '#234' }}>{m.displayName}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 600, color: m.membershipTier === 'paid' ? '#1a7' : '#579', background: m.membershipTier === 'paid' ? '#e8f8f0' : '#e8f0f8' }}>
                              {m.membershipTier === 'paid' ? '有料' : '無料'}
                            </span>
                          </td>
                          <td style={{ padding: '8px 10px', color: '#667', whiteSpace: 'nowrap' }}>{new Date(m.createdAt).toLocaleDateString('ja-JP')}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', color: '#667' }}>{m.role === 'teacher' ? '先生' : m.role === 'both' ? '両方' : '生徒'}</td>
                          <td style={{ padding: '8px 10px', color: '#667' }}>{m.area}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>{m.lineLinked ? <span style={{ color: '#1a7' }}>✓</span> : <span style={{ color: '#ccd' }}>-</span>}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>{m.consentVerified ? <span style={{ color: '#1a7' }}>✓</span> : <span style={{ color: '#c33' }}>×</span>}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', color: '#334' }}>{m.diagnosisCount > 0 ? m.diagnosisCount : '-'}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', color: '#334' }}>{m.practiceCount > 0 ? m.practiceCount : '-'}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>{m.aiTeacherUsed ? <span style={{ color: '#1a7' }}>✓</span> : <span style={{ color: '#ccd' }}>-</span>}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, fontSize: 13, color: '#667' }}>
                <span>{total > 0 ? `${total}件中 ${(page - 1) * pageSize + 1}〜${Math.min(page * pageSize, total)}件` : `${total}件`}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button disabled={page <= 1} onClick={() => setPage(page - 1)} style={{ padding: '6px 14px', border: '1px solid #ccd', borderRadius: 8, background: '#fff', cursor: page <= 1 ? 'default' : 'pointer', opacity: page <= 1 ? 0.4 : 1, fontSize: 13 }}>前へ</button>
                  <span style={{ padding: '6px 4px' }}>{page} / {Math.max(1, totalPages)}</span>
                  <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} style={{ padding: '6px 14px', border: '1px solid #ccd', borderRadius: 8, background: '#fff', cursor: page >= totalPages ? 'default' : 'pointer', opacity: page >= totalPages ? 0.4 : 1, fontSize: 13 }}>次へ</button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div style={{
      background: highlight ? '#102542' : '#fff',
      borderRadius: 12,
      padding: '16px 20px',
      boxShadow: '0 1px 4px rgba(0,0,0,.06)',
    }}>
      <div style={{ fontSize: 12, color: highlight ? '#9bd' : '#889', marginBottom: 6, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: highlight ? '#fff' : '#102542' }}>{value.toLocaleString()}</div>
    </div>
  );
}
