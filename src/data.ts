export type EntityType = 'teacher' | 'school' | 'event' | 'club';

export interface Teacher {
  id: string;
  name: string;
  type: 'teacher';
  area: string;
  lat: number;
  lng: number;
  description: string;
  targetLevels: string[];
  specialties: string[];
  formats: string[];
  certifications: string[];
  foreignSupportStatus: '対応可能' | '一部対応可能' | '対応不可';
  languages: string[];
  languageLevel: string;
  proYogaStatus: string;
}

export interface School {
  id: string;
  name: string;
  type: 'school';
  area: string;
  lat: number;
  lng: number;
  description: string;
  schoolTypes: string[];
  programs: string[];
  strengths: string[];
  foreignSupportStatus: '積極的に受け入れ' | '一部対応' | '対応不可';
  languages: string[];
  internationalSupportLevel: string;
  proYogaSupported: boolean;
  featured: boolean;
  priorityRank: number;
  adminRecommended: boolean;
}

export interface EventItem {
  id: string;
  name: string;
  type: 'event';
  area: string;
  lat: number;
  lng: number;
  date: string;
  description: string;
  organizerType: string;
  eventTypes: string[];
  contentTags: string[];
  foreignParticipantStatus: '可能' | '一部可能' | '不可';
  languages: string[];
  hasInterpreter: boolean;
  isInternationalEvent: boolean;
}

export interface Club {
  id: string;
  name: string;
  type: 'club';
  area: string;
  lat: number;
  lng: number;
  description: string;
  clubTypes: string[];
  activities: string[];
  foreignParticipantStatus: '可能' | '一部可能' | '不可';
  languages: string[];
  internationalExchangeAvailable: boolean;
}

export type SearchItem = Teacher | School | EventItem | Club;

export interface StudentDiagnosisInput {
  ageRange: string;
  gender: string;
  residentArea: string;
  preferredArea: string;
  yogaExperience: string;
  exerciseHabit: string;
  onlineAvailable: string;
  goals: string[];
  bodyConditions: string[];
  preferredStyles: string[];
  participationModes: string[];
  preferredLanguage: string;
  japaneseAnxiety: string;
  wantsForeignFriendly: string;
}

export const AREAS = [
  '渋谷', '新宿', '銀座', '青山', '表参道', '恵比寿', '世田谷', '吉祥寺', '品川', '浅草', '上野', 'オンライン'
];

export const LANGUAGES = ['日本語', '英語', '中国語', 'イタリア語', 'その他'];

export const teachers: Teacher[] = [
  { id: 't1', name: '佐藤美咲｜呼吸とやさしいヨガ', type: 'teacher', area: '渋谷', lat: 35.6595, lng: 139.7005, description: '初心者に寄り添いながら、呼吸法とリラックスを丁寧に伝える先生です。少人数制のやわらかな進行で、英語対応の案内も交えつつ安心して始められる雰囲気を大切にしています。', targetLevels: ['初心者', '中級者', '産後'], specialties: ['リラックスヨガ', '呼吸法', '睡眠改善', 'メンタルケア'], formats: ['個別レッスン', 'グループレッスン', 'オンライン'], certifications: ['RYT200', 'メディテーション指導'], foreignSupportStatus: '対応可能', languages: ['日本語', '英語'], languageLevel: 'レッスン対応可能', proYogaStatus: 'プロYoga検定取得' },
  { id: 't2', name: 'KEN MORI｜姿勢改善ヨガ', type: 'teacher', area: '銀座', lat: 35.6717, lng: 139.765, description: '姿勢改善や肩こり改善に強く、体の使い方をわかりやすく伝えてくれる先生です。はじめての方にも無理のない言葉で寄り添い、実感につながるレッスンを心がけています。', targetLevels: ['初心者', '中級者', '企業向け'], specialties: ['姿勢改善', '肩こり改善', '腰痛改善', 'ハタヨガ'], formats: ['個別レッスン', '企業研修', '出張'], certifications: ['理学療法連携講座', '解剖学研修'], foreignSupportStatus: '一部対応可能', languages: ['日本語', '英語'], languageLevel: '日常会話レベル', proYogaStatus: '取得予定' },
  { id: 't3', name: 'Luna Zhang｜国際ウェルネスヨガ', type: 'teacher', area: '新宿', lat: 35.6896, lng: 139.692, description: '英語対応・中国語対応ができ、初心者に寄り添いながら呼吸法とマインドフルネスを丁寧に深めてくれる先生です。国際的な背景を活かした落ち着いた指導が魅力です。', targetLevels: ['初心者', '中級者', 'インストラクター向け'], specialties: ['瞑想', '呼吸法', 'メンタルケア', 'ヨガ哲学'], formats: ['グループレッスン', 'オンライン', 'イベント登壇'], certifications: ['国際瞑想ファシリテーター'], foreignSupportStatus: '対応可能', languages: ['日本語', '中国語', '英語'], languageLevel: '専門指導可能', proYogaStatus: 'プロYoga検定取得' },
  { id: 't4', name: 'Chiara｜リラックスフローヨガ', type: 'teacher', area: '表参道', lat: 35.665, lng: 139.712, description: '英語対応と外国人対応に強く、やわらかな人柄で初参加でも緊張しにくい先生です。少人数クラスを中心に、流れるような動きと国際交流の楽しさを自然に届けています。', targetLevels: ['初心者', '中級者', '上級者'], specialties: ['ヴィンヤサ', '瞑想', '国際交流', '呼吸法'], formats: ['グループレッスン', 'イベント登壇', 'オンライン'], certifications: ['European Yoga Certification'], foreignSupportStatus: '対応可能', languages: ['日本語', '英語', 'イタリア語'], languageLevel: '専門指導可能', proYogaStatus: '取得予定' },
  { id: 't5', name: '佐伯遥｜やさしいケアヨガ', type: 'teacher', area: '世田谷', lat: 35.6464, lng: 139.6532, description: '初心者や産後ケアの方にも穏やかに寄り添う、地域密着型の先生です。無理なく続けられるペースを大切にしながら、安心感のあるレッスンづくりを行っています。', targetLevels: ['初心者', 'シニア', '産後'], specialties: ['リラックスヨガ', '産後ケア', '腰痛改善', '睡眠改善'], formats: ['個別レッスン', 'グループレッスン', '出張'], certifications: ['産後指導認定'], foreignSupportStatus: '対応不可', languages: ['日本語'], languageLevel: '日常会話レベル', proYogaStatus: '未取得' },
  { id: 't6', name: '藤田尚子｜資格サポートヨガ', type: 'teacher', area: '青山', lat: 35.6659, lng: 139.7123, description: '資格サポートとプロYoga対応に強く、哲学と実技の両面を丁寧に導く先生です。専門性がありながらも説明は親身で、学び直しや資格取得を目指す方に心強い存在です。', targetLevels: ['中級者', '上級者', 'インストラクター向け'], specialties: ['資格対策', 'ヨガ哲学', '呼吸法', '姿勢改善'], formats: ['養成講座講師', 'スクール講師', 'オンライン'], certifications: ['RYT500', '哲学講師認定'], foreignSupportStatus: '一部対応可能', languages: ['日本語', '英語'], languageLevel: 'レッスン対応可能', proYogaStatus: 'プロYoga検定取得' },
  { id: 't7', name: '加藤えみ｜アクティブビギナーヨガ', type: 'teacher', area: '恵比寿', lat: 35.6467, lng: 139.7101, description: '初心者に寄り添いながら、姿勢改善や運動不足解消へ前向きに導いてくれる先生です。明るい人柄で参加しやすく、続けたくなるリズム感のあるクラスが特長です。', targetLevels: ['初心者', '中級者', '男性向け'], specialties: ['パワーヨガ', 'ダイエット', '運動不足解消', 'ヴィンヤサ'], formats: ['グループレッスン', 'オンライン', 'イベント登壇'], certifications: ['フィットネス連携修了'], foreignSupportStatus: '一部対応可能', languages: ['日本語', '英語'], languageLevel: 'レッスン対応可能', proYogaStatus: '未取得' },
  { id: 't8', name: '西村太郎｜ビジネスヨガサポート', type: 'teacher', area: '品川', lat: 35.6285, lng: 139.7387, description: '肩こり改善やリラックスをテーマに、忙しい方にも続けやすい提案をしてくれる先生です。少人数制の個別対応を得意とし、英語対応の案内も交えながら丁寧に伴走します。', targetLevels: ['初心者', '企業向け', '男性向け'], specialties: ['肩こり改善', '睡眠改善', 'メンタルケア'], formats: ['個別レッスン', '企業研修', 'オンライン'], certifications: ['企業ウェルネス講師'], foreignSupportStatus: '一部対応可能', languages: ['日本語', '英語'], languageLevel: '日常会話レベル', proYogaStatus: '取得予定' },
  { id: 't9', name: 'Mei Lin｜少人数グローバルヨガ', type: 'teacher', area: '上野', lat: 35.7138, lng: 139.7773, description: '英語対応・外国人対応に加え、少人数で一人ひとりを見ながら進めるのが得意な先生です。初心者にも寄り添い、呼吸法や姿勢改善を無理なく身につけられるよう支えます。', targetLevels: ['初心者', '中級者', 'キッズ'], specialties: ['少人数', '呼吸法', '肩こり改善', '瞑想'], formats: ['グループレッスン', '個別レッスン'], certifications: ['Kids Yoga Trainer'], foreignSupportStatus: '対応可能', languages: ['日本語', '中国語', '英語'], languageLevel: '専門指導可能', proYogaStatus: '未取得' },
  { id: 't10', name: '野村彩花｜地域つながるヨガ', type: 'teacher', area: '吉祥寺', lat: 35.7033, lng: 139.5796, description: '地域のつながりを大切にしながら、初心者に寄り添うやさしい先生です。リラックス中心の指導で、仲間と続けたい方にも心地よい空気感をつくっています。', targetLevels: ['初心者', '中級者', 'シニア'], specialties: ['リラックスヨガ', '仲間と続けたい', '姿勢改善'], formats: ['グループレッスン', 'イベント登壇'], certifications: ['地域健康づくり認定'], foreignSupportStatus: '対応不可', languages: ['日本語'], languageLevel: '日常会話レベル', proYogaStatus: '未取得' }
];

export const schools: School[] = [
  { id: 's1', name: '渋谷ウェルネスヨガアカデミー', type: 'school', area: '渋谷', lat: 35.658, lng: 139.7016, description: '初心者の方でも安心して継続しやすい導線を整えた、渋谷エリアの上質な総合スクールです。少人数制クラス、資格取得サポート、プロYoga対応、国際対応まで一貫した学習環境を提供しています。', schoolTypes: ['ヨガスタジオ', '養成スクール', 'オンラインスクール'], programs: ['通常レッスン', '体験レッスン', '指導者養成', 'プロYoga対策'], strengths: ['初心者に強い', '資格取得に強い', '国際連携あり', 'インド政府公認プロYoga対応'], foreignSupportStatus: '積極的に受け入れ', languages: ['日本語', '英語', '中国語'], internationalSupportLevel: '国際資格対応', proYogaSupported: true, featured: false, priorityRank: 0, adminRecommended: false },
  { id: 's2', name: '青山アライメントヨガスクール', type: 'school', area: '青山', lat: 35.6665, lng: 139.7138, description: '少人数制で姿勢改善と肩こり改善を丁寧に学べる、青山らしい落ち着いた空気感のスクールです。継続プログラムを通じて、基礎から安心して通い続けたい方に選ばれています。', schoolTypes: ['ヨガスタジオ'], programs: ['通常レッスン', '体験レッスン', 'ワークショップ'], strengths: ['少人数制', '解剖学重視', '本格指導'], foreignSupportStatus: '一部対応', languages: ['日本語', '英語'], internationalSupportLevel: '在日外国人対応', proYogaSupported: false, featured: false, priorityRank: 0, adminRecommended: false },
  { id: 's3', name: '銀座プロヨガスクール', type: 'school', area: '銀座', lat: 35.6712, lng: 139.7635, description: '資格取得サポートとプロYoga対応を軸に据えた、銀座の教育特化型スクールです。ややフォーマルで信頼感のある指導体制が整い、継続的に専門性を高めたい方に適しています。', schoolTypes: ['養成スクール'], programs: ['指導者養成', 'プロYoga対策', 'ヨガ検定3級・2級対策', 'ヨガマネージャー講座'], strengths: ['資格取得に強い', '本格指導', '哲学重視'], foreignSupportStatus: '一部対応', languages: ['日本語', '英語'], internationalSupportLevel: '国際資格対応', proYogaSupported: true, featured: false, priorityRank: 0, adminRecommended: false },
  { id: 's4', name: '表参道インターナショナルヨガスタジオ', type: 'school', area: '表参道', lat: 35.6655, lng: 139.7111, description: '英語対応・外国人対応を備えた、表参道の洗練された国際対応スクールです。少人数制クラスと継続プログラムにより、リラックス系から専門的な学びまで安心して続けられます。', schoolTypes: ['ヨガスタジオ', '地域コミュニティ型'], programs: ['通常レッスン', '体験レッスン', 'イベント開催'], strengths: ['国際連携あり', 'リラックス重視', '地域密着'], foreignSupportStatus: '積極的に受け入れ', languages: ['日本語', '英語', 'イタリア語'], internationalSupportLevel: '外国人向けクラスあり', proYogaSupported: false, featured: false, priorityRank: 0, adminRecommended: false },
  { id: 's5', name: '世田谷やさしいヨガスタジオ', type: 'school', area: '世田谷', lat: 35.6439, lng: 139.669, description: '地域に根ざした穏やかな運営で、初心者の方やシニア世代にも安心感のあるスクールです。少人数制の継続プログラムを中心に、無理なく通い続けられる環境を整えています。', schoolTypes: ['地域コミュニティ型', 'ヨガスタジオ'], programs: ['通常レッスン', '月額会員', '体験レッスン'], strengths: ['初心者に強い', '地域密着', '少人数制'], foreignSupportStatus: '対応不可', languages: ['日本語'], internationalSupportLevel: '観光客対応', proYogaSupported: false, featured: false, priorityRank: 0, adminRecommended: false },
  { id: 's6', name: '吉祥寺ブレス＆マインドヨガスクール', type: 'school', area: '吉祥寺', lat: 35.7045, lng: 139.58, description: '呼吸法とリラックスを大切にしながら、継続的に心身を整えていける吉祥寺のスクールです。初心者歓迎のやわらかさを持ちつつ、落ち着いて学べる安心感を備えています。', schoolTypes: ['ヨガスタジオ', 'カルチャースクール'], programs: ['通常レッスン', 'ワークショップ', '月額会員'], strengths: ['リラックス重視', '初心者に強い', '哲学重視'], foreignSupportStatus: '一部対応', languages: ['日本語', '英語'], internationalSupportLevel: '在日外国人対応', proYogaSupported: false, featured: false, priorityRank: 0, adminRecommended: false },
  { id: 's7', name: '新宿ハイブリッドヨガスクール', type: 'school', area: '新宿', lat: 35.6899, lng: 139.7004, description: '対面とオンラインを組み合わせた継続プログラムが魅力の新宿スクールです。英語対応・外国人対応にも配慮し、忙しい方でも上質な学習習慣を築きやすい設計になっています。', schoolTypes: ['オンラインスクール', 'ヨガスタジオ'], programs: ['通常レッスン', 'オンラインスクール', '回数券', 'イベント開催'], strengths: ['初心者に強い', '国際連携あり', '運動量多め'], foreignSupportStatus: '積極的に受け入れ', languages: ['日本語', '英語', '中国語'], internationalSupportLevel: '外国人向けクラスあり', proYogaSupported: false, featured: false, priorityRank: 0, adminRecommended: false },
  { id: 's8', name: '上野カルチャーヨガスクール', type: 'school', area: '上野', lat: 35.7132, lng: 139.7798, description: '地域密着の親しみやすさに加え、英語・中国語サポートも備えた上野のスクールです。初心者が入りやすい体験導線と、継続して学べる穏やかな学習環境を整えています。', schoolTypes: ['カルチャースクール'], programs: ['通常レッスン', '体験レッスン', 'イベント開催'], strengths: ['初心者に強い', '地域密着', '国際連携あり'], foreignSupportStatus: '積極的に受け入れ', languages: ['日本語', '中国語', '英語'], internationalSupportLevel: '在日外国人対応', proYogaSupported: false, featured: false, priorityRank: 0, adminRecommended: false },
  { id: 's9', name: '品川ウェルネスヨガラボ', type: 'school', area: '品川', lat: 35.6292, lng: 139.7395, description: '姿勢改善や働く人のコンディショニングに強みを持つ、品川の実践型スクールです。英語対応も含めた信頼感ある運営で、日常に取り入れやすい継続プログラムを提供しています。', schoolTypes: ['法人向け研修型', 'オンラインスクール'], programs: ['法人研修', '通常レッスン', '回数券'], strengths: ['本格指導', '運動量多め', '解剖学重視'], foreignSupportStatus: '一部対応', languages: ['日本語', '英語'], internationalSupportLevel: '観光客対応', proYogaSupported: false, featured: false, priorityRank: 0, adminRecommended: false },
  { id: 's10', name: '浅草ハーモニーヨガスクール', type: 'school', area: '浅草', lat: 35.711, lng: 139.7965, description: '浅草らしい開かれた雰囲気の中で、外国人対応と国際交流を自然に取り入れたスクールです。体験から継続受講までつながる導線があり、リラックス重視で安心して通えます。', schoolTypes: ['地域コミュニティ型', 'ヨガスタジオ'], programs: ['体験レッスン', '通常レッスン', 'イベント開催'], strengths: ['リラックス重視', '国際連携あり', '地域密着'], foreignSupportStatus: '積極的に受け入れ', languages: ['日本語', '英語', 'イタリア語'], internationalSupportLevel: '観光客対応', proYogaSupported: false, featured: false, priorityRank: 0, adminRecommended: false }
];

export const events: EventItem[] = [
  { id: 'e1', name: '初心者のための朝ヨガ体験会', type: 'event', area: '渋谷', lat: 35.6612, lng: 139.6993, date: '2026-06-12', description: '週末の朝に気軽に参加しやすい、初心者歓迎の1DAY体験会です。初めてでも安心のやさしい流れで、呼吸を整えながら気持ちよく一日をスタートできます。', organizerType: 'スクール', eventTypes: ['体験会', '通常レッスン'], contentTags: ['リラックス', '睡眠', '呼吸法'], foreignParticipantStatus: '可能', languages: ['日本語', '英語'], hasInterpreter: false, isInternationalEvent: false },
  { id: 'e2', name: 'プロYoga検定説明会', type: 'event', area: '銀座', lat: 35.672, lng: 139.7648, date: '2026-06-18', description: 'これから資格取得やプロYoga対応に興味がある方にぴったりの説明イベントです。初めてでも安心して参加でき、学びの流れをその場でイメージしやすい内容です。', organizerType: '連盟', eventTypes: ['講座', 'プロYoga説明会'], contentTags: ['資格対策', 'プロYoga', 'ヨガ哲学'], foreignParticipantStatus: '一部可能', languages: ['日本語', '英語'], hasInterpreter: true, isInternationalEvent: true },
  { id: 'e3', name: '英語対応リラックスヨガワークショップ', type: 'event', area: '表参道', lat: 35.6658, lng: 139.7107, date: '2026-06-20', description: '英語対応・外国人対応ありで、国際交流も楽しめる明るいワークショップです。1DAY参加で気軽に体験でき、初めてでも安心してリラックスヨガに触れられます。', organizerType: '国際連携団体', eventTypes: ['ワークショップ', '国際イベント'], contentTags: ['呼吸法', '瞑想', '国際交流'], foreignParticipantStatus: '可能', languages: ['日本語', '英語', 'イタリア語'], hasInterpreter: true, isInternationalEvent: true },
  { id: 'e4', name: '姿勢改善フローヨガ1DAY体験', type: 'event', area: '新宿', lat: 35.6892, lng: 139.6997, date: '2026-06-22', description: '体をしっかり動かしたい方におすすめの1DAY体験イベントです。初心者歓迎で、姿勢改善をテーマにしながらも楽しく参加しやすい空気感を大切にしています。', organizerType: '先生', eventTypes: ['体験会', '通常レッスン'], contentTags: ['運動系', 'ダイエット', '姿勢改善'], foreignParticipantStatus: '一部可能', languages: ['日本語', '英語'], hasInterpreter: false, isInternationalEvent: false },
  { id: 'e5', name: 'やさしい産後ケアヨガ体験会', type: 'event', area: '世田谷', lat: 35.6458, lng: 139.6567, date: '2026-06-24', description: 'やさしい雰囲気で参加できる、地域密着の少人数体験会です。初めてでも安心の進行で、リラックスしながら無理なく体をほぐしたい方に向いています。', organizerType: 'ヨガクラブ', eventTypes: ['体験会', 'ワークショップ'], contentTags: ['リラックス', '睡眠', 'メンタルケア'], foreignParticipantStatus: '不可', languages: ['日本語'], hasInterpreter: false, isInternationalEvent: false },
  { id: 'e6', name: '睡眠と呼吸を整えるヨガナイト', type: 'event', area: '吉祥寺', lat: 35.7037, lng: 139.5811, date: '2026-06-26', description: '仕事帰りや週末前にも参加しやすい、夜のリラックスイベントです。呼吸法を中心に、初めてでも安心して心身をゆるめられる1DAYプログラムになっています。', organizerType: 'スクール', eventTypes: ['ワークショップ'], contentTags: ['睡眠', '瞑想', '呼吸法'], foreignParticipantStatus: '一部可能', languages: ['日本語', '英語'], hasInterpreter: false, isInternationalEvent: false },
  { id: 'e7', name: 'ヨガ哲学とつながる交流サロン', type: 'event', area: '上野', lat: 35.7126, lng: 139.7785, date: '2026-07-01', description: '学びと国際交流をいっしょに楽しめる、少人数の交流イベントです。初めてでも安心して会話に入れる雰囲気で、週末にゆったり参加したくなる内容です。', organizerType: '連盟', eventTypes: ['講座', 'チャリティイベント'], contentTags: ['ヨガ哲学', 'メンタルケア'], foreignParticipantStatus: '可能', languages: ['日本語', '英語', '中国語'], hasInterpreter: true, isInternationalEvent: true },
  { id: 'e8', name: '肩こり改善ヨガ1DAY講座', type: 'event', area: '品川', lat: 35.6289, lng: 139.7392, date: '2026-07-03', description: '肩こり改善をテーマに、気軽に参加できる実践型1DAY講座です。働く方にも参加しやすく、初めてでも安心して姿勢改善のヒントを持ち帰れます。', organizerType: '企業', eventTypes: ['企業向けイベント', '講座'], contentTags: ['肩こり', '睡眠', 'メンタルケア'], foreignParticipantStatus: '一部可能', languages: ['日本語', '英語'], hasInterpreter: false, isInternationalEvent: false },
  { id: 'e9', name: '浅草サンセット国際ヨガ体験', type: 'event', area: '浅草', lat: 35.7118, lng: 139.7989, date: '2026-07-05', description: '夕景の浅草で楽しむ、英語対応・外国人対応ありの国際交流イベントです。旅行中の方も地元の方も一緒に参加しやすく、初めてでも安心して楽しめます。', organizerType: '自治体', eventTypes: ['体験会', '国際イベント'], contentTags: ['リラックス', '国際交流', '呼吸法'], foreignParticipantStatus: '可能', languages: ['日本語', '英語', 'イタリア語'], hasInterpreter: true, isInternationalEvent: true },
  { id: 'e10', name: '青山アライメント集中ワークショップ', type: 'event', area: '青山', lat: 35.6671, lng: 139.7144, date: '2026-07-09', description: '姿勢改善をじっくり深めたい方に向けた、少人数の集中ワークショップです。1DAYでも学びの満足感があり、基礎を見直したい方にも参加しやすい内容です。', organizerType: 'スクール', eventTypes: ['ワークショップ', '講座'], contentTags: ['肩こり', '腰痛', '姿勢改善'], foreignParticipantStatus: '一部可能', languages: ['日本語', '英語'], hasInterpreter: false, isInternationalEvent: false }
];

export const clubs: Club[] = [
  { id: 'c1', name: '渋谷ウェルネスヨガ会', type: 'club', area: '渋谷', lat: 35.6605, lng: 139.703, description: '有志の集まりとして、地域で続けるヨガ習慣をゆるやかに楽しんでいるクラブです。初心者歓迎で、仲間と続ける心地よさを大切にしながら無理なく参加できます。', clubTypes: ['地域ヨガクラブ', '有志団体'], activities: ['定期レッスン', '勉強会', 'イベント参加'], foreignParticipantStatus: '一部可能', languages: ['日本語', '英語'], internationalExchangeAvailable: false },
  { id: 'c2', name: '銀座プロYoga学習クラブ', type: 'club', area: '銀座', lat: 35.6705, lng: 139.762, description: '資格やプロYogaに関心のある人が自然に集まる、落ち着いた有志コミュニティです。学びも交流もほどよくあり、仲間と続ける感覚を大切にしています。', clubTypes: ['有志団体'], activities: ['検定学習会', 'プロYoga学習会', '勉強会'], foreignParticipantStatus: '一部可能', languages: ['日本語', '英語'], internationalExchangeAvailable: true },
  { id: 'c3', name: '新宿オンラインヨガサークル', type: 'club', area: '新宿', lat: 35.6888, lng: 139.6958, description: 'オンライン中心で、ゆるく参加しやすい有志サークルです。初心者歓迎で、英語対応や外国人対応もあり、生活リズムに合わせて仲間と続けやすい雰囲気です。', clubTypes: ['有志団体', '職場ヨガクラブ'], activities: ['定期レッスン', 'イベント参加'], foreignParticipantStatus: '可能', languages: ['日本語', '英語', '中国語'], internationalExchangeAvailable: true },
  { id: 'c4', name: '表参道グローバルヨガサークル', type: 'club', area: '表参道', lat: 35.6652, lng: 139.7098, description: '地域にいながら国際交流も楽しめる、親しみやすいヨガサークルです。少人数で声をかけ合いやすく、仲間と続ける楽しさを自然に感じられます。', clubTypes: ['国際交流型'], activities: ['定期レッスン', 'イベント参加', 'ボランティア'], foreignParticipantStatus: '可能', languages: ['日本語', '英語', 'イタリア語'], internationalExchangeAvailable: true },
  { id: 'c5', name: '世田谷ゆるヨガクラブ', type: 'club', area: '世田谷', lat: 35.6447, lng: 139.6619, description: '地域で続けることを大切にした、やわらかな雰囲気のヨガクラブです。ゆるく参加しやすく、初心者やシニアの方も無理なく仲間に入りやすい空気があります。', clubTypes: ['地域ヨガクラブ', 'シニア向け', '親子向け'], activities: ['定期レッスン', 'ボランティア'], foreignParticipantStatus: '不可', languages: ['日本語'], internationalExchangeAvailable: false },
  { id: 'c6', name: '吉祥寺コミュニティヨガ会', type: 'club', area: '吉祥寺', lat: 35.7019, lng: 139.5805, description: '仲間と続けることを楽しみたい方に向いた、地域密着のコミュニティです。イベントにもゆるく参加でき、日常の中でリラックスを続けやすい雰囲気があります。', clubTypes: ['地域ヨガクラブ', '有志団体'], activities: ['定期レッスン', 'イベント参加', '勉強会'], foreignParticipantStatus: '一部可能', languages: ['日本語', '英語'], internationalExchangeAvailable: false },
  { id: 'c7', name: '品川アフター5ヨガクラブ', type: 'club', area: '品川', lat: 35.6297, lng: 139.7378, description: '仕事帰りにふらっと集まりやすい、親しみやすいヨガクラブです。肩こり改善や気分転換をテーマに、地域で無理なく続ける活動を行っています。', clubTypes: ['職場ヨガクラブ'], activities: ['定期レッスン', '勉強会'], foreignParticipantStatus: '一部可能', languages: ['日本語', '英語'], internationalExchangeAvailable: false },
  { id: 'c8', name: '上野インターナショナルヨガ会', type: 'club', area: '上野', lat: 35.7135, lng: 139.7765, description: '英語対応・外国人対応があり、国際交流を楽しみながらゆるく参加できるコミュニティです。少人数で話しやすく、初心者でも仲間と続けやすい空気があります。', clubTypes: ['国際交流型', '有志団体'], activities: ['定期レッスン', 'イベント参加'], foreignParticipantStatus: '可能', languages: ['日本語', '中国語', '英語'], internationalExchangeAvailable: true },
  { id: 'c9', name: '浅草つながるヨガサークル', type: 'club', area: '浅草', lat: 35.7122, lng: 139.7977, description: '地域の方も来訪者も自然につながれる、あたたかなヨガサークルです。ゆるく参加しやすく、リラックスしながら仲間と続ける時間を楽しめます。', clubTypes: ['国際交流型', '地域ヨガクラブ'], activities: ['イベント参加', 'ボランティア'], foreignParticipantStatus: '可能', languages: ['日本語', '英語', 'イタリア語'], internationalExchangeAvailable: true },
  { id: 'c10', name: '青山姿勢改善ヨガ研究会', type: 'club', area: '青山', lat: 35.6662, lng: 139.714, description: '姿勢改善をテーマにしつつも、堅すぎず仲間と学び続けられる有志の集まりです。少人数で顔なじみになりやすく、地域で続ける安心感があります。', clubTypes: ['有志団体'], activities: ['勉強会', '検定学習会', '定期レッスン'], foreignParticipantStatus: '一部可能', languages: ['日本語', '英語'], internationalExchangeAvailable: false }
];

export const allItems = [...schools, ...teachers, ...events, ...clubs];
