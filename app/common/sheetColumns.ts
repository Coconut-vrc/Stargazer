/**
 * スプレッドシート列インデックス定義（0始まり）
 * 変更時はこのファイルのみ修正すればよい
 *
 * [通常営業のフォーマット] 7列
 *   A: タイムスタンプ
 *   B: VRCの名前(例:海月ばじ_ev)
 *   C: XのID(例:@Chocomel_vrc)
 *   D: 当店にご帰宅したことはありますか？
 *   E: 希望するキャストを3人まで選択してください。（カンマ区切り）
 *   F: 自由記述欄,意気込みなど
 *   G: その他
 *
 * [特別営業のフォーマット] 9列
 *   A: タイムスタンプ
 *   B: VRCの名前(例:海月ばじ_ev)
 *   C: XのID(例:@Chocomel_vrc)
 *   D: 当店にご帰宅したことはありますか？
 *   E: 第一希望
 *   F: 第二希望
 *   G: 第三希望
 *   H: 自由記述欄,意気込みなど
 *   I: その他
 */

/** ユーザーシート（申込シート）列インデックス */
export const USER_SHEET = {
  /** A列: タイムスタンプ */
  TIMESTAMP: 0,
  /** B列: VRCの名前 */
  NAME: 1,
  /** C列: XのID */
  X_ID: 2,
  /** D列: 当店にご帰宅したことはありますか？ */
  FIRST_FLAG: 3,
  /** E列: 通常=希望3人まで(カンマ区切り) / 特別=第一希望 */
  CAST_E: 4,
  /** F列: 特別のみ=第二希望。通常ではF=意気込みは USER_SHEET_BY_MODE で参照 */
  CAST_F: 5,
  /** G列: 特別のみ=第三希望。通常ではG=その他は USER_SHEET_BY_MODE で参照 */
  CAST_G: 6,
  /** H列: 意気込み（特別営業）。通常はF列なので USER_SHEET_BY_MODE.normal */
  NOTE: 7,
  /** I列: その他（特別営業）。通常はG列なので USER_SHEET_BY_MODE.normal */
  IS_PAIR_TICKET: 8,
} as const;

/** 営業モード別のユーザーシート列数（フォーマット通りに分岐） */
export const USER_SHEET_MIN_COLUMNS = {
  /** 通常営業: 7列（A〜G） */
  normal: 7,
  /** 特別営業: 9列（A〜I） */
  special: 9,
} as const;

/** 意気込み・その他は列数で位置が異なる（7列=F,G / 9列=H,I） */
export const USER_SHEET_BY_MODE = {
  normal: { NOTE: 5, IS_PAIR_TICKET: 6 },
  special: { NOTE: 7, IS_PAIR_TICKET: 8 },
} as const;

/** キャストシート列インデックス */
export const CAST_SHEET = {
  /** A列: キャスト名 */
  NAME: 0,
  /** B列: 出席フラグ */
  IS_PRESENT: 1,
  /** C列: NGユーザー（カンマ区切り） */
  NG_USERS: 2,
} as const;

/** スプレッドシート取得範囲（A1表記） */
export const SHEET_RANGES = {
  /** ユーザーシート: A2〜I1000 */
  USER: 'A2:I1000',
  /** キャストシート: A2〜C50 */
  CAST: 'A2:C50',
} as const;

/** 自動作成シート名のプレフィックス */
export const RESULT_SHEET_PREFIX = '抽選結果_';
export const MATCHING_SHEET_PREFIX = 'マッチング結果_';
