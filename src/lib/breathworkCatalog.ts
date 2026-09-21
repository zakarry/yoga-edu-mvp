import type { VoiceCueDef, KnowledgeLink } from './poseCatalog';

export type BreathworkVisualType =
  | 'static'
  | 'circle'
  | 'phase_animation'
  | 'body_breathing'
  | 'layered_breathing'
  | 'gif';
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
  bodyFocus?: 'belly' | 'chest' | 'clavicle';
  layers?: ('belly' | 'chest' | 'clavicle')[];
  handPlacement?: ('belly' | 'lower_ribs' | 'chest' | 'clavicle')[];
  highlightZones?: ('belly' | 'chest' | 'clavicle')[];
  arrowDirection?: {
    inhale?: string[];
    exhale?: string[];
  };
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
  phaseAudioKeys?: Record<string, string>;
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
      highlightZones: ['belly'],
      arrowDirection: {
        inhale: ['expand'],
        exhale: ['contract'],
      },
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
        { at: 0, text: 'Box Breathingを始めます。4秒吸って、4秒止めて、4秒吐いて、4秒止めます。', audioKey: 'voice-box-intro' },
        { at: 5, text: '無理のない範囲で行いましょう。', audioKey: 'voice-box-intro-2' },
      ],
      phaseCues: {
        '吸う': '鼻からゆっくり吸います。',
        '止める': '息を止めます。',
        '吐く': '鼻からゆっくり吐きます。',
      },
      phaseAudioKeys: {
        '吸う': 'voice-box-inhale',
        '止める': 'voice-box-hold',
        '吐く': 'voice-box-exhale',
        'hold-in': 'voice-box-hold',
        'hold-out': 'voice-box-hold2',
      },
      repeatCues: [
        { at: 0, text: '鼻からゆっくり吸います。' },
        { at: 4, text: '息を止めます。' },
        { at: 8, text: '鼻からゆっくり吐きます。' },
        { at: 12, text: '息を止めます。' },
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
    pattern: {
      inhaleSec: 4,
      holdAfterInhaleSec: 0,
      exhaleSec: 6,
      holdAfterExhaleSec: 0,
      rounds: 6,
    },
    visual: {
      type: 'body_breathing',
      bodyFocus: 'belly',
      handPlacement: ['belly'],
      highlightZones: ['belly'],
      arrowDirection: {
        inhale: ['out'],
        exhale: ['in'],
      },
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
        { at: 0, text: '腹式呼吸を始めます。肩の力を抜いて、楽な姿勢をとりましょう。', audioKey: 'voice-abdominal-intro-1' },
        { at: 6, text: '苦しくなければ、鼻からゆっくり吸います。', audioKey: 'voice-abdominal-intro-2' },
        { at: 12, text: 'お腹がやさしく広がる感覚を感じます。', audioKey: 'voice-abdominal-intro-3' },
        { at: 18, text: '鼻からゆっくり吐いて、お腹がやさしく戻ります。', audioKey: 'voice-abdominal-intro-4' },
      ],
      phaseCues: {
        '吸う': '鼻からゆっくり吸います。',
        '吐く': '鼻からゆっくり吐いて、力を抜きます。',
      },
      phaseAudioKeys: {
        '吸う': 'voice-abdominal-r1',
        '吐く': 'voice-abdominal-r2',
      },
      repeatCues: [
        { at: 0, text: 'もう一度、鼻からゆっくり吸います。' },
        { at: 6, text: 'お腹の広がりを感じましょう。' },
        { at: 12, text: '鼻からゆっくり吐いて、力を抜きます。' },
      ],
      completion: [
        { at: 0, text: '最後の呼吸です。' },
        { at: 3, text: '自然な呼吸に戻しましょう。' },
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
    pattern: {
      inhaleSec: 4,
      holdAfterInhaleSec: 0,
      exhaleSec: 6,
      holdAfterExhaleSec: 0,
      rounds: 6,
    },
    visual: {
      type: 'body_breathing',
      bodyFocus: 'chest',
      handPlacement: ['lower_ribs'],
      highlightZones: ['chest'],
      arrowDirection: {
        inhale: ['out', 'front'],
        exhale: ['in'],
      },
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
        { at: 0, text: '胸式呼吸を始めます。肩の力を抜いて、楽な姿勢をとりましょう。', audioKey: 'voice-thoracic-intro-1' },
        { at: 6, text: '苦しくなければ、鼻からゆっくり吸います。', audioKey: 'voice-thoracic-intro-2' },
        { at: 12, text: '胸郭が前後左右にやさしく広がる感覚を感じます。', audioKey: 'voice-thoracic-intro-3' },
        { at: 18, text: '鼻からゆっくり吐いて、胸郭が自然に戻るのを感じます。', audioKey: 'voice-thoracic-intro-4' },
      ],
      phaseCues: {
        '吸う': '鼻からゆっくり吸います。',
        '吐く': '鼻からゆっくり吐いて、力を抜きます。',
      },
      phaseAudioKeys: {
        '吸う': 'voice-thoracic-r1',
        '吐く': 'voice-thoracic-r2',
      },
      repeatCues: [
        { at: 0, text: 'もう一度、鼻からゆっくり吸います。' },
        { at: 6, text: '胸の広がりを感じましょう。' },
        { at: 12, text: '鼻からゆっくり吐いて、力を抜きます。' },
      ],
      completion: [
        { at: 0, text: '最後の呼吸です。' },
        { at: 3, text: '自然な呼吸に戻しましょう。' },
      ],
    },
    status: 'active',
  },
  {
    id: 'complete-yoga-breathing',
    nameJa: '完全なヨガ呼吸',
    nameSanskrit: 'Dirgha Pranayama',
    nameEn: 'Complete Yoga Breathing',
    category: 'pranayama',
    defaultDurationMin: 3,
    pattern: {
      inhaleSec: 6,
      holdAfterInhaleSec: 0,
      exhaleSec: 8,
      holdAfterExhaleSec: 0,
      rounds: 4,
    },
    visual: {
      type: 'layered_breathing',
      layers: ['belly', 'chest', 'clavicle'],
      handPlacement: ['belly', 'chest'],
      highlightZones: ['belly', 'chest', 'clavicle'],
      arrowDirection: {
        inhale: ['up'],
        exhale: ['down'],
      },
    },
    instructions: {
      intro: [
        '楽な姿勢で座るか仰向けになる',
        '鼻から吸い、お腹→胸→鎖骨の順に膨らませる。ゆっくり鼻から吐き、上から順に戻す',
      ],
      firstRound: [
        '肩の力を抜きましょう',
        '苦しくなければ、鼻からゆっくり吸って、鼻から吐きます',
        'まずお腹を膨らませ、次に胸郭を広げ、最後に鎖骨周りも少し広げます',
        'ゆっくり吐いて、上から順に戻します',
      ],
      repeatRound: [
        'もう一度、お腹から胸、鎖骨の順に吸います',
        'ゆっくり吐いて、上から順に戻しましょう',
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
      knowledgeMasterId: 'YK-0313',
      zukanSlug: 'yk-0313',
      verified: true,
      professionalYogaRelated: null,
    },
    voiceGuide: {
      intro: [
        { at: 0, text: '完全なヨガ呼吸を始めます。', audioKey: 'voice-start-complete-breathing' },
        { at: 5, text: '肩の力を抜きましょう。', audioKey: 'voice-relax-shoulders' },
        { at: 15, text: '苦しくなければ、鼻からゆっくり吸って、鼻から吐きます。', audioKey: 'voice-nose-breath' },
        { at: 25, text: 'まずお腹を膨らませ、次に胸郭を広げ、最後に鎖骨周りも少し広げます。', audioKey: 'voice-complete-breathing-3' },
        { at: 40, text: 'ゆっくり吐いて、上から順に戻します。', audioKey: 'voice-complete-breathing-4' },
      ],
      repeatCues: [
        { at: 0, text: 'お腹から胸、鎖骨の順に吸います。' },
        { at: 10, text: 'ゆっくり吐いて、上から順に戻します。' },
      ],
      completion: [
        { at: 0, text: 'お疲れさまでした。自然な呼吸に戻しましょう。' },
      ],
    },
    status: 'active',
  },
  {
    id: 'brahmari',
    nameJa: 'ブラーマリー（ハチの呼吸）',
    nameSanskrit: 'Bhramari Pranayama',
    nameEn: 'Bhramari (Bee Breath)',
    aliases: ['ハチの呼吸', 'ブラマリ', 'ブラーマリ', 'Bhramari'],
    category: 'pranayama',
    defaultDurationMin: 1,
    pattern: {
      inhaleSec: 4,
      holdAfterInhaleSec: 0,
      exhaleSec: 8,
      holdAfterExhaleSec: 0,
      rounds: 3,
    },
    visual: {
      type: 'body_breathing',
      bodyFocus: 'chest',
    },
    instructions: {
      intro: [
        '楽な姿勢で座り、肩の力を抜きます',
        '鼻からゆっくり息を吸います',
        '息を吐きながら、無理のない範囲で小さくハミングするようにやさしく音を響かせます',
        '苦しくない範囲で繰り返しましょう',
      ],
      firstRound: [
        '肩の力を抜きましょう',
        '鼻からゆっくり吸います',
        '吐きながら、やさしくハミングします',
        '音の振動を頭や顔まわりで感じましょう',
      ],
      repeatRound: [
        'もう一度、鼻からゆっくり吸います',
        '吐きながら、やさしく音を響かせます',
      ],
      completion: [
        'お疲れさまでした',
        '自然な呼吸に戻しましょう',
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
        { at: 0, text: 'ブラーマリー（ハチの呼吸）を始めます。楽な姿勢で座り、肩の力を抜きましょう。', audioKey: 'voice-bhramari-intro' },
        { at: 19, text: '鼻からゆっくり息を吸います。', audioKey: 'voice-bhramari-inhale' },
        { at: 27, text: '息を吐きながら、無理のない範囲で小さくハミングするようにやさしく音を響かせます。', audioKey: 'voice-bhramari-hum' },
        { at: 45, text: '苦しくない範囲で繰り返しましょう。', audioKey: 'voice-bhramari-repeat' },
      ],
      phaseCues: {
        '吸う': '鼻からゆっくり吸います。',
        '吐く': 'やさしくハミングしながら吐きます。',
      },
      repeatCues: [
        { at: 0, text: 'もう一度、鼻からゆっくり吸います。', audioKey: 'voice-bhramari-r1' },
        { at: 9, text: '吐きながら、やさしく音を響かせます。', audioKey: 'voice-bhramari-r2' },
      ],
      completion: [
        { at: 0, text: '最後の呼吸です。', audioKey: 'voice-bhramari-end' },
        { at: 6, text: '自然な呼吸に戻しましょう。', audioKey: 'voice-bhramari-outro' },
      ],
    },
    status: 'active',
  },
  {
    id: 'anuloma-viloma',
    nameJa: 'ナディー・ショーダナ',
    nameSanskrit: 'Nadi Shodhana',
    nameEn: 'Alternate Nostril Breathing',
    aliases: ['アヌローマ・ヴィローマ', 'Anuloma Viloma', '片鼻呼吸', 'ナーディー・ショーダナ'],
    category: 'pranayama',
    defaultDurationMin: 3,
    pattern: {
      inhaleSec: 4,
      holdAfterInhaleSec: 0,
      exhaleSec: 6,
      holdAfterExhaleSec: 0,
      rounds: 6,
    },
    visual: {
      type: 'body_breathing',
      bodyFocus: 'chest',
    },
    instructions: {
      intro: [
        '楽な姿勢で座り、肩の力を抜きます',
        '右手の親指で右の鼻を閉じ、左の鼻からゆっくり吸います',
        '親指を離し、薬指で左の鼻を閉じ、右の鼻からゆっくり吐きます',
        '右の鼻から吸い、左の鼻から吐く。これを交互に繰り返します',
      ],
      firstRound: [
        '肩の力を抜きましょう',
        '右の鼻を閉じて、左の鼻からゆっくり吸います',
        '左の鼻を閉じて、右の鼻からゆっくり吐きます',
        '無理のない範囲で続けましょう',
      ],
      repeatRound: [
        'もう一度、左の鼻から吸います',
        '右の鼻からゆっくり吐きます',
      ],
      completion: [
        'お疲れさまでした',
        '自然な呼吸に戻しましょう',
      ],
    },
    breathing: {
      recommendNasalBreathing: true,
      nasalCue: '左右の鼻を交互に使い、鼻からゆっくり吸って、鼻から吐きます。',
    },
    safety: {
      beginnerFriendly: true,
      gentleAllowed: true,
    },
    knowledge: {
      knowledgeMasterId: 'YK-0285',
      zukanSlug: 'yk-0285',
      verified: true,
      professionalYogaRelated: null,
    },
    voiceGuide: {
      intro: [
        { at: 0, text: 'ナディー・ショーダナを始めます。楽な姿勢で座り、肩の力を抜きましょう。', audioKey: 'voice-nadi-intro' },
        { at: 17, text: '右の親指で右の鼻を閉じ、左の鼻から息を吸います。', audioKey: 'voice-nadi-1-close-right-inhale-left' },
        { at: 30, text: '次に、小指と薬指で左の鼻を閉じ、親指をはなし、右の鼻から息を吐きます。', audioKey: 'voice-nadi-2-switch-exhale-right' },
        { at: 49, text: 'そのまま右の鼻で息を吸います。', audioKey: 'voice-nadi-3-inhale-right' },
        { at: 57, text: '吸いきったら親指で右の鼻を閉じ、小指と薬指をはなし、左の鼻から吐きます。', audioKey: 'voice-nadi-4-switch-exhale-left' },
        { at: 75, text: 'そのまま左の鼻から息を吸います。', audioKey: 'voice-nadi-5-inhale-left' },
        { at: 84, text: '吸い終わったら指を入れ替えて、息を吐く動きを繰り返します。', audioKey: 'voice-nadi-6-repeat-switch' },
      ],
      phaseCues: {
        '吸う': 'ゆっくり鼻から吸います。',
        '吐く': 'ゆっくり鼻から吐きます。',
      },
      phaseAudioKeys: {
        '吸う': 'voice-nadi-r-inhale-left',
        '吐く': 'voice-nadi-r-exhale-left',
      },
      repeatCues: [
        { at: 0, text: '今の流れのまま、片鼻での呼吸を交互に繰り返します。', audioKey: 'voice-nadi-repeat-guide' },
        { at: 30, text: '無理のない範囲で、ゆっくり続けましょう。', audioKey: 'voice-nadi-continue' },
      ],
      completion: [
        { at: 0, text: '最後の呼吸です。', audioKey: 'voice-nadi-end' },
        { at: 6, text: '自然な呼吸に戻しましょう。', audioKey: 'voice-nadi-outro' },
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
