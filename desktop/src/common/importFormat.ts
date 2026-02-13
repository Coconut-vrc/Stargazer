/**
 * インポート形式：基本テンプレート／カスタム（列マッピング or ファイル読み取り）
 * ユーザー名・アカウントIDのどちらかは必須。希望キャストはオプション。
 */

/** 0始まりの列インデックス。-1 = 使わない */
export interface ColumnMapping {
  timestamp: number;
  name: number;
  x_id: number;
  first_flag: number;
  cast1: number;
  cast2: number;
  cast3: number;
  note: number;
  is_pair_ticket: number;
  /** カスタム用: 2列目ユーザー名（例: VRC名）。name が空のときのフォールバック */
  nameColumn2?: number;
  /** カスタム用: 応募リストに出す追加列（ラベル付きで raw_extra に入る） */
  extraColumns?: { columnIndex: number; label: string }[];
}

/** インポート形式：テンプレート or カスタム（列を手動指定） */
export type ImportStyle = 'template' | 'custom';

/** テンプレート：名前とマッピングのセット */
export interface ImportTemplate {
  id: string;
  name: string;
  minColumns: number;
  /** スキップするヘッダー行数（先頭から） */
  headerRows: number;
  mapping: ColumnMapping;
}

/** 基本テンプレート: ユーザー名、アカウントID、希望キャスト１・２・３（5列） */
export const TEMPLATE_BASIC: ImportTemplate = {
  id: 'basic',
  name: '基本（ユーザー名・アカウントID・希望キャスト1～3）',
  minColumns: 5,
  headerRows: 1,
  mapping: {
    timestamp: -1,
    name: 0,
    x_id: 1,
    first_flag: -1,
    cast1: 2,
    cast2: 3,
    cast3: 4,
    note: -1,
    is_pair_ticket: -1,
  },
};

/** 特別営業：ユーザー名・XID・希望キャスト1～3 が別列（9列想定） */
export const TEMPLATE_SPECIAL: ImportTemplate = {
  id: 'special',
  name: '特別営業（ユーザー名・XID・希望キャスト1～3 の9列）',
  minColumns: 9,
  headerRows: 3,
  mapping: {
    timestamp: 0,
    name: 1,
    x_id: 2,
    first_flag: 3,
    cast1: 4,
    cast2: 5,
    cast3: 6,
    note: 7,
    is_pair_ticket: 8,
  },
};

/** 通常営業：希望キャストは1列でカンマ区切り（7列想定） */
export const TEMPLATE_NORMAL: ImportTemplate = {
  id: 'normal',
  name: '通常営業（希望キャスト1列・カンマ区切り の7列）',
  minColumns: 7,
  headerRows: 3,
  mapping: {
    timestamp: 0,
    name: 1,
    x_id: 2,
    first_flag: 3,
    cast1: 4,
    cast2: -1,
    cast3: -1,
    note: 5,
    is_pair_ticket: 6,
  },
};

/** カスタム用プリセット: VRCアカウント名,ツイッターユーザー名,アカウントＩＤ,希望キャスト(カンマ),確認事項１,確認事項２,自由記入欄 */
export const CUSTOM_PRESET_VRC: ColumnMapping = {
  timestamp: -1,
  name: 1,
  x_id: 2,
  first_flag: -1,
  cast1: 3,
  cast2: -1,
  cast3: -1,
  note: 6,
  is_pair_ticket: -1,
  nameColumn2: 0,
  extraColumns: [
    { columnIndex: 4, label: '確認事項１' },
    { columnIndex: 5, label: '確認事項２' },
  ],
};

export const IMPORT_TEMPLATES: readonly ImportTemplate[] = [
  TEMPLATE_BASIC,
  TEMPLATE_SPECIAL,
  TEMPLATE_NORMAL,
];

/** カスタム用：全項目を「未選択」で初期化（-1 = 使わない） */
export function createEmptyColumnMapping(): ColumnMapping {
  return {
    timestamp: -1,
    name: -1,
    x_id: -1,
    first_flag: -1,
    cast1: -1,
    cast2: -1,
    cast3: -1,
    note: -1,
    is_pair_ticket: -1,
  };
}

/** ユーザー名・アカウントIDのどちらかが指定されていれば true */
export function hasRequiredIdentityColumn(m: ColumnMapping): boolean {
  return m.name >= 0 || m.x_id >= 0;
}

/** マッピングで参照する最大列インデックス＋1 ＝ 必要な最小列数 */
export function getMinColumnsFromMapping(m: ColumnMapping): number {
  const indices: number[] = [
    m.timestamp,
    m.name,
    m.x_id,
    m.first_flag,
    m.cast1,
    m.cast2,
    m.cast3,
    m.note,
    m.is_pair_ticket,
  ];
  if (m.nameColumn2 != null && m.nameColumn2 >= 0) indices.push(m.nameColumn2);
  if (m.extraColumns?.length) {
    m.extraColumns.forEach((e) => indices.push(e.columnIndex));
  }
  const valid = indices.filter((i) => i >= 0);
  if (valid.length === 0) return 0;
  return Math.max(...valid) + 1;
}
