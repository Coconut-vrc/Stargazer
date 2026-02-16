# マッチングシステム機能追加仕様書

**バージョン:** 2.2  
**最終更新日:** 2026年2月14日

**アプリ構成の前提**  
本アプリ（Stargazer）は **Tauri 2 デスクトップアプリ**で、完全ローカル運用です。外部API・認証は使用しません。抽選・マッチング結果のエクスポートはCSVダウンロードで行います。マッチングロジックは `desktop/src/features/matching/` 配下に実装されています。

---

## 目次

1. [実装方針](#実装方針)
2. [NGユーザー機能](#1-ngユーザー機能)
3. [要注意人物機能](#2-要注意人物機能)
4. [NG例外設定機能](#3-ng例外設定機能)
5. [マッチングロジック追加](#4-マッチングロジック追加)
6. [ファイル構成案](#5-ファイル構成案)
7. [実装順序の推奨](#6-実装順序の推奨)
8. [実装時の注意事項](#7-実装時の注意事項)

---

## 実装方針

### ⚠️ 絶対遵守事項

- **マッチングロジックは区分コードで完全分離すること**
- **コードが長くなっても問題なし（重複OK）**
- **各ロジックは独立したファイル/関数として実装**
- **リファクタリング依頼があっても中身の精査のみ実施**
- **統合・共通化の指示があった場合は必ず確認を求めること**

---

## 1. NGユーザー機能

### 1-1. 設定項目

#### 判定基準（プルダウン選択）

以下の3つから選択：

1. **ユーザー名のみで判定**
2. **アカウントID(X)のみで判定**
3. **ユーザー名 OR アカウントID**（どちらか片方が一致すればNG）

#### マッチング時の挙動（選択式）

以下の2つから選択：

#### 1. 警告モード（✅ 実装済み — ハイライト表示）

- マッチング実行
- 結果画面でNGユーザーを黄色ハイライト + ⚠アイコンで表示
- ツールチップで「このユーザーはキャスト○○のNG対象です」表示

#### 2. 除外モード（✅ 実装済み）

- マッチングアルゴリズム内部で自動除外
- そのキャストとNGユーザーをマッチングさせない

### 1-2. 警告モードUI仕様

#### 結果画面（✅ 実装済み）

- NGユーザーが含まれるマッチング結果を黄色でハイライト（`matching-cell-ng-warning`）
- ⚠ 警告アイコン表示（`matching-ng-icon`）
- ツールチップで「このユーザーはキャスト○○のNG対象です」表示（`title` 属性）

#### ドラッグ&ドロップ機能（🔲 未実装）

> **現在未実装。** 将来的に以下の動作を想定：

1. NGユーザーをドラッグ
2. 別のテーブル/スロットにドロップ
3. 入れ替え実行
4. 入れ替え先のキャストでNG判定を自動実行
5. 新たにNGが発生した場合は再度ハイライト
6. NG解消された場合はハイライト解除

### 1-3. データ構造

#### NGユーザーエントリ（`common/types/entities.ts`）

```typescript
// NGユーザー1件。登録時は名前＋ X ID。
interface NGUserEntry {
  username?: string;   // VRChat表示名
  accountId?: string;  // X（旧Twitter）アカウントID
}
```

> **設計判断:** NG判定に必要な識別子は **VRChat表示名（= username）** と **Xアカウント（= accountId）** の2つ。Google フォームのほぼ全てがこの2項目を必須として取得しているため、VRC URL は NG 判定には不要。キャスト自身の VRC プロフィールリンク（`CastBean.vrc_profile_url`）は別途キャスト管理で保持する。

#### NG設定（グローバル — 全キャスト共通）

```typescript
// judgmentType・matchingBehavior はキャストごとではなくグローバル設定。
// 実体: matching-settings-store.ts の MatchingSettingsState
interface MatchingSettingsState {
  ngJudgmentType: 'username' | 'accountId' | 'either';
  ngMatchingBehavior: 'warn' | 'exclude';
  caution: CautionUserSettings;
  ngExceptions: NGExceptionSettings;
}
```

> **補足:** 各キャストのNGリストは `CastBean.ng_entries` (NGUserEntry[]) に保持される。グローバルな判定基準・挙動と組み合わせて判定する。

#### 警告モード用の結果データ（`matching-result-types.ts`）

```typescript
// 1スロット分のマッチング結果
interface MatchedCast {
  cast: { name: string; is_present: boolean; ng_users: string[] };
  rank: number;
  isNGWarning?: boolean; // 警告モード用フラグ
  ngReason?: string;     // 「このユーザーはキャスト○○のNG対象です」
}

// テーブル1行分
interface TableSlot {
  user: UserBean | null;
  matches: MatchedCast[];
}

// マッチング結果全体
interface MatchingResult {
  userMap: Map<string, MatchedCast[]>;
  tableSlots?: TableSlot[]; // テーブル形式の場合のみ
}
```

---

## 2. 要注意人物機能

### 2-1. 自動登録ロジック

#### 条件

- 複数のキャストが同じユーザーをNGに設定
- 閾値（1名〜）は設定可能
- 閾値以上のキャストがNGに設定したユーザーを自動的に要注意人物として登録

#### NGカウント（「何人のキャストが NG にしているか」の集計）

- **1-1 の判定基準（`ngJudgmentType`）に従う**
- 設定が「ユーザー名のみ」なら username 一致でカウント、「どちらか」なら OR でカウント
- これにより username のみのNGエントリやレガシー `ng_users` もカウント対象になる
- `ng-judgment.ts` の `isUserNGForCast` を使用し、NG判定ロジックと一貫させる

#### ⚠️ 要注意人物の同一人物判定（厳密）

- 登録される CautionUser のレコードには **ユーザー名 AND アカウントID の両方が必須**
- `isCautionUser` で応募者と要注意リストを照合する際は **両方が一致** した場合のみ該当
- どちらか片方だけが一致しても別人として扱う
- **理由:** 要注意人物の誤判定（同名の別人をフラグ）を防ぐため
- **補足:** 応募ユーザーに username または x_id が欠けている場合、自動登録対象外

### 2-2. 手動登録

- 管理画面から直接要注意人物として登録可能
- ユーザー名とアカウントIDの両方を必須入力

### 2-3. 応募リスト表示仕様

#### 表示タイミング

- マッチング実行前の応募リスト確認ページ

#### 表示内容

要注意人物が含まれる場合：

- ✓ 警告メッセージ表示
- ✓ 該当行を赤色でマーキング
- ✓ 行の右端に❌ボタンを配置

#### ❌ボタン動作

1. クリック時にポップアップ表示
2. 「このユーザーをリストから削除しますか？」確認
3. 削除を選択した場合、応募リストから除外

### 2-4. 重要な仕様

**⚠️ 要注意人物はマッチングロジックに影響しない**

- あくまで事前警告機能
- マッチング自体は通常通り実行可能
- 排除するかは管理者が手動判断

### 2-5. データ構造

```typescript
type CautionUser = {
  username: string;
  accountId: string;          // 必須
  registrationType: 'auto' | 'manual';
  ngCastCount?: number;       // 自動登録の場合のみ
  registeredAt: string;       // ISO 8601 文字列（JSON シリアライズのため）
}

type CautionUserSettings = {
  autoRegisterThreshold: number; // 1〜（デフォルト: 2）
  cautionUsers: CautionUser[];
}
```

---

## 3. NG例外設定機能

### 3-1. 目的

#### 問題

- 同名ユーザーが複数存在する場合、無関係なユーザーにも警告が出る

#### 解決

- 特定のユーザーを例外リストに登録
- 応募リストでの警告を抑制

### 3-2. 設定方法

#### 必須項目

- ユーザー名（必須）
- アカウントID（必須）

**⚠️ 両方の入力が必須**

### 3-3. 適用条件

#### 例外判定が有効になる条件

- 抽選データに「ユーザー名」AND「アカウントID」の両方が存在する

#### 理由

- アカウントIDがない場合、同名の別人を区別できないため例外判定不可

### 3-4. 効果範囲

- ✓ 応募リスト確認ページでの警告表示を抑制
- ✗ キャストのNG設定には影響しない

#### 例

- ユーザー「太郎（@taro_fake）」を例外登録
- 応募リスト → 警告が出ない
- キャストAが「太郎」をNGに設定している場合
  - → マッチング時は通常通りNG判定される

### 3-5. 判定フロー

```
応募リストチェック時：

1. ユーザー名で要注意人物を検索
2. 該当者がいた場合
   ├─ 抽選データにアカウントIDがある？
   │  ├─ YES → 例外リストに「ユーザー名+アカウントID」が一致？
   │  │         ├─ YES → 警告を出さない
   │  │         └─ NO → 警告・赤マーキング
   │  └─ NO → 通常通り警告・赤マーキング
   └─ 該当者なし → 何もしない
```

### 3-6. データ構造

```typescript
type NGException = {
  username: string;
  accountId: string;    // 必須
  registeredAt: string; // ISO 8601 文字列（JSON シリアライズのため）
  note?: string;
}

type NGExceptionSettings = {
  exceptions: NGException[];
}
```

---

## 4. マッチングロジック追加

### 4-1. UI設定

#### プルダウン項目

1. 完全ランダムマッチング
2. 完全ローテーションマッチング
3. 空席込みランダムマッチング
4. 空席込みローテーションマッチング
5. グループマッチング
6. 複数マッチング

#### 共通設定

- ローテーション回数（数値入力）

#### ⚠️ バリデーションチェック（設定時点で実施）

- ユーザー数がグループ数で割り切れない場合 → エラー
- キャスト数がローテーションに足りない場合 → エラー
- 複数マッチングでキャスト数がユニット編成に足りない場合 → エラー

---

## 4-2. ロジック1-4: 既存ロジック（名称変更のみ）

### 1. 完全ランダムマッチング

**旧名称:** 特別営業（ランダム）

- 全ユーザーに必ずキャストを配置
- 空席なし
- ランダムに配置

### 2. 完全ローテーションマッチング

**旧名称:** 特別営業（ローテーション）

- 全ユーザーに必ずキャストを配置
- 空席なし
- 順番に回る

### 3. 空席込みランダムマッチング

**旧名称:** 通常営業（ランダム）

- 空席あり得る
- ランダム配置

### 4. 空席込みローテーションマッチング

**旧名称:** 通常営業（ローテーション）

- 空席あり得る
- 順番に回る

---

## 4-3. ロジック5: グループマッチング（✅ 実装済み）

> **`group-matching.ts` に対角線配置アルゴリズムで実装済み。** 以下は仕様。

### 設定項目

- グループ数（数値）
- 1グループあたりの人数（数値）
- ローテーション回数（数値）

#### ⚠️ バリデーション

- 総ユーザー数 = グループ数 × 1グループの人数
- 割り切れない場合はエラー表示

### 構造

**テーブル > グループ（細分化）**

#### 例

```
応募者20名 → 5グループ × 4名
各グループは独立したローテーション空間
```

### ローテーション動作

5グループが並行してローテーション：

```
グループA: キャスト1 → キャスト2 → キャスト3
グループB: キャスト4 → キャスト5 → キャスト1 （同時進行）
グループC: キャスト2 → キャスト3 → キャスト4
グループD: キャスト5 → キャスト1 → キャスト2
グループE: キャスト3 → キャスト4 → キャスト5
```

### 希望キャスト機能との連携

**⚠️ 既存機能を利用**

- 取り込みファイルに希望キャストの設定があれば名前で判定（既に実装済み）
- グループマッチングでも同じコンポーネントを使用可能
- 別実装でも可

### 配置ロジック（優先順位）

優先順位を必ず守ること：

#### 1. NGユーザー有無を最優先チェック

- キャストのNGユーザーがいるグループには配置しない
- 除外モードの場合: アルゴリズム内部で自動排除（実装済み）
- 警告モードの場合: マッチング後にハイライト表示

#### 2. 希望数による重み付け

- グループ内で「そのキャストを希望するユーザー数」をカウント
- 希望者が多いグループに優先的に配置

#### 3. 希望キャスト設定がある場合

- 希望するキャストをそのグループに配置
- 既存の希望キャスト判定ロジックを使用

### 全グループにNGユーザーがいて配置不可能な場合

#### 対応方法（ユーザーが選択）

**1. ドラッグ&ドロップで手動調整**

- 結果画面でユーザーを移動
- グループ構成を変更してNG回避

**2. NGユーザー単体で再抽選**

- 該当NGユーザーのみを別枠で再マッチング
- 他のユーザーの配置は維持

**⚠️ どちらを使用するかは管理者が選択**

### フローチャート

```
1. グループ分け（応募者をグループに振り分け）
2. 各キャストについて：
   a. 全グループをチェック
   b. NGユーザーがいるグループを除外（除外モードの場合）
   c. 残りのグループで希望数をカウント
   d. 希望数が最も多いグループに配置
3. ローテーション開始位置を決定
4. ローテーション実行
5. 配置不可能なキャストがある場合 → エラー通知 → 対応方法選択
```

### データ構造

```typescript
type GroupMatchingSettings = {
  groupCount: number;
  usersPerGroup: number;
  rotationCount: number;
}

type Group = {
  groupId: number;
  users: User[];
  castRotation: Cast[]; // このグループのキャストローテーション順
}
```

---

## 4-4. ロジック6: 複数マッチング（✅ 実装済み）

> **`multiple-matching.ts` にテーブル×ユニット対角線配置で実装済み。** 以下は仕様。

### 設定項目

- 1テーブルあたりのユーザー数（数値）
- 1ローテあたりのキャスト数（数値）
- ローテーション回数（数値）

#### ⚠️ バリデーション

- キャスト総数 ÷ 1ローテのキャスト数 = 整数
- 割り切れない場合はエラー表示
- ユーザー総数 ÷ 1テーブルのユーザー数 = 整数
- 割り切れない場合はエラー表示

### テーブル数の決定

**自動計算:**

```
テーブル数 = 総ユーザー数 ÷ 1テーブルのユーザー数
```

### 構造

- **ユーザー:** テーブルに固定（着席）
- **キャスト:** 複数名セットで巡回

### 動作イメージ

設定例: 3ユーザー × 2キャスト

```
テーブル1（ユーザーA, B, C）:
  1ローテ → キャスト①&② 接客
  2ローテ → キャスト③&④ 接客
  3ローテ → キャスト⑤&⑥ 接客

テーブル2（ユーザーD, E, F）:
  1ローテ → キャスト③&④ 接客
  2ローテ → キャスト⑤&⑥ 接客
  3ローテ → キャスト①&② 接客
```

### キャストユニットの編成

**⚠️ 固定パターン:**

- 最初に決めたユニットでローテーション全体を回る
- 途中でユニットの組み替えは行わない

#### 例

キャスト6名、2名ずつのユニット

```
ユニットA: [キャスト①②]
ユニットB: [キャスト③④]
ユニットC: [キャスト⑤⑥]

→ この3ユニットが各テーブルを順番に巡回
```

### 配置ロジック

#### 重み付け

- テーブル内の各キャストへの希望数をカウント
- キャストユニットごとにスコアリング
  - ユニット内の全キャストの希望数を合算
  - スコアが高いユニットを優先的に配置

#### 例

```
テーブル1でキャスト①を希望するユーザーが2名、キャスト②を希望するユーザーが1名
→ ユニットA（①②）のスコア = 3
→ 他のユニットより優先的にテーブル1に配置
```

### フローチャート

```
1. ユーザーをテーブルに振り分け
2. キャストをユニット化（設定人数ごとに固定編成）
3. 各テーブルについて：
   a. テーブル内のユーザーの希望をカウント
   b. キャストユニットごとにスコアリング
   c. スコアが高い順にローテーション順を決定
4. NGユーザーチェック（除外モード: 自動排除、警告モード: ハイライト）
5. ローテーション実行
```

### データ構造

```typescript
type MultipleMatchingSettings = {
  usersPerTable: number;
  castsPerRotation: number;
  rotationCount: number;
}

type Table = {
  tableId: number;
  users: User[];
  castUnitRotation: CastUnit[]; // キャストユニットのローテーション順
}

type CastUnit = {
  unitId: string;
  casts: Cast[]; // 複数キャストのセット（固定）
}
```

---

## 5. ファイル構成案（現行実装）

```
desktop/src/
  layout/
    AppContainer.tsx              # ルーティング・サイドバー
  features/
    home/
      TopPage.tsx                 # トップ画面（メニュータイル）
    matching/
      MatchingPage.tsx            # マッチング結果画面
      logics/
        matching_service.ts       # エントリ・振り分け
        matching-result-types.ts  # 型定義（MatchedCast, TableSlot, MatchingResult）
        complete-random.ts        # M001 ✅
        complete-rotation.ts      # M002 ✅
        vacant-random.ts          # M003 ✅
        vacant-rotation.ts        # M004 ✅
        group-matching.ts         # M005 ✅
        multiple-matching.ts      # M006 ✅
        ng-judgment.ts            # NG判定 ✅
        caution-user.ts           # 要注意人物・NG例外判定 ✅
      types/
        matching-type-codes.ts    # M001〜M006 区分コード
        matching-system-types.ts  # NG・要注意・例外・設定の型定義
      stores/
        matching-settings-store.ts # NG設定・要注意・NG例外の永続化（localStorage）
    lottery/                       # 抽選条件・抽選結果
    db/                            # DBデータ確認
    cast/                          # キャスト管理
    ng-user/                       # NGユーザー管理
    guide/                         # ガイド
    settings/                      # 設定
    import/                        # データ読取（ImportPage）
    importFlow/                    # インポートフロー（モーダルウィザード）
      index.ts
      types.ts
      constants.ts
  common/
    types/
      entities.ts                 # UserBean, CastBean, NGUserEntry（正の定義）
    config.ts                     # STORAGE_KEYS 等
  components/                      # DiscordTable, ConfirmModal, AppSelect 等
  stores/
    AppContext.tsx                # グローバル状態・Repository
```

---

## 6. 実装順序の推奨

### Phase 1: NGユーザー基盤

1. ✅ NGユーザー設定機能（除外モード・警告モード両方実装済み）
2. ✅ 警告モード結果画面UI（ハイライト表示実装済み）
   - 🔲 ドラッグ&ドロップによる入れ替えは未実装
3. ✅ 要注意人物機能（自動登録＋手動登録 実装済み）
4. ✅ NG例外設定機能（実装済み）
5. ✅ 応募リスト画面のUI実装

### Phase 2: マッチングロジック

6. ✅ 既存ロジックの名称変更（M001〜M004）
7. ✅ バリデーション機能の実装
8. ✅ グループマッチング（M005）— 対角線配置アルゴリズム
9. ✅ 複数マッチング（M006）— テーブル×ユニット対角線配置

### Phase 3: 統合テスト

10. 各機能の結合テスト
11. エッジケースの検証
12. パフォーマンステスト

---

## 7. 実装時の注意事項

### NGユーザー判定

- **キャストのNGリスト照合（NG判定）:** 1-1 の判定基準（`ngJudgmentType`）に従う
  - 自動登録のNGカウントもこの判定基準を使用する
- **要注意人物の同一人物判定（`isCautionUser`）:** ユーザー名 AND アカウントIDの両方一致（厳密 AND）
- **NG例外判定（`isNGException`）:** ユーザー名 AND アカウントIDの両方一致（厳密 AND）
- 大文字小文字の扱いを統一（`trim().toLowerCase()`）
- 空白文字のトリム処理
- アカウントIDの先頭 `@` は比較時に除去

### 警告モード

- ✅ ハイライト表示・ツールチップは実装済み
- 🔲 ドラッグ&ドロップ後のNG再判定（D&D自体が未実装）
- リアルタイムでハイライト更新
- パフォーマンス考慮（大量データでも快適に動作）

### バリデーション

- 設定画面でリアルタイムバリデーション
- エラーメッセージは具体的に（「グループ数×人数が総ユーザー数と一致しません」等）
- マッチング実行前の最終チェック

### マッチングロジック

**⚠️ 最重要**

- NGユーザーは必ず考慮（全ロジック共通）
- 各ロジックは完全に独立させる
- 共通処理の誘惑に負けない
- 希望キャスト機能は既存実装を活用

### パフォーマンス

- 大量データ（100名以上）での動作確認
- ローテーション計算の最適化
- UI応答性の確保（特にドラッグ&ドロップ）

---

## 変更履歴

| バージョン | 日付 | 変更内容 |
|---------|------|---------|
| 2.0 | 2026-02-13 | 初版作成 |
| 2.1 | 2026-02 | アプリ構成の前提（Tauri・完全ローカル）を追記。ファイル構成案を現行の features/matching 構成に更新。 |
| 2.2 | 2026-02-14 | 実装コードとの照合結果を反映。データ構造を実装に合わせて修正（`registeredAt: Date` → `string`、`NGUserEntry` に `vrc_profile_url` 追加、`NGUserSetting` をグローバル設定に変更、`MatchingResult` を3層構造に更新）。M005/M006/ドラッグ&ドロップの未実装を明記。ファイル構成案に `home/` `importFlow/` を追加。実装順序に進捗マークを付与。 |

---

**このドキュメントについて質問や不明点がある場合は、実装前に必ず確認してください。**



20260216 追加仕様

# マッチングシステム仕様書 v2.3 更新内容（詳細版）

## バージョン: 2.2 → 2.3（2026年2月16日）

---

## 1. マッチングロジックの削減

### 変更前（6種類）

1. **M001: 完全ランダムマッチング** → ❌ 削除
2. **M002: 完全ローテーションマッチング** → ❌ 削除
3. **M003: 空席込みランダムマッチング**
4. **M004: 空席込みローテーションマッチング**
5. **M005: グループマッチング** → ❌ 削除
6. **M006: 複数マッチング**

### 変更後（3種類）

1. **M001: ランダムマッチング**（旧M003から改名・昇格）
2. **M002: ローテーションマッチング**（旧M004から改名・昇格）
3. **M003: 複数マッチング**（旧M006から区分コード変更）

---

## 2. 空席数計算ロジックの明確化

### ランダムマッチング・ローテーションマッチング共通

**新規追加: 空席数の計算式**

```
空席数 = 総テーブル数 - 当選者数
```

#### 設定項目の変更

**追加項目:**
- **総テーブル数**（数値入力）← 新規追加

**既存項目:**
- ローテーション回数（変更なし）

#### 動作仕様の明確化

**ランダムマッチング:**
```typescript
// 旧仕様（v2.2まで）: 空席数は暗黙的
// 新仕様（v2.3）: 明示的に総テーブル数を指定

設定例:
- 総テーブル数: 20
- 当選者数: 15
→ 空席数 = 20 - 15 = 5

処理:
1. 当選者15名をランダムにテーブル1-15に配置
2. テーブル16-20は空席として確保
3. キャストは全20テーブル（空席含む）をランダムにローテーション
```

**ローテーションマッチング:**
```typescript
設定例:
- 総テーブル数: 20
- 当選者数: 15
→ 空席数 = 20 - 15 = 5

処理:
1. 当選者15名を順番にテーブル1-15に配置
2. テーブル16-20は空席として確保
3. キャストは全20テーブル（空席含む）を順番にローテーション
```

#### 重要な仕様変更点

**空席テーブルの扱い:**
- ✅ 空席テーブルもローテーション対象に含める
- ✅ キャストは空席テーブルも巡回する
- ✅ 空席でもローテーション順は維持される

**理由:**
- キャストの公平性を保つため
- ローテーション管理を簡素化するため

---

## 3. バリデーションの更新

### ランダムマッチング・ローテーションマッチング

**新規追加: 総テーブル数のバリデーション**

```typescript
// バリデーションルール
if (totalTables < winnerCount) {
  throw new Error('総テーブル数が当選者数より少なくなっています');
}

// 条件式
totalTables >= winnerCount

// 具体例
総テーブル数: 15
当選者数: 20
→ エラー: 空席数がマイナスになる（-5席）
```

**エラーメッセージ:**
- 「総テーブル数が当選者数より少なくなっています」
- 「総テーブル数: {totalTables}, 当選者数: {winnerCount}, 不足: {winnerCount - totalTables}席」

### 複数マッチング（変更なし）

```typescript
// 既存のバリデーション（v2.2と同じ）
if (totalUsers % usersPerTable !== 0) {
  throw new Error('ユーザー数がテーブル数で割り切れません');
}

if (totalCasts % castsPerRotation !== 0) {
  throw new Error('キャスト数がローテーション単位で割り切れません');
}
```

---

## 4. データ構造の更新

### ランダムマッチング

**新規追加:**

```typescript
type RandomMatchingSettings = {
  totalTables: number;      // 総テーブル数（新規追加）
  rotationCount: number;    // ローテーション回数（既存）
}
```

### ローテーションマッチング

**新規追加:**

```typescript
type RotationMatchingSettings = {
  totalTables: number;      // 総テーブル数（新規追加）
  rotationCount: number;    // ローテーション回数（既存）
}
```

### 複数マッチング（変更なし）

```typescript
type MultipleMatchingSettings = {
  usersPerTable: number;        // 変更なし
  castsPerRotation: number;     // 変更なし
  rotationCount: number;        // 変更なし
}
```

---

## 5. ファイル構成の変更

### 削除するファイル

```
desktop/src/features/matching/logics/
  ❌ complete-random.ts          # M001完全ランダムマッチング
  ❌ complete-rotation.ts        # M002完全ローテーションマッチング
  ❌ group-matching.ts           # M005グループマッチング
```

**削除理由:**
- M001/M002: 空席なしの需要がないため
- M005: 複雑すぎて実用性が低いため

### 改名するファイル

```
desktop/src/features/matching/logics/
  旧: vacant-random.ts    → 新: random-matching.ts
  旧: vacant-rotation.ts  → 新: rotation-matching.ts
```

**改名理由:**
- 「空席込み」が標準になったため、プレフィックス不要
- よりシンプルな命名

### 変更なし

```
desktop/src/features/matching/logics/
  ✅ multiple-matching.ts        # 区分コードのみM006→M003に変更
  ✅ ng-judgment.ts              # 変更なし
  ✅ caution-user.ts             # 変更なし
  ✅ matching_service.ts         # 変更なし
  ✅ matching-result-types.ts    # 変更なし
```

---

## 6. 区分コードの変更

### matching-type-codes.ts の更新

**変更前:**

```typescript
export const MATCHING_TYPE_CODES = {
  M001: 'complete-random',          // 完全ランダム
  M002: 'complete-rotation',        // 完全ローテーション
  M003: 'vacant-random',            // 空席込みランダム
  M004: 'vacant-rotation',          // 空席込みローテーション
  M005: 'group-matching',           // グループマッチング
  M006: 'multiple-matching',        // 複数マッチング
} as const;
```

**変更後:**

```typescript
export const MATCHING_TYPE_CODES = {
  M001: 'random-matching',          // ランダムマッチング
  M002: 'rotation-matching',        // ローテーションマッチング
  M003: 'multiple-matching',        // 複数マッチング
} as const;
```

### ロジック内部の区分コード変更

**random-matching.ts:**

```typescript
// 変更前
export const MATCHING_TYPE = 'M003';

// 変更後
export const MATCHING_TYPE = 'M001';
```

**rotation-matching.ts:**

```typescript
// 変更前
export const MATCHING_TYPE = 'M004';

// 変更後
export const MATCHING_TYPE = 'M002';
```

**multiple-matching.ts:**

```typescript
// 変更前
export const MATCHING_TYPE = 'M006';

// 変更後
export const MATCHING_TYPE = 'M003';
```

---

## 7. UI設定の変更

### プルダウン項目の更新

**変更前:**

```
1. 完全ランダムマッチング
2. 完全ローテーションマッチング
3. 空席込みランダムマッチング
4. 空席込みローテーションマッチング
5. グループマッチング
6. 複数マッチング
```

**変更後:**

```
1. ランダムマッチング
2. ローテーションマッチング
3. 複数マッチング
```

### 設定画面の入力項目

**ランダム・ローテーションマッチング:**

```tsx
<FormGroup>
  <Label>総テーブル数</Label>
  <Input 
    type="number" 
    min="1"
    value={totalTables}
    onChange={(e) => setTotalTables(Number(e.target.value))}
  />
  {/* 新規追加項目 */}
</FormGroup>

<FormGroup>
  <Label>ローテーション回数</Label>
  <Input 
    type="number" 
    min="1"
    value={rotationCount}
    onChange={(e) => setRotationCount(Number(e.target.value))}
  />
  {/* 既存項目 */}
</FormGroup>

{/* バリデーションエラー表示 */}
{totalTables < winnerCount && (
  <ErrorMessage>
    総テーブル数が当選者数より少なくなっています
    （総テーブル: {totalTables}, 当選者: {winnerCount}）
  </ErrorMessage>
)}
```

**複数マッチング（変更なし）:**

```tsx
<FormGroup>
  <Label>1テーブルあたりのユーザー数</Label>
  <Input type="number" min="1" />
</FormGroup>

<FormGroup>
  <Label>1ローテあたりのキャスト数</Label>
  <Input type="number" min="1" />
</FormGroup>

<FormGroup>
  <Label>ローテーション回数</Label>
  <Input type="number" min="1" />
</FormGroup>
```

---

## 8. マッチング実行ロジックの変更

### matching_service.ts の更新

**変更前:**

```typescript
switch (matchingType) {
  case 'M001':
    return executeCompleteRandom(...);
  case 'M002':
    return executeCompleteRotation(...);
  case 'M003':
    return executeVacantRandom(...);
  case 'M004':
    return executeVacantRotation(...);
  case 'M005':
    return executeGroupMatching(...);
  case 'M006':
    return executeMultipleMatching(...);
}
```

**変更後:**

```typescript
switch (matchingType) {
  case 'M001':
    return executeRandomMatching(users, casts, { 
      totalTables, 
      rotationCount 
    });
  case 'M002':
    return executeRotationMatching(users, casts, { 
      totalTables, 
      rotationCount 
    });
  case 'M003':
    return executeMultipleMatching(users, casts, { 
      usersPerTable, 
      castsPerRotation, 
      rotationCount 
    });
  default:
    throw new Error(`Unknown matching type: ${matchingType}`);
}
```

---

## 9. 実装手順（Phase 2詳細）

### Step 1: ファイルの削除

```bash
cd desktop/src/features/matching/logics/
rm complete-random.ts
rm complete-rotation.ts
rm group-matching.ts
```

### Step 2: ファイルの改名

```bash
mv vacant-random.ts random-matching.ts
mv vacant-rotation.ts rotation-matching.ts
```

### Step 3: 区分コードの更新

**random-matching.ts:**

```typescript
// ファイル冒頭で定義
export const MATCHING_TYPE = 'M001'; // M003 → M001 に変更

// 関数内で totalTables パラメータを追加
export function executeRandomMatching(
  users: UserBean[],
  casts: CastBean[],
  settings: { totalTables: number; rotationCount: number }
): MatchingResult {
  const { totalTables, rotationCount } = settings;
  
  // バリデーション追加
  if (totalTables < users.length) {
    throw new Error('総テーブル数が当選者数より少なくなっています');
  }
  
  const vacantCount = totalTables - users.length;
  
  // 既存のロジック + 空席処理
  // ...
}
```

**rotation-matching.ts:**

```typescript
// ファイル冒頭で定義
export const MATCHING_TYPE = 'M002'; // M004 → M002 に変更

// 関数内で totalTables パラメータを追加
export function executeRotationMatching(
  users: UserBean[],
  casts: CastBean[],
  settings: { totalTables: number; rotationCount: number }
): MatchingResult {
  const { totalTables, rotationCount } = settings;
  
  // バリデーション追加
  if (totalTables < users.length) {
    throw new Error('総テーブル数が当選者数より少なくなっています');
  }
  
  const vacantCount = totalTables - users.length;
  
  // 既存のロジック + 空席処理
  // ...
}
```

**multiple-matching.ts:**

```typescript
// ファイル冒頭で定義のみ変更
export const MATCHING_TYPE = 'M003'; // M006 → M003 に変更

// その他のロジックは変更なし
```

### Step 4: matching-type-codes.ts の更新

```typescript
export const MATCHING_TYPE_CODES = {
  M001: 'random-matching',
  M002: 'rotation-matching',
  M003: 'multiple-matching',
} as const;

export type MatchingTypeCode = keyof typeof MATCHING_TYPE_CODES;
```

### Step 5: UI設定画面の更新

プルダウン選択肢を3つに削減し、ランダム・ローテーションマッチングに「総テーブル数」入力フィールドを追加。

---

## 10. 移行時の注意事項

### 既存データとの互換性

**問題:**
- 既存の保存データにM001, M002, M005, M006が含まれている可能性

**対応:**

```typescript
// データ読み込み時にマイグレーション
function migrateMatchingType(oldType: string): string {
  const migration: Record<string, string> = {
    'M001': 'M001', // 完全ランダム → ランダム（要手動調整）
    'M002': 'M002', // 完全ローテ → ローテ（要手動調整）
    'M003': 'M001', // 空席込みランダム → ランダム
    'M004': 'M002', // 空席込みローテ → ローテ
    'M005': 'M001', // グループ → ランダム（近似）
    'M006': 'M003', // 複数 → 複数
  };
  
  return migration[oldType] || 'M001';
}
```

### バリデーションエラーの対応

**ユーザーへの説明:**
```
「総テーブル数」を設定してください。
推奨値: 当選者数 + 予備席数（例: 当選者20名の場合、25テーブル）
```

---

## 11. テストケース

### ランダムマッチング

```typescript
// テスト1: 空席なし
totalTables: 10, winners: 10 → 空席0

// テスト2: 空席あり
totalTables: 15, winners: 10 → 空席5

// テスト3: バリデーションエラー
totalTables: 5, winners: 10 → エラー
```

### ローテーションマッチング

```typescript
// テスト1: 空席なし
totalTables: 10, winners: 10 → 空席0

// テスト2: 空席あり
totalTables: 20, winners: 15 → 空席5

// テスト3: バリデーションエラー
totalTables: 10, winners: 15 → エラー
```

---

## 12. ドキュメント更新箇所

### README.md

**削除:**
- 完全ランダムマッチングの説明
- 完全ローテーションマッチングの説明
- グループマッチングの説明

**追加:**
- 総テーブル数の設定方法
- 空席数の計算式

### ユーザーガイド

**更新:**
- マッチング方式の選択画面（6種→3種）
- 設定項目の説明（総テーブル数の追加）

---