import type { TodayContext } from '../types/aiTeacherLayers';

export type PlanGateState =
  | 'LOADING_MEMORY'
  | 'NEEDS_TODAY_CHECK'
  | 'TODAY_CHECK_RESOLVED'
  | 'PLAN_ALLOWED'
  | 'SAFETY_BLOCKED'
  | 'UNKNOWN_NEEDS_SELECTION';

export type PlanGateVerdict =
  | 'ALLOW_NORMAL'
  | 'ALLOW_GENTLE'
  | 'ALLOW_GENERAL_SHORT'
  | 'ALLOW_BREATH_MEDITATION'
  | 'BLOCK_SAFETY'
  | 'REQUIRE_TODAY_CHECK'
  | 'REQUIRE_USER_SELECTION'
  | 'BLOCK_LOADING';

export type RequestedMode = 'normal' | 'gentle' | 'general_short' | 'breath_meditation' | null;

export interface PlanGateInput {
  memoryLoaded: boolean;
  hasMemoryConcerns: boolean;
  todayCheckResult: 'none' | 'mild' | 'pain' | 'unknown' | null;
  requestedMode: RequestedMode;
  safetyBlocked: boolean;
  selectionResolved: boolean;
}

export function getPlanGate(input: PlanGateInput): PlanGateVerdict {
  if (input.safetyBlocked) return 'BLOCK_SAFETY';
  if (!input.memoryLoaded) return 'BLOCK_LOADING';
  if (input.hasMemoryConcerns) {
    if (input.todayCheckResult === null) return 'REQUIRE_TODAY_CHECK';
    if (input.todayCheckResult === 'pain') return 'BLOCK_SAFETY';
    if (input.todayCheckResult === 'unknown' && !input.selectionResolved) return 'REQUIRE_USER_SELECTION';
  if (input.todayCheckResult === 'mild') return 'ALLOW_GENTLE';
  if (input.requestedMode === 'breath_meditation') return 'ALLOW_BREATH_MEDITATION';
    if (input.requestedMode === 'general_short') return 'ALLOW_GENERAL_SHORT';
  return 'ALLOW_NORMAL';
  }
  if (input.requestedMode === 'breath_meditation') return 'ALLOW_BREATH_MEDITATION';
  if (input.requestedMode === 'general_short') return 'ALLOW_GENERAL_SHORT';
  return 'ALLOW_NORMAL';
}

export function gateVerdictAllowsGeneration(verdict: PlanGateVerdict): boolean {
  return verdict === 'ALLOW_NORMAL' || verdict === 'ALLOW_GENTLE' || verdict === 'ALLOW_GENERAL_SHORT' || verdict === 'ALLOW_BREATH_MEDITATION';
}

export function gateStateMessage(state: PlanGateState): string {
  switch (state) {
    case 'LOADING_MEMORY': return 'AI先生がこれまでの情報を確認しています…';
    case 'NEEDS_TODAY_CHECK': return '今日の状態を確認しています…';
    case 'SAFETY_BLOCKED': return '安全のため実践を制限しています';
    case 'UNKNOWN_NEEDS_SELECTION': return '実践の選択をお待ちしています';
    default: return '';
  }
}
