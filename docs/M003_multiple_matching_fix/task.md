# M003 複数マッチング: ロジック修正と表示改修

## 現状の問題

### 1. 同ローテでキャストが複数テーブルに重複配置される (ロジックバグ)
`multiple-matching.ts` の対角配置式 `unitIdx = (chosenOffset + t + r) % unitCount` において、`tableCount > unitCount` のとき、同じローテーション内で同じユニットが複数テーブルに割り当てられる。

**現状**: バリデーション (L80-85) で既に検出・エラー処理済み ✅

### 2. テーブル単位のグルーピングがない (表示バグ)
`MatchingPage.tsx` L147-148 で `tableIndex: i + 1` が全スロットに別のテーブル番号を振っている。同テーブルのユーザーが別テーブルとして表示される。

### 3. `castsPerRotation > 1` のとき表示がずれる (表示バグ)
`matches` 配列は `ROUNDS * castsPerRotation` 個のエントリを持つが、表示コード `row.matches[roundIdx]` は1ローテ1キャスト前提。

### 4. キャスト別ビューが1ローテ1ユーザーしか保持できない
`CastViewRow.perRound` が `(CastAssignment | null)[]` のため、`usersPerTable > 1` で同ローテに複数ユーザーがいるケースに対応できない。

## 修正方針

### A. `matching-result-types.ts`
- ✅ `TableSlot.tableIndex` は既に追加済み

### B. `multiple-matching.ts`
- ✅ バリデーションは既に実装済み
- ✅ `tableIndex` 付与は既に実装済み (L196)
- ✅ `matches` 配列レイアウトのコメント追加済み (L175)

### C. `MatchingPage.tsx` — テーブルグルーピング表示
M003 のときの表示を以下の構造に変更:

```
テーブル 1
  user1 @x1  | 柘榴_ざくろ 第1希望 | ヌウア 希望外    |
  user2 @x2  | 柘榴_ざくろ 第3希望 | ヌウア 第1希望  |
─────────────────────────────────────────
テーブル 2
  user3 @x3  | moku 第2希望       | なゆたの 第1希望 |
  user4 @x4  | moku 希望外        | なゆたの 第2希望 |
```

具体的な変更:
1. `MatchingRow` に `isFirstInTable` フラグを追加
2. 同テーブルのユーザー間にはセパレーターなし、テーブル間にはCSS区切り線を追加
3. ローテーション列: `castsPerRotation > 1` のときは `matches[roundIdx * castsPerRotation]` から `castsPerRotation` 個を取得してすべてのキャスト名とランクバッジを表示

### D. キャスト別ビュー修正
`CastViewRow.perRound` を `(CastAssignment | null)[]` から `CastAssignment[][]` に変更し、1ローテーション内の複数ユーザーを保持可能にする。

### E. TSVエクスポート / バックアップ修正
M003のTSVエクスポートも同様に:
- テーブル番号を正しく出力
- `castsPerRotation > 1` のとき全キャストを出力

## 変更ファイル一覧
1. ~~`matching-result-types.ts`~~ (既に修正済み)
2. ~~`multiple-matching.ts`~~ (既に修正済み)
3. `MatchingPage.tsx` — グルーピング表示、複数キャスト/ユーザー対応、エクスポート修正
