/**
 * 画面・メッセージの文言を一元管理するファイル
 * 文言の変更はこのファイルのみ修正すればよい（Cursor もここを参照しやすい）
 */

/** アプリ名（ヘッダー・ガイド等） */
export const APP_NAME = 'chocomelapp';

/** 括弧内などで使う「完全事前抽選制」。ここを変えると関連ラベルも一括で変わる */
export const PRIORITY_LOTTERY = '完全事前抽選制';

/** 営業モードの表示名（短いラベル） */
export const BUSINESS_MODE_SPECIAL = '特別営業';
export const BUSINESS_MODE_NORMAL = '通常営業';

/** 営業モード別ローテーション数（通常=3 / 特別=2） */
export const ROTATION_COUNTS = { normal: 3, special: 2 } as const;

/** 特別営業のラベル（括弧付き）。PRIORITY_LOTTERY を変えると自動で変わる */
export const BUSINESS_MODE_SPECIAL_LABEL = `${BUSINESS_MODE_SPECIAL}（${PRIORITY_LOTTERY}）`;

/** サイドバー・ナビのラベル */
export const NAV = {
  GUIDE: 'ガイド',
  IMPORT: 'データ読取',
  DB: 'DBデータ確認',
  LOTTERY_CONDITION: '抽選条件',
  LOTTERY: '抽選',
  MATCHING: 'マッチング',
  CAST: 'キャスト管理',
} as const;

/** アラート・エラーメッセージ */
export const ALERT = {
  LOGOUT_FAILED: 'ログアウトに失敗したよ',
  LOAD_FAILED: 'データの読み取りに失敗しました。URLを確認してください。',
  SELECT_RESULT_SHEET: '読み込む抽選結果シートを選択してください。',
  NO_USER_SHEET_URL: '応募者名簿のURLが設定されていません。',
  NO_DATA_IN_SHEET: '選択したシートにデータがありません。',
  IMPORT_RESULT_FAILED: '既存の抽選結果の取り込みに失敗しました。',
  NO_WINNERS_EXPORT: '当選者がいないため、エクスポートできません。',
  NO_USER_SHEET_URL_EXPORT: '応募者名簿のURLが設定されていません。先に「外部連携設定」で同期してください。',
} as const;

/** キャスト管理画面の注意書き */
export const CAST_PAGE_NOTICE =
  '※ 必ず先に「データ読取」でURLを取り込み、データを取り込んでからキャストの新規登録・削除を行ってください。インポート前に登録すると、あとで取り込みしたときに上書きされてデータがずれることがあります。';

/** ガイドページ用 */
export const GUIDE = {
  SUBTITLE: `${APP_NAME}の基本的な使い方を説明します`,
  FLOW_DATA_READ: 'データ読取',
  FLOW_DATA_READ_DESC: 'スプレッドシートからデータを読み込み',
  FLOW_DB: 'DBデータ確認',
  FLOW_DB_DESC: '読み込んだデータを確認',
  FLOW_CAST: 'キャスト管理',
  FLOW_CAST_DESC: '出席状態を設定',
  FLOW_LOTTERY_CONDITION: '抽選条件',
  FLOW_LOTTERY_CONDITION_DESC: '条件を設定して抽選実行',
  FLOW_MATCHING_CONFIRM: 'マッチング構成確認',
  FLOW_MATCHING_CONFIRM_DESC: '抽選結果を確認・エクスポート',
  FLOW_MATCHING_RESULT: 'マッチング結果',
  FLOW_MATCHING_RESULT_DESC: 'マッチング結果を確認・エクスポート',
  SHEET_NAME_FORMAT: '応募者名簿のスプレッドシート内に、新しいシートとして自動的に作成されます。シート名は「抽選結果_YYYYMMDD_HHMMSS」や「マッチング結果_YYYYMMDD_HHMMSS」の形式です。',
} as const;
