/**
 * テーマ一覧。プレビュー用に各テーマの代表色を保持。
 */

export const THEME_IDS = [
  'dark',
  'pastel',
  'pattern',
  'lavender',
  'skyblue',
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export interface ThemePreview {
  /** 背景色 */
  bg: string;
  /** サイドバー色 */
  sidebar: string;
  /** カード色 */
  card: string;
  /** アクセント色（ボタン等） */
  accent: string;
  /** テキスト色 */
  text: string;
}

export interface ThemeEntry {
  id: ThemeId;
  preview: ThemePreview;
}

export const THEMES: readonly ThemeEntry[] = [
  {
    id: 'dark',
    preview: { bg: '#0d0b1e', sidebar: '#1a1b1f', card: '#1f2026', accent: '#5865f2', text: '#dbdee1' },
  },
  {
    id: 'pastel',
    preview: { bg: '#dde6dd', sidebar: '#f6f4f0', card: '#f0ede6', accent: '#5a9cc4', text: '#2d3a4a' },
  },
  {
    id: 'pattern',
    preview: { bg: '#14171f', sidebar: '#1a1b1f', card: '#181b24', accent: '#3b82f6', text: '#e2e8f0' },
  },
  {
    id: 'lavender',
    preview: { bg: '#ffe0ef', sidebar: '#f8f0f6', card: '#fdf8fc', accent: '#ff8fb8', text: '#4a284f' },
  },
  {
    id: 'skyblue',
    preview: { bg: '#e4f2ff', sidebar: '#f2f6fa', card: '#f8fbff', accent: '#4a8ec8', text: '#1e3a5f' },
  },
];

/** ツールチップ・ラベル用 */
export const THEME_NAMES: Record<ThemeId, string> = {
  dark: 'デフォルト',
  pastel: 'ライト',
  pattern: 'グラフ',
  lavender: 'スプライト',
  skyblue: 'チェック',
};

export const DEFAULT_THEME_ID: ThemeId = 'dark';
