import type { KnowledgeLink } from './poseCatalog';

export type SequenceCategory = 'surya_namaskar' | 'asana_sequence' | 'other';
export type SequenceLevel = 'beginner' | 'experienced' | 'advanced';
export type SequenceStatus = 'active' | 'draft' | 'review_required';
export type SequenceBreathing = 'inhale' | 'exhale' | 'normal' | 'hold' | 'transition';

export interface SequenceStep {
  stepNumber: number;
  poseId?: string;
  nameJa: string;
  nameSanskrit?: string;
  instruction: string[];
  breathing: SequenceBreathing;
  voiceGuide: string[];
  image?: string;
  knowledgeRef?: string;
}

export interface SequenceKnowledge {
  sourceTitle: string;
  verified: boolean;
  officialReference?: string;
}

export interface SequenceCatalogEntry {
  id: string;
  nameJa: string;
  nameEn: string;
  category: SequenceCategory;
  level: SequenceLevel;
  description: string;
  steps: SequenceStep[];
  defaultRounds: number;
  knowledge: SequenceKnowledge;
  status: SequenceStatus;
}

export const SEQUENCE_CATALOG: SequenceCatalogEntry[] = [
  {
    id: 'surya-namaskar-ayush',
    nameJa: 'インド政府AYUSH省 公認 太陽礼拝',
    nameEn: 'Government of India AYUSH Certified Surya Namaskar',
    category: 'surya_namaskar',
    level: 'experienced',
    description: '12ステップを呼吸とともに流れるようにつなぐ代表的なヨガシークエンスです。',
    defaultRounds: 1,
    knowledge: {
      sourceTitle: '第9章「スーリヤ・ナマスカーラとアーサナ」',
      verified: true,
      officialReference: 'Yoga Certification Board / Ministry of AYUSH',
    },
    status: 'active',
    steps: [
      {
        stepNumber: 1,
        nameJa: 'プラナーマーサナ',
        nameSanskrit: 'Pranamasana',
        instruction: ['マットの端に立ち、両手を胸の前で合掌する。'],
        breathing: 'normal',
        voiceGuide: ['プラナーマーサナ。自然な呼吸で合掌します。'],
        image: '/surya-namaskar/01-pranamasana.webp',
      },
      {
        stepNumber: 2,
        nameJa: 'ハストーッターナーサナ',
        nameSanskrit: 'Hastottanasana',
        instruction: ['合掌した手を頭上へ上げ、無理のない範囲で上体を後方へ伸ばす。'],
        breathing: 'inhale',
        voiceGuide: ['ハストーッターナーサナ。吸いながら、両腕を頭上へ伸ばします。'],
        image: '/surya-namaskar/02-hastottanasana.webp',
      },
      {
        stepNumber: 3,
        nameJa: 'パーダハスターサナ',
        nameSanskrit: 'Padahastasana',
        instruction: ['上体を前へ倒す。初心者は無理に膝を伸ばし切らなくてよい。'],
        breathing: 'exhale',
        voiceGuide: ['パーダハスターサナ。吐きながら、上体を前へ倒します。'],
        image: '/surya-namaskar/03-padahastasana.webp',
      },
      {
        stepNumber: 4,
        nameJa: 'アシュヴァ・サンチャラナーサナ',
        nameSanskrit: 'Ashva Sanchalanasana',
        instruction: ['片脚を後方へ引き、後ろの膝を床へ下ろす。'],
        breathing: 'inhale',
        voiceGuide: ['アシュヴァ・サンチャラナーサナ。吸いながら、片脚を後方へ引きます。'],
        image: '/surya-namaskar/04-ashva-sanchalanasana.webp',
      },
      {
        stepNumber: 5,
        nameJa: 'パルヴァターサナ',
        nameSanskrit: 'Parvatasana',
        instruction: ['腰と尾骨を上げ、身体を逆V字にする。'],
        breathing: 'exhale',
        voiceGuide: ['パルヴァターサナ。吐きながら、腰を上げて逆V字になります。'],
        image: '/surya-namaskar/05-parvatasana.webp',
      },
      {
        stepNumber: 6,
        nameJa: 'アシュタンガーサナ',
        nameSanskrit: 'Ashtanga Namaskara',
        instruction: ['両つま先、両膝、両手、胸、顎を床へ近づける。'],
        breathing: 'hold',
        voiceGuide: ['アシュタンガーサナ。両つま先、両膝、両手、胸、顎を床へ近づけます。'],
        image: '/surya-namaskar/06-ashtanga-namaskara.webp',
      },
      {
        stepNumber: 7,
        nameJa: 'ブジャンガーサナ',
        nameSanskrit: 'Bhujangasana',
        instruction: ['頭と上体をゆっくり起こし、無理のない範囲で背骨を後方へ伸ばす。'],
        breathing: 'inhale',
        voiceGuide: ['ブジャンガーサナ。吸いながら、上体をゆっくり起こします。'],
        image: '/surya-namaskar/07-bhujangasana.webp',
      },
      {
        stepNumber: 8,
        nameJa: 'パルヴァターサナ',
        nameSanskrit: 'Parvatasana',
        instruction: ['再び逆V字へ戻る。'],
        breathing: 'exhale',
        voiceGuide: ['パルヴァターサナ。吐きながら、再び逆V字へ戻ります。'],
        image: '/surya-namaskar/08-parvatasana.webp',
      },
      {
        stepNumber: 9,
        nameJa: 'アシュヴァ・サンチャラナーサナ（反対側）',
        nameSanskrit: 'Ashva Sanchalanasana',
        instruction: ['反対側の脚を前へ出す。'],
        breathing: 'inhale',
        voiceGuide: ['反対側のアシュヴァ・サンチャラナーサナ。吸いながら、反対側の脚を前へ出します。'],
        image: '/surya-namaskar/09-ashva-sanchalanasana.webp',
      },
      {
        stepNumber: 10,
        nameJa: 'パーダハスターサナ',
        nameSanskrit: 'Padahastasana',
        instruction: ['前屈へ戻る。'],
        breathing: 'exhale',
        voiceGuide: ['パーダハスターサナ。吐きながら、前屈へ戻ります。'],
        image: '/surya-namaskar/10-padahastasana.webp',
      },
      {
        stepNumber: 11,
        nameJa: 'ハストーッターナーサナ',
        nameSanskrit: 'Hastottanasana',
        instruction: ['両腕を頭上へ上げ、上体を伸ばす。'],
        breathing: 'inhale',
        voiceGuide: ['ハストーッターナーサナ。吸いながら、両腕を頭上へ伸ばします。'],
        image: '/surya-namaskar/11-hastottanasana.webp',
      },
      {
        stepNumber: 12,
        nameJa: 'プラナーマーサナ',
        nameSanskrit: 'Pranamasana',
        instruction: ['合掌し、開始姿勢へ戻る。'],
        breathing: 'normal',
        voiceGuide: ['プラナーマーサナ。自然な呼吸で、開始姿勢へ戻ります。'],
        image: '/surya-namaskar/12-pranamasana.webp',
      },
    ],
  },
];

export function getSequenceEntry(id: string): SequenceCatalogEntry | undefined {
  return SEQUENCE_CATALOG.find((s) => s.id === id);
}

export function getActiveSequences(): SequenceCatalogEntry[] {
  return SEQUENCE_CATALOG.filter((s) => s.status === 'active');
}

export function getPlannerSequences(): SequenceCatalogEntry[] {
  return SEQUENCE_CATALOG.filter((s) => s.status === 'active');
}
