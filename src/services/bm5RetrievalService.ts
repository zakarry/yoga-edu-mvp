import { supabase } from '../lib/supabase';

export interface BM5KnowledgeEntry {
  knowledge_id: string;
  title: string;
  answer_short: string | null;
  answer_detail: string | null;
  tags: string[] | null;
  example_questions: string[] | null;
  source_passage_ids: string[] | null;
}

export interface BM5CatalogEntry {
  catalog_id: string;
  name: string;
  aliases: string[] | null;
  category_id: string | null;
}

export interface BM5PassageEntry {
  passage_id: string;
  source_id: string;
  section_label: string | null;
  content: string | null;
  page_label: string | null;
}

export interface BM5SearchResult {
  entry_id: string;
  title: string;
  answer: string;
  type: 'knowledge' | 'catalog';
  score: number;
  match_type: 'title_exact' | 'title_contains' | 'alias_exact' | 'alias_contains' | 'answer_contains' | 'tag_contains' | 'example_question_contains';
  passages: BM5PassageEntry[];
}

export interface BM5DebugLog {
  rawInput: string;
  normalizedQuery: string;
  domain: 'breathwork' | 'yoga' | 'general';
  matchedIds: string[];
  matchedPassageIds: string[];
  knowledgeSource: 'bm5' | 'yoga_knowledge' | 'none';
  responseSource: string;
  resultCount: number;
}

const STOP_WORDS = new Set([
  'とは', 'って何', '教えて', 'ですか', 'ますか', 'でしょうか',
  'について', 'って', 'の', 'が', 'を', 'に', 'は', 'と', 'や',
  '？', '?', '。', '、', '，',
]);

export function normalizeQuery(input: string): string {
  let q = input.trim();
  q = q.replace(/[「」？?。、，,]/g, '');
  q = q.replace(/とは$/, '');
  q = q.replace(/って何$/, '');
  q = q.replace(/教えて$/, '');
  q = q.replace(/について$/, '');
  q = q.replace(/ですか$/, '');
  q = q.replace(/ますか$/, '');
  q = q.replace(/でしょうか$/, '');
  q = q.replace(/って$/, '');
  q = q.trim();
  return q || input.trim();
}

export function classifyDomain(text: string): 'breathwork' | 'yoga' | 'general' {
  const lower = text.toLowerCase();
  if (/呼吸|プラーナ|プラナヤマ|pranayama|breath|肺|横隔膜|換気|sp o2|spo2|息|吐く|吸う|腹式|胸式|完全なヨガ呼吸|box breathing|ボックス/.test(lower)) {
    return 'breathwork';
  }
  if (/アーサナ|ポーズ|asana|ヨガ|yoga|瞑想|meditation|チャクラ|ナマスカール|スーリヤ/.test(lower)) {
    return 'yoga';
  }
  return 'general';
}

function scoreMatch(query: string, entry: {
  title: string;
  answer_short: string | null;
  answer_detail: string | null;
  tags: string[] | null;
  example_questions: string[] | null;
  aliases?: string[] | null;
}): { score: number; match_type: BM5SearchResult['match_type'] } {
  const q = query.toLowerCase();
  const title = (entry.title || '').toLowerCase();
  const answerShort = (entry.answer_short || '').toLowerCase();
  const answerDetail = (entry.answer_detail || '').toLowerCase();
  const tags = entry.tags || [];
  const eqs = entry.example_questions || [];
  const aliases = entry.aliases || [];

  if (title === q) return { score: 100, match_type: 'title_exact' };
  for (const a of aliases) {
    if (a.toLowerCase() === q) return { score: 95, match_type: 'alias_exact' };
  }
  if (title.startsWith(q)) return { score: 90, match_type: 'title_contains' };
  for (const a of aliases) {
    if (a.toLowerCase().startsWith(q)) return { score: 85, match_type: 'alias_contains' };
  }
  if (title.includes(q)) return { score: 75, match_type: 'title_contains' };
  for (const a of aliases) {
    if (a.toLowerCase().includes(q)) return { score: 70, match_type: 'alias_contains' };
  }
  for (const eq of eqs) {
    if (eq.toLowerCase().includes(q)) return { score: 65, match_type: 'example_question_contains' };
  }
  for (const t of tags) {
    if (t.toLowerCase().includes(q)) return { score: 55, match_type: 'tag_contains' };
  }
  if (answerShort.includes(q) || answerDetail.includes(q)) return { score: 40, match_type: 'answer_contains' };

  return { score: 0, match_type: 'answer_contains' };
}

export async function searchBM5(
  query: string,
  maxResults = 5,
): Promise<{ results: BM5SearchResult[]; debug: BM5DebugLog }> {
  const normalized = normalizeQuery(query);
  const domain = classifyDomain(normalized);
  const debug: BM5DebugLog = {
    rawInput: query,
    normalizedQuery: normalized,
    domain,
    matchedIds: [],
    matchedPassageIds: [],
    knowledgeSource: 'none',
    responseSource: 'bm5_search',
    resultCount: 0,
  };

  if (!supabase) return { results: [], debug };

  const q = normalized.toLowerCase();
  const combined: BM5SearchResult[] = [];

  const { data: kData, error: kErr } = await supabase
    .from('bm5_knowledge_view')
    .select('knowledge_id, title, answer_short, answer_detail, tags, example_questions, source_passage_ids')
    .or(`title.ilike.%${q}%,answer_short.ilike.%${q}%,answer_detail.ilike.%${q}%`)
    .limit(30);

  if (kErr) {
    debug.responseSource = `bm5_error: ${kErr.message}`;
    return { results: [], debug };
  }

  if (kData) {
    for (const k of kData as BM5KnowledgeEntry[]) {
      const { score, match_type } = scoreMatch(q, k);
      if (score > 0) {
        combined.push({
          entry_id: k.knowledge_id,
          title: k.title,
          answer: k.answer_short || k.answer_detail || '',
          type: 'knowledge',
          score,
          match_type,
          passages: [],
        });
      }
    }
  }

  const { data: cData, error: cErr } = await supabase
    .from('bm5_catalog_view')
    .select('catalog_id, name, aliases, category_id')
    .or(`name.ilike.%${q}%`)
    .limit(20);

  if (!cErr && cData) {
    for (const c of cData as BM5CatalogEntry[]) {
      const { score, match_type } = scoreMatch(q, {
        title: c.name,
        answer_short: null,
        answer_detail: null,
        tags: null,
        example_questions: null,
        aliases: c.aliases,
      });
      if (score > 0) {
        combined.push({
          entry_id: c.catalog_id,
          title: c.name,
          answer: '(呼吸法カタログ)',
          type: 'catalog',
          score,
          match_type,
          passages: [],
        });
      }
    }
  }

  combined.sort((a, b) => b.score - a.score);
  const top = combined.slice(0, maxResults);

  const passageIds = new Set<string>();
  if (kData) {
    for (const k of kData as BM5KnowledgeEntry[]) {
      if (k.source_passage_ids) {
        for (const pid of k.source_passage_ids) {
          if (top.find((r) => r.entry_id === k.knowledge_id)) {
            passageIds.add(pid);
          }
        }
      }
    }
  }

  if (passageIds.size > 0) {
    const { data: pData } = await supabase
      .from('bm5_passages_view')
      .select('passage_id, source_id, section_label, content, page_label')
      .in('passage_id', Array.from(passageIds));
    if (pData) {
      for (const r of top) {
        r.passages = (pData as BM5PassageEntry[]).filter((p) => {
          const k = (kData as BM5KnowledgeEntry[]).find((kd) => kd.knowledge_id === r.entry_id);
          return k?.source_passage_ids?.includes(p.passage_id);
        });
      }
    }
  }

  debug.matchedIds = top.map((r) => r.entry_id);
  debug.matchedPassageIds = Array.from(passageIds);
  debug.knowledgeSource = top.length > 0 ? 'bm5' : 'none';
  debug.resultCount = top.length;

  return { results: top, debug };
}

export function formatBM5Response(
  result: BM5SearchResult,
  teacherName: string,
  explanationPref: 'short' | 'standard' | 'detailed',
): string {
  let body: string;
  if (explanationPref === 'short') {
    const sentences = result.answer.split(/。/).filter((s) => s.trim().length > 0);
    body = sentences.slice(0, 2).join('。') + '。';
  } else if (explanationPref === 'detailed') {
    body = result.answer;
  } else {
    const sentences = result.answer.split(/。/).filter((s) => s.trim().length > 0);
    body = sentences.slice(0, Math.min(5, sentences.length)).join('。') + '。';
  }

  const sourceLabel = '呼吸マネージャー検定 第5版';
  const passageInfo = result.passages.length > 0
    ? ` / ${result.passages.map((p) => p.section_label || p.page_label || p.passage_id).join(', ')}`
    : '';

  return `${teacherName}です。${body}\n\n参考：${sourceLabel} / ${result.title}${passageInfo}`;
}

export function buildBM5Fallback(teacherName: string, query: string, results: BM5SearchResult[]): string {
  if (results.length > 0) {
    const similar = results.slice(0, 3).map((r) => `「${r.title}」`).join('、');
    return `${teacherName}です。呼吸マネージャー検定 第5版の中では、この質問に直接対応する説明を確認できませんでした。似た項目として、${similar}について聞いてみてください。`;
  }
  return `${teacherName}です。呼吸マネージャー検定 第5版の中では、この質問に直接対応する説明を確認できませんでした。呼吸、プラーナーヤーマ、横隔膜、腹式呼吸などについて聞いてみてください。`;
}
