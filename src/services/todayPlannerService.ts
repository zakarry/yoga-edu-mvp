import type { TeacherContext, PracticeType } from './teacherContextService';

export interface TodayPlanItem {
  type: PracticeType;
  name: string;
  minutes: number;
  reason?: string;
}

export interface TodayPlan {
  title: string;
  summary: string;
  totalMinutes: number;
  items: TodayPlanItem[];
  adaptationNotes: string[];
  sourceSignals: string[];
}

const PRACTICE_NAMES: Record<PracticeType, string[]> = {
  asana: ['やさしいストレッチ', 'サンフロウ', '山のポーズから立ち木のポーズ', '初心者向けアーサナ'],
  pranayama: ['ボックスブリージング', '腹式呼吸', '交替鼻呼吸'],
  dhyana: ['1分間マインドフルネス', 'ボディスキャン瞑想', '呼吸の観察'],
};

function pickName(type: PracticeType, preferred?: string): string {
  if (preferred) {
    const found = PRACTICE_NAMES[type].find((n) => n.includes(preferred));
    if (found) return found;
  }
  return PRACTICE_NAMES[type][0];
}

function calcGapDays(lastPracticeAt?: string): number | null {
  if (!lastPracticeAt) return null;
  const diff = Date.now() - new Date(lastPracticeAt).getTime();
  return Math.floor(diff / (24 * 60 * 60 * 1000));
}

export function generateTodayPlan(context: TeacherContext): TodayPlan {
  const signals: string[] = [];
  const notes: string[] = [];
  const items: TodayPlanItem[] = [];

  const { practiceSummary, preferences, sessionIntent } = context;

  const requestedMinutes = sessionIntent?.requestedMinutes;
  const requestedType = sessionIntent?.requestedType;
  const requestedStyle = sessionIntent?.requestedStyle;

  const avgDuration = practiceSummary.averageDuration ?? 10;
  const targetMinutes = requestedMinutes ?? avgDuration;

  if (requestedMinutes) {
    signals.push(`今日は${requestedMinutes}分を希望しています`);
  } else if (practiceSummary.averageDuration) {
    signals.push(`平均${practiceSummary.averageDuration}分の実践をよく選びます`);
  }

  if (practiceSummary.favoriteTypes.length > 0) {
    const favLabels = practiceSummary.favoriteTypes.map((t) =>
      t === 'asana' ? 'アーサナ' : t === 'pranayama' ? '呼吸法' : '瞑想',
    );
    signals.push(`${favLabels.join('・')}をよく選んでいます`);
  }

  if (preferences.explanation === 'short') signals.push('説明は短めが好みです');
  else if (preferences.explanation === 'detailed') signals.push('説明は詳しいのが好みです');

  if (preferences.cue === 'minimal') signals.push('声かけは最低限が好みです');
  else if (preferences.cue === 'more') signals.push('声かけは多めが好みです');

  if (preferences.praise === 'less') signals.push('励ましは控えめが好みです');
  else if (preferences.praise === 'more') signals.push('励かしを多めにします');

  const gapDays = calcGapDays(practiceSummary.lastPracticeAt);
  if (gapDays && gapDays >= 3) {
    signals.push(`${gapDays}日ぶりの実践です`);
    notes.push('久しぶりなので短めから始めるのをおすすめします');
  }

  const recentTypes = practiceSummary.recentTypes;
  const recentAsana = recentTypes.filter((t) => t === 'asana').length;
  const recentDhyana = recentTypes.filter((t) => t === 'dhyana').length;
  const recentPranayama = recentTypes.filter((t) => t === 'pranayama').length;

  let primaryType: PracticeType;
  let secondaryType: PracticeType;
  let tertiaryType: PracticeType;

  if (requestedType && ['asana', 'pranayama', 'dhyana'].includes(requestedType)) {
    primaryType = requestedType as PracticeType;
  } else if (practiceSummary.favoriteTypes[0]) {
    primaryType = practiceSummary.favoriteTypes[0] as PracticeType;
  } else {
    primaryType = 'asana';
  }

  const allTypes: PracticeType[] = ['asana', 'pranayama', 'dhyana'];
  const remaining = allTypes.filter((t) => t !== primaryType);
  secondaryType = remaining[0];
  tertiaryType = remaining[1];

  if (recentAsana >= 2 && recentPranayama === 0) {
    notes.push('最近アーサナが続いているので、呼吸法も少し入れています');
    if (primaryType !== 'pranayama') {
      secondaryType = 'pranayama';
    }
  }
  if (recentDhyana >= 2) {
    notes.push('最近瞑想が多いので、アーサナも候補に入れています');
    if (primaryType !== 'asana') {
      secondaryType = 'asana';
    }
  }

  if (practiceSummary.favoriteTypes.includes('pranayama') && primaryType !== 'pranayama') {
    notes.push('呼吸法をよく選ぶため、候補の先頭に近づけています');
  }

  const primaryMin = Math.max(3, Math.round(targetMinutes * 0.5));
  const secondaryMin = Math.max(2, Math.round(targetMinutes * 0.3));
  const tertiaryMin = Math.max(1, targetMinutes - primaryMin - secondaryMin);

  items.push({
    type: primaryType,
    name: pickName(primaryType, requestedStyle ?? undefined),
    minutes: primaryMin,
    reason: primaryType === requestedType ? 'ご希望の実践タイプです' : undefined,
  });
  items.push({
    type: secondaryType,
    name: pickName(secondaryType),
    minutes: secondaryMin,
  });
  if (tertiaryMin > 0) {
    items.push({
      type: tertiaryType,
      name: pickName(tertiaryType),
      minutes: tertiaryMin,
    });
  }

  if (preferences.explanation === 'short') {
    notes.push('各ステップの説明を短くします');
  } else if (preferences.explanation === 'detailed') {
    notes.push('各ステップの説明を少し詳しくします');
  }
  if (preferences.cue === 'minimal') {
    notes.push('実践中の声かけを最小限にします');
  } else if (preferences.cue === 'more') {
    notes.push('実践中の声かけを少し多めにします');
  }

  const totalMinutes = items.reduce((sum, i) => sum + i.minutes, 0);
  const title = `今日の${totalMinutes}分プログラム`;
  const summary = `${primaryType === 'asana' ? 'アーサナ' : primaryType === 'pranayama' ? '呼吸法' : '瞑想'}中心の${totalMinutes}分メニューです。`;

  return {
    title,
    summary,
    totalMinutes,
    items,
    adaptationNotes: notes,
    sourceSignals: signals,
  };
}
