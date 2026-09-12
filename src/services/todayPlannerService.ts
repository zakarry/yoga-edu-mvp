import type { TeacherContext, PracticeType } from './teacherContextService';
import { PRACTICE_IDS_BY_TYPE, GENTLE_PRACTICE_IDS_BY_TYPE, getPoseById } from '../lib/poseLibrary';

export interface TodayPlanItem {
  type: PracticeType;
  name: string;
  minutes: number;
  practiceId?: string;
  reason?: string;
  knowledgeMasterId?: string;
  knowledgeTitle?: string;
  knowledgeAvailable?: boolean;
}

export interface TodayPlan {
  title: string;
  summary: string;
  totalMinutes: number;
  items: TodayPlanItem[];
  adaptationNotes: string[];
  sourceSignals: string[];
}

function pickPracticeId(type: PracticeType, gentle: boolean, index: number): string {
  const pool = gentle
    ? (GENTLE_PRACTICE_IDS_BY_TYPE[type] ?? PRACTICE_IDS_BY_TYPE[type])
    : PRACTICE_IDS_BY_TYPE[type];
  return pool[index % pool.length];
}

function practiceName(id: string): string {
  const pose = getPoseById(id);
  return pose?.name ?? id;
}

function calcGapDays(lastPracticeAt?: string): number | null {
  if (!lastPracticeAt) return null;
  const diff = Date.now() - new Date(lastPracticeAt).getTime();
  return Math.floor(diff / (24 * 60 * 60 * 1000));
}

export function generateTodayPlan(context: TeacherContext): TodayPlan {
  const signals: string[] = [];
  const notes: string[] = [];
  let items: TodayPlanItem[] = [];

  const { practiceSummary, preferences, sessionIntent, memorySummary, todayContext } = context;
  const requestedMode = todayContext?.requestedMode ?? null;

  const requestedMinutes = sessionIntent?.requestedMinutes;
  const requestedType = sessionIntent?.requestedType;
  const requestedStyle = sessionIntent?.requestedStyle;

  const avgDuration = practiceSummary.averageDuration ?? 10;
  const memoryDuration = memorySummary?.preferredDuration ?? null;
  const todayMinutes = todayContext?.availableMinutes ?? null;
  const targetMinutes = todayMinutes ?? requestedMinutes ?? memoryDuration ?? avgDuration;

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

  let primaryType: PracticeType = 'asana';
  let secondaryType: PracticeType = 'pranayama';
  let tertiaryType: PracticeType = 'dhyana';

  if (requestedMode === 'breath_meditation') {
    primaryType = 'pranayama';
    secondaryType = 'dhyana';
    tertiaryType = 'pranayama';
  } else if (requestedMode === 'general_short') {
    primaryType = 'asana';
    secondaryType = 'pranayama';
    tertiaryType = 'dhyana';
  } else if (todayContext?.requestedType && ['asana', 'pranayama', 'dhyana'].includes(todayContext.requestedType)) {
    primaryType = todayContext.requestedType;
  } else if (requestedType && ['asana', 'pranayama', 'dhyana'].includes(requestedType)) {
    primaryType = requestedType as PracticeType;
  } else if (memorySummary?.favoritePractices.some((p) => p.includes('呼吸'))) {
    primaryType = 'pranayama';
  } else if (memorySummary?.favoritePractices.some((p) => p.includes('瞑想'))) {
    primaryType = 'dhyana';
  } else if (practiceSummary.favoriteTypes[0]) {
    primaryType = practiceSummary.favoriteTypes[0] as PracticeType;
  } else {
    primaryType = 'asana';
  }

  const allTypes: PracticeType[] = ['asana', 'pranayama', 'dhyana'];

  if (requestedMode === 'breath_meditation') {
    // Only pranayama and dhyana — no asana at all
    notes.push('呼吸・瞑想中心の一般的な実践です（個別治療目的ではありません）');
  } else {
    const remaining = allTypes.filter((t) => t !== primaryType);
    secondaryType = remaining[0];
    tertiaryType = remaining[1];
  }

  // gentle: reduce load without therapeutic sequencing
  if (requestedMode === 'gentle' || (todayContext?.todayConcern && requestedMode !== 'breath_meditation')) {
    notes.push('今日気になる部分があるため、無理のない範囲で構成します（深い可動域や高負荷は避けます）');
  }

  if (requestedMode === 'general_short') {
    notes.push('一般的な短い実践です（身体状態を前提にせず、低負荷の安全な内容です）');
  }

  if (requestedMode !== 'breath_meditation' && recentAsana >= 2 && recentPranayama === 0) {
    notes.push('最近アーサナが続いているので、呼吸法も少し入れています');
    if (primaryType !== 'pranayama') {
      secondaryType = 'pranayama';
    }
  } else if (recentDhyana >= 2) {
    notes.push('最近瞑想が多いので、アーサナも候補に入れています');
    if (primaryType !== 'asana') {
      secondaryType = 'asana';
    }
  }

  if (practiceSummary.favoriteTypes.includes('pranayama') && primaryType !== 'pranayama') {
    notes.push('呼吸法をよく選ぶため、候補の先頭に近づけています');
  }

  const isGentle = requestedMode === 'gentle' || (!!todayContext?.todayConcern && requestedMode !== 'breath_meditation');
  const gentleMul = isGentle ? 0.7 : 1;

  const primaryMin = Math.max(isGentle ? 2 : 3, Math.round(targetMinutes * 0.5 * gentleMul));
  const secondaryMin = Math.max(2, Math.round(targetMinutes * 0.3 * gentleMul));
  const tertiaryMin = Math.max(1, targetMinutes - primaryMin - secondaryMin);

  if (requestedMode === 'breath_meditation') {
    const breathId = pickPracticeId('pranayama', false, 0);
    items.push({ type: 'pranayama', name: practiceName(breathId), minutes: Math.max(3, Math.round(targetMinutes * 0.5)), practiceId: breathId });
    const medId = pickPracticeId('dhyana', false, 0);
    items.push({ type: 'dhyana', name: practiceName(medId), minutes: Math.max(2, Math.round(targetMinutes * 0.3)), practiceId: medId });
    const breathRemainder = Math.max(1, targetMinutes - items[0].minutes - items[1].minutes);
    if (breathRemainder > 0) {
      const breath2Id = pickPracticeId('pranayama', false, 1);
      items.push({ type: 'pranayama', name: practiceName(breath2Id), minutes: breathRemainder, practiceId: breath2Id });
    }
  } else if (requestedMode === 'general_short') {
    const asanaId = pickPracticeId('asana', false, 0);
    items.push({ type: 'asana', name: practiceName(asanaId), minutes: Math.max(2, Math.round(targetMinutes * 0.4)), practiceId: asanaId });
    const breathId = pickPracticeId('pranayama', false, 0);
    items.push({ type: 'pranayama', name: practiceName(breathId), minutes: Math.max(2, Math.round(targetMinutes * 0.3)), practiceId: breathId });
    const shortRemainder = Math.max(1, targetMinutes - items[0].minutes - items[1].minutes);
    if (shortRemainder > 0) {
      const medId = pickPracticeId('dhyana', false, 0);
      items.push({ type: 'dhyana', name: practiceName(medId), minutes: shortRemainder, practiceId: medId });
    }
  } else {
    const pId = pickPracticeId(primaryType, isGentle, 0);
    items.push({
      type: primaryType,
      name: practiceName(pId),
      minutes: primaryMin,
      practiceId: pId,
      reason: primaryType === requestedType ? 'ご希望の実践タイプです' : undefined,
    });
    const sId = pickPracticeId(secondaryType, isGentle, 0);
    items.push({
      type: secondaryType,
      name: practiceName(sId),
      minutes: secondaryMin,
      practiceId: sId,
    });
    if (tertiaryMin > 0) {
      const tId = pickPracticeId(tertiaryType, isGentle, 0);
      items.push({
        type: tertiaryType,
        name: practiceName(tId),
        minutes: tertiaryMin,
        practiceId: tId,
      });
    }
    if (isGentle && primaryType === 'asana') {
      const restId = pickPracticeId('asana', true, 3);
      items.push({
        type: 'asana',
        name: practiceName(restId),
        minutes: Math.max(2, Math.round(targetMinutes * 0.2)),
        practiceId: restId,
      });
    }
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

  if (requestedMode === 'breath_meditation' && items.some((i) => i.type === 'asana')) {
    items = items.filter((i) => i.type !== 'asana');
    if (items.length === 0) {
      const fbBreathId = pickPracticeId('pranayama', false, 0);
      const fbMedId = pickPracticeId('dhyana', false, 0);
      items = [
        { type: 'pranayama', name: practiceName(fbBreathId), minutes: Math.max(3, Math.round(targetMinutes * 0.5)), practiceId: fbBreathId },
        { type: 'dhyana', name: practiceName(fbMedId), minutes: Math.max(2, Math.round(targetMinutes * 0.3)), practiceId: fbMedId },
      ];
    }
  }

  return {
    title,
    summary,
    totalMinutes,
    items,
    adaptationNotes: notes,
    sourceSignals: signals,
  };
}
