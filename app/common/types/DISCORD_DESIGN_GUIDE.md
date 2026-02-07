# Discord風デザイン変更ガイド

## 📦 変更したファイル

### 1. `discord-colors.ts`（新規作成）
- Discord風のカラーパレットを定数として定義
- 全ページで共通して使用

### 2. `MatchingPage.tsx`（変更）
- 全スタイルをDiscord風に変更

---

## 🎨 主な変更点

### 背景色
```typescript
// Before
backgroundColor: '#0A0C10'

// After
backgroundColor: DiscordColors.bgMain  // #36393f
```

### テキスト色
```typescript
// Before
color: '#FFF'

// After
color: DiscordColors.textNormal  // #dcddde
```

### ボタン色
```typescript
// Before（緑ボタン）
backgroundColor: '#2EA043'

// After
backgroundColor: DiscordColors.buttonSuccess  // #3ba55d
```

### 交互の行色
```typescript
// Before
backgroundColor: index % 2 === 0 ? 'transparent' : '#161B22'

// After
backgroundColor: index % 2 === 0 ? 'transparent' : DiscordColors.bgAlt  // #2f3136
```

---

## 🔧 他のページへの適用方法

### Step 1: discord-colors.ts をインポート
```typescript
import { DiscordColors } from './discord-colors';
```

### Step 2: スタイルを置き換え

**背景色:**
```typescript
const containerStyle: React.CSSProperties = {
  backgroundColor: DiscordColors.bgMain,
  color: DiscordColors.textNormal
};
```

**ヘッダー:**
```typescript
const headerStyle: React.CSSProperties = {
  borderBottom: `2px solid ${DiscordColors.border}`
};
```

**テーブル:**
```typescript
const tableStyle: React.CSSProperties = {
  backgroundColor: DiscordColors.bgDark,
  color: DiscordColors.textNormal
};
```

**ボタン:**
```typescript
// プライマリボタン
const buttonStyle: React.CSSProperties = {
  backgroundColor: DiscordColors.buttonPrimary,  // 青
  color: '#FFF'
};

// 成功ボタン
const successButtonStyle: React.CSSProperties = {
  backgroundColor: DiscordColors.buttonSuccess,  // 緑
  color: '#FFF'
};

// 危険ボタン
const dangerButtonStyle: React.CSSProperties = {
  backgroundColor: DiscordColors.buttonDanger,   // 赤
  color: '#FFF'
};
```

---

## 📋 全ページ統一チェックリスト

- [ ] `ImportPage.tsx` - Discord配色適用
- [ ] `DBViewPage.tsx` - Discord配色適用
- [ ] `CastManagementPage.tsx` - Discord配色適用
- [ ] `LotteryPage.tsx` - Discord配色適用
- [x] `MatchingPage.tsx` - Discord配色適用 ✅
- [ ] `AppContainer.css` - グローバルスタイルをDiscord風に変更

---

## 🎨 Discord配色リファレンス

| 用途 | カラー変数 | 色コード | 説明 |
|------|-----------|---------|------|
| メイン背景 | `bgMain` | `#36393f` | チャット画面の背景 |
| サイドバー背景 | `bgDark` | `#2f3136` | 左サイドバー |
| 入力欄背景 | `bgSecondary` | `#40444b` | 入力フィールド |
| 通常テキスト | `textNormal` | `#dcddde` | メインテキスト |
| 薄いテキスト | `textMuted` | `#96989d` | 補助テキスト |
| リンク色 | `textLink` | `#00b0f4` | クリック可能なテキスト |
| プライマリボタン | `buttonPrimary` | `#5865f2` | Discord Blue |
| 成功ボタン | `buttonSuccess` | `#3ba55d` | 緑ボタン |
| 危険ボタン | `buttonDanger` | `#ed4245` | 赤ボタン |

---

## 💡 ホバー効果の実装例

```typescript
<button 
  style={primaryButtonStyle}
  onMouseEnter={(e) => {
    e.currentTarget.style.backgroundColor = DiscordColors.buttonPrimaryHover;
    e.currentTarget.style.transform = 'translateY(-2px)';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.backgroundColor = DiscordColors.buttonPrimary;
    e.currentTarget.style.transform = 'translateY(0)';
  }}
>
  ボタン
</button>
```

---

## 🚀 次のステップ

1. **グローバルCSSの変更**
   - `globals.css` や `AppContainer.css` もDiscord配色に統一

2. **フォントの統一**
   - Discord は "Whitney" フォントを使用
   - フォールバック: `"Helvetica Neue", Helvetica, Arial, sans-serif`

3. **アイコンの追加**（オプション）
   - Discord風のアイコンセット（Font Awesome など）

---

## 📝 注意事項

- **コントラスト比**: Discord配色はアクセシビリティを考慮
  - 背景 `#36393f` とテキスト `#dcddde` のコントラスト比: 約 12:1（AAA準拠）

- **ホバー効果**: Discord のボタンは微妙に明るくなる
  - 通常: `#5865f2`
  - ホバー: `#4752c4`（約 15% 暗い）

- **角丸**: Discord は比較的小さい角丸（4px）を使用
  - ボタン: `border-radius: 4px`
  - カード: `border-radius: 8px`
