// @ts-nocheck
// YOAGAI 診断フロー (v4.5.1) — 新ページとして既存アプリに追加するTSX版
// 既存の診断には一切影響しません。App.tsx から <DiagnosisV2Page /> として呼び出します。
import React, { useState, useEffect } from "react";

/*
  YOAGAI — ヨガ診断フロー v4
  ═══════════════════════════════════════════════
  確定した設計:
  ● 進路の入口: 自分を整えたい / 人に伝えたい / 両方 / まだわからない
  ● 一般利用者ルート(完成): 領域(からだ・こころ) → 悩み(What) → 理由(Why・複数)
      → 目的(Goal・最優先1つ) → 実践条件 → 個別提案 → 呼吸の接続 → 記録
  ● 先生候補ルート(受け渡しまで): 現在の立場だけ確認 → 判定せず鏡返し → プロヨガ案内
  ● 「両方」はその日は一方に絞る(intent=bothは保持)。一般ルート後に先生ルートを再提示
  ● 「まだわからない」は整理の一問を挟んでから振り分け
  ● 記録の器は2種類を"型として"分離: conditionRecord(心身) / learningRecord(学習)
  ● 保持データ(安定IDで保存。表示ラベルとは分離):
      flowVersion, contentVersion,
      userIntent   … 本人の関心(self/teach/both/unknown)
      activeRoute  … 今回実際に進んだルート(self/teach) ← userIntentとは別物
      track, primaryIssue, reasons[], primaryGoal, pref, life, teachingStatus
  ※ 流派の割当・結果文言は仮。先生ルートの制度固有判定は入れない(認定制度が未確定)。
  ※ v4.1: 鏡返しはテンプレート組み立て(自由作文させない)。断定表現を避ける。
*/

const FLOW_VERSION = "v4.5.1";
const CONTENT_VERSION = "content-v1"; // ヨガ内容(流派割当・文言)のバージョン。教科書反映時に上げる
const RECIPE_VERSION = "weight-recipe-1"; // レシピ判定ロジックのバージョン
const SAFETY_VERSION = "puffiness-safety-1"; // 安全確認ロジックのバージョン

// 診断回答 → 保存ペイロード(安定IDのみ。日本語ラベルは保存しない)
function buildDiagnosisPayload(ans) {
  return {
    flowVersion: FLOW_VERSION,
    contentVersion: CONTENT_VERSION,
    recipeVersion: RECIPE_VERSION,
    safetyVersion: SAFETY_VERSION,
    userIntent: ans.userIntent || null,      // self / teach / both
    activeRoute: ans.activeRoute || null,     // self(diagnostic|practice) / teach
    activeSubroute: ans.activeSubroute || null, // body_condition など
    teacherInterest: !!ans.teacherInterest,   // 先生への関心は別管理
    // 入口の願い(この診断時点の不変記録)。primaryWish は"入口の主題"
    entryWishes: ans.wishes || [],
    primaryWish: ans.primaryWish || null,
    secondaryWishes: ans.secondaryWishes || [],
    trackHint: ans.trackHint || null,         // 一問目から得られるのはヒント
    track: ans.track || null,
    // 診断中に確定。primaryGoal は primaryWish とは別物(目指す状態)
    currentIssue: ans.current_issue || null,
    reasons: ans.reason || [],
    primaryGoal: ans.primary_goal || null,
    practicePreferences: { pref: ans.pref || null },
    lifestyleContext: { life: ans.life || null },
    weightBranch: ans.primaryWish === "lose_weight" ? {
      weightFocus: ans.weightFocus || null,
      startPreference: ans.startPreference || null,
      practiceRecipe: buildPracticeRecipe(ans),
      // 安全確認の結果は最小限のみ(詳細フラグは保存しない)
      safetyOutcome: ans.safetyOutcome || (ans.weightFocus === "puffiness" ? "cleared" : null),
    } : null,
    teachingStatus: ans.teaching_status || null,
  };
}

// 記録の器①: 心身(一般利用者)。保存されるのはこれだけ
function buildConditionRecord(ans, styleId, userId, sessionId, sourceFlow = "diagnostic", recordType = "baseline") {
  const b = ans.baseline || {};
  return {
    userId: userId || null,
    sessionId: sessionId || null,
    recordedAt: new Date().toISOString(),
    sourceFlow,   // diagnostic / practice
    recordType,   // baseline / before_practice / after_practice / periodic
    issueId: ans.current_issue || null,
    reasons: ans.reason || [],
    goalId: ans.primary_goal || ans.practiceGoal || null,
    practiceId: styleId || null,
    bodyCondition: b.bodyCondition ?? null,
    mentalCondition: b.mentalCondition ?? null,
    breathEase: b.breathEase ?? null,
    energyLevel: b.energyLevel ?? null,
  };
}

// 変わりにくい情報は practiceProfile に(時系列の conditionRecord とは分離)
function buildPracticeProfile(ans) {
  return {
    experienceStatus: ans.experienceStatus || null,
    currentFocuses: ans.wishes || [], // 現在の関心(後から編集可)。診断のentryWishes(不変)とは別
    practiceStyleIds: ans.practiceStyleIds || [],
    practiceSetting: ans.practiceSetting || null,
    durationBucket: ans.durationBucket || null,
    frequencyBucket: ans.frequencyBucket || null,
    primaryGoal: ans.practiceGoal || null,
    practiceBarrier: ans.practiceBarrier || null,
    studioName: ans.studioName || null,   // 任意・保存後
    teacherName: ans.teacherName || null, // 任意・保存後
    listingStatus: "private", // private → 掲載候補 → 確認 → 公開。自動公開しない
  };
}

// 記録の器②: 学習(先生候補)。v4.1では空のまま。混ざらないよう最初から別型
function buildLearningRecord(ans, userId) {
  return {
    userId: userId || null,
    recordedAt: new Date().toISOString(),
    learningItemId: null,
    learningStatus: null,
    teachingExperience: ans.teaching_status || null,
  };
}

const C = {
  paper: "#F7F2E7", card: "#FFFDF7", ink: "#23201B",
  indigo: "#1C3D5A", indigoDeep: "#132A40",
  saffron: "#E0A03A", saffronSoft: "#F5E4C0",
  muted: "#8A8172", line: "#E4DBC8", ok: "#3E7C5A",
  body: "#C15B3C", mind: "#3E6E8E", teach: "#7A5A9E",
};
const serif = '"Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif';
const sans = '"Hiragino Sans","Yu Gothic","Noto Sans JP",system-ui,sans-serif';

// ═══ 一問目 = ユーザーの「願い」(生徒向けのみ・複数選択) ═══
// 表向きは具体的な願い。裏で track のヒントに振り分ける(結果は主軸だけでは決めない)
// 先生系の願いはここに混ぜない → TEACH_WISHES として別枠CTAに置く
const WISHES = [
  { v: "lose_weight", label: "痩せたい・体を引き締めたい", track: "body" },
  { v: "beauty", label: "美しくなりたい", track: "body" },
  { v: "anti_aging", label: "老化と上手に付き合いたい（更年期を感じる）", track: "mind" },
  { v: "relieve_stiff", label: "肩・首・腰を楽にしたい", track: "body" },
  { v: "less_fatigue", label: "疲れを残しにくくしたい", track: "body" },
  { v: "reduce_stress", label: "ストレスを減らしたい・落ち着きたい", track: "mind" },
  { v: "sleep_better", label: "よく眠れるようになりたい", track: "mind" },
  { v: "flexibility", label: "体を柔らかくしたい", track: "body" },
  { v: "know_fit", label: "自分に合うヨガを知りたい", track: null },
  { v: "unsure", label: "まだ分からない・とりあえず知りたい", track: null },
];
const WISH_BY_V = Object.fromEntries(WISHES.map((w) => [w.v, w]));
// 先生系(別枠CTA)。選んでも生徒のwishesには入らない → teacherInterestで持つ
const TEACH_WISHES = [
  { v: "teach", label: "ヨガを人に伝えられるようになりたい" },
  { v: "better_teacher", label: "もっと良い先生になりたい" },
  { v: "deepen_knowledge", label: "ヨガの知識を深めたい" },
];

// 「両方」→ その日の開始ルート
const BOTH_START = [
  { v: "self", label: "まず自分のこころとからだを整える" },
  { v: "teach", label: "まず人に伝えるための道を知る" },
];

// 「まだ分からない」→ 整理の一問
const UNKNOWN_SORT = [
  { v: "self", label: "自分の調子を整えたい" },
  { v: "self", label: "ヨガをもっと深く知りたい" },
  { v: "teach", label: "人に伝えることにも興味がある" },
  { v: "check", label: "本当にまだ分からない" },
];

// ═══ 一般ルート: 領域 ═══
const TRACKS = [
  { v: "body", label: "からだ", sub: "こり・疲れ・引き締め・柔軟" },
  { v: "mind", label: "こころ", sub: "ストレス・不安・眠り・集中" },
  { v: "both", label: "どちらも", sub: "" },
  { v: "check", label: "まだ分からない", sub: "簡単なチェックで" },
];
const TRACK_CHECK = [
  { v: "body", label: "体が重い・こっている" },
  { v: "mind", label: "気持ちがざわつく・休まらない" },
  { v: "mind", label: "どちらもある（まず呼吸から）" },
];

// ═══ ① 悩み(What): 今ある状態 ═══
const ISSUES = {
  body: [
    { v: "shoulder", label: "肩や首がこる" },
    { v: "back", label: "腰が重い・張る" },
    { v: "tired", label: "疲れが抜けない" },
    { v: "shape", label: "体型・むくみが気になる" },
    { v: "stiff", label: "体が硬い" },
  ],
  mind: [
    { v: "stress", label: "ストレスを感じる" },
    { v: "restless", label: "気持ちが落ち着かない" },
    { v: "busy_head", label: "頭の中が休まらない" },
    { v: "sleep", label: "眠りが浅い" },
    { v: "down", label: "気分が晴れない" },
  ],
};

// ═══ ② 理由(Why): 背景・きっかけ / 複数選択(最大2) ═══
const REASONS = {
  body: [
    { v: "desk", label: "デスクワークが多い" },
    { v: "inactive", label: "運動不足が気になる" },
    { v: "failed", label: "他の運動が続かなかった" },
    { v: "age", label: "年齢による変化を感じる" },
    { v: "rhythm", label: "生活リズムが乱れている" },
  ],
  mind: [
    { v: "work", label: "仕事や人間関係の緊張が続く" },
    { v: "notime", label: "自分の時間がない" },
    { v: "care", label: "家事や育児で気が休まらない" },
    { v: "vague", label: "このままではよくない気がする" },
    { v: "rhythm", label: "生活リズムが乱れている" },
  ],
};

// ═══ ③ 目的(Goal): 目指す状態 / 最優先1つ ═══
const GOALS = {
  body: [
    { v: "loosen", label: "疲れをためにくい体になりたい" },
    { v: "flex", label: "柔らかく、動きやすくなりたい" },
    { v: "light", label: "軽やかに動ける体になりたい" },
    { v: "habit", label: "無理なく運動を続けたい" },
  ],
  mind: [
    { v: "switch", label: "心を切り替える時間がほしい" },
    { v: "calm", label: "穏やかで、振り回されない心に" },
    { v: "rest", label: "落ち着いて眠れるようになりたい" },
    { v: "aware", label: "自分の状態に気づけるようになりたい" },
  ],
};

// ═══ 実践条件(嗜好で流派を出し分け) ═══
const PREF = {
  body: { q: "体を動かす感覚は、どれが近い？", tag: "実践条件", opts: [
    { v: "active", label: "しっかり動いて汗をかきたい" },
    { v: "sweat", label: "ほどよく汗をかきたい" },
    { v: "gentle", label: "ゆっくり静かに動きたい" },
    { v: "easy", label: "運動は苦手・不安" },
  ]},
  mind: { q: "今の気持ちに近いのは？", tag: "実践条件", opts: [
    { v: "release", label: "動いて発散したい" },
    { v: "quiet", label: "静かに落ち着きたい" },
    { v: "rest", label: "とにかく休みたい" },
    { v: "meditate", label: "じっくり向き合いたい" },
  ]},
};

// ═══ ライフステージ(記録して変化を追う) ═══
const LIFE = [
  { v: "single", label: "独身・自分中心の生活" },
  { v: "married", label: "結婚・パートナーと" },
  { v: "preg", label: "妊娠中" },
  { v: "post", label: "産後・子育て中" },
  { v: "mid", label: "更年期・体調の変化を感じる" },
  { v: "free", label: "時間に少し余裕が出てきた" },
];

// ═══ 痩せ主軸の専用分岐(2問＋安全確認) ═══
// タイプを流派に直結させない。体重の因果を断定する表現(体質・代謝など)は使わない
const W_FOCUS = [
  { v: "silhouette", label: "鏡や服で、体のラインをすっきり感じたい" },
  { v: "mobility", label: "体を軽く、動きやすくしたい" },
  { v: "metrics", label: "体重・腹囲・体脂肪など、数値の変化も追いたい" },
  { v: "puffiness", label: "むくみ感や重だるさをすっきりさせたい" },
];
const W_START = [
  { v: "short_habit", label: "短時間から習慣にしたい" },
  { v: "gentle", label: "運動が苦手なので、やさしく始めたい" },
  { v: "dynamic", label: "しっかり動いて達成感を得たい" },
  { v: "complement", label: "すでに運動している。ヨガを組み合わせたい" },
];
// むくみ感選択時の安全確認。緊急度を3段階に分ける(緊急/早急/通常)
// 該当→診断・レシピを出さず、段階に応じた行動案内へ
const W_REDFLAGS = [
  { v: "breath", label: "急な息苦しさがある", level: "urgent" },
  { v: "chest", label: "胸の痛み・圧迫感がある", level: "urgent" },
  { v: "faint", label: "失神・意識が遠のく感じがある", level: "urgent" },
  { v: "one_side", label: "片側だけが急に腫れている", level: "prompt" },
  { v: "pain", label: "痛み・赤み・熱感がある", level: "prompt" },
  { v: "persistent", label: "原因不明のむくみが続く・繰り返す・悪化する", level: "routine" },
];
// 選んだレッドフラッグ群から最も高い緊急度を返す
function highestSafetyLevel(selected) {
  const order = { urgent: 3, prompt: 2, routine: 1 };
  let top = null, topScore = 0;
  for (const v of selected) {
    const f = W_REDFLAGS.find((x) => x.v === v);
    if (f && order[f.level] > topScore) { topScore = order[f.level]; top = f.level; }
  }
  return top;
}
const W_FOCUS_LABEL = { silhouette: "体のラインをすっきりさせること", mobility: "体を軽く、動きやすくすること", metrics: "数値の変化も確かめること", puffiness: "むくみ感や重だるさをやわらげること" };

// 条件 → practiceRecipe。流派を先に決めず、要素を組んでから近い流派を候補表示する
// 条件 → practiceRecipe。入力の役割を明示:
//   weightFocus → 記録する変化と実践の重点 / startPreference → 時間・強度・ペース
//   experienceStatus → 難易度の上限 / currentIssue → 避ける条件(呼び出し側で加味)
//   primaryGoal → 結果文・継続目標 / safety → レッドフラッグ時はここに来ない
//   reasons[] は運動判定に使わず、鏡返しと習慣化の助言にのみ用いる
function buildPracticeRecipe(ans) {
  const start = ans.startPreference;
  const exp = ans.experienceStatus;
  const beginnerish = exp === "new" || exp === "beginner";
  const reasonCodes = [];
  let intensity = "moderate", pace = "steady", strength = "medium", mobility = "medium";
  if (start === "gentle") { intensity = "gentle"; pace = "slow"; strength = "low"; reasonCodes.push("gentle_start"); }
  else if (start === "dynamic") { intensity = "dynamic"; pace = "flow"; strength = "high"; reasonCodes.push("dynamic_start"); }
  else if (start === "short_habit") { intensity = "gentle"; pace = "steady"; strength = "low"; reasonCodes.push("short_habit"); }
  else if (start === "complement") { intensity = "moderate"; pace = "flow"; strength = "medium"; reasonCodes.push("complement_activity"); }
  if (beginnerish) reasonCodes.push("beginner");
  if (beginnerish && intensity === "dynamic") { intensity = "moderate"; reasonCodes.push("capped_for_beginner"); }
  if (ans.weightFocus === "mobility") { mobility = "high"; reasonCodes.push("mobility_focus"); }
  if (ans.weightFocus === "silhouette") { strength = strength === "low" ? "medium" : strength; reasonCodes.push("silhouette_focus"); }
  const durationMinutes = start === "short_habit" ? 10 : start === "gentle" ? 15 : 20;
  return {
    intensity, pace, strengthComponent: strength, mobilityComponent: mobility,
    breathEmphasis: "動きのペース調整と、力み・疲れへの気づき",
    durationMinutes,
    suggestedFrequency: start === "short_habit" ? "毎日みじかく" : "週2〜3回",
    environment: "room_temperature",
    reasonCodes,
  };
}
// レシピに「近い」流派候補(固定対応ではなく候補)。経験で出し分け
function candidateStyles(recipe, ans) {
  const beginnerish = ans.experienceStatus === "new" || ans.experienceStatus === "beginner";
  if (recipe.intensity === "gentle") {
    return beginnerish ? ["基礎ハタ", "やさしいフロー"] : ["ハタ", "陰ヨガ（休息を兼ねて）"];
  }
  if (recipe.intensity === "dynamic") {
    return beginnerish ? ["ハタから、少しずつ動きを足す"] : ["ヴィンヤサ", "パワーヨガ"];
  }
  return beginnerish ? ["基礎ハタ", "ゆるやかなヴィンヤサ"] : ["ヴィンヤサ", "ハタ"];
}
// 変化の主軸に応じた記録項目(体重を主役にしない・任意指標は任意)
const W_RECORD_ITEMS = {
  silhouette: ["服の着心地", "姿勢の実感", "（任意）腹囲を同じ条件で"],
  mobility: ["体の軽さ", "疲れにくさ", "動ける時間"],
  metrics: ["体の軽さ", "実践頻度", "（任意）体重・腹囲・体脂肪を同じ条件で"],
  puffiness: ["重だるさ", "実践前後の感じ", "時間帯・左右差"],
};

// ═══ 経験確認(「自分を整えたい」の後。経験でルートを固定しない) ═══
const EXPERIENCE = [
  { v: "new", label: "これから始めたい", sub: "" },
  { v: "beginner", label: "始めたばかり", sub: "" },
  { v: "continuing", label: "今も続けている", sub: "記録か診断かを選べます" },
  { v: "returning", label: "以前していて、再開したい", sub: "記録か診断かを選べます" },
];

// ═══ 実践カルテ(経験者) ═══
const P_STYLES = [
  { v: "hatha", label: "ハタヨガ" },
  { v: "vinyasa", label: "ヴィンヤサ" },
  { v: "ashtanga", label: "アシュタンガ / パワー" },
  { v: "hot", label: "ホットヨガ" },
  { v: "yin", label: "陰ヨガ / リストラティブ" },
  { v: "raja", label: "瞑想・呼吸中心" },
  { v: "unsure", label: "種類はよく分からない" },
];
const P_SETTINGS = [
  { v: "studio", label: "スタジオ・教室に通っている" },
  { v: "online", label: "オンラインレッスン" },
  { v: "home_guided", label: "自宅で動画などを見ながら" },
  { v: "home_self", label: "自宅で自主練習" },
];
const P_DURATION = [
  { v: "lt3m", label: "3か月未満" },
  { v: "3to6m", label: "3〜6か月" },
  { v: "6to12m", label: "半年〜1年" },
  { v: "1to3y", label: "1〜3年" },
  { v: "gt3y", label: "3年以上" },
];
const P_FREQUENCY = [
  { v: "daily", label: "ほぼ毎日" },
  { v: "weekly2", label: "週に2〜3回" },
  { v: "weekly1", label: "週に1回" },
  { v: "monthly", label: "月に数回" },
  { v: "irregular", label: "不定期" },
];
// 必須①: 実感したい変化
const P_GOALS = [
  { v: "less_fatigue", label: "日常でも疲れを残しにくくしたい" },
  { v: "flexibility", label: "柔軟性をもっと高めたい" },
  { v: "strength", label: "体幹・力強さを育てたい" },
  { v: "calm", label: "心を穏やかに保ちたい" },
  { v: "sleep", label: "眠りを深くしたい" },
  { v: "breath", label: "呼吸を深められるようになりたい" },
  { v: "deepen", label: "ヨガをもっと深く理解したい" },
];
// 必須②: 迷い・停滞(先生/教室の評価ではなく本人の体験として)
const P_BARRIERS = [
  { v: "no_change", label: "変化が分かりにくい" },
  { v: "unstable_pace", label: "続けるペースが安定しない" },
  { v: "breath_unclear", label: "呼吸の使い方が分からない" },
  { v: "pose_unstable", label: "ポーズがなかなか安定しない" },
  { v: "outside_studio", label: "教室以外で何をすればいいか迷う" },
  { v: "body_worry", label: "体に不安を感じる動きがある" },
  { v: "want_deeper", label: "もっと深く学びたい" },
  { v: "none", label: "特に困っていない" },
];
// 初回コンディション(比較の基準。1-7)
const BASELINE_DIMS = [
  { key: "bodyCondition", label: "体の軽さ", low: "重い", high: "軽い" },
  { key: "mentalCondition", label: "心の落ち着き", low: "ざわつく", high: "穏やか" },
  { key: "breathEase", label: "呼吸のしやすさ", low: "浅い", high: "深い" },
  { key: "energyLevel", label: "気力・エネルギー", low: "低い", high: "高い" },
];

// ラベル辞書(実践カルテの鏡返し用)
const P_STYLE_LABEL = { hatha: "ハタヨガ", vinyasa: "ヴィンヤサヨガ", ashtanga: "アシュタンガ", hot: "ホットヨガ", yin: "陰ヨガ", raja: "瞑想・呼吸中心のヨガ", unsure: "ヨガ" };
const P_SETTING_LABEL = { studio: "スタジオ", online: "オンライン", home_guided: "自宅で動画を見ながら", home_self: "自宅の自主練習" };
const P_DURATION_LABEL = { lt3m: "3か月ほど", "3to6m": "半年ほど", "6to12m": "1年ほど", "1to3y": "数年", gt3y: "長く" };
const P_FREQ_LABEL = { daily: "ほぼ毎日", weekly2: "週2〜3回", weekly1: "週1回", monthly: "月数回", irregular: "不定期に" };
const P_GOAL_LABEL = { less_fatigue: "日常でも疲れを残しにくくすること", flexibility: "柔軟性を高めること", strength: "体幹を育てること", calm: "心を穏やかに保つこと", sleep: "眠りを深くすること", breath: "呼吸を深めること", deepen: "ヨガを深く理解すること" };
const P_BARRIER_LABEL = { no_change: "変化が見えにくい", unstable_pace: "ペースが安定しない", breath_unclear: "呼吸の使い方に迷いがある", pose_unstable: "ポーズが安定しない", outside_studio: "教室の外での実践に迷いがある", body_worry: "体に不安な動きがある", want_deeper: "もっと深く学びたい", none: "" };

// 実感したい変化に応じて「追うとよい記録」を提案
const TRACK_SUGGESTION = {
  less_fatigue: ["実践前後の疲れ", "翌日の体の軽さ", "呼吸の落ち着き"],
  flexibility: ["前屈などの届く範囲", "こわばりの強い部位", "実践後の可動域"],
  strength: ["キープできる秒数", "ぐらつきの少なさ", "実践後の充実感"],
  calm: ["実践前後の心の落ち着き", "眠りの質", "呼吸の深さ"],
  sleep: ["寝つきの早さ", "夜中に目覚める回数", "朝の目覚めの軽さ"],
  breath: ["一呼吸の長さ", "呼吸の深さ", "実践後の落ち着き"],
  deepen: ["学んだ気づき", "呼吸と動きのつながり", "集中の深まり"],
};

// ═══ 先生候補ルート: 現在の立場(判定しない) ═══
const TEACH_STATUS = [
  { v: "start", label: "これから学び始めたい" },
  { v: "learning", label: "学んでいる途中" },
  { v: "certified", label: "資格や指導経験がある" },
  { v: "teaching", label: "すでに教えている" },
  { v: "undecided", label: "まだ具体的には決めていない" },
];
const TEACH_MIRROR = {
  start: "これから、人に伝えるために学びたい段階ですね。",
  learning: "今まさに、学びを深めている途中なのですね。",
  certified: "すでに資格や指導の経験をお持ちなのですね。",
  teaching: "すでに現場で教えていらっしゃるのですね。",
  undecided: "伝えることに、少し関心が芽生えている段階ですね。",
};

// ═══ 流派の出し分け(仮) ═══
// 安定ID(STYLESのキー)を返す。保存にはこのIDを使う
function pickStyleId(track, pref) {
  if (track === "body") {
    if (pref === "active") return "ashtanga";
    if (pref === "sweat") return "hot";
    if (pref === "gentle") return "breathHatha";
    return "baseHatha";
  }
  if (pref === "release") return "vinyasa";
  if (pref === "quiet") return "pranaSit";
  if (pref === "rest") return "nidra";
  return "raja";
}
function pickStyle(track, pref) {
  return STYLES[pickStyleId(track, pref)];
}
const STYLES = {
  ashtanga: { name: "アシュタンガ / パワーヨガ", match: 93, lead: "呼吸に、力強い動きを重ねるヨガ",
    body: "決まった流れを呼吸に合わせて続ける、運動量の高いスタイル。しっかり動いて汗をかきたいあなたに。",
    first: "太陽礼拝（Surya Namaskara A）", breath: "激しい動きこそ、呼吸が乱れを整える錨になります。" },
  hot: { name: "ホットヨガ / ヴィンヤサ", match: 91, lead: "温かい中で、流れるように動くヨガ",
    body: "発汗を促し、代謝と巡りを高めるスタイル。ほどよく汗をかいてスッキリしたいあなたに。",
    first: "立位のフロー（戦士のポーズの連続）", breath: "汗を流しながらも、呼吸のリズムが動きを支えます。" },
  breathHatha: { name: "呼吸を軸にしたハタ / 陰ヨガ", match: 94, lead: "呼吸から整える、静かなヨガ",
    body: "ゆっくりした呼吸に動きを預け、こわばりをほどきます。静かに動きたいあなたに。",
    first: "猫と牛のポーズ（Marjaryasana / Bitilasana）", breath: "深い呼吸そのものが、代謝と姿勢を変えていきます。" },
  baseHatha: { name: "基礎ハタヨガ", match: 90, lead: "基本から、ていねいに積むヨガ",
    body: "一つずつポーズを整える、いちばんやさしい入口。運動が苦手でも大丈夫。慣れたら動きのあるルートへ。",
    first: "椅子や壁を使った、やさしいポーズ", breath: "まずは呼吸に慣れることから始めましょう。" },
  vinyasa: { name: "動的ハタ / ヴィンヤサ", match: 89, lead: "動いて、心の乱れを体から抜くヨガ",
    body: "あえて体を動かすことで、もやもやを発散させます。動いた後の静けさが、心を整えます。",
    first: "立位のフロー", breath: "動いた後の呼吸が、乱れた心を鎮めます。" },
  pranaSit: { name: "呼吸法（プラーナーヤーマ）＋坐法", match: 95, lead: "呼吸と坐から、心を静めるヨガ",
    body: "落ち着かない心には、まず呼吸と坐り方から。ラージャヨガ（瞑想の道）の入口です。",
    first: "ボックス呼吸（4-4-4-4）と楽な坐法", breath: "呼吸を整えることは、心を整えることそのものです。" },
  nidra: { name: "ヨガニードラ / 陰ヨガ", match: 92, lead: "深く休む、眠りのヨガ",
    body: "横たわったまま、体と心を深く休ませます。眠りが浅い、疲れが抜けないあなたに。",
    first: "ヨガニードラ（横たわる誘導）", breath: "ゆっくりした呼吸が、眠りの質を変えていきます。" },
  raja: { name: "ラージャヨガ（瞑想・八支則）", match: 96, lead: "心を整える、ヨガの王道",
    body: "瞑想を軸とした八支則の道。静かに自分と向き合い、心を深めたいあなたに。",
    first: "呼吸を数える瞑想から", breath: "八支則では、呼吸が体と心をつなぐ結節点にあります。" },
};

// ═══ ラベル辞書(鏡返し用) ═══
const ISSUE_LABEL = {
  shoulder: "肩や首のこり", back: "腰の重さ", tired: "抜けない疲れ", shape: "体型やむくみ", stiff: "体の硬さ",
  stress: "ストレス", restless: "落ち着かない気持ち", busy_head: "休まらない頭", sleep: "浅い眠り", down: "晴れない気分",
};
const REASON_LABEL = {
  desk: "デスクワークが多い", inactive: "運動不足", failed: "他の運動が続かなかった", age: "年齢による変化",
  rhythm: "生活リズムの乱れ", work: "仕事や人間関係の緊張", notime: "自分の時間のなさ", care: "家事や育児での気疲れ",
  vague: "このままではという思い",
};
const GOAL_LABEL = {
  loosen: "疲れをためにくい体", flex: "柔らかく動きやすい体", light: "軽やかに動ける体", habit: "続けられる運動習慣",
  switch: "心を切り替える時間", calm: "振り回されない穏やかな心", rest: "落ち着いて眠れる毎日", aware: "自分に気づける感覚",
};

// 鏡返し文の組み立て(自由作文させず、選んだ内容を確認する形。原因・改善・治すと断定しない)
function buildMirror(reasons, issue, goal) {
  let line1;
  if (reasons.length === 2) {
    line1 = `背景として「${reasons[0]}」「${reasons[1]}」を選び、今は${issue}を感じているのですね。`;
  } else if (reasons.length === 1) {
    line1 = `「${reasons[0]}」という背景があり、今は${issue}を感じているのですね。`;
  } else {
    line1 = `今、${issue}を感じているのですね。`;
  }
  const line2 = `あなたがいちばん目指したいのは、${goal}です。`;
  return { line1, line2 };
}

export default function DiagnosisV2Page() {
  const [stage, setStage] = useState("intro");
  const [ans, setAns] = useState({ reason: [] });
  const [demoReturning, setDemoReturning] = useState(false);

  const track = ans.track;
  const merge = (obj) => setAns((a) => ({ ...a, ...obj }));
  const reset = () => { setStage("intro"); setAns({ reason: [] }); setDemoReturning(false); };
  // activeRoute = 今回実際に進んだルート(userIntent=本人の関心 とは別に保持)
  const goSelf = (extra = {}) => { merge({ activeRoute: "self", ...extra }); setStage("experience"); };
  const goTeach = (extra = {}) => { merge({ activeRoute: "teach", ...extra }); setStage("teach"); };
  // 生徒の願いから主軸を確定。primaryWishは"入口の主題"であって結果を単独決定しない
  // (最終結果は悩み・理由・primaryGoal・経験・実践条件も反映)
  const applyPrimaryWish = (v) => {
    const w = WISH_BY_V[v];
    const secondary = (ans.wishes || []).filter((x) => x !== v);
    const teacherInterest = !!ans.teacherInterest;
    merge({
      primaryWish: v,
      secondaryWishes: secondary,
      trackHint: w?.track || null,
      userIntent: teacherInterest ? "both" : "self",
      ...(w?.track ? { track: w.track } : {}),
    });
    if (v === "unsure") setStage("unknown_sort");
    else goSelf(w?.track ? { track: w.track } : {});
  };
  // 先生CTA(別枠)。生徒wishesと混ぜず teacherInterest で持つ
  const chooseTeacher = () => {
    const hasStudentWishes = (ans.wishes || []).length > 0;
    merge({ teacherInterest: true, userIntent: hasStudentWishes ? "both" : "teach" });
    goTeach();
  };
  // 診断カルテの入口。痩せ主軸なら専用の2問(＋安全確認)へ、それ以外は通常フロー
  const startDiagnostic = () => {
    if (ans.primaryWish === "lose_weight") setStage("w_focus");
    else setStage(ans.track ? "issue" : "track");
  };

  return (
    <div style={{ background: C.paper, minHeight: "100vh", fontFamily: sans }}>
      <style>{`
        @keyframes breathe{0%,100%{transform:scale(1);opacity:.85}50%{transform:scale(1.12);opacity:1}}
        @keyframes pulse{0%,100%{opacity:.25}50%{opacity:1}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .kbtn{transition:transform .12s ease,box-shadow .12s ease,border-color .12s ease}
        .kbtn:hover{transform:translateY(-2px)}
        .kbtn:focus-visible{outline:2px solid ${C.indigo};outline-offset:2px}
        .fade{animation:fadeUp .4s ease both}
        @media (prefers-reduced-motion:reduce){.breathe-dot,.pulse-dot{animation:none!important}.kbtn:hover{transform:none}.fade{animation:none}}
      `}</style>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "32px 20px 64px" }}>
        <Header />

        {stage === "intro" && <Intro onStart={() => setStage("intent")} />}

        {/* 一問目 = 願い(裏で進路に振り分け) */}
        {/* 一問目 = 生徒の願い(最大3・複数選択)。先生系は下部の別枠CTA */}
        {stage === "intent" && (
          <MultiScreen tag="はじめに" q="今、ヨガに何を求めていますか？" sub="気になるものを3つまで"
            accent={C.indigo} options={WISHES} selected={ans.wishes || []} max={3}
            onToggle={(v) => setAns((a) => {
              const cur = a.wishes || []; const has = cur.includes(v);
              const next = has ? cur.filter((x) => x !== v) : [...cur, v];
              return { ...a, wishes: next };
            })}
            onNext={() => {
              const sel = ans.wishes || [];
              if (sel.length <= 1) applyPrimaryWish(sel[0] || "unsure");
              else setStage("wish_primary");
            }}
            footer={
              <div style={{ marginTop: 26, paddingTop: 20, borderTop: `1px solid ${C.line}` }}>
                <p style={{ fontSize: 13, color: C.muted, margin: "0 0 10px" }}>ヨガを深く学び、人に伝えたい方へ</p>
                <button className="kbtn" onClick={chooseTeacher}
                  style={{ width: "100%", padding: "13px", borderRadius: 10, border: `1.5px solid ${C.teach}`,
                    background: "transparent", color: C.teach, fontSize: 14.5, fontFamily: sans, cursor: "pointer", fontWeight: 600 }}>
                  教えるための道を見る
                </button>
              </div>
            } />
        )}
        {/* 複数選んだら、主軸を1つ */}
        {stage === "wish_primary" && (
          <Screen tag="いちばんは？" q="その中で、今日いちばんは？" sub="主軸をひとつ選んでください（他も覚えています）">
            {(ans.wishes || []).map((v) => (
              <Choice key={v} label={WISH_BY_V[v]?.label} onClick={() => applyPrimaryWish(v)} />
            ))}
          </Screen>
        )}

        {/* 両方 → その日の開始 */}
        {stage === "both_start" && (
          <Screen tag="どちらから" q="今日は、どちらから始めますか？" sub="もう一方は、あとでご案内します">
            {BOTH_START.map((e) => (
              <Choice key={e.label} label={e.label} onClick={() => (e.v === "self" ? goSelf() : goTeach())} />
            ))}
          </Screen>
        )}

        {/* まだ分からない → 整理 */}
        {stage === "unknown_sort" && (
          <Screen tag="整理しましょう" q="今、少しでも近いと感じるのは？" sub="">
            {UNKNOWN_SORT.map((e) => (
              <Choice key={e.label} label={e.label} onClick={() => {
                if (e.v === "self") goSelf();
                else if (e.v === "teach") goTeach();
                else goSelf({ track: "mind" }); // 本当に不明→まず心(呼吸)へ
              }} />
            ))}
          </Screen>
        )}

        {/* 経験確認(「自分を整えたい」の後) */}
        {stage === "experience" && (
          <Screen tag="今のあなた" q="ヨガの経験で、近いのは？" sub="ここから合うカルテへご案内します">
            {EXPERIENCE.map((e) => (
              <Choice key={e.v} label={e.label} sub={e.sub} onClick={() => {
                merge({ experienceStatus: e.v });
                // 続けている/再開したい人は、記録か診断かを選べる
                if (e.v === "continuing" || e.v === "returning") setStage("exp_mode");
                else startDiagnostic();
              }} />
            ))}
          </Screen>
        )}
        {stage === "exp_mode" && (
          <Screen tag="続けている方へ" q="今日は、どちらをしますか？" sub="">
            <Choice label="今の実践を記録して、変化を見たい" sub="実践カルテ"
              onClick={() => { merge({ karteType: "practice" }); setStage("p_style"); }} />
            <Choice label="今の自分に合うヨガを、改めて知りたい" sub="診断カルテ"
              onClick={() => { merge({ karteType: "diagnostic" }); startDiagnostic(); }} />
          </Screen>
        )}

        {/* ── 一般ルート ── */}
        {stage === "track" && (
          <Screen tag="整えたい領域" q="今、いちばん整えたいのは？" sub="直感で選んでください">
            {TRACKS.map((e) => (
              <Choice key={e.label} label={e.label} sub={e.sub} onClick={() => {
                if (e.v === "check") setStage("track_check");
                else { merge({ track: e.v === "both" ? "mind" : e.v }); setStage("issue"); }
              }} />
            ))}
          </Screen>
        )}
        {stage === "track_check" && (
          <Screen tag="かんたんチェック" q="今の状態に近いのは？" sub="合う方へご案内します">
            {TRACK_CHECK.map((e) => (
              <Choice key={e.label} label={e.label} onClick={() => { merge({ track: e.v }); setStage("issue"); }} />
            ))}
          </Screen>
        )}

        {/* ── 痩せ主軸: 専用の2問＋安全確認 ── */}
        {stage === "w_focus" && (
          <Screen tag="① どこで変化を" q="どんな変化を、いちばん確かめたい？" sub="「引き締めたい」と感じたとき" accent={C.body}>
            {W_FOCUS.map((e) => (
              <Choice key={e.v} label={e.label} onClick={() => {
                merge({ weightFocus: e.v });
                if (e.v === "puffiness") setStage("w_safety"); // むくみ感は安全確認へ
                else setStage("w_start");
              }} />
            ))}
          </Screen>
        )}
        {stage === "w_safety" && (
          <MultiScreen tag="はじめに確認" q="次のような状態はありますか？" sub="当てはまるものを（なければ下のボタンへ）"
            accent={C.body} options={W_REDFLAGS} selected={ans.safetyFlags || []} max={W_REDFLAGS.length}
            onToggle={(v) => setAns((a) => {
              const cur = a.safetyFlags || []; const has = cur.includes(v);
              const next = has ? cur.filter((x) => x !== v) : [...cur, v];
              return { ...a, safetyFlags: next };
            })}
            nextLabel="この内容で進む"
            onNext={() => {
              const level = highestSafetyLevel(ans.safetyFlags || []);
              if (level) { merge({ safetyOutcome: level }); setStage("w_medical"); }
              else { merge({ activeSubroute: "body_condition" }); setStage("w_start"); }
            }}
            footer={
              <div style={{ marginTop: 16 }}>
                <button className="kbtn" onClick={() => { merge({ safetyFlags: [], activeSubroute: "body_condition" }); setStage("w_start"); }}
                  style={{ width: "100%", padding: "14px", borderRadius: 12, border: `1.5px solid ${C.line}`, background: C.card, color: C.ink, fontSize: 15, fontFamily: sans, cursor: "pointer" }}>
                  どれも当てはまらない
                </button>
              </div>
            } />
        )}
        {stage === "w_medical" && (
          <MedicalRedirect level={ans.safetyOutcome} onReset={reset} />
        )}
        {stage === "w_start" && (
          <Screen tag="② 始め方" q="続けられそうな始め方は？" sub="今のあなたに合いそうなものを" accent={C.body}>
            {W_START.map((e) => (
              <Choice key={e.v} label={e.label} onClick={() => {
                merge({ startPreference: e.v });
                setStage(ans.track ? "issue" : "track"); // 現在の状態・理由・目的へ続く
              }} />
            ))}
          </Screen>
        )}

        {stage === "issue" && track && (
          <Screen tag="① いまの悩み" q="今、気になっているのは？" sub="いちばん近いものを"
            accent={track === "body" ? C.body : C.mind}>
            {ISSUES[track].map((e) => (
              <Choice key={e.v} label={e.label} onClick={() => { merge({ current_issue: e.v }); setStage("reason"); }} />
            ))}
          </Screen>
        )}

        {/* 理由: 複数選択(最大2) */}
        {stage === "reason" && track && (
          <MultiScreen tag="② きっかけ・背景" q="そう感じる背景に、近いものは？" sub="2つまで選べます"
            accent={track === "body" ? C.body : C.mind}
            options={REASONS[track]} selected={ans.reason} max={2}
            onToggle={(v) => setAns((a) => {
              const has = a.reason.includes(v);
              const next = has ? a.reason.filter((x) => x !== v) : [...a.reason, v];
              return { ...a, reason: next };
            })}
            onNext={() => setStage("goal")} />
        )}

        {/* 目的: 最優先1つ */}
        {stage === "goal" && track && (
          <Screen tag="③ めざす姿" q="続けた先で、いちばん実感したい変化は？" sub="最優先のひとつを"
            accent={track === "body" ? C.body : C.mind}>
            {GOALS[track].map((e) => (
              <Choice key={e.v} label={e.label} onClick={() => { merge({ primary_goal: e.v }); setStage("pref"); }} />
            ))}
          </Screen>
        )}

        {stage === "pref" && track && (
          <Screen tag={PREF[track].tag} q={PREF[track].q} sub="答えに合わせて提案が変わります"
            accent={track === "body" ? C.body : C.mind}>
            {PREF[track].opts.map((e) => (
              <Choice key={e.v} label={e.label} onClick={() => { merge({ pref: e.v }); setStage("life"); }} />
            ))}
          </Screen>
        )}

        {stage === "life" && (
          <Screen tag="いまの暮らし" q="今の暮らしに近いのは？" sub="記録して、変化を見ていきます"
            accent={track === "body" ? C.body : C.mind}>
            {LIFE.map((e) => (
              <Choice key={e.v} label={e.label} onClick={() => { merge({ life: e.v }); setStage("analyzing"); }} />
            ))}
          </Screen>
        )}

        {stage === "analyzing" && <Analyzing onDone={() => setStage("result")} />}

        {stage === "result" && (
          ans.primaryWish === "lose_weight"
            ? <WeightResult ans={ans} onSave={() => setStage("wall")} />
            : <Result ans={ans} track={track} onSave={() => setStage("wall")} />
        )}

        {stage === "wall" && (
          <Wall onRegister={() => {
            // v4.1: 保存されるのは conditionRecord のみ(learningRecordには入れない)
            const styleId = pickStyleId(track, ans.pref);
            const payload = buildDiagnosisPayload(ans);
            const record = buildConditionRecord(ans, styleId);
            if (typeof console !== "undefined") { console.log("[diagnosis payload]", payload); console.log("[conditionRecord]", record); }
            // TODO(Supabase): ここで condition_record テーブルへ upsert
            setStage("saved");
          }} onBack={() => setStage("result")} />
        )}

        {stage === "saved" && (
          <Saved ans={ans} track={track} demoReturning={demoReturning}
            onToggleDemo={() => setDemoReturning((d) => !d)} onReset={reset}
            onTeach={() => { merge({ activeRoute: "teach" }); setStage("teach"); }} />
        )}

        {/* ── 実践カルテルート(経験者) ── */}
        {stage === "p_style" && (
          <MultiScreen tag="① 今の実践" q="今、どんなヨガをしていますか？" sub="近いものを（複数可）"
            accent={C.body} options={P_STYLES} selected={ans.practiceStyleIds || []} max={3}
            onToggle={(v) => setAns((a) => {
              const cur = a.practiceStyleIds || []; const has = cur.includes(v);
              const next = has ? cur.filter((x) => x !== v) : [...cur, v];
              return { ...a, practiceStyleIds: next };
            })} onNext={() => setStage("p_setting")} />
        )}
        {stage === "p_setting" && (
          <Screen tag="② 実践環境" q="どこで実践していますか？" sub="いちばん多いものを" accent={C.body}>
            {P_SETTINGS.map((e) => (
              <Choice key={e.v} label={e.label} onClick={() => { merge({ practiceSetting: e.v }); setStage("p_duration"); }} />
            ))}
          </Screen>
        )}
        {stage === "p_duration" && (
          <Screen tag="③ 続けた期間" q="どれくらい続けていますか？" sub="" accent={C.body}>
            {P_DURATION.map((e) => (
              <Choice key={e.v} label={e.label} onClick={() => { merge({ durationBucket: e.v }); setStage("p_frequency"); }} />
            ))}
          </Screen>
        )}
        {stage === "p_frequency" && (
          <Screen tag="④ 頻度" q="どれくらいの頻度で？" sub="" accent={C.body}>
            {P_FREQUENCY.map((e) => (
              <Choice key={e.v} label={e.label} onClick={() => { merge({ frequencyBucket: e.v }); setStage("p_goal"); }} />
            ))}
          </Screen>
        )}
        {/* 必須①: 実感したい変化 */}
        {stage === "p_goal" && (
          <Screen tag="⑤ 実感したい変化" q="今いちばん、実感したい変化は？" sub="最優先のひとつを" accent={C.body}>
            {P_GOALS.map((e) => (
              <Choice key={e.v} label={e.label} onClick={() => { merge({ practiceGoal: e.v }); setStage("p_barrier"); }} />
            ))}
          </Screen>
        )}
        {/* 必須②: 迷い・停滞(本人の体験として) */}
        {stage === "p_barrier" && (
          <Screen tag="⑥ 気になっていること" q="続ける中で、近いものはありますか？" sub="本人の実感として" accent={C.body}>
            {P_BARRIERS.map((e) => (
              <Choice key={e.v} label={e.label} onClick={() => { merge({ practiceBarrier: e.v }); setStage("p_baseline"); }} />
            ))}
          </Screen>
        )}
        {/* 初回コンディション(比較の基準) */}
        {stage === "p_baseline" && (
          <Baseline onDone={(vals) => { merge({ baseline: vals }); setStage("p_analyzing"); }} />
        )}
        {stage === "p_analyzing" && <Analyzing onDone={() => setStage("p_result")} />}
        {stage === "p_result" && <PracticeResult ans={ans} onSave={() => setStage("p_wall")} />}
        {stage === "p_wall" && (
          <Wall onRegister={() => {
            const profile = buildPracticeProfile(ans);
            const record = buildConditionRecord(ans, null, null, null, "practice", "baseline");
            if (typeof console !== "undefined") { console.log("[practiceProfile]", profile); console.log("[conditionRecord/baseline]", record); }
            // TODO(Supabase): practice_profile を upsert + condition_record(baseline) を insert
            setStage("p_studio");
          }} onBack={() => setStage("p_result")} />
        )}
        {/* 保存後の任意: 教室・先生の記録(初回必須にしない) */}
        {stage === "p_studio" && (
          <StudioOptional onDone={() => setStage("p_saved")} />
        )}
        {stage === "p_saved" && (
          <PracticeSaved ans={ans} onReset={reset}
            onTeach={() => { merge({ activeRoute: "teach" }); setStage("teach"); }} />
        )}

        {/* ── 先生候補ルート: 受け渡しまで ── */}
        {stage === "teach" && (
          <Screen tag="人に伝える" q="ヨガを人に伝えることについて、今のあなたは？" sub="今の立ち位置を教えてください"
            accent={C.teach}>
            {TEACH_STATUS.map((e) => (
              <Choice key={e.v} label={e.label} onClick={() => { merge({ teaching_status: e.v, teacher_route_status: "informed" }); setStage("teach_bridge"); }} />
            ))}
          </Screen>
        )}
        {stage === "teach_bridge" && (
          <TeachBridge ans={ans} onReset={reset} />
        )}
      </div>
    </div>
  );
}

function Header() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 26 }}>
      <span style={{ fontFamily: serif, fontSize: 18, color: C.indigo, letterSpacing: "0.04em" }}>
        YOAGAI <span style={{ fontSize: 12, color: C.muted, fontFamily: sans }}>ヨガ診断</span>
      </span>
      <span style={{ fontSize: 11, color: C.muted, letterSpacing: "0.1em" }}>無料</span>
    </div>
  );
}

function Intro({ onStart }) {
  return (
    <div className="fade">
      <p style={{ fontSize: 12, color: C.saffron, letterSpacing: "0.14em", marginBottom: 14, fontWeight: 600 }}>はじめての方へ</p>
      <h1 style={{ fontFamily: serif, fontSize: 29, lineHeight: 1.5, color: C.ink, margin: "0 0 18px", fontWeight: 600 }}>
        ヨガに興味はあるけれど、<br />何から始めればいいか<br />分からない方へ。
      </h1>
      <p style={{ fontSize: 15, lineHeight: 1.9, color: C.muted, margin: "0 0 32px" }}>
        YOAGAIが、あなたの悩み・きっかけ・目指したい姿をうかがい、
        今のあなたに合ったヨガの入り口をご提案します。登録は不要です。
      </p>
      <Primary onClick={onStart}>診断を始める</Primary>
      <p style={{ fontSize: 12, color: C.muted, marginTop: 16, textAlign: "center" }}>結果は無料で見られます</p>
    </div>
  );
}

function Screen({ tag, q, sub, accent = C.indigo, children }) {
  return (
    <div className="fade">
      <p style={{ fontSize: 12, color: accent, letterSpacing: "0.1em", margin: "0 0 8px", fontWeight: 600 }}>{tag}</p>
      <h2 style={{ fontFamily: serif, fontSize: 23, color: C.ink, margin: "0 0 6px", fontWeight: 600, lineHeight: 1.45 }}>{q}</h2>
      {sub && <p style={{ fontSize: 13, color: C.muted, margin: "0 0 22px" }}>{sub}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: sub ? 0 : 18 }}>{children}</div>
    </div>
  );
}

function Choice({ label, sub, onClick }) {
  return (
    <button className="kbtn" onClick={onClick}
      style={{ textAlign: "left", padding: "15px 18px", borderRadius: 12, border: `1.5px solid ${C.line}`,
        background: C.card, color: C.ink, fontFamily: sans, cursor: "pointer", boxShadow: "0 1px 0 rgba(0,0,0,0.02)" }}>
      <div style={{ fontSize: 15.5 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{sub}</div>}
    </button>
  );
}

// 複数選択画面。max到達後は未選択を押しても無反応(自動解除しない)。footerで別枠CTA可
function MultiScreen({ tag, q, sub, accent, options, selected, max, onToggle, onNext, footer, nextLabel }) {
  const atMax = selected.length >= max;
  return (
    <div className="fade">
      <p style={{ fontSize: 12, color: accent, letterSpacing: "0.1em", margin: "0 0 8px", fontWeight: 600 }}>{tag}</p>
      <h2 style={{ fontFamily: serif, fontSize: 23, color: C.ink, margin: "0 0 6px", fontWeight: 600, lineHeight: 1.45 }}>{q}</h2>
      <p style={{ fontSize: 13, color: C.muted, margin: "0 0 22px" }}>{sub}（{selected.length}/{max}）</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {options.map((o) => {
          const active = selected.includes(o.v);
          const locked = atMax && !active; // 上限到達＋未選択は選べない(既存は消さない)
          return (
            <button key={o.v} className="kbtn" onClick={() => { if (!locked) onToggle(o.v); }}
              disabled={locked}
              style={{ textAlign: "left", padding: "15px 18px", borderRadius: 12,
                border: `1.5px solid ${active ? accent : C.line}`, background: active ? accent : C.card,
                color: active ? "#fff" : (locked ? C.muted : C.ink), fontSize: 15.5, fontFamily: sans,
                cursor: locked ? "not-allowed" : "pointer", opacity: locked ? 0.5 : 1,
                display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{o.label}</span>
              {active && <span style={{ fontSize: 13 }}>✓</span>}
            </button>
          );
        })}
      </div>
      {atMax && (
        <p style={{ fontSize: 12, color: accent, margin: "12px 0 0" }}>
          {max}つまで選べます。入れ替えたい項目を一度外してください。
        </p>
      )}
      <div style={{ marginTop: 20 }}>
        <Primary onClick={onNext} disabled={selected.length === 0}>
          {selected.length === 0 ? "1つ以上えらんでください" : (nextLabel || "次へ")}
        </Primary>
      </div>
      {footer}
    </div>
  );
}

function Analyzing({ onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 1600); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className="fade" style={{ textAlign: "center", padding: "60px 0" }}>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 22 }}>
        {[0, 1, 2].map((i) => (
          <span key={i} className="pulse-dot" style={{ width: 12, height: 12, borderRadius: "50%", background: C.indigo, animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
        ))}
      </div>
      <p style={{ fontFamily: serif, fontSize: 18, color: C.indigo, margin: 0 }}>YOAGAIが読み解いています</p>
      <p style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>悩み・きっかけ・目指す姿から…</p>
    </div>
  );
}

function Result({ ans, track, onSave }) {
  const style = pickStyle(track, ans.pref);
  const issue = ISSUE_LABEL[ans.current_issue];
  const reasons = (ans.reason || []).map((r) => REASON_LABEL[r]).filter(Boolean);
  const goal = GOAL_LABEL[ans.primary_goal];
  const mirror = buildMirror(reasons, issue, goal); // 断定せず、選んだ内容を整理して返す
  // 主軸(primaryWish)を先に示し、副軸(secondaryWishes)はチップ＋文章で受け止める
  const primaryLabel = WISH_BY_V[ans.primaryWish]?.label;
  const secondaryLabels = (ans.secondaryWishes || []).map((v) => WISH_BY_V[v]?.label).filter(Boolean);

  return (
    <div className="fade">
      {/* 鏡返し: 主軸 → (副軸を受け止め) → 悩み・理由・目的 */}
      <div style={{ background: C.indigoDeep, borderRadius: 16, padding: "22px", marginBottom: 16 }}>
        <p style={{ fontSize: 11, color: C.saffron, letterSpacing: "0.14em", margin: "0 0 12px" }}>YOAGAIより</p>
        <p style={{ fontSize: 15.5, lineHeight: 2.05, color: "#F3EBD8", margin: 0 }}>
          {primaryLabel && <>今日いちばん大切なのは、「{primaryLabel}」という願いですね。<br /></>}
          {secondaryLabels.length > 0 && <>あわせて、{secondaryLabels.map((s) => `「${s}」`).join("")}も気にかけています。<br /></>}
          {mirror.line1}<br />
          {mirror.line2}
        </p>
      </div>

      {/* 主軸・副軸をチップで残す */}
      {(primaryLabel || secondaryLabels.length > 0) && (
        <div style={{ marginBottom: 22 }}>
          {primaryLabel && (
            <div style={{ marginBottom: secondaryLabels.length ? 12 : 0 }}>
              <p style={{ fontSize: 11, color: C.saffron, letterSpacing: "0.1em", margin: "0 0 6px", fontWeight: 600 }}>今日の主軸</p>
              <span style={{ display: "inline-block", padding: "7px 14px", borderRadius: 999, background: C.indigo, color: "#fff", fontSize: 13.5 }}>{primaryLabel}</span>
            </div>
          )}
          {secondaryLabels.length > 0 && (
            <div>
              <p style={{ fontSize: 11, color: C.muted, letterSpacing: "0.1em", margin: "0 0 6px" }}>あわせて記録すること</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {secondaryLabels.map((s) => (
                  <span key={s} style={{ padding: "7px 14px", borderRadius: 999, background: C.card, border: `1.5px solid ${C.line}`, color: C.ink, fontSize: 13.5 }}>{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <div style={{ position: "relative", width: 108, height: 108, margin: "0 auto 14px" }}>
          <div className="breathe-dot" style={{ position: "absolute", inset: 0, borderRadius: "50%", background: C.saffronSoft, animation: "breathe 4s ease-in-out infinite" }} />
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: serif, fontSize: 30, color: C.indigo, fontWeight: 700, lineHeight: 1 }}>{style.match}</span>
            <span style={{ fontSize: 10, color: C.muted, letterSpacing: "0.1em" }}>MATCH</span>
          </div>
        </div>
        <p style={{ fontSize: 12, color: C.saffron, letterSpacing: "0.12em", margin: "0 0 6px" }}>あなたへの提案</p>
        <h2 style={{ fontFamily: serif, fontSize: 25, color: C.ink, margin: "0 0 8px", fontWeight: 600 }}>{style.name}</h2>
        <p style={{ fontSize: 15, color: C.indigo, margin: 0, fontWeight: 500 }}>{style.lead}</p>
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: "20px", marginBottom: 14 }}>
        <p style={{ fontSize: 14.5, lineHeight: 1.95, color: C.ink, margin: 0 }}>{style.body}</p>
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: "16px 20px", marginBottom: 14, display: "flex", gap: 12 }}>
        <span style={{ fontSize: 11, color: C.saffron, letterSpacing: "0.1em", paddingTop: 2, whiteSpace: "nowrap" }}>最初の一歩</span>
        <span style={{ fontSize: 15, color: C.ink, lineHeight: 1.7 }}>{style.first}</span>
      </div>

      <div style={{ background: C.saffronSoft, borderRadius: 14, padding: "18px 20px", marginBottom: 28 }}>
        <p style={{ fontSize: 11, color: C.indigo, letterSpacing: "0.1em", margin: "0 0 8px", fontWeight: 600 }}>呼吸が、すべての土台</p>
        <p style={{ fontSize: 14, color: C.indigoDeep, lineHeight: 1.85, margin: "0 0 12px" }}>{style.breath}</p>
        <a href="#" onClick={(e) => e.preventDefault()}
          style={{ fontSize: 13.5, color: C.indigo, fontWeight: 600, textDecoration: "underline", cursor: "pointer" }}>
          なぜ呼吸が土台なのか、もっと知る →
        </a>
      </div>

      <Primary onClick={onSave}>この結果を記録する</Primary>
      <p style={{ fontSize: 12.5, color: C.muted, marginTop: 14, textAlign: "center", lineHeight: 1.7 }}>
        記録すると、次に診断したとき<br />心と体の変化を見られます
      </p>
    </div>
  );
}

function Wall({ onRegister, onBack }) {
  const [email, setEmail] = useState("");
  const valid = /\S+@\S+\.\S+/.test(email);
  return (
    <div className="fade">
      <p style={{ fontSize: 12, color: C.saffron, letterSpacing: "0.12em", margin: "0 0 10px" }}>記録を保存</p>
      <h2 style={{ fontFamily: serif, fontSize: 24, color: C.ink, margin: "0 0 12px", fontWeight: 600, lineHeight: 1.5 }}>
        あなたの記録を<br />作ります
      </h2>
      <p style={{ fontSize: 14.5, lineHeight: 1.9, color: C.muted, margin: "0 0 26px" }}>
        メールアドレスだけで登録できます。今日の結果が記録され、次回の診断で
        「前回からどう変わったか」を並べて見られるようになります。
      </p>
      <label style={{ fontSize: 12, color: C.muted, display: "block", marginBottom: 8 }}>メールアドレス</label>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
        style={{ width: "100%", boxSizing: "border-box", padding: "14px 16px", fontSize: 16, borderRadius: 12, border: `1.5px solid ${C.line}`, background: C.card, color: C.ink, fontFamily: sans, marginBottom: 20 }} />
      <Primary onClick={onRegister} disabled={!valid}>記録を作成して保存</Primary>
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "18px 0", color: C.muted }}>
        <div style={{ flex: 1, height: 1, background: C.line }} /><span style={{ fontSize: 11 }}>または</span><div style={{ flex: 1, height: 1, background: C.line }} />
      </div>
      <button className="kbtn" onClick={onRegister}
        style={{ width: "100%", padding: "14px", borderRadius: 12, border: `1.5px solid ${C.line}`, background: C.card, color: C.ink, fontSize: 15, fontFamily: sans, cursor: "pointer" }}>
        Googleで続ける
      </button>
      <button onClick={onBack} style={{ marginTop: 22, background: "none", border: "none", color: C.muted, fontSize: 13, cursor: "pointer", fontFamily: sans, display: "block", margin: "22px auto 0" }}>
        ← 結果に戻る
      </button>
    </div>
  );
}

function Saved({ ans, track, demoReturning, onToggleDemo, onReset, onTeach }) {
  const style = pickStyle(track, ans.pref);
  return (
    <div className="fade">
      <div style={{ textAlign: "center", marginBottom: 26 }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: C.ok, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, margin: "0 auto 14px" }}>✓</div>
        <h2 style={{ fontFamily: serif, fontSize: 23, color: C.ink, margin: "0 0 6px", fontWeight: 600 }}>記録を保存しました</h2>
        <p style={{ fontSize: 13.5, color: C.muted, margin: 0 }}>定期的に振り返って、変化を実感してください。</p>
      </div>
      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, overflow: "hidden", marginBottom: 20 }}>
        <div style={{ background: C.indigo, color: "#fff", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: serif, fontSize: 15 }}>こころとからだの記録</span>
          <span style={{ fontSize: 11, opacity: 0.8 }}>{demoReturning ? "2回目" : "初回"}</span>
        </div>
        <div style={{ padding: "18px 20px" }}>
          <Row date={demoReturning ? "8月2日" : "7月15日"} issue={ISSUE_LABEL[ans.current_issue]} style={style.name} match={style.match} latest />
          {demoReturning && (
            <>
              <div style={{ height: 1, background: C.line, margin: "16px 0" }} />
              <Row date="7月15日" issue="休まらない頭" style="ヨガニードラ / 陰ヨガ" match={92} />
              <div style={{ marginTop: 16, padding: "12px 14px", background: C.saffronSoft, borderRadius: 10, fontSize: 13.5, color: C.indigoDeep, lineHeight: 1.7 }}>
                前回は「頭が休まらない」が入口でしたね。今回は少し前へ。変わってきています。
              </div>
            </>
          )}
        </div>
      </div>

      {/* 一般ルート後の先生ルート再提示(自然なプロヨガ導線) */}
      <div style={{ border: `1.5px dashed ${C.teach}`, borderRadius: 14, padding: "16px 18px", marginBottom: 16 }}>
        <p style={{ fontSize: 14, color: C.ink, lineHeight: 1.8, margin: "0 0 12px" }}>
          自分を整えた経験を、いつか<strong>人に伝える学び</strong>につなげてみませんか？
        </p>
        <button className="kbtn" onClick={onTeach}
          style={{ width: "100%", padding: "13px", borderRadius: 10, border: "none", background: C.teach, color: "#fff", fontSize: 14.5, fontFamily: sans, cursor: "pointer", fontWeight: 600 }}>
          プロヨガについて知る
        </button>
      </div>

      <button onClick={onToggleDemo}
        style={{ width: "100%", padding: "12px", borderRadius: 10, border: `1px dashed ${C.saffron}`, background: "transparent", color: C.saffron, fontSize: 12.5, fontFamily: sans, cursor: "pointer", marginBottom: 12 }}>
        ◆ デモ: {demoReturning ? "初回の見え方に戻す" : "2回目の来訪として見る（前回比較）"}
      </button>
      <button onClick={onReset} style={{ width: "100%", background: "none", border: "none", color: C.muted, fontSize: 13, cursor: "pointer", fontFamily: sans }}>
        最初からやり直す
      </button>
    </div>
  );
}

function Row({ date, issue, style, match, latest }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
      <span style={{ fontSize: 12, color: C.muted, width: 52, flexShrink: 0 }}>{date}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, color: C.saffron, marginBottom: 3 }}>{issue}</div>
        <div style={{ fontSize: 15, color: C.ink, fontFamily: serif }}>{style}</div>
      </div>
      <span style={{ fontSize: 13, color: latest ? C.indigo : C.muted, fontWeight: latest ? 700 : 400 }}>{match}</span>
    </div>
  );
}

// 先生候補ルートの受け渡し(判定しない・案内のみ)
function TeachBridge({ ans, onReset }) {
  const mirror = TEACH_MIRROR[ans.teaching_status] || "伝えることに関心をお持ちなのですね。";
  return (
    <div className="fade">
      <div style={{ background: "#2E2440", borderRadius: 16, padding: "22px", marginBottom: 20 }}>
        <p style={{ fontSize: 11, color: C.saffron, letterSpacing: "0.14em", margin: "0 0 12px" }}>YOAGAIより</p>
        <p style={{ fontSize: 15.5, lineHeight: 2.05, color: "#EFE7F5", margin: 0 }}>
          {mirror}<br />
          プロヨガでは、呼吸を土台に、理解・実践・伝え方を段階的に学べる入口を用意しています。
        </p>
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: "20px", marginBottom: 16 }}>
        <p style={{ fontSize: 12, color: C.teach, letterSpacing: "0.1em", margin: "0 0 10px", fontWeight: 600 }}>プロヨガとは</p>
        <p style={{ fontSize: 14.5, lineHeight: 1.95, color: C.ink, margin: 0 }}>
          ヨガの母国インドが公認する基準に沿った資格です。RYTでは扱いきれない、本場の体系を土台から学べます。
          あなたの学びと指導を、この診断が記録していきます。
        </p>
      </div>

      <div style={{ background: C.saffronSoft, borderRadius: 14, padding: "16px 20px", marginBottom: 24 }}>
        <p style={{ fontSize: 13.5, color: C.indigoDeep, lineHeight: 1.8, margin: 0 }}>
          ここから先の詳しい適性診断・学習・受験のご案内は、準備を進めています。
          まずは図鑑で、プロヨガの世界に触れてみてください。
        </p>
      </div>

      <Primary onClick={() => {}}>ヨガ検定図鑑を見てみる</Primary>
      <button onClick={onReset} style={{ marginTop: 18, width: "100%", background: "none", border: "none", color: C.muted, fontSize: 13, cursor: "pointer", fontFamily: sans }}>
        最初に戻る
      </button>
    </div>
  );
}

// 初回コンディション: 4次元を1-7で自己申告(比較の基準)
function Baseline({ onDone }) {
  const [vals, setVals] = useState({ bodyCondition: 4, mentalCondition: 4, breathEase: 4, energyLevel: 4 });
  return (
    <div className="fade">
      <p style={{ fontSize: 12, color: C.body, letterSpacing: "0.1em", margin: "0 0 8px", fontWeight: 600 }}>⑦ 今の状態</p>
      <h2 style={{ fontFamily: serif, fontSize: 23, color: C.ink, margin: "0 0 6px", fontWeight: 600, lineHeight: 1.45 }}>今日のコンディションは？</h2>
      <p style={{ fontSize: 13, color: C.muted, margin: "0 0 24px" }}>これが、次回と比べる基準になります</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {BASELINE_DIMS.map((d) => (
          <div key={d.key}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
              <span style={{ fontSize: 14.5, color: C.ink, fontWeight: 600 }}>{d.label}</span>
              <span style={{ fontSize: 13, color: C.indigo, fontWeight: 700 }}>{vals[d.key]}</span>
            </div>
            <input type="range" min="1" max="7" value={vals[d.key]}
              onChange={(e) => setVals((v) => ({ ...v, [d.key]: Number(e.target.value) }))}
              style={{ width: "100%", accentColor: C.indigo }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.muted, marginTop: 2 }}>
              <span>{d.low}</span><span>{d.high}</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 28 }}>
        <Primary onClick={() => onDone(vals)}>記録して、提案を見る</Primary>
      </div>
    </div>
  );
}

function PracticeResult({ ans, onSave }) {
  const styles = (ans.practiceStyleIds || []).map((s) => P_STYLE_LABEL[s]).filter(Boolean);
  const styleText = styles.length ? styles.join("・") : "ヨガ";
  const setting = P_SETTING_LABEL[ans.practiceSetting] || "";
  const freq = P_FREQ_LABEL[ans.frequencyBucket] || "";
  const dur = P_DURATION_LABEL[ans.durationBucket] || "";
  const goal = P_GOAL_LABEL[ans.practiceGoal] || "";
  const barrier = P_BARRIER_LABEL[ans.practiceBarrier] || "";
  const suggestions = TRACK_SUGGESTION[ans.practiceGoal] || ["実践前後の心と体の状態", "呼吸の落ち着き", "翌日の軽さ"];

  return (
    <div className="fade">
      {/* 鏡返し: 実践内容 + 目的 + 停滞(断定しない) */}
      <div style={{ background: C.indigoDeep, borderRadius: 16, padding: "22px", marginBottom: 20 }}>
        <p style={{ fontSize: 11, color: C.saffron, letterSpacing: "0.14em", margin: "0 0 12px" }}>YOAGAIより</p>
        <p style={{ fontSize: 15.5, lineHeight: 2.05, color: "#F3EBD8", margin: 0 }}>
          {setting && `${setting}で`}{styleText}を{freq}、{dur}続けているのですね。<br />
          今いちばん実感したいのは、{goal}。
          {barrier && <>{`一方で、${barrier}と感じています。`}</>}
        </p>
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: "20px", marginBottom: 16 }}>
        <p style={{ fontSize: 12, color: C.body, letterSpacing: "0.1em", margin: "0 0 12px", fontWeight: 600 }}>あなたが追うとよい変化</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {suggestions.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ width: 22, height: 22, borderRadius: "50%", background: C.saffronSoft, color: C.indigo, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 700 }}>{i + 1}</span>
              <span style={{ fontSize: 14.5, color: C.ink }}>{s}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: C.saffronSoft, borderRadius: 14, padding: "18px 20px", marginBottom: 28 }}>
        <p style={{ fontSize: 11, color: C.indigo, letterSpacing: "0.1em", margin: "0 0 8px", fontWeight: 600 }}>呼吸が、その実践を支える</p>
        <p style={{ fontSize: 14, color: C.indigoDeep, lineHeight: 1.85, margin: "0 0 12px" }}>
          続けていて変化が見えにくいときこそ、呼吸を記録の軸にすると、動きの上達より先に「落ち着き」の変化に気づけます。
        </p>
        <a href="#" onClick={(e) => e.preventDefault()}
          style={{ fontSize: 13.5, color: C.indigo, fontWeight: 600, textDecoration: "underline", cursor: "pointer" }}>
          なぜ呼吸が土台なのか、もっと知る →
        </a>
      </div>

      <Primary onClick={onSave}>この実践カルテを保存する</Primary>
      <p style={{ fontSize: 12.5, color: C.muted, marginTop: 14, textAlign: "center", lineHeight: 1.7 }}>
        保存すると、次回の記録と<br />並べて変化を見られます
      </p>
    </div>
  );
}

// 保存後の任意: 教室・先生の記録(初回必須にしない・自動公開しない)
function StudioOptional({ onDone }) {
  const [mode, setMode] = useState(null);
  const [studio, setStudio] = useState("");
  const [teacher, setTeacher] = useState("");
  return (
    <div className="fade">
      <p style={{ fontSize: 12, color: C.body, letterSpacing: "0.1em", margin: "0 0 8px", fontWeight: 600 }}>任意</p>
      <h2 style={{ fontFamily: serif, fontSize: 22, color: C.ink, margin: "0 0 10px", fontWeight: 600, lineHeight: 1.5 }}>
        通っている教室も<br />記録しますか？
      </h2>
      <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.85, margin: "0 0 22px" }}>
        登録すると、通った期間やその間の変化を一緒に振り返れます。記録はあなただけのもので、勝手に公開はされません。
      </p>
      {mode !== "record" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Choice label="教室・先生を記録する" onClick={() => setMode("record")} />
          <Choice label="今回は記録しない" onClick={() => onDone()} />
        </div>
      ) : (
        <div>
          <label style={{ fontSize: 12, color: C.muted, display: "block", marginBottom: 6 }}>教室名（任意）</label>
          <input value={studio} onChange={(e) => setStudio(e.target.value)} placeholder="例：〇〇ヨガスタジオ"
            style={{ width: "100%", boxSizing: "border-box", padding: "13px 15px", fontSize: 15, borderRadius: 10, border: `1.5px solid ${C.line}`, background: C.card, color: C.ink, fontFamily: sans, marginBottom: 16 }} />
          <label style={{ fontSize: 12, color: C.muted, display: "block", marginBottom: 6 }}>先生の名前（任意）</label>
          <input value={teacher} onChange={(e) => setTeacher(e.target.value)} placeholder="例：田中先生"
            style={{ width: "100%", boxSizing: "border-box", padding: "13px 15px", fontSize: 15, borderRadius: 10, border: `1.5px solid ${C.line}`, background: C.card, color: C.ink, fontFamily: sans, marginBottom: 20 }} />
          <Primary onClick={() => {
            if (typeof console !== "undefined") console.log("[practiceProfile.studio/teacher]", { studioName: studio || null, teacherName: teacher || null, listingStatus: "private" });
            onDone();
          }}>記録する</Primary>
          <p style={{ fontSize: 11.5, color: C.muted, marginTop: 12, textAlign: "center", lineHeight: 1.6 }}>
            地図に載せる場合は、教室・先生ご本人の確認後に公開します
          </p>
        </div>
      )}
    </div>
  );
}

function PracticeSaved({ ans, onReset, onTeach }) {
  const styles = (ans.practiceStyleIds || []).map((s) => P_STYLE_LABEL[s]).filter(Boolean);
  const b = ans.baseline || {};
  return (
    <div className="fade">
      <div style={{ textAlign: "center", marginBottom: 26 }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: C.ok, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, margin: "0 auto 14px" }}>✓</div>
        <h2 style={{ fontFamily: serif, fontSize: 23, color: C.ink, margin: "0 0 6px", fontWeight: 600 }}>実践カルテを作りました</h2>
        <p style={{ fontSize: 13.5, color: C.muted, margin: 0 }}>次にヨガをした日、また記録してください。</p>
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, overflow: "hidden", marginBottom: 20 }}>
        <div style={{ background: C.body, color: "#fff", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: serif, fontSize: 15 }}>わたしの実践カルテ</span>
          <span style={{ fontSize: 11, opacity: 0.85 }}>初回（基準）</span>
        </div>
        <div style={{ padding: "18px 20px" }}>
          <div style={{ fontSize: 12, color: C.saffron, marginBottom: 4 }}>7月15日</div>
          <div style={{ fontSize: 15.5, color: C.ink, fontFamily: serif, marginBottom: 14 }}>{styles.join("・") || "ヨガ"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {BASELINE_DIMS.map((d) => (
              <div key={d.key} style={{ background: C.paper, borderRadius: 8, padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12.5, color: C.muted }}>{d.label}</span>
                <span style={{ fontSize: 14, color: C.indigo, fontWeight: 700 }}>{b[d.key] ?? "-"}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12.5, color: C.muted, marginTop: 14, lineHeight: 1.7 }}>
            次回、同じ項目を記録すると、この数字と並べて変化が見えます。
          </p>
        </div>
      </div>

      {/* 先生候補の発掘は、先生の資格を聞くのでなく本人の関心を聞く */}
      <div style={{ border: `1.5px dashed ${C.teach}`, borderRadius: 14, padding: "16px 18px", marginBottom: 16 }}>
        <p style={{ fontSize: 14, color: C.ink, lineHeight: 1.8, margin: "0 0 12px" }}>
          あなた自身が、この経験を<strong>人に伝えること</strong>にも興味がありますか？
        </p>
        <button className="kbtn" onClick={onTeach}
          style={{ width: "100%", padding: "13px", borderRadius: 10, border: "none", background: C.teach, color: "#fff", fontSize: 14.5, fontFamily: sans, cursor: "pointer", fontWeight: 600 }}>
          プロヨガについて知る
        </button>
      </div>

      <button onClick={onReset} style={{ width: "100%", background: "none", border: "none", color: C.muted, fontSize: 13, cursor: "pointer", fontFamily: sans }}>
        最初からやり直す
      </button>
    </div>
  );
}

// 痩せ主軸の結果。流派を固定せず候補表示、呼吸は継続の土台に限定、断定しない
function WeightResult({ ans, onSave }) {
  const recipe = buildPracticeRecipe(ans);
  const styles = candidateStyles(recipe, ans);
  const focusLabel = W_FOCUS_LABEL[ans.weightFocus];
  const records = W_RECORD_ITEMS[ans.weightFocus] || ["体の軽さ", "実践頻度"];
  const secondaryLabels = (ans.secondaryWishes || []).map((v) => WISH_BY_V[v]?.label).filter(Boolean);
  const intensityJa = { gentle: "やさしい強度で", moderate: "ほどよい強度で", dynamic: "しっかり動いて" }[recipe.intensity];
  const isBodyCondition = ans.activeSubroute === "body_condition"; // むくみ感(レッドフラッグなし)

  return (
    <div className="fade">
      <div style={{ background: C.indigoDeep, borderRadius: 16, padding: "22px", marginBottom: 16 }}>
        <p style={{ fontSize: 11, color: C.saffron, letterSpacing: "0.14em", margin: "0 0 12px" }}>YOAGAIより</p>
        <p style={{ fontSize: 15.5, lineHeight: 2.05, color: "#F3EBD8", margin: 0 }}>
          {isBodyCondition ? (
            <>お話を整理すると、求めているのは体重の変化というより、むくみ感や重だるさをやわらげることに近いようです。<br />
            今回は体重ではなく、体の軽さや時間帯による変化を記録していきましょう。</>
          ) : (
            <>あなたが確かめたいのは、{focusLabel}ですね。<br />
            {intensityJa}、{recipe.durationMinutes}分ほどから、{recipe.suggestedFrequency}続けられる形をご提案します。</>
          )}
          {secondaryLabels.length > 0 && <><br />あわせて、{secondaryLabels.map((s) => `「${s}」`).join("")}も記録していきます。</>}
        </p>
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: "20px", marginBottom: 14 }}>
        <p style={{ fontSize: 12, color: C.body, letterSpacing: "0.1em", margin: "0 0 10px", fontWeight: 600 }}>あなたに近い実践</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {styles.map((s) => (
            <span key={s} style={{ padding: "7px 14px", borderRadius: 999, background: C.saffronSoft, color: C.indigoDeep, fontSize: 13.5 }}>{s}</span>
          ))}
        </div>
        <p style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.8, margin: 0 }}>
          強度・ペース・時間はあなたの答えに合わせています。上のどれかが、今のあなたに近い候補です。
        </p>
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: "18px 20px", marginBottom: 14 }}>
        <p style={{ fontSize: 12, color: C.body, letterSpacing: "0.1em", margin: "0 0 10px", fontWeight: 600 }}>追うとよい記録</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {records.map((r, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ width: 20, height: 20, borderRadius: "50%", background: C.saffronSoft, color: C.indigo, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 700 }}>{i + 1}</span>
              <span style={{ fontSize: 14, color: C.ink }}>{r}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: C.saffronSoft, borderRadius: 14, padding: "18px 20px", marginBottom: 28 }}>
        <p style={{ fontSize: 11, color: C.indigo, letterSpacing: "0.1em", margin: "0 0 8px", fontWeight: 600 }}>呼吸の役割</p>
        <p style={{ fontSize: 14, color: C.indigoDeep, lineHeight: 1.85, margin: "0 0 6px" }}>
          呼吸は、動きのペースを調整し、力みや疲れに気づきながら、無理なく続けるための土台です。
        </p>
        <p style={{ fontSize: 13, color: C.indigoDeep, lineHeight: 1.8, margin: 0, opacity: 0.85 }}>
          呼吸だけで痩せるのではありません。呼吸を使って動きの質とペースを整え、続けやすい実践につなげます。
        </p>
      </div>

      <Primary onClick={onSave}>この結果を記録する</Primary>
      <p style={{ fontSize: 12.5, color: C.muted, marginTop: 14, textAlign: "center", lineHeight: 1.7 }}>
        記録すると、次に診断したとき<br />変化を並べて見られます
      </p>
    </div>
  );
}

// レッドフラッグ該当時：緊急度に応じた正しい行動を伝える(病気の判断はしない)
function MedicalRedirect({ level, onReset }) {
  const content = {
    urgent: {
      accent: "#A32D2D", bg: "#FCEBEB",
      heading: "今はヨガを行わないでください",
      body: "急な息苦しさ、胸の痛みや圧迫感、意識が遠のく感じは、すぐに確認が必要な状態のことがあります。地域の救急窓口へ連絡してください。",
      note: "この確認は病気を判断するものではありません。安全のため、今回はヨガの提案を表示しません。",
    },
    prompt: {
      accent: "#854F0B", bg: "#FAEEDA",
      heading: "安全を確認してから始めましょう",
      body: "片側だけの急な腫れや、痛み・赤み・熱感がある場合は、今日はヨガを控え、早めに医療機関へ相談してください。",
      note: "落ち着いて安全が確認できたら、いつでも戻ってきてください。",
    },
    routine: {
      accent: "#0C447C", bg: "#E6F1FB",
      heading: "一度、相談してみましょう",
      body: "原因のはっきりしないむくみが続いたり、繰り返したり、悪化する場合は、一度医療機関に相談してから、無理のない実践を検討するのが安心です。",
      note: "相談のうえで問題がなければ、また診断に戻ってきてください。",
    },
  }[level] || {
    accent: C.indigo, bg: C.card,
    heading: "一度、相談してみましょう",
    body: "気になる症状があるときは、まず医療機関に相談してから、無理のない実践を検討してください。",
    note: "落ち着いたら、いつでも戻ってきてください。",
  };
  return (
    <div className="fade">
      <div style={{ background: content.bg, padding: "24px", marginBottom: 20, borderLeft: `4px solid ${content.accent}`, borderRadius: 12 }}>
        <p style={{ fontSize: 12, color: content.accent, letterSpacing: "0.1em", margin: "0 0 12px", fontWeight: 600 }}>だいじなお知らせ</p>
        <h2 style={{ fontFamily: serif, fontSize: 20, color: C.ink, margin: "0 0 12px", fontWeight: 600, lineHeight: 1.5 }}>{content.heading}</h2>
        <p style={{ fontSize: 15, color: C.ink, lineHeight: 1.95, margin: 0 }}>{content.body}</p>
        <p style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.85, margin: "16px 0 0" }}>{content.note}</p>
      </div>
      <button onClick={onReset} style={{ width: "100%", background: "none", border: "none", color: C.muted, fontSize: 13, cursor: "pointer", fontFamily: sans }}>
        最初に戻る
      </button>
    </div>
  );
}

function Primary({ children, onClick, disabled }) {
  return (
    <button className="kbtn" onClick={onClick} disabled={disabled}
      style={{ width: "100%", padding: "16px", borderRadius: 12, border: "none", background: disabled ? C.line : C.indigo, color: disabled ? C.muted : "#fff", fontSize: 16, fontWeight: 600, fontFamily: sans, cursor: disabled ? "not-allowed" : "pointer", boxShadow: disabled ? "none" : "0 2px 12px rgba(28,61,90,0.18)" }}>
      {children}
    </button>
  );
}

export { DiagnosisV2Page };
