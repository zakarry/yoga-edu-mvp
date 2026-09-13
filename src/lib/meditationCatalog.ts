import type { KnowledgeLink } from './poseCatalog';
import susokukanNarration from './susokukanNarration.json';

export type MeditationCategory = 'concentration' | 'mindfulness' | 'other';
export type MeditationStatus = 'active' | 'draft' | 'review_required';
export type MeditationVisualType = 'minimal' | 'breathing' | 'focus' | 'static';

export interface MeditationTimelineEvent {
  atSec: number;
  type: 'voice' | 'silence' | 'subtitle' | 'complete';
  text?: string;
  audioKey?: string;
  durationSec?: number;
}

export interface MeditationVisual {
  type: MeditationVisualType;
  asset?: string;
}

export interface MeditationKnowledge {
  knowledgeEntryId?: string | null;
  verified: boolean;
  professionalYogaRelated: true | false | null;
}

export interface MeditationCatalogEntry {
  id: string;
  nameJa: string;
  nameEn?: string;
  category: MeditationCategory;
  tradition?: string;
  durationSec: number;
  description: string;
  timeline: MeditationTimelineEvent[];
  visual?: MeditationVisual;
  knowledge: MeditationKnowledge;
  status: MeditationStatus;
}

export const MEDITATION_CATALOG: MeditationCatalogEntry[] = [
  {
    id: 'susokukan-5min',
    nameJa: '数息観',
    nameEn: 'Susokukan (Breath Counting Meditation)',
    category: 'concentration',
    tradition: '禅Yoga',
    durationSec: 300,
    description: '呼吸を数えることに意識を集中する5分間の集中瞑想。',
    timeline: [
      // Captions are measured against one complete 50-second narration file.
      ...susokukanNarration.map(cue => ({ ...cue, type: 'voice' as const })),
      { atSec: 50, type: 'silence', durationSec: 250, text: '呼吸を数えながら、静寂の時間を過ごします' },
      { atSec: 300, type: 'complete', text: 'お疲れさまでした' },
    ],
    visual: { type: 'minimal' },
    knowledge: {
      knowledgeEntryId: null,
      verified: false,
      professionalYogaRelated: null,
    },
    status: 'active',
  },
  {
    id: 'mindfulness-5min',
    nameJa: 'マインドフルネス瞑想',
    nameEn: 'Mindfulness Meditation',
    category: 'mindfulness',
    durationSec: 300,
    description: '今ここにある呼吸や身体感覚に意識を向ける5分間の瞑想。',
    timeline: [
      { atSec: 0, type: 'voice', text: '楽な姿勢で座り、肩の力を抜いていきましょう。', audioKey: 'voice-mindfulness-1' },
      { atSec: 7, type: 'voice', text: '目は閉じるか、うつむき加減にします。', audioKey: 'voice-mindfulness-2' },
      { atSec: 13, type: 'voice', text: '考えるのをやめて、感じる。', audioKey: 'voice-mindfulness-3' },
      { atSec: 18, type: 'voice', text: '今ここにある、身体の感覚にただ意識を向けていきます。', audioKey: 'voice-mindfulness-4' },
      { atSec: 26, type: 'silence', durationSec: 10 },
      { atSec: 36, type: 'voice', text: '鼻から吸って、鼻からはいて。', audioKey: 'voice-mindfulness-5' },
      { atSec: 42, type: 'voice', text: '無理にコントロールしようとせず、今の自然な呼吸を繰り返します。', audioKey: 'voice-mindfulness-6' },
      { atSec: 50, type: 'voice', text: '理由も目的も考えない。', audioKey: 'voice-mindfulness-7' },
      { atSec: 55, type: 'voice', text: '善い悪いの評価もしない、好き嫌いの判断もしない。', audioKey: 'voice-mindfulness-8' },
      { atSec: 62, type: 'voice', text: 'ただ、出入りする息の感覚を見つめていきます。', audioKey: 'voice-mindfulness-9' },
      { atSec: 70, type: 'silence', durationSec: 10 },
      { atSec: 80, type: 'voice', text: '評価をするのをやめて、受け入れて受け流す。', audioKey: 'voice-mindfulness-10' },
      { atSec: 86, type: 'voice', text: 'もし途中で、何か考えや雑念が浮かんできたら、', audioKey: 'voice-mindfulness-11' },
      { atSec: 92, type: 'voice', text: '頭に浮かんだものをそのまま受け入れて、流してください。', audioKey: 'voice-mindfulness-12' },
      { atSec: 100, type: 'voice', text: '流していったら、また淡々と、鼻呼吸の感覚に戻ります。', audioKey: 'voice-mindfulness-13' },
      { atSec: 108, type: 'silence', durationSec: 15 },
      { atSec: 123, type: 'voice', text: '吸う息、吐く息を通じて、この空間の空気と自分の身体が地続きになっていきます。', audioKey: 'voice-mindfulness-14' },
      { atSec: 133, type: 'voice', text: '自分が自然と一体化していく感覚を楽しみましょう。', audioKey: 'voice-mindfulness-15' },
      { atSec: 140, type: 'voice', text: '何かをしようとせず、ただ、環境の中に身を委ねておきます。', audioKey: 'voice-mindfulness-16' },
      { atSec: 148, type: 'silence', durationSec: 132, text: '今ここにある感覚に意識を向けます' },
      { atSec: 280, type: 'voice', text: 'まもなく、5分間の時間が終わります。', audioKey: 'voice-mindfulness-end-1' },
      { atSec: 285, type: 'voice', text: 'ゆっくりと手先や足先を動かし、ご自身の身体に意識を戻していきます。', audioKey: 'voice-mindfulness-end-2' },
      { atSec: 295, type: 'voice', text: '準備ができたら、ゆっくりと目を開けてください。', audioKey: 'voice-mindfulness-end-3' },
      { atSec: 300, type: 'complete', text: 'お疲れさまでした' },
    ],
    visual: { type: 'minimal' },
    knowledge: {
      knowledgeEntryId: null,
      verified: true,
      professionalYogaRelated: false,
    },
    status: 'active',
  },
];

export function getMeditationEntry(id: string): MeditationCatalogEntry | undefined {
  return MEDITATION_CATALOG.find((e) => e.id === id);
}

export function getActiveMeditations(): MeditationCatalogEntry[] {
  return MEDITATION_CATALOG.filter((e) => e.status === 'active');
}

export function getPlannerMeditations(): MeditationCatalogEntry[] {
  return MEDITATION_CATALOG.filter((e) => e.status === 'active');
}
