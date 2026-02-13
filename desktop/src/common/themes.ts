/**
 * テーマ一覧。プレビュー用に各テーマの代表色を保持。
 */

export const THEME_IDS = [
  'dark',
  'lavender',
  'gradient',
  'pattern',
  'midnight',
  'minimal',
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export interface ThemeEntry {
  id: ThemeId;
  /** プレビュー用。1～3色を並べて表示（ツールチップ用 name は別） */
  previewColors: [string, string?, string?];
}

export const THEMES: readonly ThemeEntry[] = [
  { id: 'dark', previewColors: ['#1a0a1a', '#2b2d31', '#313338'] },
  { id: 'lavender', previewColors: ['#9156a3', '#e8d5f0', '#5a3a66'] },
  { id: 'gradient', previewColors: ['#0D0B1E', '#1A0A1A', '#05121B'] },
  { id: 'pattern', previewColors: ['#1e1f22', '#2b2d31', '#383a40'] },
  { id: 'midnight', previewColors: ['#0f1419', '#192734', '#22303c'] },
  { id: 'minimal', previewColors: ['#ffffff', '#fafafa', '#e0e0e0'] },
];

/** アクセシビリティ・ツールチップ用（画面には出さない） */
export const THEME_NAMES: Record<ThemeId, string> = {
  dark: 'ダーク',
  lavender: 'ラベンダー',
  gradient: 'グラデーション',
  pattern: 'パターン',
  midnight: 'ミッドナイト',
  minimal: 'ミニマル',
};

export const DEFAULT_THEME_ID: ThemeId = 'dark';
