# M003 表示レイアウト改善

## 変更概要
M003（複数マッチング）の表示を改善し、テーブルごとに1行にまとめ、ユーザーを縦に並べて表示するようにしました。

## 変更前の問題
- 同じテーブルのユーザーが別々の行として表示されていた
- テーブルグルーピングが視覚的に分かりにくかった
- 見た目の重複が多かった

## 変更後の表示イメージ

```
テーブル 1
  user1 @x1  | キャストA キャストB | キャストE キャストF | キャストC キャストD |
  user2 @x2  | キャストA キャストB | キャストE キャストF | キャストC キャストD |
─────────────────────────────────────────────────────────────────────────────
テーブル 2
  user3 @x3  | キャストC キャストD | キャストA キャストB | キャストE キャストF |
  user4 @x4  | キャストC キャストD | キャストA キャストB | キャストE キャストF |
─────────────────────────────────────────────────────────────────────────────
テーブル 3
  user5 @x5  | キャストE キャストF | キャストC キャストD | キャストA キャストB |
  user6 @x6  | キャストE キャストF | キャストC キャストD | キャストA キャストB |
```

## 変更内容

### 1. `MatchingRow` インターフェース拡張 (L40-48)

```typescript
interface MatchingRow {
  tableIndex?: number;
  user: UserBean | null;
  matches: MatchedCast[];
  isFirstInTable?: boolean;
  // M003用: テーブル全体のユーザーとマッチ情報
  tableUsers?: Array<{ user: UserBean | null; matches: MatchedCast[] }>;
}
```

**理由**: テーブル全体のユーザー情報を1行に保持するため、`tableUsers` フィールドを追加。

### 2. `matchingRows` 構築ロジック変更 (L160-193)

**変更前**: 各ユーザーを別々の行として作成
```typescript
for (const slot of tableSlots) {
  const isFirstInTable = slot.tableIndex !== prevTableIndex;
  rows.push({
    tableIndex: slot.tableIndex,
    user: slot.user,
    matches: slot.matches,
    isFirstInTable,
  });
  prevTableIndex = slot.tableIndex;
}
```

**変更後**: テーブルごとに1行を作成し、全ユーザー情報を `tableUsers` に格納
```typescript
// テーブルごとにユーザーをグループ化
const tableMap = new Map<number, Array<{ user: UserBean | null; matches: MatchedCast[] }>>();

for (const slot of tableSlots) {
  const tblIdx = slot.tableIndex ?? 0;
  if (!tableMap.has(tblIdx)) {
    tableMap.set(tblIdx, []);
  }
  tableMap.get(tblIdx)!.push({
    user: slot.user,
    matches: slot.matches,
  });
}

// テーブル番号順にソートして行を作成
const rows: MatchingRow[] = [];
const sortedTables = Array.from(tableMap.entries()).sort((a, b) => a[0] - b[0]);

for (const [tableIndex, users] of sortedTables) {
  rows.push({
    tableIndex,
    user: users[0]?.user ?? null,
    matches: users[0]?.matches ?? [],
    isFirstInTable: true,
    tableUsers: users,
  });
}
```

### 3. テーブル列の表示ロジック変更 (L210-265)

**M003の場合**: テーブル番号を表示し、全ユーザーを縦に並べる
```typescript
if (row.tableUsers && row.tableUsers.length > 0) {
  return (
    <td className="table-cell-padding">
      {row.tableIndex != null && (
        <div className="text-body-sm table-cell-table-index" style={{ marginBottom: '8px' }}>
          テーブル {row.tableIndex}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {row.tableUsers.map((userInfo, idx) => (
          <div key={idx} style={{ display: 'flex', flexDirection: 'column' }}>
            {userInfo.user ? (
              <>
                <div className="text-user-name">{userInfo.user.name}</div>
                <XLinkInline xId={userInfo.user.x_id} ... />
              </>
            ) : (
              <span className="text-unassigned">空</span>
            )}
          </div>
        ))}
      </div>
    </td>
  );
}
```

**M001/M002の場合**: 従来通りの表示（後方互換性維持）

### 4. ローテーション列の表示ロジック変更 (L273-350)

**M003の場合**: 各ユーザーのキャストを縦に並べ、キャストは横に並べる
```typescript
if (row.tableUsers && row.tableUsers.length > 0) {
  return (
    <td className="table-cell-padding">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {row.tableUsers.map((userInfo, userIdx) => {
          const startIdx = roundIdx * castsPerRotation;
          const endIdx = startIdx + castsPerRotation;
          const slots = userInfo.matches.slice(startIdx, endIdx);
          
          return (
            <div key={userIdx} style={{ display: 'flex', flexDirection: 'row', gap: '8px', flexWrap: 'wrap' }}>
              {slots.map((slot, castIdx) => (
                <div key={castIdx} style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className="text-body-sm">{slot.cast.name}</div>
                  <div>{renderRankBadge(slot.rank)}</div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </td>
  );
}
```

**レイアウト構造**:
- 外側の `div`: 縦方向（ユーザーごと）
- 内側の `div`: 横方向（キャストごと）

## 動作確認ポイント

### M003 (usersPerTable=2, castsPerRotation=2, rotationCount=3)
- [ ] テーブルごとに1行で表示される
- [ ] テーブル番号が各テーブルの先頭に表示される
- [ ] 同じテーブルの2人のユーザーが縦に並んで表示される
- [ ] 各ユーザーの2人のキャストが横に並んで表示される
- [ ] 3ローテーション分のキャストが正しく表示される

### M001/M002（後方互換性）
- [ ] 従来通りの表示が維持される
- [ ] テーブルグルーピングが正しく動作する

## まとめ

この変更により、M003の表示が大幅に改善され、以下のメリットがあります:

1. **視認性向上**: テーブルごとにまとまって表示されるため、どのユーザーが同じテーブルかが一目で分かる
2. **スペース効率**: 同じテーブルのユーザーを1行にまとめることで、縦のスペースを節約
3. **重複削減**: テーブル番号を各テーブルに1回だけ表示することで、見た目の重複を削減
4. **後方互換性**: M001/M002の表示は従来通り維持

ローテーションの考え方は変更せず、表示レイアウトのみを改善しました。
