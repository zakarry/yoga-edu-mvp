import type { VoiceCueDef, KnowledgeLink } from './poseCatalog';

export type BreathworkVisualType = 'static' | 'circle' | 'phase_animation';
export type BreathworkStatus = 'active' | 'draft' | 'review_required';

export interface BreathworkPattern {
  inhaleSec: number;
  holdAfterInhaleSec: number;
  exhaleSec: number;
  holdAfterExhaleSec: number;
  rounds: number;
}

export interface BreathworkVisual {
  type: BreathworkVisualType;
  asset?: string;
}

export interface BreathworkInstructions {
  intro: string[];
  firstRound: string[];
  repeatRound?: string[];
  completion: string[];
}

export interface BreathworkBreathing {
  recommendNasalBreathing: boolean;
  nasalCue?: string;
}

export interface BreathworkSafety {
  beginnerFriendly: boolean;
  gentleAllowed: boolean;
  requiresReview?: boolean;
}

export interface BreathworkVoiceGuide {
  intro: VoiceCueDef[];
  phaseCues?: Record<string, string>;
  repeatCues?: VoiceCueDef[];
  completion: VoiceCueDef[];
}

export interface BreathworkCatalogEntry {
  id: string;
  nameJa: string;
  nameSanskrit?: string;
  nameEn?: string;
  aliases?: string[];
  category: 'pranayama';
  defaultDurationMin: number;
  pattern?: BreathworkPattern;
  visual: BreathworkVisual;
  instructions: BreathworkInstructions;
  breathing: BreathworkBreathing;
  safety: BreathworkSafety;
  knowledge: KnowledgeLink;
  voiceGuide: BreathworkVoiceGuide;
  status: BreathworkStatus;
}

export const BREATHWORK_CATALOG: BreathworkCatalogEntry[] = [
  {
    id: 'box-breathing',
    nameJa: 'Box Breathing',
    nameSanskrit: 'Sama Vritti Pranayama',
    nameEn: 'Box Breathing',
    category: 'pranayama',
    defaultDurationMin: 2,
    pattern: {
      inhaleSec: 4,
      holdAfterInhaleSec: 4,
      exhaleSec: 4,
      holdAfterExhaleSec: 4,
      rounds: 4,
    },
    visual: {
      type: 'phase_animation',
    },
    instructions: {
      intro: [
        '楽な姿勢で座る（椅子でも床でもOK）',
        '4秒吸う → 4秒止める → 4秒吐く → 4秒止める。これを繰り返す',
      ],
      firstRound: [
        '4秒吸って、4秒止めて、4秒吐いて、4秒止めます',
        '無理のない範囲で行いましょう',
      ],
      repeatRound: [
        '吸います',
        '止めます',
        'ゆっくり吐きます',
        '止めます',
      ],
      completion: [
        '最後の呼吸です',
        'お疲れさまでした。自然な呼吸に戻しましょう',
      ],
    },
    breathing: {
      recommendNasalBreathing: true,
      nasalCue: '苦しくなければ、鼻からゆっくり吸って、鼻から吐きます。',
    },
    safety: {
      beginnerFriendly: true,
      gentleAllowed: true,
    },
    knowledge: {
      knowledgeEntryId: 'b4dbb7d1-f1c5-4141-8f6d-398cde68bc8c',
      zukanSlug: 'box-breathing',
      verified: true,
      professionalYogaRelated: null,
    },
    voiceGuide: {
      intro: [
        { at: 0, text: 'Box Breathingを始めます。4秒吸って、4秒止めて、4秒吐いて、4秒止めます。' },
        { at: 5, text: '無理のない範囲で行いましょう。' },
      ],
      phaseCues: {
        '吸う': '鼻から吸います。',
        '止める': '止めます。',
        '吐く': 'ゆっくり吐きます。',
      },
      repeatCues: [
        { at: 0, text: '鼻から吸います。' },
        { at: 4, text: '止めます。' },
        { at: 8, text: 'ゆっくり吐きます。' },
        { at: 12, text: '止めます。' },
      ],
      completion: [
        { at: 0, text: '最後の呼吸です。' },
        { at: 3, text: 'お疲れさまでした。自然な呼吸に戻しましょう。' },
      ],
    },
    status: 'active',
  },
  {
    id: 'abdominal-breathing',
    nameJa: '腹式呼吸',
    nameSanskrit: 'Diaphragmatic Breathing',
    nameEn: 'Abdominal Breathing',
    category: 'pranayama',
    defaultDurationMin: 3,
    visual: {
      type: 'static',
      asset: '/pose-abdominal-breathing.webp',
    },
    instructions: {
      intro: [
        '仰向けまたは椅子に座り、片手をお腹に置く',
        '鼻から吸い、お腹が膨らむのを感じる。ゆっくり鼻から吐き、お腹が戻るのを感じる',
      ],
      firstRound: [
        '肩の力を抜きましょう',
        '苦しくなければ、鼻からゆっくり吸って、鼻から吐きます',
        'お腹が膨らむのを感じながら吸います',
        'ゆっくり吐いて、お腹が戻るのを感じます',
      ],
      repeatRound: [
        'もう一度、お腹の膨らみを感じながら吸います',
        'ゆっくり吐いて、お腹を戻しましょう',
      ],
      completion: [
        'お疲れさまでした',
      ],
    },
    breathing: {
      recommendNasalBreathing: true,
      nasalCue: '苦しくなければ、鼻からゆっくり吸って、鼻から吐きます。',
    },
    safety: {
      beginnerFriendly: true,
      gentleAllowed: true,
    },
    knowledge: {
      knowledgeMasterId: 'YK-0318',
      zukanSlug: 'yk-0318',
      verified: true,
      professionalYogaRelated: null,
    },
    voiceGuide: {
      intro: [
        { at: 0, text: '腹式呼吸を始めます。' },
      ],
      completion: [
        { at: 0, text: 'お疲れさまでした。' },
      ],
    },
    status: 'active',
  },
  {
    id: 'thoracic-breathing',
    nameJa: '胸式呼吸',
    nameSanskrit: 'Thoracic Breathing',
    nameEn: 'Chest Breathing',
    category: 'pranayama',
    defaultDurationMin: 3,
    visual: {
      type: 'static',
      asset: '/pose-abdominal-breathing.webp',
    },
    instructions: {
      intro: [
        '楽な姿勢で座るか仰向けになる',
        '鼻からゆっくり吸い、胸郭が広がるのを感じる。ゆっくり鼻から吐き、胸郭が戻るのを感じる',
      ],
      firstRound: [
        '苦しくなければ、鼻からゆっくり吸います。胸郭が前後左右に広がる感覚を感じてみましょう',
        '鼻からゆっくり吐きます。胸郭が自然に戻るのを感じましょう',
        '無理に大きく吸おうとせず、楽にできる範囲で続けましょう',
      ],
      repeatRound: [
        'もう一度、胸の広がりを感じながら吸います',
        'ゆっくり吐いて、力を抜きましょう',
      ],
      completion: [
        'お疲れさまでした',
      ],
    },
    breathing: {
      recommendNasalBreathing: true,
      nasalCue: '苦しくなければ、鼻からゆっくり吸って、鼻から吐きます。',
    },
    safety: {
      beginnerFriendly: true,
      gentleAllowed: true,
    },
    knowledge: {
      knowledgeMasterId: 'YK-0317',
      zukanSlug: 'yk-0317',
      verified: true,
      professionalYogaRelated: null,
    },
    voiceGuide: {
      intro: [
        { at: 0, text: '胸式呼吸を始めます。肩の力を抜いて、楽な姿勢をとりましょう。' },
      ],
      completion: [
        { at: 0, text: 'お疲れさまでした。' },
      ],
    },
    status: 'active',
  },
  {
    id: 'test-breathwork',
    nameJa: 'テスト呼吸法',
    nameSanskrit: 'TestPranayama',
    nameEn: 'Test Breathwork',
    category: 'pranayama',
    defaultDurationMin: 2,
    visual: {
      type: 'static',
      asset: '/pose-abdominal-breathing.webp',
    },
    instructions: {
      intro: [
        '楽な姿勢で座る',
        '自然な呼吸を続ける',
      ],
      firstRound: [
        '肩の力を抜きましょう',
        '鼻からゆっくり吸います',
      ],
      repeatRound: [
        'もう一度、ゆっくり吸います',
        'ゆっくり吐きます',
      ],
      completion: [
        'お疲れさまでした',
      ],
    },
    breathing: {
      recommendNasalBreathing: true,
      nasalCue: '苦しくなければ、鼻からゆっくり吸って、鼻から吐きます。',
    },
    safety: {
      beginnerFriendly: true,
      gentleAllowed: true,
    },
    knowledge: {
      verified: false,
      professionalYogaRelated: null,
    },
    voiceGuide: {
      intro: [
        { at: 0, text: 'テスト呼吸法を始めます。' },
      ],
      completion: [
        { at: 0, text: 'お疲れさまでした。' },
      ],
    },
    status: 'draft',
  },
];

const BW_BY_ID: Record<string, BreathworkCatalogEntry> = {};
const BW_BY_NAME: Record<string, BreathworkCatalogEntry> = {};

for (const entry of BREATHWORK_CATALOG) {
  BW_BY_ID[entry.id] = entry;
  BW_BY_NAME[entry.nameJa] = entry;
}

export function getBreathworkEntry(id: string): BreathworkCatalogEntry | undefined {
  return BW_BY_ID[id];
}

export function getBreathworkEntryByName(name: string): BreathworkCatalogEntry | undefined {
  return BW_BY_NAME[name];
}

export function getActiveBreathwork(): BreathworkCatalogEntry[] {
  return BREATHWORK_CATALOG.filter((e) => e.status === 'active');
}

export function getPlannerBreathwork(gentle: boolean): BreathworkCatalogEntry[] {
  return BREATHWORK_CATALOG.filter((e) => {
    if (e.status !== 'active' && e.status !== 'draft') return false;
    if (gentle && !e.safety.gentleAllowed) return false;
    return true;
  });
}

export function hasBreathworkPattern(id: string): boolean {
  const entry = BW_BY_ID[id];
  return !!entry?.pattern;
}

export function getBreathworkPattern(id: string): BreathworkPattern | undefined {
  return BW_BY_ID[id]?.pattern;
}

export function getBreathworkPhaseCues(id: string): Record<string, string> | undefined {
  return BW_BY_ID[id]?.voiceGuide.phaseCues;
}
