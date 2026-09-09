import { getKnowledgeRanking, getExplanationByMasterId, type KnowledgeExplanation, type RankedCandidate } from './teacherKnowledgeService';
import type { TodayPlan, TodayPlanItem } from './todayPlannerService';

export interface KnowledgeLink {
  masterId: string;
  title: string;
  label: string;
}

export interface TodayPlanItemWithKnowledge extends TodayPlanItem {
  knowledgeMasterId?: string;
  knowledgeTitle?: string;
  knowledgeAvailable?: boolean;
  knowledgeLinks?: KnowledgeLink[];
}

export interface TodayPlanWithKnowledge extends Omit<TodayPlan, 'items'> {
  items: TodayPlanItemWithKnowledge[];
}

const HIGH_CONFIDENCE_SCORE = 75;

const AMBIGUOUS_PLAN_NAMES = ['瞑想', '呼吸', 'ヨガ', 'アーサナ', 'ストレッチ'];

const TODAY_PLAN_KNOWLEDGE_ALIASES: Record<string, string> = {
  '1分間マインドフルネス': 'マインドフルネス瞑想',
  '交替鼻呼吸': 'アヌローマ・ヴィローマ／ナーディー・ショーダナ',
};

const COMPOSITE_PLAN_LINKS: Record<string, { label: string; searchName: string }[]> = {
  '山のポーズから立ち木のポーズ': [
    { label: '山のポーズを見る', searchName: 'タダーサナ' },
    { label: '木のポーズを見る', searchName: 'ヴルクシャーサナ' },
  ],
};

export async function findKnowledgeForPlanItem(name: string): Promise<RankedCandidate | null> {
  if (AMBIGUOUS_PLAN_NAMES.includes(name)) return null;

  const aliasTarget = TODAY_PLAN_KNOWLEDGE_ALIASES[name];
  if (aliasTarget) {
    const ranked = await getKnowledgeRanking(aliasTarget);
    const exact = ranked.find(
      (c) => c.matchType === 'title_exact' || c.matchType === 'alias_exact',
    );
    if (exact) return exact;
  }

  const ranked = await getKnowledgeRanking(name);
  if (ranked.length === 0) return null;

  const top = ranked[0];
  if (top.score >= HIGH_CONFIDENCE_SCORE) return top;

  const sameStrength = ranked.filter((c) => c.score === top.score && c.matchType === top.matchType);
  if (top.matchType === 'title_prefix' && sameStrength.length > 1) return null;

  return null;
}

export async function hasSafeKnowledge(name: string): Promise<boolean> {
  return (await findKnowledgeForPlanItem(name)) !== null;
}

export async function attachKnowledgeToTodayPlan(plan: TodayPlan): Promise<TodayPlanWithKnowledge> {
  const items: TodayPlanItemWithKnowledge[] = await Promise.all(
    plan.items.map(async (item) => {
      const compositeLinks = COMPOSITE_PLAN_LINKS[item.name];
      if (compositeLinks) {
        const links: KnowledgeLink[] = [];
        for (const cl of compositeLinks) {
          const match = await findKnowledgeForPlanItem(cl.searchName);
          if (match) {
            links.push({
              masterId: match.entry.masterId,
              title: match.entry.title,
              label: cl.label,
            });
          }
        }
        if (links.length > 0) {
          return { ...item, knowledgeAvailable: true, knowledgeLinks: links };
        }
        return { ...item, knowledgeAvailable: false };
      }

      const match = await findKnowledgeForPlanItem(item.name);
      if (match) {
        return {
          ...item,
          knowledgeMasterId: match.entry.masterId,
          knowledgeTitle: match.entry.title,
          knowledgeAvailable: true,
        };
      }
      return { ...item, knowledgeAvailable: false };
    }),
  );

  return {
    title: plan.title,
    summary: plan.summary,
    totalMinutes: plan.totalMinutes,
    items,
    adaptationNotes: plan.adaptationNotes,
    sourceSignals: plan.sourceSignals,
  };
}

export async function fetchKnowledgeExplanation(masterId: string): Promise<KnowledgeExplanation | null> {
  return getExplanationByMasterId(masterId);
}
