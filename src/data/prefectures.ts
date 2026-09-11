export interface PrefectureGroup {
  label: string;
  prefectures: string[];
}

export const PREFECTURE_GROUPS: PrefectureGroup[] = [
  { label: '北海道', prefectures: ['北海道'] },
  { label: '東北', prefectures: ['青森', '岩手', '宮城', '秋田', '山形', '福島'] },
  { label: '関東', prefectures: ['茨城', '栃木', '群馬', '埼玉', '千葉', '東京', '神奈川'] },
  { label: '甲信越・北陸', prefectures: ['新潟', '富山', '石川', '福井', '山梨', '長野'] },
  { label: '東海', prefectures: ['岐阜', '静岡', '愛知', '三重'] },
  { label: '近畿', prefectures: ['滋賀', '京都', '大阪', '兵庫', '奈良', '和歌山'] },
  { label: '中国', prefectures: ['鳥取', '島根', '岡山', '広島', '山口'] },
  { label: '四国', prefectures: ['徳島', '香川', '愛媛', '高知'] },
  { label: '九州・沖縄', prefectures: ['福岡', '佐賀', '長崎', '熊本', '大分', '宮崎', '鹿児島', '沖縄'] },
];

export const EXTRA_AREAS = ['オンライン', '全国', '海外', '特に指定なし'];

export const ALL_AREAS: string[] = [
  ...PREFECTURE_GROUPS.flatMap((g) => g.prefectures),
  ...EXTRA_AREAS,
];

export const LEGACY_AREA_MAP: Record<string, string> = {
  '渋谷': '東京',
  '新宿': '東京',
  '銀座': '東京',
  '青山': '東京',
  '表参道': '東京',
  '恵比寿': '東京',
  '世田谷': '東京',
  '吉祥寺': '東京',
  '品川': '東京',
  '浅草': '東京',
  '上野': '東京',
  'オンライン': 'オンライン',
};

export function migrateArea(area: string): string {
  return LEGACY_AREA_MAP[area] ?? area;
}
