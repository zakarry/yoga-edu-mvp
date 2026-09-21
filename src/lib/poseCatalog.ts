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
  audioKey?: string;
  audioText?: string;
}

export interface VoiceGuideDef {
  intro: string;
  introAudioKey?: string;
  firstRound: VoiceCueDef[];
  secondRound?: VoiceCueDef[];
  breathingCue?: string;
  breathingCueAudioKey?: string;
  breathingReminderCue?: string;
  completion?: string;
  completionAudioKey?: string;
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
      introAudioKey: 'voice-start-tadasana',
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
      breathingCueAudioKey: 'voice-nose-breath-v2',
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
      introAudioKey: 'voice-start-vrksasana',
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
      breathingCueAudioKey: 'voice-nose-breath-v2',
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
      { image: '/pose-tadasana.webp', label: '段階1：まっすぐ立つ', description: '足を腰幅に開き、背すじを伸ばして立つ。腕は自然に下へ。ここからゆっくり始める' },
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
      introAudioKey: 'voice-start-uttanasana-v2',
      firstRound: [
        { at: 5, text: '膝は無理に伸ばしきらなくて大丈夫です。' },
        { at: 15, text: '股関節からゆっくり前へ倒します。', audioKey: 'voice-uttanasana-2-v2' },
        { at: 25, text: '床に手をつける必要はありません。無理のない位置で止まりましょう。' },
      ],
      secondRound: [
        { at: 0, text: 'もう一度、膝を楽にしてみましょう。' },
        { at: 10, text: '床に手をつける必要はありません。' },
      ],
      breathingCue: '苦しくなければ、鼻からゆっくり吸って、鼻から吐きます。',
      breathingCueAudioKey: 'voice-nose-breath-v2',
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
      introAudioKey: 'voice-start-balasana-v2',
      firstRound: [
        { at: 5, text: 'お尻をかかとの方向へゆっくり下ろします。', audioKey: 'voice-balasana-1-v2' },
        { at: 15, text: '背中を広げるように、楽に呼吸しましょう。' },
        { at: 25, text: '苦しくない位置で休みます。' },
      ],
      secondRound: [
        { at: 0, text: 'お尻をかかとに預けて、リラックスしましょう。' },
      ],
      breathingCue: '苦しくなければ、鼻からゆっくり吸って、鼻から吐きます。',
      breathingCueAudioKey: 'voice-nose-breath-v2',
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
      introAudioKey: 'voice-start-catcow-v2',
      firstRound: [
        { at: 5, text: '吸いながら胸を開き、背中をやさしく反らします。', audioKey: 'voice-catcow-1-v2' },
        { at: 15, text: '吐きながら背中を丸め、おへそを見るようにします。', audioKey: 'voice-catcow-2-v2' },
        { at: 25, text: '首は無理に反らさず、呼吸に合わせてゆっくり動きましょう。', audioKey: 'voice-catcow-3-v2' },
      ],
      secondRound: [
        { at: 0, text: 'もう一度、吸いながら胸を開きます。', audioKey: 'voice-catcow-r1-v2' },
        { at: 10, text: '吐きながら背中を丸めましょう。', audioKey: 'voice-catcow-r2-v2' },
      ],
      breathingCue: '苦しくなければ、鼻からゆっくり吸って、鼻から吐きます。',
      breathingCueAudioKey: 'voice-nose-breath-v2',
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
      introAudioKey: 'voice-start-paschi-v2',
      firstRound: [
        { at: 5, text: '膝を少し曲げても大丈夫です。', audioKey: 'voice-paschi-1-v2' },
        { at: 15, text: '股関節からゆっくり前に倒します。', audioKey: 'voice-paschi-2-v2' },
        { at: 25, text: '無理のない位置で止まりましょう。', audioKey: 'voice-paschi-3-v2' },
      ],
      breathingCue: '苦しくなければ、鼻からゆっくり吸って、鼻から吐きます。',
      breathingCueAudioKey: 'voice-nose-breath-v2',
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
      introAudioKey: 'voice-start-savasana',
      firstRound: [
        { at: 5, text: '全身の力を抜いて、楽な姿勢をとります。' },
        { at: 15, text: '呼吸をコントロールしようとせず、自然に任せましょう。' },
      ],
      secondRound: [
        { at: 0, text: '全身の力を抜いて、楽な姿勢をとりましょう。' },
      ],
      breathingCue: '苦しくなければ、鼻からゆっくり吸って、鼻から吐きます。',
      breathingCueAudioKey: 'voice-nose-breath-v2',
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
    id: 'setu-bandhasana',
    type: 'asana',
    nameJa: 'セツ・バンダーサナ（橋のポーズ）',
    nameSanskrit: 'Setu Bandhasana',
    nameEn: 'Bridge Pose',
    aliases: ['橋のポーズ', '橋'],
    image: '/pose-setu-bandhasana.webp',
    defaultDurationMin: 1,
    beginnerInstructions: [
      '仰向けに寝る。膝を立て、足は腰幅程度に開き、足裏を床に置く',
      '息を吐きながら腰をゆっくり持ち上げる。無理のない高さで止まり、肩と足で体を支える',
    ],
    breathingInstructions: [
      '持ち上げるときに吐き、戻すときに吸う。自然な呼吸を続ける',
    ],
    generalCautions: [
      '首を無理に回さない。腰が痛いときは無理に持ち上げない。膝の下に毛布を入れてもよい',
    ],
    voiceGuide: {
      intro: '橋のポーズを始めます。',
      introAudioKey: 'voice-start-setu',
      firstRound: [
        { at: 5, text: '仰向けに寝て、膝を立てましょう。', audioKey: 'voice-setu-1' },
        { at: 10, text: '足裏は腰幅程度に開きます。', audioKey: 'voice-setu-2' },
        { at: 18, text: '息を吐きながら、腰をゆっくり持ち上げます。無理のない高さで止まりましょう。', audioKey: 'voice-setu-3' },
        { at: 28, text: '肩と足裏で体を支え、呼吸を続けましょう。' },
      ],
      secondRound: [
        { at: 0, text: 'もう一度、息を吐きながら腰を持ち上げます。', audioKey: 'voice-setu-r1' },
        { at: 10, text: '無理のない高さで、リラックスして呼吸を続けましょう。', audioKey: 'voice-setu-r2' },
      ],
      breathingCue: '苦しくなければ、鼻からゆっくり吸って、鼻から吐きます。',
      breathingCueAudioKey: 'voice-nose-breath-v2',
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
    id: 'bhujangasana',
    type: 'asana',
    nameJa: 'ブジャンガーサナ（コブラのポーズ）',
    nameSanskrit: 'Bhujangasana',
    nameEn: 'Cobra Pose',
    aliases: ['コブラのポーズ', 'コブラ'],
    image: '/pose-bhujangasana.webp',
    defaultDurationMin: 1,
    beginnerInstructions: [
      'うつ伏せに寝る。足はそろえて伸ばし、手のひらを胸の横に置く',
      '息を吸いながら手で床を軽く押し、胸をやさしく持ち上げる。ひじは少し曲げたままでよい。無理のない高さで止まる',
    ],
    breathingInstructions: [
      '持ち上げるときに鼻から吸い、戻すときに鼻から吐く。自然な呼吸を続ける',
    ],
    generalCautions: [
      '腰に痛みがあるときは無理をしない。ひじを伸ばしきらず、少し曲げたまま行う。手首が痛いときは拳を作る',
    ],
    voiceGuide: {
      intro: 'コブラのポーズを始めます。',
      introAudioKey: 'voice-start-bhujanga',
      firstRound: [
        { at: 5, text: 'うつ伏せで楽な姿勢をとります。手のひらを胸の横に置きましょう。', audioKey: 'voice-bhujanga-1' },
        { at: 15, text: '息を吸いながら、胸をやさしく持ち上げます。ひじは少し曲げたままで大丈夫です。', audioKey: 'voice-bhujanga-2' },
        { at: 25, text: '無理のない高さで止まり、肩の力を抜きましょう。', audioKey: 'voice-bhujanga-3' },
      ],
      secondRound: [
        { at: 0, text: 'もう一度、息を吸いながら胸をやさしく持ち上げます。', audioKey: 'voice-bhujanga-r1' },
        { at: 10, text: '首を無理に反らさず、目線は自然な角度に保ちましょう。', audioKey: 'voice-bhujanga-r2' },
      ],
      breathingCue: '苦しくなければ、鼻からゆっくり吸って、鼻から吐きます。',
      breathingCueAudioKey: 'voice-nose-breath-v2',
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
      breathingCueAudioKey: 'voice-nose-breath-v2',
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
  {
    id: 'trikonasana',
    type: 'asana',
    nameJa: '三角のポーズ',
    nameSanskrit: 'Trikonasana',
    nameEn: 'Triangle Pose',
    aliases: ['トリコーナーサナ'],
    image: '/pose-trikonasana-new.webp',
    defaultDurationMin: 1,
    beginnerInstructions: [
      '足を大きく開き、右足を外に向ける',
      '息を吐きながら右手を右足の方向に伸ばし、無理のない位置で止める。左手は上に伸ばす',
    ],
    breathingInstructions: [
      '鼻から自然な呼吸を続ける。無理な深さを求めない',
    ],
    generalCautions: [
      '腰を丸めない。膝を少し曲げてもよい。めまいがあるときはゆっくり戻る',
    ],
    voiceGuide: {
      intro: '三角のポーズを始めます。',
      introAudioKey: 'voice-start-trikona',
      firstRound: [
        { at: 5, text: '足を大きく開き、右足を外に向けます。', audioKey: 'voice-trikona-1' },
        { at: 15, text: '息を吐きながら、上体を右へ倒します。', audioKey: 'voice-trikona-2' },
        { at: 25, text: '無理のない位置で止まり、左手は上に伸ばします。', audioKey: 'voice-trikona-3' },
      ],
      secondRound: [
        { at: 0, text: 'もう一度、反対側も行いましょう。', audioKey: 'voice-trikona-r1' },
        { at: 10, text: '無理のない範囲で、自然な呼吸を続けます。', audioKey: 'voice-trikona-r2' },
      ],
      breathingCue: '苦しくなければ、鼻からゆっくり吸って、鼻から吐きます。',
      breathingCueAudioKey: 'voice-nose-breath-v2',
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
      knowledgeMasterId: 'YK-0267',
      zukanSlug: 'yk-0267',
      verified: true,
      professionalYogaRelated: null,
    },
    status: 'active',
  },
  {
    id: 'vajrasana',
    type: 'asana',
    nameJa: '金剛座（正座）',
    nameSanskrit: 'Vajrasana',
    nameEn: 'Thunderbolt Pose',
    aliases: ['ヴァジュラーサナ', '正座のポーズ'],
    image: '/pose-vajrasana-new.webp',
    defaultDurationMin: 2,
    beginnerInstructions: [
      '床にひざまずき、両膝をそろえてかかとに座る',
      '背すじを自然に伸ばし、手を膝の上におく。肩の力を抜いて自然な呼吸を続ける',
    ],
    breathingInstructions: [
      '鼻からゆっくり呼吸。お腹まわりが静かに動くのを感じる',
    ],
    generalCautions: [
      '膝が痛いときは折り畳んだ毛布を膝のうしろに入れる。足首が痛いときは膝の下に毛布を敷く',
    ],
    voiceGuide: {
      intro: '金剛座（正座）を始めます。',
      introAudioKey: 'voice-start-vajra',
      firstRound: [
        { at: 5, text: 'かかとの上にお尻をゆっくり下ろします。', audioKey: 'voice-vajra-1' },
        { at: 15, text: '背すじを無理なく伸ばし、肩の力を抜きます。', audioKey: 'voice-vajra-2' },
        { at: 25, text: '自然な呼吸を続けましょう。', audioKey: 'voice-vajra-3' },
      ],
      secondRound: [
        { at: 0, text: 'もう一度、背すじを整えましょう。', audioKey: 'voice-vajra-r1' },
        { at: 10, text: 'お腹まわりの呼吸を感じながら、静かに座ります。', audioKey: 'voice-vajra-r2' },
      ],
      breathingCue: '苦しくなければ、鼻からゆっくり吸って、鼻から吐きます。',
      breathingCueAudioKey: 'voice-nose-breath-v2',
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
      knowledgeMasterId: 'YK-0311',
      zukanSlug: 'yk-0311',
      verified: true,
      professionalYogaRelated: null,
    },
    status: 'active',
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
  const firstRound = bw.voiceGuide.intro.map((c) => ({ at: c.at, text: c.text, audioKey: c.audioKey }));
  const completionCues = bw.voiceGuide.completion;
  const completionText = completionCues.map((c) => c.text).join(' ');
  const completionAudioKey = completionCues[0]?.audioKey;
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
      introAudioKey: bw.voiceGuide.intro[0]?.audioKey,
      firstRound,
      secondRound: bw.voiceGuide.repeatCues?.map((c) => ({ at: c.at, text: c.text, audioKey: c.audioKey })),
      breathingCue: bw.breathing.nasalCue,
      completion: completionText,
      completionAudioKey,
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
    .map((t) => ({ at: t.atSec, text: t.text!, audioKey: t.audioKey }));
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
      completionAudioKey: completionEvent?.audioKey,
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
    knowledge: {
      knowledgeEntryId: m.knowledge.knowledgeEntryId ?? null,
      knowledgeMasterId: m.knowledge.knowledgeMasterId ?? null,
      zukanSlug: m.knowledge.zukanSlug ?? null,
      zukanUrl: m.knowledge.zukanUrl ?? null,
      verified: m.knowledge.verified,
      professionalYogaRelated: m.knowledge.professionalYogaRelated,
    },
    status: m.status as PoseStatus,
  };
}

function meditationToPoseEntry(id: string): PoseCatalogEntry | undefined {
  const m = getPlannerMeditations().find((e) => e.id === id);
  return m ? meditationEntryToPoseEntry(m) : undefined;
}
