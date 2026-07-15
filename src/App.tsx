import { useMemo, useState } from 'react';
import {
  AREAS,
  Club,
  EventItem,
  School,
  SearchItem,
  StudentDiagnosisInput,
  Teacher,
  clubs as initialClubs,
  events as initialEvents,
  schools as initialSchools,
  teachers as initialTeachers,
} from './data';
import { DiagnosisForm } from './components/DiagnosisForm';
import { CardList } from './components/CardList';
import { MapView } from './components/MapView';
import { DiagnosisResult, ResultPage, YogaPoseRecommendation } from './components/ResultPage';
import { FieldConfig, FormSectionConfig, RegisterForm } from './components/RegisterForm';
import { ProYogaPage } from './components/ProYogaPage';
import { ProDrillPage } from './ProDrillPage';
import DiagnosisV2Page from './DiagnosisV2Page';
import { SacredSitesPage } from './components/SacredSitesPage';
import { StaticInfoPage } from './components/StaticInfoPage';
import { TeacherDiagnosisPage } from './components/TeacherDiagnosisPage';
import { TopBackLink } from './components/TopBackLink';
import { MyPage, type DiagnosisHistoryRecord, type WellnessScores } from './components/MyPage';

type PageKey = 'home' | 'diagnosis' | 'results' | 'search' | 'my-page' | 'teacher-diagnosis' | 'listing-select' | 'teacher-register' | 'school-register' | 'event-register' | 'club-register' | 'pro-yoga' | 'pro-drill' | 'sacred-sites' | 'terms' | 'privacy'| 'diagnosis-v2';

type FilterType = SearchItem['type'] | 'all';

type SearchFilterPreset = {
  area: 'all' | string;
  levels: string[];
  purposes: string[];
  features: string[];
};

const searchLevelOptions = ['初心者', '中級', '上級'] as const;
const searchPurposeOptions = ['リラックス', '姿勢改善', '肩こり・腰痛', 'ダイエット', '瞑想・呼吸'] as const;
const searchFeatureOptions = ['初心者歓迎', '英語対応', '外国人対応', 'プロYoga対応', '資格対応'] as const;

const DIAGNOSIS_HISTORY_STORAGE_KEY = 'yoga-japan-diagnosis-history-v1';

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildWellnessScores(input: StudentDiagnosisInput): WellnessScores {
  const scores: WellnessScores = {
    flexibility: 46,
    strengthStability: 45,
    postureBalance: 46,
    stressManagement: 48,
    breathFocus: 44,
    yogaUnderstanding: 38,
    yogaActivity: 40,
    lifestyle: 42,
  };

  const experienceBoost = input.yogaExperience === '深く学んでいる'
    ? 18
    : input.yogaExperience === '継続中'
      ? 11
      : input.yogaExperience === '少しある'
        ? 5
        : 0;

  scores.flexibility += experienceBoost;
  scores.strengthStability += experienceBoost;
  scores.postureBalance += Math.round(experienceBoost * 0.9);
  scores.breathFocus += Math.round(experienceBoost * 0.7);
  scores.yogaUnderstanding += Math.round(experienceBoost * 1.1);
  scores.yogaActivity += Math.round(experienceBoost * 0.9);
  scores.lifestyle += Math.round(experienceBoost * 0.5);

  if (input.exerciseHabit === '習慣的にしている') {
    scores.flexibility += 8;
    scores.strengthStability += 14;
    scores.postureBalance += 10;
    scores.yogaActivity += 6;
    scores.lifestyle += 8;
  } else if (input.exerciseHabit === 'たまにしている') {
    scores.flexibility += 4;
    scores.strengthStability += 7;
    scores.postureBalance += 5;
    scores.yogaActivity += 3;
    scores.lifestyle += 4;
  } else {
    scores.strengthStability -= 4;
    scores.yogaActivity -= 2;
    scores.lifestyle -= 4;
  }

  if (input.goals.includes('柔軟性向上')) scores.flexibility += 16;
  if (input.goals.includes('運動不足解消') || input.goals.includes('ダイエット')) {
    scores.strengthStability += 14;
    scores.yogaActivity += 4;
    scores.lifestyle += 3;
  }
  if (input.goals.includes('リラックス') || input.goals.includes('ストレス軽減') || input.goals.includes('睡眠改善')) {
    scores.stressManagement += 16;
    scores.lifestyle += 8;
  }
  if (input.goals.includes('姿勢改善')) scores.postureBalance += 17;
  if (input.goals.includes('肩こり改善') || input.goals.includes('腰痛改善')) {
    scores.postureBalance += 8;
    scores.stressManagement += 4;
  }
  if (input.goals.includes('瞑想・呼吸法')) {
    scores.breathFocus += 18;
    scores.stressManagement += 8;
    scores.yogaUnderstanding += 4;
  }
  if (input.goals.includes('資格取得に興味がある') || input.goals.includes('本格的に学びたい')) {
    scores.yogaUnderstanding += 16;
    scores.yogaActivity += 10;
  }

  if (input.preferredStyles.includes('ゆったり')) {
    scores.stressManagement += 8;
    scores.lifestyle += 4;
  }
  if (input.preferredStyles.includes('しっかり動く')) {
    scores.strengthStability += 10;
    scores.yogaActivity += 6;
  }
  if (input.preferredStyles.includes('バランス型')) scores.postureBalance += 10;
  if (input.preferredStyles.includes('瞑想重視')) {
    scores.breathFocus += 12;
    scores.yogaUnderstanding += 6;
    scores.stressManagement += 4;
  }
  if (input.preferredStyles.includes('呼吸法重視')) {
    scores.breathFocus += 12;
    scores.stressManagement += 4;
  }

  if (input.participationModes.includes('先生に習いたい')) {
    scores.postureBalance += 4;
    scores.yogaUnderstanding += 4;
    scores.yogaActivity += 6;
  }
  if (input.participationModes.includes('スクールに通いたい')) {
    scores.postureBalance += 4;
    scores.strengthStability += 3;
    scores.yogaUnderstanding += 6;
    scores.yogaActivity += 8;
  }
  if (input.participationModes.includes('イベントで試したい')) {
    scores.yogaActivity += 4;
    scores.yogaUnderstanding += 3;
  }
  if (input.participationModes.includes('ヨガクラブに入りたい')) {
    scores.stressManagement += 4;
    scores.yogaActivity += 8;
    scores.lifestyle += 5;
  }
  if (input.participationModes.includes('オンラインで受けたい')) {
    scores.breathFocus += 3;
    scores.lifestyle += 3;
    scores.yogaActivity += 2;
  }
  if (input.participationModes.includes('自宅動画で始めたい')) {
    scores.lifestyle += 4;
    scores.yogaActivity += 3;
  }

  if (input.onlineAvailable === '可能') {
    scores.lifestyle += 2;
    scores.yogaActivity += 1;
  }

  input.bodyConditions.forEach((condition) => {
    if (condition === '股関節の硬さ') scores.flexibility -= 10;
    if (['肩こり', '首こり', '腰痛'].includes(condition)) {
      scores.postureBalance -= 8;
      scores.stressManagement -= 4;
    }
    if (['睡眠の悩み', '自律神経の乱れ'].includes(condition)) {
      scores.stressManagement -= 7;
      scores.breathFocus -= 6;
      scores.lifestyle -= 5;
    }
    if (['疲れやすい', 'むくみ', '冷え'].includes(condition)) {
      scores.strengthStability -= 5;
      scores.lifestyle -= 7;
      scores.stressManagement -= 3;
    }
  });

  return {
    flexibility: clampScore(scores.flexibility),
    strengthStability: clampScore(scores.strengthStability),
    postureBalance: clampScore(scores.postureBalance),
    stressManagement: clampScore(scores.stressManagement),
    breathFocus: clampScore(scores.breathFocus),
    yogaUnderstanding: clampScore(scores.yogaUnderstanding),
    yogaActivity: clampScore(scores.yogaActivity),
    lifestyle: clampScore(scores.lifestyle),
  };
}

function averageScoreFromKeys(scores: WellnessScores, keys: Array<keyof WellnessScores>) {
  const total = keys.reduce((sum, key) => sum + scores[key], 0);
  return Math.round(total / keys.length);
}

function buildResultScoreSummary(scores: WellnessScores) {
  return [
    {
      key: 'body',
      label: '身体',
      description: '体の動かしやすさと安定感',
      value: averageScoreFromKeys(scores, ['flexibility', 'strengthStability', 'postureBalance']),
    },
    {
      key: 'mind',
      label: '心',
      description: '気分の整え方と毎日のリズム',
      value: averageScoreFromKeys(scores, ['stressManagement', 'lifestyle']),
    },
    {
      key: 'breath',
      label: '呼吸',
      description: '呼吸の深さと集中しやすさ',
      value: averageScoreFromKeys(scores, ['breathFocus']),
    },
    {
      key: 'understanding',
      label: '理解',
      description: '自分に合う続け方の理解',
      value: averageScoreFromKeys(scores, ['yogaUnderstanding']),
    },
    {
      key: 'practice',
      label: '実践',
      description: '日常の中での取り入れやすさ',
      value: averageScoreFromKeys(scores, ['yogaActivity']),
    },
  ];
}

function loadDiagnosisHistory(): DiagnosisHistoryRecord[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(DIAGNOSIS_HISTORY_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((record): record is Partial<DiagnosisHistoryRecord> & { input: StudentDiagnosisInput; result: DiagnosisResult } => (
        !!record && typeof record === 'object' && !!record.input && !!record.result
      ))
      .map((record, index) => ({
        id: typeof record.id === 'string' ? record.id : `diagnosis-history-${index}`,
        createdAt: typeof record.createdAt === 'string' ? record.createdAt : new Date().toISOString(),
        input: record.input,
        result: record.result,
        scores: buildWellnessScores(record.input),
      }))
      .slice(0, 2);
  } catch {
    return [];
  }
}

function persistDiagnosisHistory(history: DiagnosisHistoryRecord[]) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(DIAGNOSIS_HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, 2)));
  } catch {
    // ignore storage errors on unsupported/private browsers
  }
}

const initialDiagnosis: StudentDiagnosisInput = {
  ageRange: '30代',
  gender: '女性',
  residentArea: '渋谷',
  preferredArea: '渋谷',
  yogaExperience: '未経験',
  exerciseHabit: 'ほとんどない',
  onlineAvailable: 'どちらでもよい',
  goals: ['リラックス'],
  bodyConditions: [],
  preferredStyles: ['ゆったり'],
  participationModes: ['スクールに通いたい'],
  preferredLanguage: '日本語',
  japaneseAnxiety: 'ない',
  wantsForeignFriendly: 'どちらでもよい',
};

const areaCoordinates: Record<string, { lat: number; lng: number }> = {
  渋谷: { lat: 35.6595, lng: 139.7005 },
  新宿: { lat: 35.6896, lng: 139.692 },
  銀座: { lat: 35.6717, lng: 139.765 },
  青山: { lat: 35.6659, lng: 139.7123 },
  表参道: { lat: 35.665, lng: 139.712 },
  恵比寿: { lat: 35.6467, lng: 139.7101 },
  世田谷: { lat: 35.6464, lng: 139.6532 },
  吉祥寺: { lat: 35.7033, lng: 139.5796 },
  品川: { lat: 35.6285, lng: 139.7387 },
  浅草: { lat: 35.711, lng: 139.7965 },
  上野: { lat: 35.7138, lng: 139.7773 },
  オンライン: { lat: 35.6762, lng: 139.6503 },
};

const teacherSections: FormSectionConfig[] = [
  {
    title: '基本',
    fields: [
      { name: 'name', label: '氏名', type: 'text' },
      { name: 'activityName', label: '活動名', type: 'text' },
      { name: 'photo', label: '写真', type: 'file' },
      { name: 'profile', label: 'プロフィール', type: 'textarea' },
      { name: 'activityRegion', label: '活動地域', type: 'select', options: AREAS },
      { name: 'onlineSupport', label: 'オンライン対応', type: 'select', options: ['可能', '不可'] },
      { name: 'schoolAffiliation', label: '所属スクール', type: 'text' },
      { name: 'privateActivity', label: '個人活動の有無', type: 'select', options: ['あり', 'なし'] },
      { name: 'experienceYears', label: '指導歴', type: 'text', placeholder: '例: 8年' },
      { name: 'monthlyLessons', label: '月間レッスン数', type: 'number' },
    ],
  },
  {
    title: '指導対象',
    fields: [
      { name: 'targetLevels', label: '指導対象', type: 'multiselect', options: ['初心者', '中級者', '上級者', 'シニア', '産後', 'キッズ', '男性向け', '企業向け', 'インストラクター向け'] },
      { name: 'specialties', label: '得意分野', type: 'multiselect', options: ['リラックスヨガ', 'ハタヨガ', 'パワーヨガ', 'ヴィンヤサ', '瞑想', '呼吸法', '姿勢改善', '肩こり改善', '腰痛改善', 'ダイエット', '睡眠改善', 'メンタルケア', 'ヨガ哲学', '資格対策'] },
      { name: 'formats', label: '提供形式', type: 'multiselect', options: ['個別レッスン', 'グループレッスン', 'オンライン', '出張', 'イベント登壇', '企業研修', 'スクール講師', '養成講座講師'] },
    ],
  },
  {
    title: '資格・認定 / 外国人対応',
    fields: [
      { name: 'certifications', label: '保有資格', type: 'text' },
      { name: 'proYogaStatus', label: 'プロフェッショナルYoga検定取得状況', type: 'select', options: ['未取得', '取得予定', 'プロYoga検定取得'] },
      { name: 'plannedCertification', label: '取得予定', type: 'text' },
      { name: 'managerCourseStatus', label: 'ヨガマネージャー講座修了状況', type: 'text' },
      { name: 'badgeDisplay', label: '認定バッジ表示可否', type: 'select', options: ['表示可', '表示不可'] },
      { name: 'foreignSupportStatus', label: '外国人対応可能か', type: 'select', options: ['対応可能', '一部対応可能', '対応不可'] },
      { name: 'languages', label: '対応言語', type: 'multiselect', options: ['英語', '中国語', 'イタリア語', 'その他'] },
      { name: 'languageLevel', label: '対応レベル', type: 'select', options: ['日常会話レベル', 'レッスン対応可能', '専門指導可能'] },
      { name: 'interpreterEvent', label: '通訳ありイベントへの対応', type: 'select', options: ['可能', '不可'] },
    ],
  },
];

const schoolSections: FormSectionConfig[] = [
  {
    title: '基本',
    fields: [
      { name: 'name', label: 'スクール名', type: 'text' },
      { name: 'corporateName', label: '運営法人名', type: 'text' },
      { name: 'address', label: '所在地', type: 'text' },
      { name: 'areas', label: '対応エリア', type: 'multiselect', options: AREAS.filter((area) => area !== 'オンライン') },
      { name: 'representative', label: '代表者名', type: 'text' },
      { name: 'contact', label: '連絡先', type: 'text' },
      { name: 'website', label: 'Webサイト', type: 'url' },
      { name: 'sns', label: 'SNS', type: 'url' },
      { name: 'photo', label: '写真', type: 'file' },
      { name: 'description', label: '紹介文', type: 'textarea' },
    ],
  },
  {
    title: 'スクール特性',
    fields: [
      { name: 'schoolTypes', label: 'スクール種別', type: 'multiselect', options: ['ヨガスタジオ', '養成スクール', 'フィットネス併設', 'カルチャースクール', 'オンラインスクール', '地域コミュニティ型', '法人向け研修型'] },
      { name: 'programs', label: '提供プログラム', type: 'multiselect', options: ['通常レッスン', '体験レッスン', '月額会員', '回数券', 'ワークショップ', '指導者養成', 'プロYoga対策', 'ヨガ検定3級・2級対策', 'ヨガマネージャー講座', '法人研修', 'イベント開催'] },
      { name: 'strengths', label: '強み', type: 'multiselect', options: ['初心者に強い', '資格取得に強い', '少人数制', '本格指導', 'リラックス重視', '運動量多め', '解剖学重視', '哲学重視', '地域密着', '国際連携あり', 'インド政府公認プロYoga対応'] },
    ],
  },
  {
    title: '外国人対応',
    fields: [
      { name: 'foreignSupportStatus', label: '外国人受け入れ', type: 'select', options: ['積極的に受け入れ', '一部対応', '対応不可'] },
      { name: 'languages', label: '対応言語', type: 'multiselect', options: ['英語', '中国語', 'イタリア語', 'その他'] },
      { name: 'internationalSupportLevel', label: '国際対応レベル', type: 'select', options: ['観光客対応', '在日外国人対応', '外国人向けクラスあり', '国際資格対応'] },
      { name: 'internationalLinks', label: '国際連携', type: 'multiselect', options: ['イタリア連携対応', '台湾連携対応', '海外講師受け入れ可', '国際イベント開催可'] },
    ],
  },
];

const eventSections: FormSectionConfig[] = [
  {
    title: '基本',
    fields: [
      { name: 'name', label: 'イベント名', type: 'text' },
      { name: 'date', label: '開催日', type: 'date' },
      { name: 'startTime', label: '開始時間', type: 'time' },
      { name: 'endTime', label: '終了時間', type: 'time' },
      { name: 'place', label: '開催場所', type: 'text' },
      { name: 'onlineUrl', label: 'オンラインURL', type: 'url' },
      { name: 'price', label: '参加費', type: 'text' },
      { name: 'capacity', label: '定員', type: 'number' },
      { name: 'applyUrl', label: '申込URL', type: 'url' },
      { name: 'organizer', label: '主催者', type: 'text' },
      { name: 'speakers', label: '登壇講師', type: 'text' },
      { name: 'photo', label: '写真', type: 'file' },
    ],
  },
  {
    title: 'イベント分類',
    fields: [
      { name: 'organizerType', label: '主催者種別', type: 'select', options: ['先生', 'スクール', 'ヨガクラブ', '連盟', '自治体', '企業', '国際連携団体'] },
      { name: 'eventTypes', label: 'イベント種別', type: 'multiselect', options: ['体験会', '通常レッスン', 'ワークショップ', 'リトリート', '講座', '検定対策', 'プロYoga説明会', 'ヨガクラブ交流会', '国際イベント', '企業向けイベント', 'チャリティイベント'] },
      { name: 'contentTags', label: '内容タグ', type: 'multiselect', options: ['リラックス', '運動系', '瞑想', '呼吸法', '肩こり', '腰痛', '姿勢改善', '睡眠', 'メンタルケア', 'ダイエット', 'ヨガ哲学', '資格対策', 'プロYoga', '国際交流'] },
      { name: 'description', label: '説明', type: 'textarea' },
    ],
  },
  {
    title: '外国人対応',
    fields: [
      { name: 'foreignParticipantStatus', label: '外国人参加可能か', type: 'select', options: ['可能', '一部可能', '不可'] },
      { name: 'languages', label: '対応言語', type: 'multiselect', options: ['英語', '中国語', 'イタリア語', 'その他'] },
      { name: 'hasInterpreter', label: '通訳の有無', type: 'select', options: ['あり', 'なし'] },
      { name: 'isInternationalEvent', label: '国際イベント扱いか', type: 'select', options: ['はい', 'いいえ'] },
      { name: 'hasForeignSpeaker', label: '海外講師参加', type: 'select', options: ['あり', 'なし'] },
    ],
  },
];

const clubSections: FormSectionConfig[] = [
  {
    title: '基本',
    fields: [
      { name: 'name', label: 'クラブ名', type: 'text' },
      { name: 'area', label: '活動地域', type: 'select', options: AREAS.filter((area) => area !== 'オンライン') },
      { name: 'representative', label: '代表者', type: 'text' },
      { name: 'contact', label: '連絡先', type: 'text' },
      { name: 'description', label: '紹介文', type: 'textarea' },
      { name: 'photo', label: '活動写真', type: 'file' },
    ],
  },
  {
    title: 'クラブ特性',
    fields: [
      { name: 'clubTypes', label: 'クラブ種別', type: 'multiselect', options: ['地域ヨガクラブ', '職場ヨガクラブ', '学校・大学系', '有志団体', 'シニア向け', '親子向け', '国際交流型'] },
      { name: 'activities', label: '活動内容', type: 'multiselect', options: ['定期レッスン', '勉強会', 'イベント参加', 'ボランティア', '検定学習会', 'プロYoga学習会'] },
    ],
  },
  {
    title: '外国人対応',
    fields: [
      { name: 'foreignParticipantStatus', label: '外国人参加可能か', type: 'select', options: ['可能', '一部可能', '不可'] },
      { name: 'languages', label: '対応言語', type: 'multiselect', options: ['英語', '中国語', 'イタリア語', 'その他'] },
      { name: 'internationalExchange', label: '国際交流イベント開催可否', type: 'select', options: ['可能', '不可'] },
      { name: 'exchangeHope', label: '海外連盟との交流希望', type: 'select', options: ['希望する', 'どちらでもよい'] },
    ],
  },
];

function asArray(value: string | string[] | undefined) {
  return Array.isArray(value) ? value : [];
}

function asString(value: string | string[] | undefined) {
  return typeof value === 'string' ? value : '';
}

function inferArea(text: string, fallback = '渋谷') {
  const matched = AREAS.find((area) => text.includes(area));
  return matched || fallback;
}

function getCoordinates(area: string) {
  return areaCoordinates[area] || areaCoordinates['渋谷'];
}

function getItemTags(item: SearchItem) {
  if (item.type === 'teacher') return [...item.targetLevels, ...item.specialties, ...item.formats, ...item.certifications];
  if (item.type === 'school') return [...item.schoolTypes, ...item.programs, ...item.strengths];
  if (item.type === 'event') return [...item.eventTypes, ...item.contentTags, item.organizerType];
  return [...item.clubTypes, ...item.activities];
}

function getForeignScore(item: SearchItem) {
  if (item.type === 'teacher' || item.type === 'school') {
    return item.foreignSupportStatus.includes('対応') || item.foreignSupportStatus.includes('受け入れ') ? 1 : 0;
  }
  return item.foreignParticipantStatus !== '不可' ? 1 : 0;
}

function getSearchableText(item: SearchItem) {
  return [item.name, item.description, item.area, ...item.languages, ...getItemTags(item)].join(' ').toLowerCase();
}

function toggleFilterValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function uniqueValues(values: string[]) {
  return [...new Set(values)];
}

function supportsEnglish(item: SearchItem) {
  return item.languages.includes('英語');
}

function isForeignFriendly(item: SearchItem) {
  if (item.type === 'teacher' || item.type === 'school') return !item.foreignSupportStatus.includes('不可');
  return item.foreignParticipantStatus !== '不可';
}

function isBeginnerFriendly(item: SearchItem) {
  if (item.type === 'teacher') return item.targetLevels.includes('初心者');
  if (item.type === 'school') return item.strengths.includes('初心者に強い') || item.programs.includes('体験レッスン');
  if (item.type === 'event') return item.eventTypes.includes('体験会') || item.description.includes('初心者');
  return item.description.includes('初心者');
}

function supportsCertification(item: SearchItem) {
  if (item.type === 'teacher') {
    return item.specialties.includes('資格対策') || item.certifications.some((value) => /RYT|認定|講師|ファシリテーター/.test(value));
  }
  if (item.type === 'school') {
    return item.programs.some((value) => /指導者養成|プロYoga|検定|講座/.test(value)) || item.strengths.includes('資格取得に強い');
  }
  if (item.type === 'event') {
    return item.contentTags.includes('資格対策') || item.contentTags.includes('プロYoga') || item.eventTypes.includes('講座');
  }
  return item.activities.some((value) => /検定|学習会|プロYoga/.test(value));
}

function isProYoga(item: SearchItem) {
  if (item.type === 'teacher') return item.proYogaStatus.includes('取得');
  if (item.type === 'school') return item.proYogaSupported;
  if (item.type === 'event') return item.contentTags.includes('プロYoga');
  return item.activities.some((value) => value.includes('プロYoga'));
}

function matchesFeatureFilter(item: SearchItem, feature: string) {
  if (feature === '初心者歓迎') return isBeginnerFriendly(item);
  if (feature === '英語対応') return supportsEnglish(item);
  if (feature === '外国人対応') return isForeignFriendly(item);
  if (feature === 'プロYoga対応') return isProYoga(item);
  if (feature === '資格対応') return supportsCertification(item);
  return false;
}

function matchesLevelFilter(item: SearchItem, level: string) {
  if (item.type === 'teacher') {
    if (level === '初心者') return item.targetLevels.includes('初心者');
    if (level === '中級') return item.targetLevels.includes('中級者');
    if (level === '上級') return item.targetLevels.includes('上級者') || item.targetLevels.includes('インストラクター向け');
    return false;
  }

  if (item.type === 'school') {
    if (level === '初心者') return item.strengths.includes('初心者に強い') || item.programs.includes('体験レッスン');
    if (level === '中級') return item.strengths.some((value) => ['本格指導', '解剖学重視', '運動量多め'].includes(value)) || item.programs.includes('ワークショップ');
    if (level === '上級') return item.proYogaSupported || item.programs.some((value) => /指導者養成|プロYoga|検定|マネージャー/.test(value)) || item.strengths.some((value) => ['資格取得に強い', '哲学重視'].includes(value));
    return false;
  }

  if (item.type === 'event') {
    if (level === '初心者') return item.eventTypes.includes('体験会') || item.description.includes('初心者');
    if (level === '中級') return item.eventTypes.includes('ワークショップ') || item.contentTags.some((value) => ['姿勢改善', 'ダイエット', '肩こり', '腰痛', '運動系'].includes(value));
    if (level === '上級') return item.eventTypes.some((value) => ['講座', '検定対策', 'プロYoga説明会'].includes(value)) || item.contentTags.some((value) => ['資格対策', 'プロYoga', 'ヨガ哲学'].includes(value));
    return false;
  }

  if (item.type === 'club') {
    if (level === '初心者') return item.description.includes('初心者');
    if (level === '中級') return item.activities.includes('定期レッスン') || /姿勢改善|肩こり|腰痛/.test(item.description);
    if (level === '上級') return item.activities.some((value) => /検定|プロYoga/.test(value));
  }

  return false;
}

function matchesPurposeFilter(item: SearchItem, purpose: string) {
  const text = getSearchableText(item);

  if (purpose === 'リラックス') return /リラックス|睡眠|メンタル|やさしい/.test(text);
  if (purpose === '姿勢改善') return /姿勢改善/.test(text);
  if (purpose === '肩こり・腰痛') return /肩こり|腰痛/.test(text);
  if (purpose === 'ダイエット') return /ダイエット|運動量|パワーヨガ|ヴィンヤサ/.test(text);
  if (purpose === '瞑想・呼吸') return /瞑想|呼吸法|メディテーション/.test(text);
  return false;
}

function buildSearchPresetFromDiagnosis(input: StudentDiagnosisInput): SearchFilterPreset {
  const levels: string[] = [];
  const purposes: string[] = [];
  const features: string[] = [];

  if (['未経験', '少しある'].includes(input.yogaExperience)) {
    levels.push('初心者');
    features.push('初心者歓迎');
  } else if (input.yogaExperience === '継続中') {
    levels.push('中級');
  } else if (input.yogaExperience === '深く学んでいる') {
    levels.push('上級');
  }

  if (input.goals.includes('リラックス') || input.goals.includes('睡眠改善') || input.goals.includes('ストレス軽減')) {
    purposes.push('リラックス');
  }
  if (input.goals.includes('姿勢改善')) {
    purposes.push('姿勢改善');
  }
  if (
    input.goals.includes('肩こり改善')
    || input.goals.includes('腰痛改善')
    || input.bodyConditions.some((item) => ['肩こり', '首こり', '腰痛'].includes(item))
  ) {
    purposes.push('肩こり・腰痛');
  }
  if (input.goals.includes('ダイエット') || input.goals.includes('運動不足解消')) {
    purposes.push('ダイエット');
  }
  if (
    input.goals.includes('瞑想・呼吸法')
    || input.preferredStyles.includes('瞑想重視')
    || input.preferredStyles.includes('呼吸法重視')
  ) {
    purposes.push('瞑想・呼吸');
  }

  if (input.preferredLanguage === '英語') {
    features.push('英語対応');
  }
  if (input.preferredLanguage !== '日本語' || input.japaneseAnxiety !== 'ない' || input.wantsForeignFriendly === '希望する') {
    features.push('外国人対応');
  }
  if (input.goals.includes('資格取得に興味がある') || input.goals.includes('本格的に学びたい')) {
    features.push('資格対応', 'プロYoga対応');
  }

  const area = input.preferredArea !== 'オンライン'
    ? input.preferredArea
    : input.residentArea !== 'オンライン'
      ? input.residentArea
      : 'all';

  return {
    area,
    levels: uniqueValues(levels),
    purposes: uniqueValues(purposes),
    features: uniqueValues(features),
  };
}

function scoreItem(item: SearchItem, input: StudentDiagnosisInput) {
  let score = 0;
  if (item.area === input.preferredArea) score += 8;
  if (item.area === input.residentArea) score += 4;
  if (input.preferredArea === 'オンライン' && item.languages.length > 0) score += 1;

  const tags = getItemTags(item);
  input.goals.forEach((goal) => {
    if (tags.some((tag) => tag.includes(goal) || goal.includes(tag))) score += 5;
    if (goal === 'リラックス' && tags.some((tag) => tag.includes('リラックス') || tag.includes('睡眠') || tag.includes('瞑想'))) score += 2;
    if (goal === '資格取得に興味がある' && tags.some((tag) => tag.includes('資格') || tag.includes('プロYoga') || tag.includes('養成'))) score += 8;
    if (goal === '本格的に学びたい' && tags.some((tag) => tag.includes('本格') || tag.includes('哲学') || tag.includes('養成'))) score += 6;
  });
  input.bodyConditions.forEach((condition) => {
    if (tags.some((tag) => tag.includes(condition) || condition.includes(tag))) score += 4;
  });
  input.preferredStyles.forEach((style) => {
    if (tags.some((tag) => tag.includes(style))) score += 4;
  });

  if (input.yogaExperience === '未経験' && tags.some((tag) => tag.includes('初心者'))) score += 6;
  if (input.onlineAvailable === '可能' && tags.some((tag) => tag.includes('オンライン'))) score += 4;
  if (input.participationModes.includes('オンラインで受けたい') && tags.some((tag) => tag.includes('オンライン'))) score += 5;
  if (input.participationModes.includes('自宅動画で始めたい') && item.type === 'school' && item.schoolTypes.includes('オンラインスクール')) score += 5;

  if (input.preferredLanguage !== '日本語') {
    if (item.languages.includes(input.preferredLanguage)) score += 10;
    if (getForeignScore(item)) score += 6;
  }
  if (input.japaneseAnxiety !== 'ない' && getForeignScore(item)) score += 5;
  if (input.wantsForeignFriendly === '希望する' && getForeignScore(item)) score += 5;

  if (input.participationModes.includes('スクールに通いたい') && item.type === 'school') score += 12;
  if (input.participationModes.includes('先生に習いたい') && item.type === 'teacher') score += 10;
  if (input.participationModes.includes('イベントで試したい') && item.type === 'event') score += 10;
  if ((input.participationModes.includes('ヨガクラブに入りたい') || input.preferredStyles.includes('仲間と続けたい')) && item.type === 'club') score += 10;

  if ((input.goals.includes('資格取得に興味がある') || input.goals.includes('本格的に学びたい')) && (tags.some((tag) => tag.includes('プロYoga') || tag.includes('資格') || tag.includes('養成')))) {
    score += 8;
  }

  if (item.type === 'school') score += 2;

  return score;
}

function hasAny(values: string[], targets: string[]) {
  return targets.some((target) => values.includes(target));
}

function buildRecommendedYogaPose(input: StudentDiagnosisInput): YogaPoseRecommendation {
  const beginner = ['未経験', '少しある'].includes(input.yogaExperience);
  const wantsStressCare = hasAny(input.goals, ['リラックス', 'ストレス軽減', '睡眠改善', '瞑想・呼吸法'])
    || hasAny(input.bodyConditions, ['睡眠の悩み', '自律神経の乱れ', '疲れやすい']);
  const wantsBackCare = input.goals.includes('腰痛改善') || input.bodyConditions.includes('腰痛');
  const wantsShoulderPosture = hasAny(input.goals, ['肩こり改善', '姿勢改善']) || hasAny(input.bodyConditions, ['肩こり', '首こり']);
  const wantsExercise = input.goals.includes('運動不足解消') || input.preferredStyles.includes('しっかり動く');
  const wantsFlexibility = input.goals.includes('柔軟性向上') || input.bodyConditions.includes('股関節の硬さ');
  const wantsBalance = input.preferredStyles.includes('バランス型');
  const wantsBreathFocus = input.preferredStyles.includes('瞑想重視') || input.preferredStyles.includes('呼吸法重視') || input.goals.includes('瞑想・呼吸法');
  const wantsDigestiveSupport = hasAny(input.bodyConditions, ['冷え', 'むくみ']);

  if (wantsBackCare) {
    if (beginner) {
      return {
        category: '仰臥位・伏臥位',
        title: 'セツ・バンダーサナ（橋のポーズ）',
        description: '仰向けでひざを立て、お尻を小さく持ち上げます。背中と胸まわりをやさしく広げ、腰まわりのこわばりをゆるめる助けになるとされています。',
        practice: '10秒 × 3回',
      };
    }

    return {
      category: '仰臥位・伏臥位',
      title: 'ブジャンガーサナ（コブラのポーズ）',
      description: 'うつ伏せから胸をやさしく持ち上げるポーズです。背中を無理なく動かし、腰まわりの緊張をゆるめるのに役立つとされています。',
      practice: '10秒 × 3回',
    };
  }

  if (wantsStressCare || wantsBreathFocus) {
    if (input.goals.includes('瞑想・呼吸法') || input.preferredStyles.includes('瞑想重視')) {
      return {
        category: '呼吸・瞑想',
        title: '瞑想（1分）',
        description: '楽に座って目を閉じ、呼吸の出入りを静かに見守ります。気持ちを落ち着け、自分の状態を整える時間として役立つとされています。',
        practice: '1分 × 1回',
      };
    }

    return {
      category: '呼吸・瞑想',
      title: 'ブラマリ（ハチの呼吸）',
      description: '息を吐くときに小さくハミングする呼吸法です。顔や肩の力みをやわらげ、気分を静めたいときに役立つとされています。',
      practice: '3呼吸 × 3回',
    };
  }

  if (wantsShoulderPosture) {
    if (!beginner && wantsBalance) {
      return {
        category: '立位',
        title: 'ヴリクシャーサナ（木のポーズ）',
        description: '片足に少しずつ体重をのせて立つポーズです。姿勢を整えながら、肩や体幹をやさしく意識する助けになるとされています。',
        practice: '左右10秒 × 2回',
      };
    }

    return {
      category: '立位',
      title: 'タダーサナ（山のポーズ）',
      description: '足裏で床を感じながらまっすぐ立つ基本のポーズです。胸をひらきやすくなり、姿勢を見直したいときに役立つとされています。',
      practice: '10秒 × 3回',
    };
  }

  if (wantsExercise) {
    if (!beginner) {
      return {
        category: '立位',
        title: 'トリコナーサナ（三角のポーズ）',
        description: '足幅を広げて体の横を気持ちよく伸ばすポーズです。全身を大きく使い、運動不足をやさしくほぐす助けになるとされています。',
        practice: '左右10秒 × 2回',
      };
    }

    return {
      category: '立位',
      title: 'タダーサナ（山のポーズ）',
      description: 'まっすぐ立って呼吸を整える基本のポーズです。体を起こしやすくし、最初の一歩として取り入れやすいとされています。',
      practice: '10秒 × 3回',
    };
  }

  if (wantsFlexibility) {
    return {
      category: '座位',
      title: 'バッダ・コナーサナ（合せきのポーズ）',
      description: '足裏を合わせて座り、股関節まわりをゆっくりゆるめます。体の硬さが気になるときに、やさしくほぐす助けになるとされています。',
      practice: '15秒 × 2回',
    };
  }

  if (wantsDigestiveSupport) {
    return {
      category: '座位',
      title: 'ヴァジュラーサナ（正座のポーズ）',
      description: '無理のない正座で背すじを整えて座ります。体を落ち着けながら、お腹まわりを静かに整える時間として役立つとされています。',
      practice: '20秒 × 2回',
    };
  }

  if (beginner) {
    return {
      category: '立位',
      title: 'タダーサナ（山のポーズ）',
      description: '足を腰幅に開いて立ち、肩の力を抜いて呼吸します。はじめてでも取り入れやすく、姿勢を整える基本として役立つとされています。',
      practice: '10秒 × 3回',
    };
  }

  return {
    category: '呼吸・瞑想',
    title: 'ナディ・ショーダナ（片鼻呼吸）',
    description: '左右の鼻を交互に使い、ゆっくり呼吸のリズムを整える方法です。気持ちを切り替えたいときや、呼吸を落ち着けたいときに役立つとされています。',
    practice: '3呼吸 × 2回',
  };
}

function buildResult(input: StudentDiagnosisInput, items: SearchItem[]): DiagnosisResult {
  const scored = [...items].sort((a, b) => scoreItem(b, input) - scoreItem(a, input));

  const recommendedSchools = items
    .filter((item): item is School => item.type === 'school')
    .sort((a, b) => {
      const scoreDiff = scoreItem(b, input) - scoreItem(a, input);
      if (scoreDiff !== 0) return scoreDiff;

      const priorityDiff = (b.priorityRank ?? 0) - (a.priorityRank ?? 0);
      if (priorityDiff !== 0) return priorityDiff;

      const adminDiff = Number(b.adminRecommended) - Number(a.adminRecommended);
      if (adminDiff !== 0) return adminDiff;

      return 0;
    })
    .slice(0, 4);

  const recommendedTeachers = scored.filter((item) => item.type === 'teacher').slice(0, 3);
  const recommendedEvents = scored.filter((item) => item.type === 'event').slice(0, 3);
  const recommendedClubs = scored.filter((item) => item.type === 'club').slice(0, 3);

  const wantsInternational = input.preferredLanguage !== '日本語' || input.japaneseAnxiety !== 'ない' || input.wantsForeignFriendly === '希望する';
  const wantsCertification = input.goals.includes('資格取得に興味がある') || input.goals.includes('本格的に学びたい');
  const wantsPosture = input.goals.includes('姿勢改善') || input.bodyConditions.some((item) => ['肩こり', '首こり', '腰痛'].includes(item));

  let typeName = '初心者リラックス型';
  let summary = '安心して続けられるスクールと、やさしい先生・イベントから始めると相性が良いタイプです。';

  let internationalSupportTitle = '必要に応じて国際対応も確認できます';
  let internationalSupportSummary = '優先順位の高い候補を見たあとで、対応言語や外国人対応のしやすさも最後に確認できるようにしています。';
  let internationalSupportNotes = [
    '各候補の詳細で、対応言語や外国人対応の状況を確認できます。',
    '日本語以外のサポートが必要になったときも、後から比較しやすい構成です。',
    '今回のおすすめ順位や推薦ロジック自体は変えず、見やすい位置だけを後ろに整理しています。',
  ];

  if (wantsInternational) {
    typeName = '国際対応希望型';
    summary = '言語・外国人対応を重視した学習導線が向いています。英語・中国語・イタリア語などに対応したスクールや先生を優先表示しています。';
    internationalSupportTitle = '国際対応の確認ポイント';
    internationalSupportSummary = '優先候補を見たあとで、言語対応や外国人対応のしやすさを確認しやすいよう、国際対応の情報を後ろにまとめています。';
    internationalSupportNotes = [
      input.preferredLanguage !== '日本語'
        ? `${input.preferredLanguage}対応の候補を優先表示しています。`
        : '日本語以外の案内が必要な場合も、対応しやすい候補を確認できます。',
      input.japaneseAnxiety !== 'ない'
        ? '日本語での受講に不安がある場合も、案内しやすい候補を比較しやすくしています。'
        : '必要に応じて、言語面の安心感もあとから比較できます。',
      input.wantsForeignFriendly === '希望する'
        ? '外国人対応可能な先生・スクール・イベント・クラブを見つけやすくしています。'
        : '国際対応を重視する場合でも、主要候補の確認後に落ち着いて比較できます。',
    ];
  } else if (wantsCertification) {
    typeName = '資格学習関心型';
    summary = '本格学習・資格取得・検定導線との相性が高いタイプです。プロYoga対応や養成・検定対策に強いスクールを優先しています。';
  } else if (wantsPosture && input.participationModes.includes('スクールに通いたい')) {
    typeName = '姿勢改善・スクール継続型';
    summary = '姿勢改善と継続性の両立を重視するタイプです。少人数や解剖学重視のスクールを中心におすすめしています。';
  }

  return {
    typeName,
    summary,
    recommendedYogaPose: buildRecommendedYogaPose(input),
    recommendedSchools,
    recommendedTeachers,
    recommendedEvents,
    recommendedClubs,
    allRecommendedItems: [...recommendedSchools, ...recommendedTeachers, ...recommendedEvents, ...recommendedClubs],
    shouldShowBoxBreathing: input.goals.includes('ストレス軽減') || input.goals.includes('睡眠改善') || input.bodyConditions.includes('自律神経の乱れ'),
    shouldHighlightProYoga: wantsCertification,
    shouldShowInternationalSupport: true,
    internationalSupportTitle,
    internationalSupportSummary,
    internationalSupportNotes,
  };
}

function buildTeacherFromForm(values: Record<string, string | string[]>): Teacher {
  const area = asString(values.activityRegion) || '渋谷';
  const coords = getCoordinates(area);
  return {
    id: `t-${Date.now()}`,
    name: asString(values.activityName) || asString(values.name) || '新規先生',
    type: 'teacher',
    area,
    lat: coords.lat,
    lng: coords.lng,
    description: asString(values.profile) || `${area}エリアで活動する新規登録講師。`,
    targetLevels: asArray(values.targetLevels),
    specialties: asArray(values.specialties),
    formats: [...asArray(values.formats), ...(asString(values.onlineSupport) === '可能' ? ['オンライン'] : [])],
    certifications: [asString(values.certifications), asString(values.managerCourseStatus), asString(values.plannedCertification)].filter(Boolean),
    foreignSupportStatus: (asString(values.foreignSupportStatus) as Teacher['foreignSupportStatus']) || '対応不可',
    languages: ['日本語', ...asArray(values.languages)],
    languageLevel: asString(values.languageLevel) || '日常会話レベル',
    proYogaStatus: asString(values.proYogaStatus) || '未取得',
  };
}

function buildSchoolFromForm(values: Record<string, string | string[]>): School {
  const areas = asArray(values.areas);
  const area = areas[0] || inferArea(asString(values.address), '渋谷');
  const coords = getCoordinates(area);
  return {
    id: `s-${Date.now()}`,
    name: asString(values.name) || '新規スクール',
    type: 'school',
    area,
    lat: coords.lat,
    lng: coords.lng,
    description: asString(values.description) || `${area}エリアに対応する新規スクールです。`,
    schoolTypes: asArray(values.schoolTypes),
    programs: asArray(values.programs),
    strengths: [...asArray(values.strengths), ...asArray(values.internationalLinks)],
    foreignSupportStatus: (asString(values.foreignSupportStatus) as School['foreignSupportStatus']) || '対応不可',
    languages: ['日本語', ...asArray(values.languages)],
    internationalSupportLevel: asString(values.internationalSupportLevel) || '観光客対応',
    proYogaSupported: asArray(values.programs).includes('プロYoga対策') || asArray(values.strengths).includes('インド政府公認プロYoga対応'),
    featured: false,
    priorityRank: 0,
    adminRecommended: false,
  };
}

function buildEventFromForm(values: Record<string, string | string[]>): EventItem {
  const area = inferArea(asString(values.place), '渋谷');
  const coords = getCoordinates(area);
  return {
    id: `e-${Date.now()}`,
    name: asString(values.name) || '新規イベント',
    type: 'event',
    area,
    lat: coords.lat,
    lng: coords.lng,
    date: asString(values.date) || '2026-06-01',
    description: asString(values.description) || `${area}で開催予定のイベント。`,
    organizerType: asString(values.organizerType) || '先生',
    eventTypes: asArray(values.eventTypes),
    contentTags: asArray(values.contentTags),
    foreignParticipantStatus: (asString(values.foreignParticipantStatus) as EventItem['foreignParticipantStatus']) || '不可',
    languages: ['日本語', ...asArray(values.languages)],
    hasInterpreter: asString(values.hasInterpreter) === 'あり',
    isInternationalEvent: asString(values.isInternationalEvent) === 'はい',
  };
}

function buildClubFromForm(values: Record<string, string | string[]>): Club {
  const area = asString(values.area) || '渋谷';
  const coords = getCoordinates(area);
  return {
    id: `c-${Date.now()}`,
    name: asString(values.name) || '新規ヨガクラブ',
    type: 'club',
    area,
    lat: coords.lat,
    lng: coords.lng,
    description: asString(values.description) || `${area}で活動する新規ヨガクラブです。`,
    clubTypes: asArray(values.clubTypes),
    activities: asArray(values.activities),
    foreignParticipantStatus: (asString(values.foreignParticipantStatus) as Club['foreignParticipantStatus']) || '不可',
    languages: ['日本語', ...asArray(values.languages)],
    internationalExchangeAvailable: asString(values.internationalExchange) === '可能',
  };
}

export default function App() {
  const [page, setPage] = useState<PageKey>('home');
  const [teacherList, setTeacherList] = useState<Teacher[]>(initialTeachers);
  const [schoolList, setSchoolList] = useState<School[]>(initialSchools);
  const [eventList, setEventList] = useState<EventItem[]>(initialEvents);
  const [clubList, setClubList] = useState<Club[]>(initialClubs);
  const [diagnosisInput, setDiagnosisInput] = useState<StudentDiagnosisInput>(initialDiagnosis);
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResult | null>(null);
  const [diagnosisHistory, setDiagnosisHistory] = useState<DiagnosisHistoryRecord[]>(() => loadDiagnosisHistory());
  const [searchType, setSearchType] = useState<FilterType>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchArea, setSearchArea] = useState<'all' | string>('all');
  const [searchLevels, setSearchLevels] = useState<string[]>([]);
  const [searchPurposes, setSearchPurposes] = useState<string[]>([]);
  const [searchFeatures, setSearchFeatures] = useState<string[]>([]);
  const [detailItem, setDetailItem] = useState<SearchItem | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const allItems = useMemo<SearchItem[]>(() => [...schoolList, ...teacherList, ...eventList, ...clubList], [schoolList, teacherList, eventList, clubList]);

  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      const matchesType = searchType === 'all' || item.type === searchType;
      const matchesArea = searchArea === 'all' || item.area === searchArea;
      const text = getSearchableText(item);
      const matchesKeyword = !searchKeyword || text.includes(searchKeyword.toLowerCase());
      const matchesLevel = searchLevels.length === 0 || searchLevels.some((level) => matchesLevelFilter(item, level));
      const matchesPurpose = searchPurposes.length === 0 || searchPurposes.some((purpose) => matchesPurposeFilter(item, purpose));
      const matchesFeature = searchFeatures.length === 0 || searchFeatures.some((feature) => matchesFeatureFilter(item, feature));
      return matchesType && matchesArea && matchesKeyword && matchesLevel && matchesPurpose && matchesFeature;
    });
  }, [allItems, searchArea, searchFeatures, searchKeyword, searchLevels, searchPurposes, searchType]);

  const moveTo = (next: PageKey) => {
    setMobileMenuOpen(false);
    setPage(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDiagnosisSubmit = (input: StudentDiagnosisInput) => {
    setDiagnosisInput(input);
    const result = buildResult(input, allItems);
    setDiagnosisResult(result);

    const historyRecord: DiagnosisHistoryRecord = {
      id: `diagnosis-${Date.now()}`,
      createdAt: new Date().toISOString(),
      input,
      scores: buildWellnessScores(input),
      result,
    };

    setDiagnosisHistory((prev) => {
      const next = [historyRecord, ...prev].slice(0, 2);
      persistDiagnosisHistory(next);
      return next;
    });

    moveTo('results');
  };

  const applySearchPreset = (preset: SearchFilterPreset, type: FilterType = 'all') => {
    setSearchType(type);
    setSearchKeyword('');
    setSearchArea(preset.area);
    setSearchLevels(preset.levels);
    setSearchPurposes(preset.purposes);
    setSearchFeatures(preset.features);
    moveTo('search');
  };

  const openSearchWithType = (type: FilterType, useDiagnosisPreset = false) => {
    if (useDiagnosisPreset) {
      applySearchPreset(buildSearchPresetFromDiagnosis(diagnosisInput), type);
      return;
    }

    setSearchType(type);
    moveTo('search');
  };

  const clearSearchFilters = () => {
    setSearchKeyword('');
    setSearchArea('all');
    setSearchLevels([]);
    setSearchPurposes([]);
    setSearchFeatures([]);
  };

  const hasAdvancedSearchFilters = searchLevels.length > 0 || searchPurposes.length > 0 || searchFeatures.length > 0 || searchArea !== 'all' || searchKeyword.length > 0;

  const currentYear = new Date().getFullYear();

  const footerGroups: Array<{
    title: string;
    links: Array<{ label: string; action?: () => void; disabled?: boolean }>;
  }> = [
    {
      title: 'Service',
      links: [
        { label: '無料診断を始める', action: () => moveTo('diagnosis') },
        { label: '先生を探す', action: () => openSearchWithType('teacher') },
        { label: 'イベントを探す', action: () => openSearchWithType('event') },
      ],
    },
    {
      title: 'Learning / Certification',
      links: [
        { label: '動画で学ぶ', disabled: true },
        { label: '資格・検定', action: () => moveTo('pro-yoga') },
        { label: 'プロYoga検定', action: () => moveTo('pro-yoga') },
        { label: 'ヨガの聖地と文化', action: () => moveTo('sacred-sites') },
      ],
    },
    {
      title: 'Others',
      links: [
        { label: '連盟について', disabled: true },
        { label: 'お知らせ', disabled: true },
        { label: 'お問い合わせ', disabled: true },
      ],
    },
  ];

  return (
    <div className="app-root">
      <header className="topbar">
        <div className="topbar-brand-row">
          <button className="brandmark" onClick={() => moveTo('home')}>Yoga Organization of Japan</button>
          <button
            type="button"
            className={`menu-toggle ${mobileMenuOpen ? 'is-open' : ''}`}
            aria-expanded={mobileMenuOpen}
            aria-label="メニューを開く"
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
        <div className="topbar-actions">
          <button className="primary-button header-main-button" onClick={() => moveTo('diagnosis')}>無料診断を始める</button>
          <nav className={`nav-row nav-secondary-menu ${mobileMenuOpen ? 'is-open' : ''}`}>
            <button className="nav-mobile-home" onClick={() => moveTo('home')}>TOPへ戻る</button>
            <button onClick={() => openSearchWithType('all', page === 'results')}>検索・一覧</button>
            <button onClick={() => moveTo('my-page')}>マイページ</button>
            <button onClick={() => moveTo('pro-yoga')}>プロYoga検定</button>
          </nav>
        </div>
      </header>

      <main className="main-shell">
        {page === 'home' && (
          <div className="page-shell split-home">
            <section className="hero-panel federation-hero student-hero-panel">
              <div className="hero-copy-block">
                <span className="eyebrow">For Students</span>
                <h1>無料診断で、あなたに合うヨガと出会う</h1>
                <p className="hero-subcopy">先生・スクール・イベント・ヨガクラブから、あなたに合うヨガ体験を提案します。</p>
              </div>
              <div className="hero-actions wrap student-hero-actions">
                <button className="primary-button hero-primary-cta" onClick={() => moveTo('diagnosis')}>無料診断を始める</button>
                <div className="hero-secondary-search-entry">
                  <span className="hero-secondary-search-label">すでにヨガをしている方へ</span>
                  <button className="ghost-button hero-secondary-search-button" onClick={() => moveTo('search')}>ヨガを探す</button>
                </div>
              </div>
              <p className="hero-support-copy">
                まずは無料診断から。目的、身体状態、通いやすいエリア、国際対応ニーズに合わせて、スクールを中心におすすめを表示します。
              </p>
              <div className="hero-card-grid stats-cards">
                <div className="stats-card"><strong>{schoolList.length}</strong><span>おすすめスクール</span></div>
                <div className="stats-card"><strong>{teacherList.length}</strong><span>おすすめ先生</span></div>
                <div className="stats-card"><strong>{eventList.length}</strong><span>イベント</span></div>
                <div className="stats-card"><strong>{clubList.length}</strong><span>ヨガクラブ</span></div>
              </div>
            </section>

            <section className="panel business-entry-panel">
              <div className="section-inline-header business-entry-header">
                <div>
                  <span className="eyebrow business-eyebrow">For Organizers</span>
                  <h3>先生・スクール・イベント主催者の方へ</h3>
                  <p>掲載導線、先生AI診断、プロYoga検定の情報をまとめて確認できます。</p>
                </div>
                <div className="business-entry-actions business-entry-actions-three">
                  <button className="secondary-button business-entry-button" onClick={() => moveTo('listing-select')}>掲載する</button>
                  <button className="primary-button business-entry-button" onClick={() => moveTo('teacher-diagnosis')}>自分のレベルを知る（先生AI診断）</button>
                  <button className="gold-button business-entry-button" onClick={() => moveTo('pro-yoga')}>プロYoga検定を見る</button>
                </div>
              </div>
            </section>

            <section className="panel quick-links-panel">
              <div className="section-inline-header">
                <h3>探す</h3>
              </div>
              <div className="quick-link-grid">
                <button className="quick-link-card" onClick={() => openSearchWithType('teacher')}><strong>先生</strong><span>個別指導や専門指導から探す</span></button>
                <button className="quick-link-card" onClick={() => openSearchWithType('school')}><strong>スクール</strong><span>継続・学習導線を最優先で探す</span></button>
                <button className="quick-link-card" onClick={() => openSearchWithType('event')}><strong>イベント</strong><span>体験・説明会・交流会から試す</span></button>
                <button className="quick-link-card" onClick={() => openSearchWithType('club')}><strong>ヨガクラブ</strong><span>仲間と継続できる場を探す</span></button>
              </div>
            </section>

            <div className="feature-showcase">
              <section className="panel">
                <h3>このMVPの特徴</h3>
                <ul className="check-list">
                  <li>生徒導線と事業者導線を明確に分離</li>
                  <li>スクール最優先の推薦ロジック</li>
                  <li>言語・外国人対応を考慮した国際対応マッチング</li>
                  <li>検索・一覧と地図の両方で比較可能</li>
                </ul>
              </section>
              <MapView items={allItems.slice(0, 12)} onSelectItem={setDetailItem} />
            </div>
          </div>
        )}

        {page === 'diagnosis' && <DiagnosisForm initialValue={diagnosisInput} onSubmit={handleDiagnosisSubmit} onBackHome={() => moveTo('home')} />}

        {page === 'results' && diagnosisResult && (
          <ResultPage
            result={diagnosisResult}
            scoreSummary={buildResultScoreSummary(diagnosisHistory[0]?.scores ?? buildWellnessScores(diagnosisInput))}
            onRestart={() => moveTo('diagnosis')}
            onOpenSearch={() => openSearchWithType('all', true)}
            onBackHome={() => moveTo('home')}
            onOpenMyPage={() => moveTo('my-page')}
            onOpenProYoga={() => moveTo('pro-yoga')}
            onDetail={setDetailItem}
          />
        )}

        {page === 'my-page' && (
          <MyPage
            history={diagnosisHistory}
            onRestart={() => moveTo('diagnosis')}
            onDetail={setDetailItem}
          />
        )}

        {page === 'teacher-diagnosis' && (
          <TeacherDiagnosisPage
            onOpenListingSelect={() => moveTo('listing-select')}
            onOpenTeacherRegister={() => moveTo('teacher-register')}
            onOpenProYoga={() => moveTo('pro-yoga')}
            onBackHome={() => moveTo('home')}
          />
        )}

        {page === 'search' && (
          <div className="page-shell">
            <section className="hero-panel compact-hero">
              <div>
                <TopBackLink onBackHome={() => moveTo('home')} />
                <span className="eyebrow">Search & Directory</span>
                <h2>先生・スクール・イベント・ヨガクラブを探す</h2>
                <p>カード一覧とGoogleマップを同時に見ながら、条件に合う候補を比較できます。</p>
              </div>
            </section>
            <section className="panel search-filter-panel">
              <div className="filter-row">
                <div className="tab-row">
                  {(['all', 'school', 'teacher', 'event', 'club'] as const).map((type) => (
                    <button key={type} className={searchType === type ? 'tab-button active' : 'tab-button'} onClick={() => setSearchType(type)}>
                      {type === 'all' ? 'すべて' : type === 'school' ? 'スクール' : type === 'teacher' ? '先生' : type === 'event' ? 'イベント' : 'ヨガクラブ'}
                    </button>
                  ))}
                </div>
                <div className="search-row">
                  <input value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} placeholder="名前・説明・タグで検索" />
                  <select value={searchArea} onChange={(e) => setSearchArea(e.target.value)}>
                    <option value="all">全エリア</option>
                    {AREAS.filter((area) => area !== 'オンライン').map((area) => <option key={area} value={area}>{area}</option>)}
                  </select>
                </div>
              </div>

              <div className="search-filter-groups">
                <section className="search-filter-group">
                  <div className="search-filter-heading">
                    <strong>レベル</strong>
                    <span>経験値に合わせて探す</span>
                  </div>
                  <div className="chip-grid compact">
                    {searchLevelOptions.map((level) => (
                      <button
                        key={level}
                        type="button"
                        className={searchLevels.includes(level) ? 'select-chip active search-filter-chip' : 'select-chip search-filter-chip'}
                        onClick={() => setSearchLevels((prev) => toggleFilterValue(prev, level))}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </section>

                <section className="search-filter-group">
                  <div className="search-filter-heading">
                    <strong>目的</strong>
                    <span>気になるテーマで絞り込む</span>
                  </div>
                  <div className="chip-grid compact">
                    {searchPurposeOptions.map((purpose) => (
                      <button
                        key={purpose}
                        type="button"
                        className={searchPurposes.includes(purpose) ? 'select-chip active search-filter-chip' : 'select-chip search-filter-chip'}
                        onClick={() => setSearchPurposes((prev) => toggleFilterValue(prev, purpose))}
                      >
                        {purpose}
                      </button>
                    ))}
                  </div>
                </section>

                <section className="search-filter-group">
                  <div className="search-filter-heading">
                    <strong>特徴</strong>
                    <span>気になる対応や強みで選ぶ</span>
                  </div>
                  <div className="chip-grid compact">
                    {searchFeatureOptions.map((feature) => (
                      <button
                        key={feature}
                        type="button"
                        className={searchFeatures.includes(feature) ? 'select-chip active search-filter-chip' : 'select-chip search-filter-chip'}
                        onClick={() => setSearchFeatures((prev) => toggleFilterValue(prev, feature))}
                      >
                        {feature}
                      </button>
                    ))}
                  </div>
                </section>
              </div>

              <div className="search-filter-meta">
                <p><strong>{filteredItems.length}件</strong> 見つかりました</p>
                {hasAdvancedSearchFilters && (
                  <button type="button" className="ghost-button search-filter-reset" onClick={clearSearchFilters}>
                    絞り込みをクリア
                  </button>
                )}
              </div>
            </section>
            <MapView items={filteredItems} selectedType={searchType} onSelectItem={setDetailItem} />
            <CardList title="検索結果一覧" items={filteredItems} onDetail={setDetailItem} emptyMessage="条件に合う候補が見つかりませんでした。フィルターを少し減らしてみてください。" />
          </div>
        )}

        {page === 'listing-select' && (
          <div className="page-shell">
            <section className="hero-panel compact-hero listing-select-hero">
              <div>
                <span className="eyebrow">For Organizers</span>
                <h2>掲載するカテゴリを選択してください</h2>
                <p>先生・スクール・イベント・ヨガクラブの掲載導線をここから選べます。無料掲載のまま登録ページへ進めます。</p>
              </div>
              <div className="hero-actions">
                <button className="secondary-button" onClick={() => moveTo('home')}>TOPへ戻る</button>
              </div>
            </section>
            <section className="panel listing-select-panel">
              <div className="listing-option-grid">
                <button className="listing-option-card" onClick={() => moveTo('teacher-register')}>
                  <strong>先生として登録</strong>
                  <span>プロフィールや得意分野、外国語対応を掲載する</span>
                </button>
                <button className="listing-option-card" onClick={() => moveTo('school-register')}>
                  <strong>スクールを登録</strong>
                  <span>スクールの強みや資格導線、国際対応を掲載する</span>
                </button>
                <button className="listing-option-card" onClick={() => moveTo('event-register')}>
                  <strong>イベントを登録</strong>
                  <span>体験会・説明会・ワークショップ情報を掲載する</span>
                </button>
                <button className="listing-option-card" onClick={() => moveTo('club-register')}>
                  <strong>ヨガクラブを登録</strong>
                  <span>継続コミュニティや交流会情報を掲載する</span>
                </button>
              </div>
            </section>
          </div>
        )}

        {page === 'teacher-register' && (
          <RegisterForm title="先生登録ページ" subtitle="先生プロフィールを登録し、一覧とおすすめに反映します。" sections={teacherSections} onSubmit={(values) => { setTeacherList((prev) => [buildTeacherFromForm(values), ...prev]); moveTo('search'); setSearchType('teacher'); }} />
        )}
        {page === 'school-register' && (
          <RegisterForm title="スクール登録ページ" subtitle="スクール情報を登録し、スクール最優先の推薦導線に反映します。" sections={schoolSections} onSubmit={(values) => { setSchoolList((prev) => [buildSchoolFromForm(values), ...prev]); moveTo('search'); setSearchType('school'); }} />
        )}
        {page === 'event-register' && (
          <RegisterForm title="イベント登録ページ" subtitle="イベント情報を登録し、体験導線・説明会導線として掲載します。" sections={eventSections} onSubmit={(values) => { setEventList((prev) => [buildEventFromForm(values), ...prev]); moveTo('search'); setSearchType('event'); }} />
        )}
        {page === 'club-register' && (
          <RegisterForm title="ヨガクラブ登録ページ" subtitle="コミュニティ情報を登録し、仲間と続けたい生徒に訴求します。" sections={clubSections} onSubmit={(values) => { setClubList((prev) => [buildClubFromForm(values), ...prev]); moveTo('search'); setSearchType('club'); }} />
        )}
        {page === 'pro-yoga' && <ProYogaPage onStartDiagnosis={() => moveTo('diagnosis')} onBackHome={() => moveTo('home')} onOpenDrill={() => moveTo('pro-drill')} />}
        {page === 'pro-drill' && <ProDrillPage onBackHome={() => moveTo('home')} />}
        {page === 'diagnosis-v2' && <DiagnosisV2Page />}
        {page === 'sacred-sites' && <SacredSitesPage onBackHome={() => moveTo('home')} />}
        {page === 'terms' && (
          <StaticInfoPage
            eyebrow="Terms"
            title="利用規約"
            intro="本ページはMVP用の簡易的な利用規約表示です。正式公開時には、提供条件、禁止事項、免責事項などをより詳細に掲載できます。"
            sections={[
              {
                heading: 'サービス利用について',
                body: 'AI診断、検索、掲載登録などの機能は、利用者の自己判断のもとでご利用いただく前提の情報提供サービスです。掲載情報や診断結果は、最終的な意思決定を補助する参考情報として扱います。',
              },
              {
                heading: '掲載情報と免責',
                body: '掲載内容は将来的に運営または掲載者によって更新される可能性があります。MVP段階ではダミーデータを含むため、正式運用時には審査・更新フロー・免責表記を拡張できる構成です。',
              },
            ]}
          />
        )}
        {page === 'privacy' && (
          <StaticInfoPage
            eyebrow="Privacy"
            title="プライバシーポリシー"
            intro="本ページはMVP用の簡易的なプライバシーポリシー表示です。正式公開時には、取得情報、利用目的、保管期間、第三者提供などをより詳細に整備できます。"
            sections={[
              {
                heading: '取得する情報の考え方',
                body: 'AI診断入力や検索条件など、サービス改善や画面表示に必要な情報を取り扱う想定です。正式公開時には、取得項目ごとの目的と保管方法を明確に記載できます。',
              },
              {
                heading: '利用目的',
                body: 'おすすめ表示、検索体験の向上、問い合わせ対応、サービス改善などに利用する想定です。MVPではフロントエンド中心の構成であり、今後の本番実装時に詳細な運用ポリシーへ拡張可能です。',
              },
            ]}
          />
        )}
      </main>

      <footer className="site-footer">
        <div className="site-footer-inner enhanced-footer-grid">
          <section className="footer-brand-block">
            <button type="button" className="footer-brandmark" onClick={() => moveTo('home')}>
              <span className="footer-brand-logo" aria-hidden="true">YJ</span>
              <span className="footer-brand-copy">
                <strong>Yoga Organization of Japan</strong>
                <small>ヨガ教育・診断・学びの導線をつなぐ公式感のあるプラットフォーム</small>
              </span>
            </button>
          </section>

          {footerGroups.map((group) => (
            <section key={group.title} className="footer-group">
              <h4>{group.title}</h4>
              <div className="footer-link-list">
                {group.links.map((link) => (
                  <button
                    key={link.label}
                    type="button"
                    className={link.disabled ? 'footer-link is-disabled' : 'footer-link'}
                    onClick={link.action}
                    disabled={link.disabled}
                  >
                    {link.label}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
        <div className="site-footer-meta">
          <p>© {currentYear} Yoga Organization of Japan. All rights reserved.</p>
          <div className="footer-legal-links">
            <button type="button" className="footer-link" onClick={() => moveTo('terms')}>利用規約</button>
            <button type="button" className="footer-link" onClick={() => moveTo('privacy')}>プライバシーポリシー</button>
          </div>
        </div>
      </footer>

      {detailItem && (
        <aside className="detail-drawer">
          <div className="detail-header">
            <div>
              <span className={`type-pill ${detailItem.type}`}>{detailItem.type === 'school' ? 'スクール' : detailItem.type === 'teacher' ? '先生' : detailItem.type === 'event' ? 'イベント' : 'ヨガクラブ'}</span>
              <h3>{detailItem.name}</h3>
            </div>
            <button className="close-button" onClick={() => setDetailItem(null)}>×</button>
          </div>
          <p>{detailItem.description}</p>
          <div className="detail-grid">
            <div><strong>地域</strong><span>{detailItem.area}</span></div>
            <div><strong>対応言語</strong><span>{detailItem.languages.join(' / ')}</span></div>
            <div><strong>タグ</strong><span>{getItemTags(detailItem).slice(0, 8).join(' / ')}</span></div>
          </div>
        </aside>
      )}
    </div>
  );
}
