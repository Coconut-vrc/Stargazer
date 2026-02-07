// app/common/types/discord-colors.ts
// app/mock/test.html から抽出したカラーリング

export const DiscordColors = {
  // test.html :root の背景色
  purpleDeep: '#1A0A1A',   // 左上の赤紫
  violetMid: '#0D0B1E',    // ベースの暗紫
  navyDark: '#05121B',     // 右下の紺

  // 背景（グラデーション上で使う半透明）
  bgSidebar: 'rgba(0, 0, 0, 0.2)',
  bgMain: 'transparent',
  bgDark: 'rgba(0, 0, 0, 0.25)',
  bgSecondary: 'rgba(255, 255, 255, 0.05)',
  itemHover: 'rgba(255, 255, 255, 0.06)',
  itemActive: 'rgba(255, 255, 255, 0.08)',
  bgAlt: 'rgba(0, 0, 0, 0.15)',

  // テキスト・ライン（test.html と同一）
  textNormal: '#dbdee1',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  textActive: '#ffffff',
  textHeader: '#f2f3f5',
  textLink: '#00a8fc',

  border: 'rgba(255, 255, 255, 0.1)',
  lineColor: 'rgba(255, 255, 255, 0.1)',

  // アクセント（ボタン等）
  accentBlue: '#5865f2',
  accentGreen: '#23a559',
  accentYellow: '#f0b232',
  accentRed: '#ed4245',
  buttonSuccess: '#23a559',
  bgHover: 'rgba(255, 255, 255, 0.08)',

  // 後方互換用エイリアス
  bgServerList: '#1A0A1A',
} as const;
