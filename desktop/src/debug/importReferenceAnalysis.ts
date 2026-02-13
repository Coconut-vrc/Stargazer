/**
 * docs/import-file-reference.md に基づくインポート可否の解析結果。
 * フォームの中身はドキュメント記載の「質問項目」から判定。リンク先の実フォームは未取得。
 */

/** 基本テンプレート項目の有無（ドキュメントの質問項目から判定）。null は記載なしで不明。 */
export interface BasicTemplateItems {
  /** ユーザー名（VRCネーム）。VRCアカウント名・VRC-ID・VRC名等は同一視。 */
  userName: boolean | null;
  /** X（Twitter）アカウントID */
  xAccount: boolean | null;
  /** 希望キャスト欄1（第1希望など） */
  castHope1: boolean | null;
  /** 希望キャスト欄2（第2希望など） */
  castHope2: boolean | null;
  /** 希望キャスト欄3（第3希望など） */
  castHope3: boolean | null;
}

export interface FormCompatibilityRow {
  name: string;
  category: string;
  /** ドキュメントに記載された質問項目（要約） */
  docItems: string;
  /** 基本テンプレートで取り込み可能か */
  basicTemplate: '○' | '△' | '×' | '要カスタム';
  /** カスタム列割り当てで対応可能か */
  customImport: '○' | '△' | '×';
  note: string;
  /** 基本テンプレート項目の有無（ユーザー名・X・希望キャスト1～3）。記載なしのフォームは null。 */
  basicTemplateItems: BasicTemplateItems | null;
}

/** 必須項目の対応表（リファレンス共通必須 vs Stargazer） */
export const REQUIRED_ITEMS_ANALYSIS = {
  referenceRequired: [
    'VRChat名/ID',
    'X（Twitter）アカウント',
    '注意事項への同意',
    '公式アカウントのフォロー確認',
  ] as const,
  stargazerSupport: [
    { ref: 'VRChat名/ID', field: 'name または nameColumn2（VRC名）', supported: true, note: 'ユーザー名・アカウントIDのどちらか必須。両方あれば両方マッピング可。' },
    { ref: 'X（Twitter）アカウント', field: 'x_id', supported: true, note: '列割り当てで「アカウントID」にマッピング。' },
    { ref: '注意事項への同意', field: 'extraColumns または未使用列', supported: true, note: 'カスタムで任意列を extraColumns に追加すれば raw_extra に保持。抽選・マッチングには未使用。' },
    { ref: '公式アカウントのフォロー確認', field: 'extraColumns または未使用列', supported: true, note: '同上。チェック結果はCSVの1列として取り込み可能。' },
  ] as const,
  stargazerRequiredRule: 'name と x_id のどちらかが必須（hasRequiredIdentityColumn）。両方未指定の行は無効。',
};

/** よく見られる項目の対応 */
export const COMMON_ITEMS_ANALYSIS = {
  castHope: { ref: 'キャスト指名（第1・第2希望）', field: 'cast1, cast2, cast3', supported: true, note: '3列別 or 1列カンマ区切り（splitCommaColumnIndex）で対応。' },
  rpHope: { ref: 'RPの希望内容・シチュエーション', field: 'note または extraColumns', supported: true, note: '意気込み欄にマッピングするか、extraColumns で保持。' },
  participantCount: { ref: '参加人数（1名 or 2名）', field: 'extraColumns または is_pair_ticket', supported: true, note: '2名のときは is_pair_ticket に 1 など。列割り当てで対応。' },
  enthusiasm: { ref: '意気込み・質問欄', field: 'note', supported: true, note: 'テンプレート・カスタムとも note にマッピング可。' },
  dislike: { ref: '苦手な行為の申告', field: 'note または extraColumns', supported: true, note: 'カスタムで任意列にマッピング。' },
  partnerConsent: { ref: 'パートナーへの承諾確認', field: 'extraColumns', supported: true, note: 'カスタムでチェック列を extraColumns に追加可。' },
};

/** フォーム別の対応表（ドキュメント記載の質問項目から判定） */
export const FORM_COMPATIBILITY: FormCompatibilityRow[] = [
  { name: 'Bar OneDrop（2/22）', category: 'Bar・クラブ', docItems: 'VRC-ID, X, 話したいキャスト希望, 意気込み', basicTemplate: '○', customImport: '○', note: '希望1列＋意気込み。基本テンプレートで可。', basicTemplateItems: { userName: true, xAccount: true, castHope1: true, castHope2: false, castHope3: false } },
  { name: 'Bar OneDrop（別回）', category: 'Bar・クラブ', docItems: '同意, VRC-ID, X, 話したいキャスト希望, 意気込み（2/22と同構成）', basicTemplate: '○', customImport: '○', note: '2/5営業。フォーム実体確認済み。', basicTemplateItems: { userName: true, xAccount: true, castHope1: true, castHope2: false, castHope3: false } },
  { name: 'CLUB SUIEN', category: 'Bar・クラブ', docItems: '同意2項目, VRC URL, Twitter URL, 指名キャスト(複数可)', basicTemplate: '○', customImport: '○', note: '2/15。フォーム実体確認済み。指名は1列複数で cast1 に割り当て可。', basicTemplateItems: { userName: true, xAccount: true, castHope1: true, castHope2: false, castHope3: false } },
  { name: 'Club Luv of Eden', category: 'Bar・クラブ', docItems: 'VRC名, Xリンク, ホラー等NG(複数選択)', basicTemplate: '○', customImport: '○', note: 'LoEデート姫用。フォーム実体確認済み。キャスト指名欄なし。', basicTemplateItems: { userName: true, xAccount: true, castHope1: false, castHope2: false, castHope3: false } },
  { name: '僕のお砂糖がメイドさん', category: 'メイド・キャバ', docItems: 'X, VRC URL, 関係性(1-5), RP希望, 指名メイド(複数可), 確認チェック3項目', basicTemplate: '×', customImport: '○', note: '指名メイドは1列カンマ区切りで cast1 に割り当て可。確認は extraColumns。', basicTemplateItems: { userName: true, xAccount: true, castHope1: true, castHope2: false, castHope3: false } },
  { name: 'Older Maide', category: 'メイド・キャバ', docItems: '（記載なし）', basicTemplate: '△', customImport: '○', note: '受付終了。形式は他と同様想定。', basicTemplateItems: null },
  { name: 'mimiChou', category: 'メイド・キャバ', docItems: 'VRCアカウント名, VRC URL, X URL, フォロー・PCVR・ランク・女性アバター確認, 気になるキャスト(任意), 意気込み', basicTemplate: '○', customImport: '○', note: 'フォーム実体確認済み。希望1相当は「気になるキャスト」1列。', basicTemplateItems: { userName: true, xAccount: true, castHope1: true, castHope2: false, castHope3: false } },
  { name: 'めいどりーむ症候群', category: 'メイド・キャバ', docItems: 'VRCお名前, X(@から), 希望時間帯(一部/二部), 連絡事項・キャストへのメッセージ, 確認事項', basicTemplate: '○', customImport: '○', note: 'フォーム実体確認済み。キャスト指名欄なし。', basicTemplateItems: { userName: true, xAccount: true, castHope1: false, castHope2: false, castHope3: false } },
  { name: 'Schlafen Lala', category: 'メイド・キャバ', docItems: '了承・承諾・責任不同意, VRC URL, X URL, DM確認, 苦手な行為, 熱意・推しへの思い', basicTemplate: '△', customImport: '○', note: 'フォーム実体確認済み。名前相当をVRC URL列に、x_id をX列に。', basicTemplateItems: { userName: true, xAccount: true, castHope1: false, castHope2: false, castHope3: false } },
  { name: 'めす男子かふぇ あどらぶ', category: 'メイド・キャバ', docItems: '1ページ目: 規約・PCVR・日本語VC・ランク・人型アバター等。2ページ目以降未確認', basicTemplate: '△', customImport: '○', note: '1ページ目のみ取得。2ページ目にVRC名・X等がある想定。', basicTemplateItems: null },
  { name: 'Pécheur', category: 'ホスト', docItems: 'VRChat名, X(@～), 参加人数, 連れ様VRC名, 第一希望, 第二希望, 確認, 意気込み', basicTemplate: '○', customImport: '○', note: 'フォーム実体確認済み。希望2列＋意気込み。参加人数は extraColumns 推奨。', basicTemplateItems: { userName: true, xAccount: true, castHope1: true, castHope2: true, castHope3: false } },
  { name: 'コココイ', category: 'ホスト', docItems: '同意複数, VRC URL, X URL, 誰とデートがしたい？(複数可), 呼んでほしい名前, VR酔い, スキンシップ, その他', basicTemplate: '○', customImport: '○', note: 'フォーム実体確認済み。希望1相当は「誰とデートがしたい」1列（複数選択）。', basicTemplateItems: { userName: true, xAccount: true, castHope1: true, castHope2: false, castHope3: false } },
  { name: 'くうたくんホストクラブ', category: 'ホスト', docItems: 'VRCお名前, X(URL), 参加経験, 希望時間帯, 接客タイプ, 利用環境, おはなししたいキャスト(複数可), 異なる場合参加可か, 確認・その他', basicTemplate: '○', customImport: '○', note: '2/21開催。フォーム実体確認済み。希望1相当は「おはなししてみたいキャスト」1列。', basicTemplateItems: { userName: true, xAccount: true, castHope1: true, castHope2: false, castHope3: false } },
  { name: '海底宮殿 ALMARE（2/23）', category: '特別企画', docItems: 'VRC名, xアカウントURL', basicTemplate: '○', customImport: '○', note: 'フォーム実体確認済み。最小構成。', basicTemplateItems: { userName: true, xAccount: true, castHope1: false, castHope2: false, castHope3: false } },
  { name: '海底宮殿 ALMARE（別回）', category: '特別企画', docItems: 'VRC名, xアカウントURL（2/23と同構成）', basicTemplate: '○', customImport: '○', note: 'フォーム実体確認済み。2/23と同構成。', basicTemplateItems: { userName: true, xAccount: true, castHope1: false, castHope2: false, castHope3: false } },
  { name: '天上の縁', category: '特別企画', docItems: 'X(URL), VRChatアカウント(URL), 初参加, 気になる神(任意), 自由記述, 禁止事項・確認', basicTemplate: '○', customImport: '○', note: 'フォーム実体確認済み。希望1相当は「気になる神」1列。', basicTemplateItems: { userName: true, xAccount: true, castHope1: true, castHope2: false, castHope3: false } },
  { name: '天上の縁（別回）', category: '特別企画', docItems: '2/8と同構成。X(URL), VRChat(URL), 初参加, 気になる神(任意), 自由記述, 禁止・確認', basicTemplate: '○', customImport: '○', note: '第二十二回・1/25。フォーム実体確認済み。2/8と同構成。', basicTemplateItems: { userName: true, xAccount: true, castHope1: true, castHope2: false, castHope3: false } },
  { name: '元カレ元カノ喫茶 TRIANGULAR', category: '特別企画', docItems: 'VRCID(ユーザー名・URL×), XID(@～), 呼ばれたい名前, 来店時性別, 確認2項目, 元恋人を知りたいか, フォロー・RP確認', basicTemplate: '○', customImport: '○', note: '2/16営業。フォーム実体確認済み。キャスト指名欄なし。', basicTemplateItems: { userName: true, xAccount: true, castHope1: false, castHope2: false, castHope3: false } },
  { name: '3×3 シェアハウス', category: '特別企画', docItems: '同意複数, VRC URL, X URL, 君の気になる子は誰？(複数可), 呼ばれたい名前, スキンシップ範囲', basicTemplate: '○', customImport: '○', note: 'バレンタイン限定。フォーム実体確認済み。希望1相当は「君の気になる子」1列。', basicTemplateItems: { userName: true, xAccount: true, castHope1: true, castHope2: false, castHope3: false } },
  { name: 'My Sweet Mummy × OKEANOS', category: '特別企画', docItems: 'VRCお名前, VRC URL, X URL, VR酔い, 参加経験, どこで知ったか, 要望。2ページ目あり', basicTemplate: '○', customImport: '○', note: 'フォーム実体確認済み（1ページ目）。キャスト指名欄なし。', basicTemplateItems: { userName: true, xAccount: true, castHope1: false, castHope2: false, castHope3: false } },
  { name: 'LUNA REAL × カジノLU', category: '特別企画', docItems: '1ページ目: VRC名/リンク, X。2ページ目以降未確認', basicTemplate: '○', customImport: '○', note: '2/27開催。1ページ目のみ取得。最小構成に近い。', basicTemplateItems: { userName: true, xAccount: true, castHope1: false, castHope2: false, castHope3: false } },
  { name: '競技大喜利会', category: 'その他', docItems: '（記載なし）', basicTemplate: '△', customImport: '○', note: 'カスタムで対応可。', basicTemplateItems: null },
  { name: 'VitalLink（看護師RP）', category: 'その他', docItems: '（記載なし）', basicTemplate: '△', customImport: '○', note: '同上。', basicTemplateItems: null },
  { name: 'F-Lick-Out（ASMR）', category: 'その他', docItems: '（記載なし）', basicTemplate: '△', customImport: '○', note: 'Closed可能性。形式はカスタムで対応可。', basicTemplateItems: null },
  { name: 'なっぱちゃん個人イベント', category: 'その他', docItems: '（記載なし）', basicTemplate: '△', customImport: '○', note: '同上。', basicTemplateItems: null },
  { name: 'Velvet V 合同個人イベント', category: 'その他', docItems: '（記載なし）', basicTemplate: '△', customImport: '○', note: '同上。', basicTemplateItems: null },
  { name: 'Ephemeral Sugar -Bitter- 第3回', category: 'その他', docItems: '（記載なし）', basicTemplate: '△', customImport: '○', note: '同上。', basicTemplateItems: null },
  { name: '渡海鉄道 WIT', category: 'その他', docItems: '（記載なし）', basicTemplate: '△', customImport: '○', note: '同上。', basicTemplateItems: null },
  { name: 'Mag・Mell 晩餐会', category: 'その他', docItems: '（記載なし）', basicTemplate: '△', customImport: '○', note: '同上。', basicTemplateItems: null },
  { name: 'Secret Dream 第2回', category: 'その他', docItems: '（記載なし）', basicTemplate: '△', customImport: '○', note: '同上。', basicTemplateItems: null },
  { name: 'The Ecstasy × Egil=Sapphire', category: 'その他', docItems: '（記載なし）', basicTemplate: '△', customImport: '○', note: '同上。', basicTemplateItems: null },
  { name: 'AMS A Momentary Secret', category: 'その他', docItems: '（記載なし）', basicTemplate: '△', customImport: '○', note: '同上。', basicTemplateItems: null },
];

/** カスタムインポートで対応できることの要約 */
export const CUSTOM_IMPORT_CAPABILITY = {
  supported: [
    'ユーザー名（name）・アカウントID（x_id）のどちらか必須。両方マッピング可。',
    'VRC名を別列で持つ場合: nameColumn2 に列を指定。',
    '希望キャスト: cast1〜cast3 に列割り当て。1列でカンマ区切りの場合は「列を分割」で希望1・2・3に展開。',
    '意気込み・自由記述: note にマッピング。',
    '確認チェック・同意・フォロー等: extraColumns で列を追加すると raw_extra に保持（表示はDB画面で確認可能）。',
    'タイムスタンプ・初回フラグ・ペアチケット: timestamp, first_flag, is_pair_ticket に任意列を割り当て可。',
  ],
  limitation: 'extraColumns の内容は抽選・マッチングロジックでは使用しない。名簿確認用。',
};

/** 解析の前提・出典 */
export const ANALYSIS_META = {
  sourceDoc: 'docs/import-file-reference.md',
  sourceTitle: 'VRChatイベント事前抽選フォーム 詳細リスト',
  analyzedAt: '2026-02',
  note: 'フォームの実際のCSV出力は未取得。ドキュメントに記載された「質問項目」から対応可否を判定。Google Form のエクスポート列順はフォームごとに異なるため、実際のCSVはカスタム列割り当てで確認すること。',
};
