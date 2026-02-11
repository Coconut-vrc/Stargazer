// 共通エンティティ定義
// Sheets から読み込んだ行データをアプリ内で扱うための型

export interface UserBean {
  /** 応募タイムスタンプ（A列） */
  timestamp: string;
  /** 名前（B列） */
  name: string;
  /** X の ID（C列 / @なしで保持） */
  x_id: string;
  /** 先着フラグなど（D列） */
  first_flag: string;
  /** 希望キャスト名リスト（E〜G列から生成） */
  casts: string[];
  /** 意気込み（H列） */
  note: string;
  /** ペアチケットフラグ（I列: '1' なら true） */
  is_pair_ticket: boolean;
  /** 追加列など将来拡張用の予備フィールド */
  raw_extra: unknown[];
}

export interface CastBean {
  /** キャスト名（A列） */
  name: string;
  /** 出席フラグ（B列: '1' なら true） */
  is_present: boolean;
  /** NG ユーザー名または X ID の配列（C列のカンマ区切り） */
  ng_users: string[];
}

