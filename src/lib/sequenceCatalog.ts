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
  audioKey?: string;
  audioKeyLeft?: string;
  instructionLeft?: string[];
  voiceGuideLeft?: string[];
  image?: string;
  imageLeft?: string;
  mirrorImageLeft?: boolean;
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
        voiceGuide: ['プラナーマーサナ。胸の前で合掌します。'],
        audioKey: 'voice-surya-01',
        image: '/surya-namaskar/01-pranamasana.webp',
      },
      {
        stepNumber: 2,
        nameJa: 'ハストーッターナーサナ',
        nameSanskrit: 'Hastottanasana',
        instruction: ['合掌した手を頭上へ上げ、無理のない範囲で上体を後方へ伸ばす。'],
        breathing: 'inhale',
        voiceGuide: ['吸いながら、両腕を頭上へ伸ばします。'],
        audioKey: 'voice-surya-02',
        image: '/surya-namaskar/02-hastottanasana.webp',
      },
      {
        stepNumber: 3,
        nameJa: 'パーダハスターサナ',
        nameSanskrit: 'Padahastasana',
        instruction: ['上体を前へ倒す。初心者は無理に膝を伸ばし切らなくてよい。'],
        breathing: 'exhale',
        voiceGuide: ['吐きながら、上体を前へ倒します。'],
        audioKey: 'voice-surya-03',
        image: '/surya-namaskar/03-padahastasana.webp',
      },
      {
        stepNumber: 4,
        nameJa: 'アシュヴァ・サンチャラナーサナ',
        nameSanskrit: 'Ashva Sanchalanasana',
        instruction: ['右脚を後方へ引き、右膝を床へ下ろす。'],
        instructionLeft: ['左脚を後方へ引き、左膝を床へ下ろす。'],
        breathing: 'inhale',
        voiceGuide: ['吸いながら、右脚を後ろへ引き、右膝を床につきます。'],
        voiceGuideLeft: ['吸いながら、左脚を後ろへ引き、左膝を床につきます。'],
        audioKey: 'voice-surya-04-right',
        audioKeyLeft: 'voice-surya-04-left',
        image: '/surya-namaskar/04-ashva-sanchalanasana.webp',
        mirrorImageLeft: true,
      },
      {
        stepNumber: 5,
        nameJa: 'パルヴァターサナ',
        nameSanskrit: 'Parvatasana',
        instruction: ['腰と尾骨を上げ、身体を逆V字にする。'],
        breathing: 'exhale',
        voiceGuide: ['吐きながら、腰を持ち上げます。'],
        audioKey: 'voice-surya-05',
        image: '/surya-namaskar/05-parvatasana.webp',
      },
      {
        stepNumber: 6,
        nameJa: 'アシュタンガーサナ',
        nameSanskrit: 'Ashtanga Namaskara',
        instruction: ['両つま先、両膝、両手、胸、顎を床へ近づける。'],
        breathing: 'hold',
        voiceGuide: ['ゆっくり身体を下ろします。'],
        audioKey: 'voice-surya-06',
        image: '/surya-namaskar/06-ashtanga-namaskara.webp',
      },
      {
        stepNumber: 7,
        nameJa: 'ブジャンガーサナ',
        nameSanskrit: 'Bhujangasana',
        instruction: ['頭と上体をゆっくり起こし、無理のない範囲で背骨を後方へ伸ばす。'],
        breathing: 'inhale',
        voiceGuide: ['吸いながら、胸を起こします。'],
        audioKey: 'voice-surya-07',
        image: '/surya-namaskar/07-bhujangasana.webp',
      },
      {
        stepNumber: 8,
        nameJa: 'パルヴァターサナ',
        nameSanskrit: 'Parvatasana',
        instruction: ['再び逆V字へ戻る。'],
        breathing: 'exhale',
        voiceGuide: ['吐きながら、腰を持ち上げます。'],
        audioKey: 'voice-surya-08',
        image: '/surya-namaskar/08-parvatasana.webp',
      },
      {
        stepNumber: 9,
        nameJa: 'アシュヴァ・サンチャラナーサナ（反対側）',
        nameSanskrit: 'Ashva Sanchalanasana',
        instruction: ['右脚を両手の間へ踏み込み、左膝を床へ下ろす。'],
        instructionLeft: ['左脚を両手の間へ踏み込み、右膝を床へ下ろす。'],
        breathing: 'inhale',
        voiceGuide: ['吸いながら、右脚を両手の間へ踏み込み、左膝を床につきます。'],
        voiceGuideLeft: ['吸いながら、左脚を両手の間へ踏み込み、右膝を床につきます。'],
        audioKey: 'voice-surya-09-right',
        audioKeyLeft: 'voice-surya-09-left',
        image: '/surya-namaskar/09-ashva-sanchalanasana.webp',
        mirrorImageLeft: true,
      },
      {
        stepNumber: 10,
        nameJa: 'パーダハスターサナ',
        nameSanskrit: 'Padahastasana',
        instruction: ['前屈へ戻る。'],
        breathing: 'exhale',
        voiceGuide: ['吐きながら、上体を前へ倒します。'],
        audioKey: 'voice-surya-10',
        image: '/surya-namaskar/10-padahastasana.webp',
      },
      {
        stepNumber: 11,
        nameJa: 'ハストーッターナーサナ',
        nameSanskrit: 'Hastottanasana',
        instruction: ['両腕を頭上へ上げ、上体を伸ばす。'],
        breathing: 'inhale',
        voiceGuide: ['吸いながら、両腕を頭上へ伸ばします。'],
        audioKey: 'voice-surya-11',
        image: '/surya-namaskar/11-hastottanasana.webp',
      },
      {
        stepNumber: 12,
        nameJa: 'プラナーマーサナ',
        nameSanskrit: 'Pranamasana',
        instruction: ['合掌し、開始姿勢へ戻る。'],
        breathing: 'normal',
        voiceGuide: ['自然な呼吸に戻り、胸の前で合掌します。'],
        audioKey: 'voice-surya-12',
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
