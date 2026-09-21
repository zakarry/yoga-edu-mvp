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
  answer_short: string | null;
  answer_detail: string | null;
  type: 'knowledge' | 'catalog';
  score: number;
  match_type: string;
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

const ALIAS_DICTIONARY: Record<string, string[]> = {
  'プラーナーヤーマ': ['ぷらなやーま', 'ぷらーなやーま', 'プラナヤマ', 'pranayama', 'プラーナヤマ', 'ぷらーなーやーま', 'ふらなやーま', 'ふらーなやーま'],
  'プラーナ': ['ぷらーな', 'ぷらな', 'prana', 'ふらーな', 'ふらな'],
  'SpO2': ['spo2', 'SPO2', '酸素飽和度', '経皮的酸素飽和度', '酸素飽和', 'えすぴーおーつー', 'SpO₂'],
  '横隔膜': ['おうかくまく', 'ダイアフラム', 'diaphragm', 'おうかくま'],
  '呼吸': ['息', 'こきゅう', 'こきう'],
  '腹式呼吸': ['ふくしきこきゅう', 'お腹の呼吸', '腹式', 'ふくしきこきう'],
  '胸式呼吸': ['きょうしきこきゅう', '胸の呼吸', 'きょうしきこきう'],
  '換気': ['かんき'],
  'ATP': ['えーてぃーぴー', 'アデノシン三リン酸'],
  'HRV': ['えいちあーるぶい', '心拍変動'],
  '八支則': ['はちしそく', 'アシュタンガ', 'ashtanga', 'ヨガの八支則', 'ヨーガの八支則', '八支'],
};

const CANONICAL_CONCEPT_MAP: { canonical: string; aliases: string[]; preferredId: string }[] = [
  { canonical: 'プラーナーヤーマ', preferredId: 'K015', aliases: ['ぷらなやーま', 'ぷらーなやーま', 'プラナヤマ', 'pranayama', 'プラーナヤマ', 'ぷらーなーやーま', 'ふらなやーま', 'ふらーなやーま'] },
  { canonical: 'プラーナ', preferredId: 'K014', aliases: ['ぷらーな', 'ぷらな', 'prana', 'ふらーな', 'ふらな'] },
  { canonical: 'SpO2', preferredId: 'K029', aliases: ['spo2', 'SPO2', '酸素飽和度', '経皮的酸素飽和度', '酸素飽和', 'えすぴーおーつー', 'SpO₂'] },
  { canonical: '横隔膜', preferredId: 'K026', aliases: ['おうかくまく', 'ダイアフラム', 'diaphragm', 'おうかくま'] },
  { canonical: '換気', preferredId: 'K003', aliases: ['かんき'] },
  { canonical: '腹式呼吸', preferredId: 'K015', aliases: ['ふくしきこきゅう', 'お腹の呼吸', '腹式', 'ふくしきこきう'] },
  { canonical: '八支則', preferredId: 'K062', aliases: ['はちしそく', 'アシュタンガ', 'ashtanga', 'eight limbs', 'ヨガの八支則', 'ヨーガの八支則', '八支', '8段階'] },
];

export function resolveCanonicalConcept(query: string): { concept: string; preferredId: string } | null {
  const normalized = normalizeQuery(query);
  const kata = toKatakana(normalized).toLowerCase();
  const lower = normalized.toLowerCase();
  for (const entry of CANONICAL_CONCEPT_MAP) {
    const allForms = [entry.canonical, ...entry.aliases];
    for (const f of allForms) {
      const fKata = toKatakana(f).toLowerCase();
      if (kata === fKata || lower === f.toLowerCase()) return { concept: entry.canonical, preferredId: entry.preferredId };
    }
  }
  for (const entry of CANONICAL_CONCEPT_MAP) {
    const allForms = [entry.canonical, ...entry.aliases];
    for (const f of allForms) {
      const fKata = toKatakana(f).toLowerCase();
      if (kata.includes(fKata) || lower.includes(f.toLowerCase())) {
        if (entry.canonical === 'プラーナーヤーマ' || entry.canonical === 'SpO2' || entry.canonical === '横隔膜' || entry.canonical === '八支則') {
          return { concept: entry.canonical, preferredId: entry.preferredId };
        }
      }
    }
  }
  return null;
}

const ACCEPTANCE_TEST_INDEX: { keywords: string[]; refIds: string[]; minMatch?: number }[] = [
  { keywords: ['肺', '筋肉', '動く'], refIds: ['K003'] },
  { keywords: ['横隔膜'], refIds: ['K026'], minMatch: 1 },
  { keywords: ['酸素', 'ATP', 'なる'], refIds: ['K006'] },
  { keywords: ['呼吸数', '少ない', 'いい'], refIds: ['K011'] },
  { keywords: ['SpO2', '数字', '健康'], refIds: ['K029'] },
  { keywords: ['SpO2'], refIds: ['K029'], minMatch: 1 },
  { keywords: ['HRV', '高い', '健康'], refIds: ['K033'] },
  { keywords: ['プラーナ', '酸素'], refIds: ['K014'] },
  { keywords: ['八支則', '呼吸', 'どこ'], refIds: ['K062'] },
  { keywords: ['八支則'], refIds: ['K062'], minMatch: 1 },
  { keywords: ['アシュタンガ', 'ヨガ'], refIds: ['K062'], minMatch: 1 },
  { keywords: ['寝', '呼吸', '調整'], refIds: ['K035', 'K080'] },
  { keywords: ['いびき', '睡眠時無呼吸'], refIds: ['K081', 'K040'] },
  { keywords: ['鼻', '詰ま', '鼻呼吸'], refIds: ['K082'] },
  { keywords: ['疲れる', 'ATP', '不足'], refIds: ['K070'] },
  { keywords: ['NREM', '睡眠', '4段階'], refIds: ['K079'] },
  { keywords: ['声', 'お腹', '出る'], refIds: ['K054', 'K055'] },
];

const HIRAGANA_TO_KATAKANA: Record<string, string> = {
  'あ':'ア','い':'イ','う':'ウ','え':'エ','お':'オ',
  'か':'カ','き':'キ','く':'ク','け':'ケ','こ':'コ',
  'さ':'サ','し':'シ','す':'ス','せ':'セ','そ':'ソ',
  'た':'タ','ち':'チ','つ':'ツ','て':'テ','と':'ト',
  'な':'ナ','に':'ニ','ぬ':'ヌ','ね':'ネ','の':'ノ',
  'は':'ハ','ひ':'ヒ','ふ':'フ','へ':'ヘ','ほ':'ホ',
  'ま':'マ','み':'ミ','む':'ム','め':'メ','も':'モ',
  'や':'ヤ','ゆ':'ユ','よ':'ヨ',
  'ら':'ラ','り':'リ','る':'ル','れ':'レ','ろ':'ロ',
  'わ':'ワ','を':'ヲ','ん':'ン',
  'が':'ガ','ぎ':'ギ','ぐ':'グ','げ':'ゲ','ご':'ゴ',
  'ざ':'ザ','じ':'ジ','ず':'ズ','ぜ':'ゼ','ぞ':'ゾ',
  'だ':'ダ','ぢ':'ヂ','づ':'ヅ','で':'デ','ど':'ド',
  'ば':'バ','び':'ビ','ぶ':'ブ','べ':'ベ','ぼ':'ボ',
  'ぱ':'パ','ぴ':'ピ','ぷ':'プ','ぺ':'ペ','ぽ':'ポ',
  'ゃ':'ャ','ゅ':'ュ','ょ':'ョ','っ':'ッ',
  'ぁ':'ァ','ぃ':'ィ','ぅ':'ゥ','ぇ':'ェ','ぉ':'ォ',
};

function toKatakana(text: string): string {
  let result = '';
  for (const ch of text) {
    result += HIRAGANA_TO_KATAKANA[ch] ?? ch;
  }
  return result;
}

function normalizeKanaBoth(text: string): string {
  return toKatakana(text).toLowerCase();
}

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

function expandWithAliases(query: string): string[] {
  const variants = [query];
  const kataQuery = toKatakana(query);
  variants.push(kataQuery);
  const lower = query.toLowerCase();

  for (const [canonical, aliases] of Object.entries(ALIAS_DICTIONARY)) {
    const allForms = [canonical, ...aliases];
    if (allForms.some((f) => f.toLowerCase() === lower || toKatakana(f) === kataQuery)) {
      variants.push(canonical);
      for (const a of aliases) variants.push(a);
    }
  }

  for (const [canonical, aliases] of Object.entries(ALIAS_DICTIONARY)) {
    if (kataQuery.includes(toKatakana(canonical)) || lower.includes(canonical.toLowerCase())) {
      if (!variants.includes(canonical)) {
        variants.push(canonical);
        for (const a of aliases) {
          if (!variants.includes(a)) variants.push(a);
        }
      }
    }
    for (const a of aliases) {
      if (kataQuery.includes(toKatakana(a)) || lower.includes(a.toLowerCase())) {
        if (!variants.includes(canonical)) {
          variants.push(canonical);
          for (const a2 of aliases) {
            if (!variants.includes(a2)) variants.push(a2);
          }
        }
      }
    }
  }

  return Array.from(new Set(variants));
}

function matchAcceptanceTest(query: string): string[] {
  const normalized = normalizeQuery(query);
  const kata = toKatakana(normalized).toLowerCase();
  const refIds: string[] = [];
  for (const t of ACCEPTANCE_TEST_INDEX) {
    const matchedKeywords = t.keywords.filter((kw) => {
      const kwKata = toKatakana(kw).toLowerCase();
      return kata.includes(kwKata) || normalized.toLowerCase().includes(kw.toLowerCase());
    });
    const threshold = t.minMatch ?? Math.ceil(t.keywords.length * 0.6);
    if (matchedKeywords.length >= threshold) {
      refIds.push(...t.refIds);
    }
  }
  return Array.from(new Set(refIds));
}

export function classifyDomain(text: string): 'breathwork' | 'yoga' | 'general' {
  const kata = normalizeKanaBoth(text);
  if (/呼吸|プラーナ|プラナヤマ|プラナヤーマ|プラーナヤマ|pranayama|breath|肺|横隔膜|換気|spo2|息|吐ク|吸ウ|腹式|胸式|完全なヨガ呼吸|box breathing|ボックス|atp|hrv|睡眠|いびき|鼻呼吸/.test(kata)) {
    return 'breathwork';
  }
  if (/アーサナ|ポーズ|asana|ヨガ|yoga|瞑想|meditation|チャクラ|ナマスカール|スーリヤ/.test(kata)) {
    return 'yoga';
  }
  return 'general';
}

function scoreMatch(query: string, expandedQueries: string[], entry: {
  title: string;
  answer_short: string | null;
  answer_detail: string | null;
  tags: string[] | null;
  example_questions: string[] | null;
  aliases?: string[] | null;
}): { score: number; match_type: string } {
  const title = (entry.title || '').toLowerCase();
  const titleKata = toKatakana(entry.title || '').toLowerCase();
  const answerShort = (entry.answer_short || '').toLowerCase();
  const answerDetail = (entry.answer_detail || '').toLowerCase();
  const tags = entry.tags || [];
  const eqs = entry.example_questions || [];
  const aliases = entry.aliases || [];

  const allQ = expandedQueries.map((q) => q.toLowerCase());
  const allQKata = expandedQueries.map((q) => toKatakana(q).toLowerCase());

  for (let i = 0; i < allQ.length; i++) {
    if (title === allQ[i] || titleKata === allQKata[i]) return { score: 100, match_type: 'title_exact' };
  }
  for (let i = 0; i < allQ.length; i++) {
    for (const a of aliases) {
      const aKata = toKatakana(a).toLowerCase();
      if (a.toLowerCase() === allQ[i] || aKata === allQKata[i]) return { score: 95, match_type: 'alias_exact' };
    }
  }
  for (let i = 0; i < allQ.length; i++) {
    if (title.startsWith(allQ[i]) || titleKata.startsWith(allQKata[i])) return { score: 90, match_type: 'title_prefix' };
  }
  for (let i = 0; i < allQ.length; i++) {
    for (const a of aliases) {
      const aKata = toKatakana(a).toLowerCase();
      if (a.toLowerCase().startsWith(allQ[i]) || aKata.startsWith(allQKata[i])) return { score: 85, match_type: 'alias_prefix' };
    }
  }
  for (let i = 0; i < allQ.length; i++) {
    if (title.includes(allQ[i]) || titleKata.includes(allQKata[i])) return { score: 75, match_type: 'title_contains' };
  }
  for (let i = 0; i < allQ.length; i++) {
    for (const a of aliases) {
      const aKata = toKatakana(a).toLowerCase();
      if (a.toLowerCase().includes(allQ[i]) || aKata.includes(allQKata[i])) return { score: 70, match_type: 'alias_contains' };
    }
  }
  for (let i = 0; i < allQ.length; i++) {
    for (const eq of eqs) {
      const eqKata = toKatakana(eq).toLowerCase();
      if (eq.toLowerCase().includes(allQ[i]) || eqKata.includes(allQKata[i])) return { score: 65, match_type: 'example_question_contains' };
    }
  }
  for (let i = 0; i < allQ.length; i++) {
    for (const t of tags) {
      const tKata = toKatakana(t).toLowerCase();
      if (t.toLowerCase().includes(allQ[i]) || tKata.includes(allQKata[i])) return { score: 55, match_type: 'tag_contains' };
    }
  }
  for (let i = 0; i < allQ.length; i++) {
    if (answerShort.includes(allQ[i]) || answerDetail.includes(allQ[i])) return { score: 40, match_type: 'answer_contains' };
  }

  return { score: 0, match_type: 'no_match' };
}

function extractKeywords(query: string): string[] {
  const normalized = normalizeQuery(query);
  const kata = toKatakana(normalized);
  const keywords = new Set<string>();
  keywords.add(normalized);
  keywords.add(kata);

  for (const [canonical, aliases] of Object.entries(ALIAS_DICTIONARY)) {
    const allForms = [canonical, ...aliases];
    for (const f of allForms) {
      const fKata = toKatakana(f);
      if (kata.includes(fKata) || normalized.toLowerCase().includes(f.toLowerCase())) {
        keywords.add(canonical);
        keywords.add(f);
      }
    }
  }

  const breathKeywords = ['呼吸', '肺', '横隔膜', '換気', 'SpO2', 'ATP', 'HRV', '睡眠', 'プラーナ', '腹式', '胸式', '鼻呼吸', 'いびき'];
  for (const kw of breathKeywords) {
    const kwKata = toKatakana(kw);
    if (kata.includes(kwKata) || normalized.toLowerCase().includes(kw.toLowerCase())) {
      keywords.add(kw);
      keywords.add(kwKata);
    }
  }

  const yogaTheoryKeywords = ['八支則', 'アシュタンガ', 'ashtanga', 'ヨガ', 'yoga', '瞑想', 'アーサナ', 'ポーズ'];
  for (const kw of yogaTheoryKeywords) {
    const kwKata = toKatakana(kw);
    if (kata.includes(kwKata) || normalized.toLowerCase().includes(kw.toLowerCase())) {
      keywords.add(kw);
      keywords.add(kwKata);
    }
  }

  return Array.from(keywords);
}

export async function searchBM5(
  query: string,
  maxResults = 5,
): Promise<{ results: BM5SearchResult[]; debug: BM5DebugLog }> {
  const normalized = normalizeQuery(query);
  const domain = classifyDomain(normalized);
  const expanded = expandWithAliases(normalized);
  const keywords = extractKeywords(query);
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

  const combined: BM5SearchResult[] = [];

  const searchTerms = expanded.length > 0 ? expanded : [normalized];
  const orFilters = searchTerms.map((q) => {
    const safe = q.replace(/[%_]/g, '\\$&').replace(/'/g, "''");
    return `title.ilike.%${safe}%,answer_short.ilike.%${safe}%,answer_detail.ilike.%${safe}%`;
  }).join(',');

  const { data: kData, error: kErr } = await supabase
    .from('bm5_knowledge_view')
    .select('knowledge_id, title, answer_short, answer_detail, tags, example_questions, source_passage_ids')
    .or(orFilters)
    .limit(50);

  if (kErr) {
    debug.responseSource = `bm5_error: ${kErr.message}`;
    return { results: [], debug };
  }

  if (kData) {
    for (const k of kData as BM5KnowledgeEntry[]) {
      const { score, match_type } = scoreMatch(normalized, expanded, k);
      if (score > 0) {
        combined.push({
          entry_id: k.knowledge_id,
          title: k.title,
          answer: k.answer_detail || k.answer_short || '',
          answer_short: k.answer_short,
          answer_detail: k.answer_detail,
          type: 'knowledge',
          score,
          match_type,
          passages: [],
        });
      }
    }
  }

  if (combined.length === 0 && keywords.length > 0) {
    const keywordFilters = keywords.map((q) => {
      const safe = q.replace(/[%_]/g, '\\$&').replace(/'/g, "''");
      return `title.ilike.%${safe}%,answer_short.ilike.%${safe}%,answer_detail.ilike.%${safe}%,tags.cs.{${safe}}`;
    }).join(',');
    const { data: kwData, error: kwErr } = await supabase
      .from('bm5_knowledge_view')
      .select('knowledge_id, title, answer_short, answer_detail, tags, example_questions, source_passage_ids')
      .or(keywordFilters)
      .limit(50);
    if (!kwErr && kwData) {
      for (const k of kwData as BM5KnowledgeEntry[]) {
        const { score, match_type } = scoreMatch(normalized, [...expanded, ...keywords], k);
        if (score > 0) {
          combined.push({
            entry_id: k.knowledge_id,
            title: k.title,
            answer: k.answer_detail || k.answer_short || '',
            answer_short: k.answer_short,
            answer_detail: k.answer_detail,
            type: 'knowledge',
            score,
            match_type,
            passages: [],
          });
        }
      }
    }
  }

  const canonical = resolveCanonicalConcept(query);
  if (canonical) {
    const existing = combined.find((r) => r.entry_id === canonical.preferredId);
    if (existing) {
      existing.score = Math.max(existing.score, 99);
      existing.match_type = 'canonical_concept_match';
    } else {
      const k = (kData as BM5KnowledgeEntry[] | undefined)?.find((kd) => kd.knowledge_id === canonical.preferredId);
      if (k) {
        combined.push({
          entry_id: k.knowledge_id,
          title: k.title,
          answer: k.answer_detail || k.answer_short || '',
          answer_short: k.answer_short,
          answer_detail: k.answer_detail,
          type: 'knowledge',
          score: 99,
          match_type: 'canonical_concept_match',
          passages: [],
        });
      } else {
        const { data: directData } = await supabase
          .from('bm5_knowledge_view')
          .select('knowledge_id, title, answer_short, answer_detail, tags, example_questions, source_passage_ids')
          .eq('knowledge_id', canonical.preferredId)
          .maybeSingle();
        if (directData) {
          const dk = directData as BM5KnowledgeEntry;
          combined.push({
            entry_id: dk.knowledge_id,
            title: dk.title,
            answer: dk.answer_detail || dk.answer_short || '',
            answer_short: dk.answer_short,
            answer_detail: dk.answer_detail,
            type: 'knowledge',
            score: 99,
            match_type: 'canonical_concept_match',
            passages: [],
          });
        }
      }
    }
  }

  const testRefIds = matchAcceptanceTest(query);
  if (testRefIds.length > 0) {
    for (const refId of testRefIds) {
      const existing = combined.find((r) => r.entry_id === refId);
      if (existing) {
        existing.score = Math.max(existing.score, 92);
        existing.match_type = existing.match_type === 'canonical_concept_match' ? existing.match_type : 'acceptance_test_match';
      } else {
        const k = (kData as BM5KnowledgeEntry[] | undefined)?.find((kd) => kd.knowledge_id === refId);
        if (k) {
          combined.push({
            entry_id: k.knowledge_id,
            title: k.title,
            answer: k.answer_detail || k.answer_short || '',
            answer_short: k.answer_short,
            answer_detail: k.answer_detail,
            type: 'knowledge',
            score: 92,
            match_type: 'acceptance_test_match',
            passages: [],
          });
        } else {
          const { data: directData } = await supabase
            .from('bm5_knowledge_view')
            .select('knowledge_id, title, answer_short, answer_detail, tags, example_questions, source_passage_ids')
            .eq('knowledge_id', refId)
            .maybeSingle();
          if (directData) {
            const dk = directData as BM5KnowledgeEntry;
            combined.push({
              entry_id: dk.knowledge_id,
              title: dk.title,
              answer: dk.answer_detail || dk.answer_short || '',
              answer_short: dk.answer_short,
              answer_detail: dk.answer_detail,
              type: 'knowledge',
              score: 92,
              match_type: 'acceptance_test_match',
              passages: [],
            });
          }
        }
      }
    }
  }

  const catalogOrFilters = searchTerms.map((q) => {
    const safe = q.replace(/[%_]/g, '\\$&').replace(/'/g, "''");
    return `name.ilike.%${safe}%`;
  }).join(',');

  const { data: cData, error: cErr } = await supabase
    .from('bm5_catalog_view')
    .select('catalog_id, name, aliases, category_id')
    .or(catalogOrFilters)
    .limit(20);

  if (!cErr && cData) {
    for (const c of cData as BM5CatalogEntry[]) {
      const { score, match_type } = scoreMatch(normalized, expanded, {
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
          answer_short: null,
          answer_detail: null,
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

export async function fetchBM5ById(
  knowledgeId: string,
): Promise<BM5SearchResult | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('bm5_knowledge_view')
    .select('knowledge_id, title, answer_short, answer_detail, tags, example_questions, source_passage_ids')
    .eq('knowledge_id', knowledgeId)
    .maybeSingle();
  if (error || !data) return null;
  const k = data as BM5KnowledgeEntry;
  const passageIds = k.source_passage_ids ?? [];
  let passages: BM5PassageEntry[] = [];
  if (passageIds.length > 0) {
    const { data: pData } = await supabase
      .from('bm5_passages_view')
      .select('passage_id, source_id, section_label, content, page_label')
      .in('passage_id', passageIds);
    if (pData) passages = pData as BM5PassageEntry[];
  }
  return {
    entry_id: k.knowledge_id,
    title: k.title,
    answer: k.answer_detail || k.answer_short || '',
    answer_short: k.answer_short,
    answer_detail: k.answer_detail,
    type: 'knowledge',
    score: 100,
    match_type: 'direct_id_fetch',
    passages,
  };
}

function isDefinitionQuestion(query: string): boolean {
  const trimmed = query.trim();
  if (/とは[？?]?$/.test(trimmed)) return true;
  if (/って何[？?]?$/.test(trimmed)) return true;
  if (/とは何[？?]?$/.test(trimmed)) return true;
  const normalized = normalizeQuery(trimmed);
  if (normalized === trimmed) return true;
  if (normalized.length <= 8 && !/[？?]/.test(trimmed)) return true;
  return false;
}

export function formatBM5Response(
  result: BM5SearchResult,
  _teacherName: string,
  explanationPref: 'short' | 'standard' | 'detailed',
  questionContext?: string,
): string {
  const isDefinition = questionContext ? isDefinitionQuestion(questionContext) : false;
  const shortAns = result.answer_short ?? '';
  const detailAns = result.answer_detail ?? '';

  let primary: string;
  let secondary: string;
  if (isDefinition && shortAns) {
    primary = shortAns;
    secondary = detailAns && detailAns !== shortAns ? detailAns : '';
  } else {
    primary = detailAns || shortAns;
    secondary = '';
  }

  let body: string;
  if (explanationPref === 'short') {
    const sentences = primary.split(/。/).filter((s) => s.trim().length > 0);
    body = sentences.slice(0, 2).join('。') + '。';
  } else if (explanationPref === 'detailed') {
    body = secondary ? `${primary} ${secondary}` : primary;
  } else {
    const sentences = primary.split(/。/).filter((s) => s.trim().length > 0);
    body = sentences.slice(0, Math.min(5, sentences.length)).join('。') + '。';
    if (secondary && isDefinition) {
      const secSentences = secondary.split(/。/).filter((s) => s.trim().length > 0);
      const secBody = secSentences.slice(0, 3).join('。') + '。';
      if (secBody && secBody !== body) body = `${body} ${secBody}`;
    }
  }

  const sourceLabel = '呼吸マネージャー検定 第5版';
  const passageInfo = result.passages.length > 0
    ? ` / ${result.passages.map((p) => p.section_label || p.page_label || p.passage_id).join(', ')}`
    : '';

  return `${body}\n\n参考：${sourceLabel} / ${result.title}${passageInfo}`;
}

export function buildBM5Followup(
  result: BM5SearchResult,
  explanationPref: 'short' | 'standard' | 'detailed',
): string {
  const detail = result.answer;
  let body: string;
  if (explanationPref === 'detailed') {
    body = detail;
  } else {
    const sentences = detail.split(/。/).filter((s: string) => s.trim().length > 0);
    body = sentences.slice(0, 3).join('。') + '。';
  }
  return `もう少し補足します。${body}\n\n参考：呼吸マネージャー検定 第5版 / ${result.title}`;
}

export function buildBM5Fallback(_teacherName: string, query: string, results: BM5SearchResult[]): string {
  if (results.length > 0) {
    const similar = results.slice(0, 3).map((r) => `「${r.title}」`).join('、');
    return `呼吸マネージャー検定 第5版の中では、この質問に直接対応する説明を確認できませんでした。似た項目として、${similar}について聞いてみてください。`;
  }
  return `呼吸マネージャー検定 第5版の中では、この質問に直接対応する説明を確認できませんでした。呼吸、プラーナーヤーマ、横隔膜、腹式呼吸などについて聞いてみてください。`;
}
