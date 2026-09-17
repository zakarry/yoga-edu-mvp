import type { KnowledgeLink } from './poseCatalog';
import susokukanNarration from './susokukanNarration.json';

export type MeditationCategory = 'concentration' | 'mindfulness' | 'yoga_nidra' | 'other';
export type MeditationStatus = 'active' | 'draft' | 'review_required';
export type MeditationVisualType = 'minimal' | 'breathing' | 'focus' | 'static';

export interface MeditationTimelineEvent {
  atSec: number;
  type: 'voice' | 'silence' | 'subtitle' | 'complete';
  text?: string;
  audioText?: string;
  audioKey?: string;
  durationSec?: number;
}

export interface MeditationVisual {
  type: MeditationVisualType;
  asset?: string;
}

export interface MeditationKnowledge {
  knowledgeEntryId?: string | null;
  knowledgeMasterId?: string | null;
  zukanSlug?: string | null;
  zukanUrl?: string | null;
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
      // Captions are measured against one complete 60-second narration file.
      ...susokukanNarration.map(cue => ({ ...cue, type: 'voice' as const })),
      { atSec: 60, type: 'silence', durationSec: 240, text: '呼吸を数えながら、静寂の時間を過ごします' },
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
  {
    id: 'yoga-nidra-3m30s',
    nameJa: 'Yoga Nidra｜3分30秒リラクゼーション',
    nameEn: 'Yoga Nidra (3.5 min Relaxation)',
    category: 'yoga_nidra',
    tradition: 'Yoga Nidra',
    durationSec: 210,
    description: '短時間で心身を静め、深い休息へ向かうYoga Nidra。',
    timeline: [
      { atSec: 0, type: 'voice', text: 'ヨガニードラとは、サンスクリット語で「ヨガの眠り」を意味する言葉です。体を深く休ませながら、意識を静かに保っていくリラクゼーションと瞑想の実践です。', audioText: 'ヨガニードラとは、サンスクリット語で「ヨガの眠り」を意味する言葉です。からだを深く休ませながら、意識を静かに保っていくリラクゼーションと瞑想の実践です。', audioKey: 'voice-nidra350-intro' },
      { atSec: 18, type: 'voice', text: 'シャヴァーサナで、仰向けに楽に横になりましょう。脚を少し開き、腕は体から離して、手のひらを上に向けます。そっと目を閉じます。', audioText: 'シャヴァーサナで、仰向けに楽に横になりましょう。脚を少し開き、腕はからだから離して、手のひらを上に向けます。そっと目を閉じます。', audioKey: 'voice-nidra350-posture' },
      { atSec: 38, type: 'voice', text: '鼻からゆっくり息を吸います。そして、ゆっくり吐きます。もう一度。吸って。吐いて。呼吸のたびに、体の力を少しずつ緩めていきます。', audioText: '鼻からゆっくり息を吸います。そして、ゆっくりはきます。もう一度。吸って。はいて。呼吸のたびに、からだの力を少しずつ緩めていきます。', audioKey: 'voice-nidra350-breath' },
      { atSec: 60, type: 'voice', text: '眠ろうとせず、声を聞きながら、静かに意識を保っていきましょう。', audioKey: 'voice-nidra350-stay-awake' },
      { atSec: 70, type: 'voice', text: '体のそれぞれの場所へ、順番に意識を移していきます。右手の親指。人差し指。中指。薬指。小指。右の手のひら。手首。前腕。肘。上腕。肩。右の腰。太もも。膝。ふくらはぎ。足首。かかと。足の裏。足の指。', audioText: 'からだのそれぞれの場所へ、順番に意識を移していきます。右手の親指。人差し指。中指。薬指。小指。右の手のひら。手首。ぜんわん。肘。上腕。肩。右の腰。太もも。膝。ふくらはぎ。足首。かかと。足の裏。足の指。', audioKey: 'voice-nidra350-body-right' },
      { atSec: 105, type: 'voice', text: '次に左側。左手。手首。前腕。肘。上腕。肩。左の腰。太もも。膝。ふくらはぎ。足首。かかと。足の裏。足の指。', audioText: '次に左側。左手。手首。ぜんわん。肘。上腕。肩。左の腰。太もも。膝。ふくらはぎ。足首。かかと。足の裏。足の指。', audioKey: 'voice-nidra350-body-left' },
      { atSec: 130, type: 'voice', text: '意識を背面へ移します。肩甲骨。背骨。腰。お尻。続いて前面へ。お腹。胸。鎖骨。喉。顔。目。頭頂部。', audioText: '意識を背面へ移します。肩甲骨。背骨。腰。お尻。続いて前面へ。おなか。胸。鎖骨。喉。顔。目。頭頂部。', audioKey: 'voice-nidra350-body-back-front' },
      { atSec: 155, type: 'voice', text: '今、床に横たわっている体全体を感じます。体の重さを、そのまま床に委ねてください。何かをしようとせず、静けさを感じていきます。', audioText: '今、床に横たわっているからだ全体を感じます。からだの重さを、そのまま床に委ねてください。何かをしようとせず、静けさを感じていきます。', audioKey: 'voice-nidra350-whole-body' },
      { atSec: 172, type: 'voice', text: '自然な呼吸を、変えようとせずにただ観察します。吸う息。吐く息。一つひとつの呼吸を感じていきます。', audioKey: 'voice-nidra350-observe-breath' },
      { atSec: 188, type: 'voice', text: '心と体を、もう少しだけ深いリラクゼーションへと委ねます。静かに休みましょう。', audioText: '心とからだを、もう少しだけ深いリラクゼーションへと委ねます。静かに休みましょう。', audioKey: 'voice-nidra350-deep-relax' },
      { atSec: 188, type: 'silence', durationSec: 12 },
      { atSec: 200, type: 'voice', text: 'ゆっくりと意識を体へ戻します。手の指先、足の指先を少しずつ動かします。深くひと呼吸。準備ができたら、ゆっくりと目を開けてください。', audioText: 'ゆっくりと意識をからだへ戻します。手の指先、足の指先を少しずつ動かします。深くひと呼吸。準備ができたら、ゆっくりと目を開けてください。', audioKey: 'voice-nidra350-return' },
      { atSec: 210, type: 'complete', text: 'お疲れさまでした' },
    ],
    visual: { type: 'minimal' },
    knowledge: {
      knowledgeEntryId: null,
      verified: false,
      professionalYogaRelated: false,
    },
    status: 'active',
  },
  {
    id: 'yoga-nidra-10min',
    nameJa: 'Yoga Nidra｜10分 深いリラクゼーション',
    nameEn: 'Yoga Nidra (10 min Deep Relaxation)',
    category: 'yoga_nidra',
    tradition: 'Yoga Nidra',
    durationSec: 600,
    description: '就寝前や深い休息に向けて、身体感覚・呼吸・イメージ・静寂を使う10分間のYoga Nidra。',
    timeline: [
      { atSec: 0, type: 'voice', text: 'ヨガニードラとは、サンスクリット語で「ヨガの眠り」を意味する言葉です。心と体を深いリラクゼーションと瞑想へと導いていくプラクティスです。意識を保ちながら、覚醒と睡眠の間にある、静かで心地よい状態へと入っていきます。', audioText: 'ヨガニードラとは、サンスクリット語で「ヨガの眠り」を意味する言葉です。心とからだを深いリラクゼーションと瞑想へと導いていくプラクティスです。意識を保ちながら、覚醒と睡眠の間にある、静かで心地よい状態へと入っていきます。', audioKey: 'voice-nidra10-intro' },
      { atSec: 25, type: 'voice', text: 'それでは、シャヴァーサナ、仰向けの姿勢で楽に横になりましょう。足は肩幅より少し広めに開き、つま先は自然に外側へ。腕は体から少し離し、手のひらを上に向けて、そっと置きます。静かに目を閉じます。ここからは、できるだけ体を動かさず、目も閉じたまま、声を聞いていきましょう。', audioText: 'それでは、シャヴァーサナ、仰向けの姿勢で楽に横になりましょう。足は肩幅より少し広めに開き、つま先は自然に外側へ。腕はからだから少し離し、手のひらを上に向けて、そっと置きます。静かに目を閉じます。ここからは、できるだけからだを動かさず、目も閉じたまま、声を聞いていきましょう。', audioKey: 'voice-nidra10-posture' },
      { atSec: 60, type: 'voice', text: '心の中で、自分自身にこう伝えます。「私は今からヨガニードラを行います。眠ってしまわず、意識を保ち続けます。」', audioKey: 'voice-nidra10-intention' },
      { atSec: 75, type: 'voice', text: '今、自分の周りから聞こえてくる、一番遠くの音に耳を澄ませます。音の正体を探る必要はありません。ただレーダーのように、音から音へと意識を移していきます。', audioText: '今、自分の周りから聞こえてくる、一番遠くのおとに耳を澄ませます。おとの正体を探る必要はありません。ただレーダーのように、おとからおとへと意識を移していきます。', audioKey: 'voice-nidra10-distant-sounds' },
      { atSec: 95, type: 'voice', text: '次に、自分の呼吸へ意識を向けます。息を吸うと、お腹がやさしく膨らみます。息を吐くと、お腹が自然に戻ります。呼吸を変えようとせず、その動きをただ観察していきます。', audioText: '次に、自分の呼吸へ意識を向けます。息を吸うと、おなかがやさしく膨らみます。息をはくと、おなかが自然に戻ります。呼吸を変えようとせず、その動きをただ観察していきます。', audioKey: 'voice-nidra10-observe-breath' },
      { atSec: 115, type: 'voice', text: 'ここで、あなたの短い願い、サンカルパを思い浮かべます。「私は健康です」「私は心が穏やかです」など、今の自分に合う、肯定的で短い言葉をひとつ選びましょう。その言葉を、心の中でゆっくり3回繰り返します。', audioKey: 'voice-nidra10-sankalpa' },
      { atSec: 140, type: 'voice', text: 'ここから、体のそれぞれの部位へ、順番に意識を移していきます。名前を呼ばれた場所を動かす必要はありません。ただ、その場所へ意識を移し、力を緩めていきます。まずは右側から。', audioText: 'ここから、からだのそれぞれの部位へ、順番に意識を移していきます。名前を呼ばれた場所を動かす必要はありません。ただ、その場所へ意識を移し、力を緩めていきます。まずは右側から。', audioKey: 'voice-nidra10-body-scan-intro' },
      { atSec: 155, type: 'voice', text: '右手の親指。人差し指。中指。薬指。小指。右の手のひら。手の甲。手首。前腕。肘。上腕。肩。脇の下。右の腰。股関節。太もも。膝。ふくらはぎ。足首。かかと。足の裏。右足の親指。人差し指。中指。薬指。小指。', audioText: '右手の親指。人差し指。中指。薬指。小指。右の手のひら。手の甲。手首。ぜんわん。肘。上腕。肩。脇の下。右の腰。股関節。太もも。膝。ふくらはぎ。足首。かかと。足の裏。右足の親指。人差し指。中指。薬指。小指。', audioKey: 'voice-nidra10-body-right' },
      { atSec: 190, type: 'voice', text: '続いて左側です。左手の親指。人差し指。中指。薬指。小指。左の手のひら。手の甲。手首。前腕。肘。上腕。肩。脇の下。左の腰。股関節。太もも。膝。ふくらはぎ。足首。かかと。足の裏。左足の親指。人差し指。中指。薬指。小指。', audioText: '続いて左側です。左手の親指。人差し指。中指。薬指。小指。左の手のひら。手の甲。手首。ぜんわん。肘。上腕。肩。脇の下。左の腰。股関節。太もも。膝。ふくらはぎ。足首。かかと。足の裏。左足の親指。人差し指。中指。薬指。小指。', audioKey: 'voice-nidra10-body-left' },
      { atSec: 225, type: 'voice', text: '意識を体の背面へ移します。右のお尻。左のお尻。腰の低い部分。背中の高い部分。背骨全体。頭の後ろ。続いて前面へ。おでこ。右の眉。左の眉。眉間。右目。左目。右耳。左耳。右の頬。左の頬。鼻。唇。あご。喉。右の胸。左の胸。みぞおち。お腹。下腹部。', audioText: '意識をからだの背面へ移します。右のお尻。左のお尻。腰の低い部分。背中の高い部分。背骨全体。頭の後ろ。続いて前面へ。おでこ。右の眉。左の眉。眉間。右目。左目。右耳。左耳。右の頬。左の頬。鼻。唇。あご。喉。右の胸。左の胸。みぞおち。おなか。下腹部。', audioKey: 'voice-nidra10-body-back-front' },
      { atSec: 265, type: 'voice', text: '体全体を感じていきます。右脚全体。左脚全体。両脚全体。右腕全体。左腕全体。両腕全体。頭部。胴体。そして、体全体をひとつのものとして感じます。体の重さを床に委ねて、深くリラックスしていきます。', audioText: 'からだ全体を感じていきます。右脚全体。左脚全体。りょうあし全体。右腕全体。左腕全体。両腕全体。頭部。どうたい。そして、からだ全体をひとつのものとして感じます。からだの重さを床に委ねて、深くリラックスしていきます。', audioKey: 'voice-nidra10-whole-body' },
      { atSec: 295, type: 'voice', text: '再び、お腹の呼吸へ意識を戻します。ここから呼吸を、27から1まで、心の中で逆方向に数えていきます。「息を吸って、お腹が膨らむ。27。」「息を吐いて、お腹が戻る。27。」次は26。途中で数が分からなくなったら、また27から始めます。眠ってしまわないように、ただ淡々と数えていきましょう。', audioText: '再び、おなかの呼吸へ意識を戻します。ここから呼吸を、27から1まで、心の中で逆方向に数えていきます。「息を吸って、おなかが膨らむ。27。」「息をはいて、おなかが戻る。27。」次は26。途中で数が分からなくなったら、また27から始めます。眠ってしまわないように、ただ淡々と数えていきましょう。', audioKey: 'voice-nidra10-breath-count' },
      { atSec: 295, type: 'silence', durationSec: 120 },
      { atSec: 415, type: 'voice', text: '数を数えるのをやめます。心の中のスクリーンに、これから伝える風景を、ひとつずつ思い浮かべてみてください。静かな夜明けの海。激しく降る雨。暗闇に灯る、一本のろうそくの炎。', audioText: '数を数えるのをやめます。心の中のスクリーンに、これから伝える風景を、ひとつずつ思い浮かべてみてください。静かな夜明けの海。激しく降る雨。暗闇に灯る、一本のろうそくのほのお。', audioKey: 'voice-nidra10-imagery-1' },
      { atSec: 445, type: 'voice', text: '深く澄んだ湖。静かに流れていく、白い雲。そして、美しい富士山。', audioText: '深く澄んだ湖。静かに流れていく、白い雲。そして、美しいふじさん。', audioKey: 'voice-nidra10-imagery-2' },
      { atSec: 470, type: 'voice', text: 'それでは、最初に思い浮かべたあなたのサンカルパを、もう一度、心の中で3回繰り返します。', audioKey: 'voice-nidra10-sankalpa-repeat' },
      { atSec: 490, type: 'voice', text: '今、あなたの体が床やマットの上に横たわっている感覚を感じます。衣服が肌に触れている感覚。部屋の空気。周囲の気配。少しずつ、今いる場所へ意識を戻していきます。', audioText: '今、あなたのからだが床やマットの上に横たわっている感覚を感じます。衣服が肌に触れている感覚。部屋の空気。周囲の気配。少しずつ、今いる場所へ意識を戻していきます。', audioKey: 'voice-nidra10-return-awareness' },
      { atSec: 510, type: 'voice', text: 'ここからは、心と体をさらに深いリラクゼーションの中へと委ねます。何かをしようとせず、ただ静けさの中で休んでいきます。', audioText: 'ここからは、心とからだをさらに深いリラクゼーションの中へと委ねます。何かをしようとせず、ただ静けさの中で休んでいきます。', audioKey: 'voice-nidra10-deep-rest' },
      { atSec: 510, type: 'silence', durationSec: 60 },
      { atSec: 570, type: 'voice', text: '準備ができたら、ゆっくりと意識を体へ戻していきましょう。手の指先。足の指先。少しずつ、やさしく動かしていきます。', audioText: '準備ができたら、ゆっくりと意識をからだへ戻していきましょう。手の指先。足の指先。少しずつ、やさしく動かしていきます。', audioKey: 'voice-nidra10-return' },
      { atSec: 585, type: 'voice', text: '両足を中央へそろえます。両腕を伸ばし、体をゆっくり大きく伸ばします。深くひと呼吸。準備ができたら、ゆっくりと目を開けてください。ヨガニードラを終了します。', audioText: '両足を中央へそろえます。両腕を伸ばし、からだをゆっくり大きく伸ばします。深くひと呼吸。準備ができたら、ゆっくりと目を開けてください。ヨガニードラを終了します。', audioKey: 'voice-nidra10-ending' },
      { atSec: 600, type: 'complete', text: 'お疲れさまでした' },
    ],
    visual: { type: 'minimal' },
    knowledge: {
      knowledgeEntryId: null,
      verified: false,
      professionalYogaRelated: false,
    },
    status: 'active',
  },
  {
    id: 'mindfulness-1min',
    nameJa: '1分マインドフルネス',
    nameEn: 'One Minute Mindfulness',
    category: 'mindfulness',
    durationSec: 60,
    description: '短いガイドのあと、静寂の時間を過ごす1分間の瞑想。',
    timeline: [
      { atSec: 0, type: 'voice', text: '楽な姿勢で、自然な呼吸に戻ります。今ここにある呼吸や身体の感覚に静かに意識を向けてみましょう。', audioKey: 'voice-mindfulness-1min-intro' },
      { atSec: 22, type: 'silence', durationSec: 24, text: '今ここにある感覚に意識を向けます' },
      { atSec: 46, type: 'voice', text: 'ゆっくり意識を身体に戻します。準備ができたら目を開けましょう。', audioKey: 'voice-mindfulness-1min-outro' },
      { atSec: 60, type: 'complete', text: 'お疲れさまでした' },
    ],
    visual: { type: 'minimal' },
    knowledge: {
      knowledgeEntryId: null,
      knowledgeMasterId: 'YK-0307',
      zukanSlug: 'yk-0307',
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
