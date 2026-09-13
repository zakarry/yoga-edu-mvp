import type { PoseStage } from './poseLibrary';
import type { BreathworkCatalogEntry } from './breathworkCatalog';
import { BREATHWORK_CATALOG, getPlannerBreathwork } from './breathworkCatalog';
import { getPlannerMeditations, type MeditationCatalogEntry } from './meditationCatalog';

export type PoseType = 'asana' | 'pranayama' | 'dhyana';
export type PoseIntensity = 'low' | 'medium' | 'high';
export type PoseTransitionComplexity = 'low' | 'medium' | 'high';
export type PoseStatus = 'active' | 'draft' | 'review_required';

export interface VoiceCueDef {
  at: number;
  text: string;
}

export interface VoiceGuideDef {
  intro: string;
  firstRound: VoiceCueDef[];
  secondRound?: VoiceCueDef[];
  breathingCue?: string;
  breathingReminderCue?: string;
  completion?: string;
}

export interface PlannerAttrs {
  beginnerFriendly: boolean;
  gentleAllowed: boolean;
  intensity: PoseIntensity;
  advancedBalance: boolean;
  deepRange: boolean;
  highLoad: boolean;
  transitionComplexity: PoseTransitionComplexity;
}

export interface KnowledgeLink {
  knowledgeEntryId?: string | null;
  knowledgeMasterId?: string | null;
  zukanSlug?: string | null;
  zukanUrl?: string | null;
  verified: boolean;
  professionalYogaRelated: boolean | null;
}

export interface PoseCatalogEntry {
  id: string;
  type: PoseType;
  nameJa: string;
  nameSanskrit?: string;
  nameEn?: string;
  aliases?: string[];
  image?: string;
  stageImages?: string[];
  stages?: PoseStage[];
  defaultDurationMin: number;
  beginnerInstructions: string[];
  breathingInstructions: string[];
  generalCautions: string[];
  voiceGuide: VoiceGuideDef;
  planner: PlannerAttrs;
  knowledge: KnowledgeLink;
  status: PoseStatus;
}

export const POSE_CATALOG: PoseCatalogEntry[] = [
  {
    id: 'tadasana',
    type: 'asana',
    nameJa: '山のポーズ',
    nameSanskrit: 'Tadasana',
    nameEn: 'Mountain Pose',
    image: '/pose-tadasana-v4.webp',
    defaultDurationMin: 1,
    beginnerInstructions: [
      '足を腰幅程度に開き、両足の裏を床にしっかり置いて立つ',
      '背すじを自然に伸ばし、頭頂部を天に向ける。肩の力を抜き、腕を体の脇に垂らす',
    ],
    breathingInstructions: [
      '鼻から自然な呼吸を続ける。息を吸うとき背すじが少し伸びるのを感じる',
    ],
    generalCautions: [
      '膝を反らさず、足首に均等に体重をかける。めまいがあるときは座って行う',
    ],
    voiceGuide: {
      intro: '山のポーズを始めます。',
      firstRound: [
        { at: 5, text: '足裏で床を感じ、自然に立ちます。' },
        { at: 15, text: '背骨を無理なく伸ばし、肩の力を抜きます。' },
        { at: 25, text: '自然な呼吸を続けましょう。' },
      ],
      secondRound: [
        { at: 0, text: '足裏で床を感じ、まっすぐ立ちましょう。' },
        { at: 10, text: '肩の力を抜いて、自然な呼吸を続けます。' },
      ],
      breathingCue: '苦しくなければ、鼻からゆっくり吸って、鼻から吐きます。',
      breathingReminderCue: '呼吸は止めず、無理のない範囲で鼻呼吸を続けましょう。',
      completion: 'お疲れさまでした。',
    },
    planner: {
      beginnerFriendly: true,
      gentleAllowed: true,
      intensity: 'low',
      advancedBalance: false,
      deepRange: false,
      highLoad: false,
      transitionComplexity: 'low',
    },
    knowledge: {
      knowledgeMasterId: 'YK-0264',
      zukanSlug: 'yk-0264',
      verified: true,
      professionalYogaRelated: null,
    },
    status: 'active',
  },
  {
    id: 'vrksasana',
    type: 'asana',
    nameJa: '立ち木のポーズ',
    nameSanskrit: 'Vrksasana',
    nameEn: 'Tree Pose',
    image: '/pose-vrksasana.webp',
    defaultDurationMin: 1,
    beginnerInstructions: [
      '山のポーズで立ち、体重を右足にのせる',
      '左足の裏を右足の内側（ふくらはぎまたは太もも）に当てる。両手を胸の前で合わせる',
    ],
    breathingInstructions: [
      '鼻からゆっくり呼吸。バランスを取りながら呼吸を続ける',
    ],
    generalCautions: [
      '膝には足を直接当てない。バランスが崩れたら一度足をおろして再開する',
    ],
    voiceGuide: {
      intro: '立ち木のポーズを始めます。',
      firstRound: [
        { at: 5, text: '軸足にゆっくり体重を乗せます。' },
        { at: 15, text: '視線を一点に置くと、バランスを取りやすくなります。' },
        { at: 25, text: 'ふらついたら無理せず足を下ろして大丈夫です。' },
      ],
      secondRound: [
        { at: 0, text: 'もう一度、軸足を安定させましょう。' },
        { at: 10, text: '視線を一点に置いて、無理のない範囲で続けます。' },
      ],
      breathingCue: '苦しくなければ、鼻からゆっくり吸って、鼻から吐きます。',
      breathingReminderCue: '呼吸は止めず、無理のない範囲で鼻呼吸を続けましょう。',
      completion: 'お疲れさまでした。',
    },
    planner: {
      beginnerFriendly: true,
      gentleAllowed: false,
      intensity: 'medium',
      advancedBalance: true,
      deepRange: false,
      highLoad: false,
      transitionComplexity: 'medium',
    },
    knowledge: {
      knowledgeMasterId: 'YK-0277',
      zukanSlug: 'yk-0277',
      verified: true,
      professionalYogaRelated: null,
    },
    status: 'active',
  },
  {
    id: 'uttanasana',
    type: 'asana',
    nameJa: 'やさしい前屈',
    nameSanskrit: 'Uttanasana',
    nameEn: 'Standing Forward Bend',
    image: '/pose-uttanasana-stage3.webp',
    stageImages: ['/pose-uttanasana-stage1.webp', '/pose-uttanasana-stage2.webp', '/pose-uttanasana-stage3.webp'],
    stages: [
      { image: '/pose-uttanasana-stage1.webp', label: '段階1：まっすぐ立つ', description: '足を腰幅に開き、背すじを伸ばして立つ。ここからゆっくり始める' },
      { image: '/pose-uttanasana-stage2.webp', label: '段階2：股関節から前に倒す', description: '息を吐きながら股関節からゆっくり前に倒す。膝は少し曲げてもよい' },
      { image: '/pose-uttanasana-stage3.webp', label: '段階3：無理のない位置で止まる', description: '手は床またはすねにおく。床に手をつける必要はない。無理な深さを求めない' },
    ],
    defaultDurationMin: 1,
    beginnerInstructions: [
      '足を腰幅に開いて立つ',
      '息を吐きながら股関節から前に倒す。膝は少し曲げてもよい。手は床またはすねにおく',
    ],
    breathingInstructions: [
      '吐く息で上半身をリラックスさせる。自然な呼吸を続ける',
    ],
    generalCautions: [
      '腰を丸めない。膝を曲げてもよいので無理な深さを求めない。床に手をつける必要はない。めまいがあるときはゆっくり戻る',
    ],
    voiceGuide: {
      intro: 'やさしい前屈を始めます。',
      firstRound: [
        { at: 5, text: '膝は無理に伸ばしきらなくて大丈夫です。' },
        { at: 15, text: '股関節からゆっくり前へ倒します。' },
        { at: 25, text: '床に手をつける必要はありません。無理のない位置で止まりましょう。' },
      ],
      secondRound: [
        { at: 0, text: 'もう一度、膝を楽にしてみましょう。' },
        { at: 10, text: '床に手をつける必要はありません。' },
      ],
      breathingCue: '苦しくなければ、鼻からゆっくり吸って、鼻から吐きます。',
      breathingReminderCue: '呼吸は止めず、無理のない範囲で鼻呼吸を続けましょう。',
      completion: 'お疲れさまでした。',
    },
    planner: {
      beginnerFriendly: true,
      gentleAllowed: false,
      intensity: 'medium',
      advancedBalance: false,
      deepRange: true,
      highLoad: false,
      transitionComplexity: 'medium',
    },
    knowledge: {
      verified: false,
      professionalYogaRelated: null,
    },
    status: 'active',
  },
  {
    id: 'balasana',
    type: 'asana',
    nameJa: 'チャイルドポーズ',
    nameSanskrit: 'Balasana',
    nameEn: "Child's Pose",
    image: '/pose-balasana.webp',
    defaultDurationMin: 2,
    beginnerInstructions: [
      '床に正座し、つま先をそろえてお尻をかかとにのせる',
      '息を吐きながら上半身を前に倒し、額を床におく。腕は前に伸ばすか体の脇におく',
    ],
    breathingInstructions: [
      '鼻からゆっくり呼吸。背中が広がるのを感じる',
    ],
    generalCautions: [
      '膝が痛いときは折り畳んだ毛布を膝のうしろに入れる。食後は避ける',
    ],
    voiceGuide: {
      intro: 'チャイルドポーズを始めます。',
      firstRound: [
        { at: 5, text: 'お尻をかかとの方向へゆっくり下ろします。' },
        { at: 15, text: '背中を広げるように、楽に呼吸しましょう。' },
        { at: 25, text: '苦しくない位置で休みます。' },
      ],
      secondRound: [
        { at: 0, text: 'お尻をかかとに預けて、リラックスしましょう。' },
      ],
      breathingCue: '苦しくなければ、鼻からゆっくり吸って、鼻から吐きます。',
      breathingReminderCue: '呼吸は止めず、無理のない範囲で鼻呼吸を続けましょう。',
      completion: 'お疲れさまでした。',
    },
    planner: {
      beginnerFriendly: true,
      gentleAllowed: true,
      intensity: 'low',
      advancedBalance: false,
      deepRange: false,
      highLoad: false,
      transitionComplexity: 'low',
    },
    knowledge: {
      verified: false,
      professionalYogaRelated: null,
    },
    status: 'active',
  },
  {
    id: 'catcow',
    type: 'asana',
    nameJa: '猫と牛のポーズ',
    nameSanskrit: 'Marjaryasana-Bitilasana',
    nameEn: 'Cat-Cow Pose',
    image: '/pose-cow.webp',
    stageImages: ['/pose-cow.webp', '/pose-cat.webp'],
    stages: [
      { image: '/pose-cow.webp', label: '吸う息：牛のポーズ（Cow）', description: '息を吸いながら胸を開き、背中をやさしく反らせる。お腹は床に向かって下げる。視線は自然に前方へ' },
      { image: '/pose-cat.webp', label: '吐く息：猫のポーズ（Cat）', description: '息を吐きながら背中を丸める。おへそを見る方向で首を無理に曲げない。ゆっくり交互に繰り返す' },
    ],
    defaultDurationMin: 2,
    beginnerInstructions: [
      '四つん這いになる。手のひらを肩の下、膝を腰の下に置く',
      '息を吸いながら背中を反らせ（牛）、息を吐きながら背中を丸める（猫）。ゆっくり交互に',
    ],
    breathingInstructions: [
      '吸う息で反らせ、吐く息で丸める。呼吸と動きを合わせる',
    ],
    generalCautions: [
      '手首が痛いときは拳を作るか前腕をつく。首を無理に動かさない',
    ],
    voiceGuide: {
      intro: '猫と牛のポーズを始めます。',
      firstRound: [
        { at: 5, text: '吸いながら胸を開き、背中をやさしく反らします。' },
        { at: 15, text: '吐きながら背中を丸め、おへそを見るようにします。' },
        { at: 25, text: '首は無理に反らさず、呼吸に合わせてゆっくり動きましょう。' },
      ],
      secondRound: [
        { at: 0, text: 'もう一度、吸いながら胸を開きます。' },
        { at: 10, text: '吐きながら背中を丸めましょう。' },
      ],
      breathingCue: '苦しくなければ、鼻からゆっくり吸って、鼻から吐きます。',
      breathingReminderCue: '呼吸は止めず、無理のない範囲で鼻呼吸を続けましょう。',
      completion: 'お疲れさまでした。',
    },
    planner: {
      beginnerFriendly: true,
      gentleAllowed: true,
      intensity: 'low',
      advancedBalance: false,
      deepRange: false,
      highLoad: false,
      transitionComplexity: 'low',
    },
    knowledge: {
      verified: false,
      professionalYogaRelated: null,
    },
    status: 'active',
  },
  {
    id: 'paschimottanasana',
    type: 'asana',
    nameJa: '座って前屈',
    nameSanskrit: 'Paschimottanasana',
    nameEn: 'Seated Forward Bend',
    image: '/pose-paschimottanasana.webp',
    defaultDurationMin: 2,
    beginnerInstructions: [
      '床に座り、両足を前に伸ばす',
      '息を吐きながら股関節から前に倒す。手はすねまたは足先に向かって伸ばす',
    ],
    breathingInstructions: [
      '吐く息で上半身をリラックス。自然な呼吸を続ける',
    ],
    generalCautions: [
      '膝を少し曲げてもよい。腰を丸めず股関節から倒れる。坐骨が床から離れないようにする',
    ],
    voiceGuide: {
      intro: '座って前屈を始めます。',
      firstRound: [
        { at: 5, text: '膝を少し曲げても大丈夫です。' },
        { at: 15, text: '股関節からゆっくり前に倒します。' },
        { at: 25, text: '無理のない位置で止まりましょう。' },
      ],
      breathingCue: '苦しくなければ、鼻からゆっくり吸って、鼻から吐きます。',
      breathingReminderCue: '呼吸は止めず、無理のない範囲で鼻呼吸を続けましょう。',
      completion: 'お疲れさまでした。',
    },
    planner: {
      beginnerFriendly: true,
      gentleAllowed: false,
      intensity: 'medium',
      advancedBalance: false,
      deepRange: true,
      highLoad: false,
      transitionComplexity: 'low',
    },
    knowledge: {
      knowledgeMasterId: 'YK-0270',
      zukanSlug: 'yk-0270',
      verified: true,
      professionalYogaRelated: null,
    },
    status: 'active',
  },
  {
    id: 'savasana',
    type: 'asana',
    nameJa: '休息のポーズ',
    nameSanskrit: 'Savasana',
    nameEn: 'Corpse Pose',
    image: '/pose-savasana.webp',
    defaultDurationMin: 3,
    beginnerInstructions: [
      '仰向けに寝る。足を自然に開き、手を体の脇に置く',
      '全身の力を抜き、目を閉じる。手のひらを天に向ける',
    ],
    breathingInstructions: [
      '自然な呼吸に任せる。体が床に沈んでいくのを感じる',
    ],
    generalCautions: [
      '腰が浮くときは膝の下に丸めた毛布を入れる。眠ってしまってもよい',
    ],
    voiceGuide: {
      intro: '休息のポーズを始めます。',
      firstRound: [
        { at: 5, text: '全身の力を抜いて、楽な姿勢をとります。' },
        { at: 15, text: '呼吸をコントロールしようとせず、自然に任せましょう。' },
      ],
      secondRound: [
        { at: 0, text: '全身の力を抜いて、楽な姿勢をとりましょう。' },
      ],
      breathingCue: '苦しくなければ、鼻からゆっくり吸って、鼻から吐きます。',
      breathingReminderCue: '呼吸は止めず、無理のない範囲で鼻呼吸を続けましょう。',
      completion: 'お疲れさまでした。',
    },
    planner: {
      beginnerFriendly: true,
      gentleAllowed: true,
      intensity: 'low',
      advancedBalance: false,
      deepRange: false,
      highLoad: false,
      transitionComplexity: 'low',
    },
    knowledge: {
      knowledgeMasterId: 'YK-0260',
      zukanSlug: 'yk-0260',
      verified: true,
      professionalYogaRelated: null,
    },
    status: 'active',
  },
  {
    id: 'mindfulness-1min',
    type: 'dhyana',
    nameJa: '1分間マインドフルネス',
    nameSanskrit: 'Dhyana',
    nameEn: 'One Minute Mindfulness',
    image: '/pose-mindfulness.webp',
    defaultDurationMin: 1,
    beginnerInstructions: [
      '背筋を伸ばして楽な姿勢で座る。目を閉じるか薄く開く',
      '呼吸の動き（鼻の奥、胸、お腹）に注意を向ける。呼吸がそれたらやさしく戻す',
    ],
    breathingInstructions: [
      '自然な呼吸。変えようとしない',
    ],
    generalCautions: [
      '眠くなったら目を開けてもよい。雑念が来るのは自然なこと',
    ],
    voiceGuide: {
      intro: '1分間マインドフルネスを始めます。',
      firstRound: [
        { at: 5, text: '肩の力を抜きましょう。' },
      ],
      completion: 'お疲れさまでした。',
    },
    planner: {
      beginnerFriendly: true,
      gentleAllowed: true,
      intensity: 'low',
      advancedBalance: false,
      deepRange: false,
      highLoad: false,
      transitionComplexity: 'low',
    },
    knowledge: {
      knowledgeMasterId: 'YK-0307',
      zukanSlug: 'yk-0307',
      verified: true,
      professionalYogaRelated: null,
    },
    status: 'active',
  },
  {
    id: 'test-pose',
    type: 'asana',
    nameJa: 'テストポーズ',
    nameSanskrit: 'TestAsana',
    nameEn: 'Test Pose',
    image: '/pose-tadasana.webp',
    defaultDurationMin: 1,
    beginnerInstructions: [
      '足を腰幅に開いて立つ',
      '両手を体の脇に垂らし、背すじを伸ばす',
    ],
    breathingInstructions: [
      '鼻から自然な呼吸を続ける',
    ],
    generalCautions: [
      '無理のない範囲で行う',
    ],
    voiceGuide: {
      intro: 'テストポーズを始めます。',
      firstRound: [
        { at: 5, text: '足裏で床を感じ、立ちます。' },
        { at: 15, text: '肩の力を抜きます。' },
      ],
      breathingCue: '苦しくなければ、鼻からゆっくり吸って、鼻から吐きます。',
      completion: 'お疲れさまでした。',
    },
    planner: {
      beginnerFriendly: true,
      gentleAllowed: true,
      intensity: 'low',
      advancedBalance: false,
      deepRange: false,
      highLoad: false,
      transitionComplexity: 'low',
    },
    knowledge: {
      verified: false,
      professionalYogaRelated: null,
    },
    status: 'draft',
  },
];

const CATALOG_BY_ID: Record<string, PoseCatalogEntry> = {};
const CATALOG_BY_NAME: Record<string, PoseCatalogEntry> = {};
const CATALOG_BY_ALIAS: Record<string, PoseCatalogEntry> = {};

for (const entry of POSE_CATALOG) {
  CATALOG_BY_ID[entry.id] = entry;
  CATALOG_BY_NAME[entry.nameJa] = entry;
  if (entry.aliases) {
    for (const alias of entry.aliases) {
      CATALOG_BY_ALIAS[alias] = entry;
    }
  }
}

export function getCatalogEntry(id: string): PoseCatalogEntry | undefined {
  return CATALOG_BY_ID[id] ?? breathworkToPoseEntry(id) ?? meditationToPoseEntry(id);
}

export function getCatalogEntryByName(name: string): PoseCatalogEntry | undefined {
  return CATALOG_BY_NAME[name] ?? CATALOG_BY_ALIAS[name] ?? breathworkToPoseEntryByName(name);
}

export function getActivePoses(): PoseCatalogEntry[] {
  return POSE_CATALOG.filter((e) => e.status === 'active');
}

export function getActivePosesByType(type: PoseType): PoseCatalogEntry[] {
  if (type === 'pranayama') {
    return BREATHWORK_CATALOG.filter((e) => e.status === 'active').map(breathworkEntryToPoseEntry);
  }
  if (type === 'dhyana') {
    const meditations = getPlannerMeditations();
    if (meditations.length > 0) {
      return meditations.map(meditationEntryToPoseEntry);
    }
  }
  return POSE_CATALOG.filter((e) => e.status === 'active' && e.type === type);
}

export function getPlannerPoses(type: PoseType, gentle: boolean): PoseCatalogEntry[] {
  if (type === 'pranayama') {
    return getPlannerBreathwork(gentle).map(breathworkEntryToPoseEntry);
  }
  if (type === 'dhyana') {
    const meditations = getPlannerMeditations();
    if (meditations.length > 0) {
      return meditations.map(meditationEntryToPoseEntry);
    }
  }
  return POSE_CATALOG.filter((e) => {
    if (e.status !== 'active' && e.status !== 'draft') return false;
    if (e.type !== type) return false;
    if (gentle && !e.planner.gentleAllowed) return false;
    return true;
  });
}

export function getDefaultPlanPoseIds(): string[] {
  return ['tadasana', 'catcow', 'box-breathing', 'mindfulness-1min'];
}

function breathworkEntryToPoseEntry(bw: BreathworkCatalogEntry): PoseCatalogEntry {
  const firstRound = bw.voiceGuide.intro.map((c) => ({ at: c.at, text: c.text }));
  const completionText = bw.voiceGuide.completion[0]?.text ?? 'お疲れさまでした。';
  return {
    id: bw.id,
    type: 'pranayama' as PoseType,
    nameJa: bw.nameJa,
    nameSanskrit: bw.nameSanskrit,
    nameEn: bw.nameEn,
    aliases: bw.aliases,
    image: bw.visual.asset ?? '',
    defaultDurationMin: bw.defaultDurationMin,
    beginnerInstructions: [...bw.instructions.intro, ...bw.instructions.firstRound],
    breathingInstructions: bw.breathing.recommendNasalBreathing ? [bw.breathing.nasalCue ?? ''] : [],
    generalCautions: [],
    voiceGuide: {
      intro: bw.voiceGuide.intro[0]?.text ?? `${bw.nameJa}を始めます。`,
      firstRound,
      secondRound: bw.voiceGuide.repeatCues?.map((c) => ({ at: c.at, text: c.text })),
      breathingCue: bw.breathing.nasalCue,
      completion: completionText,
    },
    planner: {
      beginnerFriendly: bw.safety.beginnerFriendly,
      gentleAllowed: bw.safety.gentleAllowed,
      intensity: 'low' as PoseIntensity,
      advancedBalance: false,
      deepRange: false,
      highLoad: false,
      transitionComplexity: 'low' as PoseTransitionComplexity,
    },
    knowledge: bw.knowledge,
    status: bw.status as PoseStatus,
  };
}

function breathworkToPoseEntry(id: string): PoseCatalogEntry | undefined {
  const bw = BREATHWORK_CATALOG.find((e) => e.id === id);
  return bw ? breathworkEntryToPoseEntry(bw) : undefined;
}

function breathworkToPoseEntryByName(name: string): PoseCatalogEntry | undefined {
  const bw = BREATHWORK_CATALOG.find((e) => e.nameJa === name || e.aliases?.includes(name));
  return bw ? breathworkEntryToPoseEntry(bw) : undefined;
}

function meditationEntryToPoseEntry(m: MeditationCatalogEntry): PoseCatalogEntry {
  const voiceCues = m.timeline
    .filter((t) => t.type === 'voice' && t.text)
    .map((t) => ({ at: t.atSec, text: t.text! }));
  const completionEvent = m.timeline.find((t) => t.type === 'complete');
  return {
    id: m.id,
    type: 'dhyana' as PoseType,
    nameJa: m.nameJa,
    nameSanskrit: undefined,
    nameEn: m.nameEn,
    aliases: undefined,
    image: m.visual?.asset ?? '/pose-mindfulness.webp',
    defaultDurationMin: Math.round(m.durationSec / 60),
    beginnerInstructions: [m.description],
    breathingInstructions: [],
    generalCautions: [],
    voiceGuide: {
      intro: voiceCues[0]?.text ?? `${m.nameJa}を始めます。`,
      firstRound: voiceCues,
      secondRound: undefined,
      breathingCue: undefined,
      completion: completionEvent?.text ?? 'お疲れさまでした。',
    },
    planner: {
      beginnerFriendly: true,
      gentleAllowed: true,
      intensity: 'low' as PoseIntensity,
      advancedBalance: false,
      deepRange: false,
      highLoad: false,
      transitionComplexity: 'low' as PoseTransitionComplexity,
    },
    knowledge: m.knowledge as unknown as KnowledgeLink,
    status: m.status as PoseStatus,
  };
}

function meditationToPoseEntry(id: string): PoseCatalogEntry | undefined {
  const m = getPlannerMeditations().find((e) => e.id === id);
  return m ? meditationEntryToPoseEntry(m) : undefined;
}
