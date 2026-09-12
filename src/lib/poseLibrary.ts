export interface PoseStage {
  image: string;
  label: string;
  description: string;
}

export interface ConcretePose {
  id: string;
  name: string;
  sanskrit?: string;
  type: 'asana' | 'pranayama' | 'dhyana';
  image: string;
  stages?: PoseStage[];
  startPose: string;
  movement: string;
  breathing: string;
  durationLabel: string;
  caution: string;
  defaultMinutes: number;
  knowledgeEntryId?: string | null;
  knowledgeMasterId?: string | null;
  zukanSlug?: string | null;
  zukanUrl?: string | null;
  professionalYogaRelated?: boolean | null;
  professionalYogaSourceLabel?: string | null;
  knowledgeVerified?: boolean;
}

export const CONCRETE_POSES: ConcretePose[] = [
  {
    id: 'tadasana',
    name: '山のポーズ',
    sanskrit: 'Tadasana',
    type: 'asana',
    image: '/pose-tadasana-v2.webp',
    startPose: '足を腰幅程度に開き、両足の裏を床にしっかり置いて立つ',
    movement: '背すじを自然に伸ばし、頭頂部を天に向ける。肩の力を抜き、腕を体の脇に垂らす',
    breathing: '鼻から自然な呼吸を続ける。息を吸うとき背すじが少し伸びるのを感じる',
    durationLabel: '1分',
    caution: '膝を反らさず、足首に均等に体重をかける。めまいがあるときは座って行う',
    defaultMinutes: 1,
    knowledgeEntryId: null,
    knowledgeMasterId: 'YK-0264',
    zukanSlug: 'yk-0264',
    zukanUrl: null,
    professionalYogaRelated: null,
    professionalYogaSourceLabel: null,
    knowledgeVerified: true,
  },
  {
    id: 'vrksasana',
    name: '立ち木のポーズ',
    sanskrit: 'Vrksasana',
    type: 'asana',
    image: '/pose-vrksasana.webp',
    startPose: '山のポーズで立ち、体重を右足にのせる',
    movement: '左足の裏を右足の内側（ふくらはぎまたは太もも）に当てる。両手を胸の前で合わせる',
    breathing: '鼻からゆっくり呼吸。バランスを取りながら呼吸を続ける',
    durationLabel: '1分（左右各30秒）',
    caution: '膝には足を直接当てない。バランスが崩れたら一度足をおろして再開する',
    defaultMinutes: 1,
    knowledgeEntryId: null,
    knowledgeMasterId: 'YK-0277',
    zukanSlug: 'yk-0277',
    zukanUrl: null,
    professionalYogaRelated: null,
    professionalYogaSourceLabel: null,
    knowledgeVerified: true,
  },
  {
    id: 'uttanasana',
    name: 'やさしい前屈',
    sanskrit: 'Uttanasana',
    type: 'asana',
    image: '/pose-uttanasana-stage3.webp',
    stages: [
      { image: '/pose-uttanasana-stage1.webp', label: '段階1：まっすぐ立つ', description: '足を腰幅に開き、背すじを伸ばして立つ。ここからゆっくり始める' },
      { image: '/pose-uttanasana-stage2.webp', label: '段階2：股関節から前に倒す', description: '息を吐きながら股関節からゆっくり前に倒す。膝は少し曲げてもよい' },
      { image: '/pose-uttanasana-stage3.webp', label: '段階3：無理のない位置で止まる', description: '手は床またはすねにおく。床に手をつける必要はない。無理な深さを求めない' },
    ],
    startPose: '足を腰幅に開いて立つ',
    movement: '息を吐きながら股関節から前に倒す。膝は少し曲げてもよい。手は床またはすねにおく',
    breathing: '吐く息で上半身をリラックスさせる。自然な呼吸を続ける',
    durationLabel: '1分',
    caution: '腰を丸めない。膝を曲げてもよいので無理な深さを求めない。床に手をつける必要はない。めまいがあるときはゆっくり戻る',
    defaultMinutes: 1,
    knowledgeEntryId: null,
    knowledgeMasterId: null,
    zukanSlug: null,
    zukanUrl: null,
    professionalYogaRelated: false,
    professionalYogaSourceLabel: null,
    knowledgeVerified: false,
  },
  {
    id: 'balasana',
    name: 'チャイルドポーズ',
    sanskrit: 'Balasana',
    type: 'asana',
    image: '/pose-balasana.webp',
    startPose: '床に正座し、つま先をそろえてお尻をかかとにのせる',
    movement: '息を吐きながら上半身を前に倒し、額を床におく。腕は前に伸ばすか体の脇におく',
    breathing: '鼻からゆっくり呼吸。背中が広がるのを感じる',
    durationLabel: '2分',
    caution: '膝が痛いときは折り畳んだ毛布を膝のうしろに入れる。食後は避ける',
    defaultMinutes: 2,
    knowledgeEntryId: null,
    knowledgeMasterId: null,
    zukanSlug: null,
    zukanUrl: null,
    professionalYogaRelated: false,
    professionalYogaSourceLabel: null,
    knowledgeVerified: false,
  },
  {
    id: 'catcow',
    name: '猫と牛のポーズ',
    sanskrit: 'Marjaryasana-Bitilasana',
    type: 'asana',
    image: '/pose-cow.webp',
    stages: [
      { image: '/pose-cow.webp', label: '吸う息：牛のポーズ（Cow）', description: '息を吸いながら胸を開き、背中をやさしく反らせる。お腹は床に向かって下げる。視線は自然に前方へ' },
      { image: '/pose-cat.webp', label: '吐く息：猫のポーズ（Cat）', description: '息を吐きながら背中を丸める。おへそを見る方向で首を無理に曲げない。ゆっくり交互に繰り返す' },
    ],
    startPose: '四つん這いになる。手のひらを肩の下、膝を腰の下に置く',
    movement: '息を吸いながら背中を反らせ（牛）、息を吐きながら背中を丸める（猫）。ゆっくり交互に',
    breathing: '吸う息で反らせ、吐く息で丸める。呼吸と動きを合わせる',
    durationLabel: '2分',
    caution: '手首が痛いときは拳を作るか前腕をつく。首を無理に動かさない',
    defaultMinutes: 2,
    knowledgeEntryId: null,
    knowledgeMasterId: null,
    zukanSlug: null,
    zukanUrl: null,
    professionalYogaRelated: false,
    professionalYogaSourceLabel: null,
    knowledgeVerified: false,
  },
  {
    id: 'paschimottanasana',
    name: '座って前屈',
    sanskrit: 'Paschimottanasana',
    type: 'asana',
    image: '/pose-paschimottanasana.webp',
    startPose: '床に座り、両足を前に伸ばす',
    movement: '息を吐きながら股関節から前に倒す。手はすねまたは足先に向かって伸ばす',
    breathing: '吐く息で上半身をリラックス。自然な呼吸を続ける',
    durationLabel: '2分',
    caution: '膝を少し曲げてもよい。腰を丸めず股関節から倒れる。坐骨が床から離れないようにする',
    defaultMinutes: 2,
    knowledgeEntryId: null,
    knowledgeMasterId: 'YK-0270',
    zukanSlug: 'yk-0270',
    zukanUrl: null,
    professionalYogaRelated: null,
    professionalYogaSourceLabel: null,
    knowledgeVerified: true,
  },
  {
    id: 'savasana',
    name: '休息のポーズ',
    sanskrit: 'Savasana',
    type: 'asana',
    image: '/pose-savasana.webp',
    startPose: '仰向けに寝る。足を自然に開き、手を体の脇に置く',
    movement: '全身の力を抜き、目を閉じる。手のひらを天に向ける',
    breathing: '自然な呼吸に任せる。体が床に沈んでいくのを感じる',
    durationLabel: '3分',
    caution: '腰が浮くときは膝の下に丸めた毛布を入れる。眠ってしまってもよい',
    defaultMinutes: 3,
    knowledgeEntryId: null,
    knowledgeMasterId: 'YK-0260',
    zukanSlug: 'yk-0260',
    zukanUrl: null,
    professionalYogaRelated: null,
    professionalYogaSourceLabel: null,
    knowledgeVerified: true,
  },
  {
    id: 'box-breathing',
    name: 'Box Breathing',
    sanskrit: 'Sama Vritti Pranayama',
    type: 'pranayama',
    image: '/pose-box-breathing.webp',
    startPose: '楽な姿勢で座る（椅子でも床でもOK）',
    movement: '4秒吸う → 4秒止める → 4秒吐く → 4秒止める。これを繰り返す',
    breathing: '鼻から呼吸。4つのフェーズを同じ長さで保つ',
    durationLabel: '2分（4〜6周）',
    caution: '息を止めるのが苦しいときは無理をしない。自然な呼吸に戻してよい',
    defaultMinutes: 2,
    knowledgeEntryId: 'b4dbb7d1-f1c5-4141-8f6d-398cde68bc8c',
    knowledgeMasterId: null,
    zukanSlug: 'box-breathing',
    zukanUrl: null,
    professionalYogaRelated: false,
    professionalYogaSourceLabel: null,
    knowledgeVerified: true,
  },
  {
    id: 'abdominal-breathing',
    name: '腹式呼吸',
    sanskrit: 'Diaphragmatic Breathing',
    type: 'pranayama',
    image: '/pose-abdominal-breathing.webp',
    startPose: '仰向けまたは椅子に座り、片手をお腹に置く',
    movement: '鼻から吸い、お腹が膨らむのを感じる。ゆっくり鼻から吐き、お腹が戻るのを感じる',
    breathing: '胸よりお腹を動かす。無理に深く吸わず自然な範囲で',
    durationLabel: '3分',
    caution: '肩や胸に力を入れない。苦しいときは通常の呼吸に戻す',
    defaultMinutes: 3,
    knowledgeEntryId: null,
    knowledgeMasterId: 'YK-0318',
    zukanSlug: 'yk-0318',
    zukanUrl: null,
    professionalYogaRelated: null,
    professionalYogaSourceLabel: null,
    knowledgeVerified: true,
  },
  {
    id: 'mindfulness-1min',
    name: '1分間マインドフルネス',
    sanskrit: 'Dhyana',
    type: 'dhyana',
    image: '/pose-mindfulness.webp',
    startPose: '背筋を伸ばして楽な姿勢で座る。目を閉じるか薄く開く',
    movement: '呼吸の動き（鼻の奥、胸、お腹）に注意を向ける。呼吸がそれたらやさしく戻す',
    breathing: '自然な呼吸。変えようとしない',
    durationLabel: '1分',
    caution: '眠くなったら目を開けてもよい。雑念が来るのは自然なこと',
    defaultMinutes: 1,
    knowledgeEntryId: null,
    knowledgeMasterId: 'YK-0307',
    zukanSlug: 'yk-0307',
    zukanUrl: null,
    professionalYogaRelated: null,
    professionalYogaSourceLabel: null,
    knowledgeVerified: true,
  },
];

const POSE_BY_NAME: Record<string, ConcretePose> = {};
const POSE_BY_ID: Record<string, ConcretePose> = {};
for (const p of CONCRETE_POSES) {
  POSE_BY_NAME[p.name] = p;
  POSE_BY_ID[p.id] = p;
}

const ABSTRACT_TO_CONCRETE: Record<string, string[]> = {
  'やさしいストレッチ': ['tadasana', 'catcow', 'uttanasana'],
  'サンフロウ': ['tadasana', 'vrksasana', 'uttanasana'],
  '山のポーズから立ち木のポーズ': ['tadasana', 'vrksasana'],
  '初心者向けアーサナ': ['tadasana', 'catcow', 'balasana'],
  'ボックスブリージング': ['box-breathing'],
  '腹式呼吸': ['abdominal-breathing'],
  '交替鼻呼吸': ['abdominal-breathing'],
  '1分間マインドフルネス': ['mindfulness-1min'],
  'ボディスキャン瞑想': ['mindfulness-1min', 'savasana'],
  '呼吸の観察': ['mindfulness-1min'],
};

export function resolveConcretePoses(name: string): ConcretePose[] {
  const ids = ABSTRACT_TO_CONCRETE[name];
  if (ids && ids.length > 0) {
    return ids.map((id) => POSE_BY_ID[id]).filter(Boolean);
  }
  const direct = POSE_BY_NAME[name];
  if (direct) return [direct];
  return [];
}

export function getDefaultPlanPoses(): ConcretePose[] {
  return [
    POSE_BY_ID['tadasana'],
    POSE_BY_ID['catcow'],
    POSE_BY_ID['box-breathing'],
    POSE_BY_ID['mindfulness-1min'],
  ].filter(Boolean);
}

export interface PoseKnowledgeLink {
  available: boolean;
  knowledgeEntryId?: string;
  knowledgeMasterId?: string;
  zukanSlug?: string;
  zukanUrl?: string;
  professionalYogaRelated?: boolean | null;
  professionalYogaSourceLabel?: string;
  verified: boolean;
}

export function getPoseKnowledgeLink(poseId: string): PoseKnowledgeLink {
  const pose = POSE_BY_ID[poseId];
  if (!pose || !pose.knowledgeVerified) {
    return { available: false, verified: false };
  }
  const hasLink = !!(pose.knowledgeEntryId || pose.knowledgeMasterId || pose.zukanSlug || pose.zukanUrl);
  if (!hasLink) {
    return { available: false, verified: false };
  }
  return {
    available: true,
    knowledgeEntryId: pose.knowledgeEntryId ?? undefined,
    knowledgeMasterId: pose.knowledgeMasterId ?? undefined,
    zukanSlug: pose.zukanSlug ?? undefined,
    zukanUrl: pose.zukanUrl ?? undefined,
    professionalYogaRelated: pose.professionalYogaRelated,
    professionalYogaSourceLabel: pose.professionalYogaSourceLabel ?? undefined,
    verified: true,
  };
}
