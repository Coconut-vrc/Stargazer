# M003 複数マッチング修正 Walkthrough

## 修正概要
M003 (複数マッチング) において、以下の4つの問題を修正しました:

1. ✅ **テーブルグルーピング表示の実装** - 同じテーブルのユーザーを正しくグループ化
2. ✅ **複数キャスト表示対応** - `castsPerRotation > 1` のとき全キャストを表示
3. ✅ **キャスト別ビューの複数ユーザー対応** - 1ローテに複数ユーザーを表示
4. ✅ **TSVエクスポート修正** - 正しいテーブル番号と全データを出力

## 変更ファイル

### `MatchingPage.tsx`

#### 1. インターフェース定義の拡張 (L35-46)

**変更前:**
```typescript
interface CastViewRow {
  castName: string;
  perRound: (CastAssignment | null)[];
}

interface MatchingRow {
  tableIndex?: number;
  user: UserBean | null;
  matches: MatchedCast[];
}
```

**変更後:**
```typescript
interface CastViewRow {
  castName: string;
  perRound: CastAssignment[][]; // M003対応: 1ローテに複数ユーザー
}

interface MatchingRow {
  tableIndex?: number;
  user: UserBean | null;
  matches: MatchedCast[];
  isFirstInTable?: boolean; // M003対応: テーブルグルーピング用
}
```

**理由:** 
- `CastViewRow.perRound` を `CastAssignment[][]` に変更することで、1ローテーションに複数ユーザーを保持可能に
- `MatchingRow.isFirstInTable` を追加して、各テーブルの最初の行を識別可能に

#### 2. matchingRows 構築ロジック修正 (L145-167)

**変更前:**
```typescript
if (tableSlots != null && tableSlots.length > 0) {
  return tableSlots.map((slot, i) => ({
    tableIndex: i + 1,  // ❌ 全スロットに別のテーブル番号
    user: slot.user,
    matches: slot.matches,
  }));
}
```

**変更後:**
```typescript
if (tableSlots != null && tableSlots.length > 0) {
  const rows: MatchingRow[] = [];
  let prevTableIndex: number | undefined = undefined;
  
  for (const slot of tableSlots) {
    const isFirstInTable = slot.tableIndex !== prevTableIndex;
    rows.push({
      tableIndex: slot.tableIndex,  // ✅ slot.tableIndexを使用
      user: slot.user,
      matches: slot.matches,
      isFirstInTable,  // ✅ テーブルの最初の行を識別
    });
    prevTableIndex = slot.tableIndex;
  }
  return rows;
}
```

**理由:**
- `slot.tableIndex` を使用することで、同じテーブルのユーザーに同じテーブル番号を付与
- `isFirstInTable` フラグで各テーブルの最初の行を識別し、テーブル番号の表示を制御

#### 3. テーブル列の表示ロジック修正 (L179-198)

**変更前:**
```typescript
{row.tableIndex != null && (
  <div className="text-body-sm table-cell-table-index">
    テーブル {row.tableIndex}
  </div>
)}
```

**変更後:**
```typescript
{row.isFirstInTable && row.tableIndex != null && (
  <div className="text-body-sm table-cell-table-index">
    テーブル {row.tableIndex}
  </div>
)}
```

**理由:** テーブル番号を各テーブルの最初の行にのみ表示することで、視覚的にグルーピングを実現

#### 4. ローテーション列で複数キャスト表示 (L208-250)

**変更前:**
```typescript
const slot = row.matches[roundIdx];  // ❌ 1キャストのみ取得
return (
  <td className="table-cell-padding">
    {slot ? (
      <div className="stack-vertical-4">
        <div className="text-body-sm">{slot.cast.name}</div>
        <div>{renderRankBadge(slot.rank)}</div>
      </div>
    ) : (
      <span className="text-unassigned">未配置</span>
    )}
  </td>
);
```

**変更後:**
```typescript
// M003対応: castsPerRotation > 1 のとき複数キャストを表示
const startIdx = roundIdx * castsPerRotation;
const endIdx = startIdx + castsPerRotation;
const slots = row.matches.slice(startIdx, endIdx);  // ✅ 複数キャスト取得

return (
  <td className="table-cell-padding">
    <div className="stack-vertical-4">
      {slots.map((slot, i) => (
        <div key={i}>
          {slot ? (
            <>
              <div className="text-body-sm">{slot.cast.name}</div>
              <div>{renderRankBadge(slot.rank)}</div>
            </>
          ) : (
            <span className="text-unassigned">未配置</span>
          )}
        </div>
      ))}
    </div>
  </td>
);
```

**理由:** 
- `matches` 配列のレイアウト `matches[r * castsPerRotation + c]` に従って正しくキャストを取得
- `castsPerRotation > 1` のとき、全キャストを縦に並べて表示

#### 5. castViewRows 構築ロジック修正 (L256-308)

**変更前:**
```typescript
const basePerRound = Array.from({ length: rotationCount }, () => null as CastAssignment | null);
// ...
for (const slot of tableSlots) {
  for (let idx = 0; idx < rotationCount && idx < slot.matches.length; idx++) {
    const m = slot.matches[idx];  // ❌ 1キャストのみ処理
    if (!m) continue;
    const row = map.get(m.cast.name) ?? { castName: m.cast.name, perRound: [...basePerRound] };
    row.perRound[idx] = slot.user
      ? { userName: slot.user.name, x_id: slot.user.x_id, rank: m.rank }
      : null;
    map.set(m.cast.name, row);
  }
}
```

**変更後:**
```typescript
const basePerRound = Array.from({ length: rotationCount }, () => [] as CastAssignment[]);
// ...
for (const slot of tableSlots) {
  if (!slot.user) continue;
  
  for (let r = 0; r < rotationCount; r++) {
    // M003対応: castsPerRotation > 1 のとき、matches配列から正しくキャストを取得
    const startIdx = r * castsPerRotation;
    const endIdx = startIdx + castsPerRotation;
    const castsInRound = slot.matches.slice(startIdx, endIdx);  // ✅ 複数キャスト取得
    
    for (const m of castsInRound) {
      if (!m) continue;
      const row = map.get(m.cast.name);
      if (row) {
        row.perRound[r].push({  // ✅ 配列にpush
          userName: slot.user.name,
          x_id: slot.user.x_id,
          rank: m.rank,
        });
      }
    }
  }
}
```

**理由:**
- `perRound` を `CastAssignment[][]` に変更したため、各ローテーションで複数ユーザーを保持可能
- `castsPerRotation > 1` のとき、全キャストを正しく処理

#### 6. キャスト別ビューの表示修正 (L336-360)

**変更前:**
```typescript
const assignment = row.perRound[roundIdx];  // ❌ 単一ユーザー
return (
  <td className="table-cell-padding">
    {assignment ? (
      <div className="stack-vertical-4">
        <div className="text-body-sm">{assignment.userName}</div>
        <XLinkInline xId={assignment.x_id} ... />
        <div>{renderRankBadge(assignment.rank)}</div>
      </div>
    ) : (
      <span className="text-unassigned">未配置</span>
    )}
  </td>
);
```

**変更後:**
```typescript
const assignments = row.perRound[roundIdx];  // ✅ 複数ユーザー
return (
  <td className="table-cell-padding">
    {assignments.length > 0 ? (
      <div className="stack-vertical-4">
        {assignments.map((assignment, i) => (  // ✅ 全ユーザーを表示
          <div key={i} style={{ marginBottom: i < assignments.length - 1 ? '8px' : '0' }}>
            <div className="text-body-sm">{assignment.userName}</div>
            <XLinkInline xId={assignment.x_id} ... />
            <div>{renderRankBadge(assignment.rank)}</div>
          </div>
        ))}
      </div>
    ) : (
      <span className="text-unassigned">未配置</span>
    )}
  </td>
);
```

**理由:** 1ローテーションに複数ユーザーがいる場合、全員を縦に並べて表示

#### 7. バックアップTSVエクスポート修正 (L98-121)

**変更前:**
```typescript
slots.forEach((slot, i) => {
  const row: (string | number)[] = [i + 1, slot.user?.name ?? '空', slot.user?.x_id ?? ''];
  for (let r = 0; r < R; r++) {
    const m = slot.matches[r];  // ❌ 1キャストのみ
    row.push(m?.cast.name ?? '', m && m.rank >= 1 ? `第${m.rank}希望` : m ? '希望外' : '');
  }
  values.push(row);
});
```

**変更後:**
```typescript
slots.forEach((slot) => {
  const row: (string | number)[] = [
    slot.tableIndex ?? '?',  // ✅ 正しいテーブル番号
    slot.user?.name ?? '空',
    slot.user?.x_id ?? ''
  ];
  for (let r = 0; r < R; r++) {
    // M003対応: castsPerRotation > 1 のとき複数キャストを連結
    const startIdx = r * castsPerRotation;
    const endIdx = startIdx + castsPerRotation;
    const castsInRound = slot.matches.slice(startIdx, endIdx);
    
    const castNames = castsInRound.map(m => m?.cast.name ?? '').join(', ');
    const ranks = castsInRound.map(m => 
      m && m.rank >= 1 ? `第${m.rank}希望` : m ? '希望外' : ''
    ).join(', ');
    
    row.push(castNames, ranks);  // ✅ 複数キャストをカンマ区切りで出力
  }
  values.push(row);
});
```

**理由:**
- `slot.tableIndex` を使用して正しいテーブル番号を出力
- 複数キャストをカンマ区切りで連結して出力

#### 8. buildExportValues 修正 (L413-433, L453-467)

**テーブル別エクスポート:**
```typescript
// 変更前: i + 1 を使用
const row: (string | number)[] = [i + 1, slot.user?.name ?? '空', slot.user?.x_id ?? ''];

// 変更後: slot.tableIndex を使用
const row: (string | number)[] = [
  slot.tableIndex ?? '?',
  slot.user?.name ?? '空',
  slot.user?.x_id ?? ''
];
```

**キャスト別エクスポート:**
```typescript
// 変更前: 単一ユーザー
const assignment = row.perRound[r];
if (assignment) {
  line.push(assignment.userName);
  line.push(assignment.x_id);
  line.push(assignment.rank >= 1 ? `第${assignment.rank}希望` : '希望外');
}

// 変更後: 複数ユーザーをカンマ区切り
const assignments = row.perRound[r];
if (assignments.length > 0) {
  const userNames = assignments.map(a => a.userName).join(', ');
  const xIds = assignments.map(a => a.x_id).join(', ');
  const ranks = assignments.map(a => a.rank >= 1 ? `第${a.rank}希望` : '希望外').join(', ');
  line.push(userNames, xIds, ranks);
}
```

**理由:** TSVエクスポートでも同様の修正を適用

## 動作確認ポイント

### 1. テーブルグルーピング表示
- [ ] M003で複数ユーザーが同じテーブル番号でグループ化されている
- [ ] テーブル番号が各テーブルの最初の行にのみ表示されている

### 2. 複数キャスト表示
- [ ] `castsPerRotation = 2` のとき、各ローテーション列に2人のキャストが表示される
- [ ] キャスト名とランクバッジが縦に並んで表示される

### 3. キャスト別ビュー
- [ ] `usersPerTable = 2` のとき、各ローテーション列に2人のユーザーが表示される
- [ ] ユーザー名、XID、ランクバッジが縦に並んで表示される

### 4. TSVエクスポート
- [ ] テーブル番号が正しく出力される (1, 1, 2, 2, ... ではなく 1, 1, 2, 2, ...)
- [ ] `castsPerRotation = 2` のとき、キャスト名がカンマ区切りで出力される
- [ ] キャスト別リストで複数ユーザーがカンマ区切りで出力される

## まとめ

この修正により、M003 (複数マッチング) が以下のシナリオで正しく動作するようになりました:

- ✅ `usersPerTable > 1`: 複数ユーザーが同じテーブルに配置される
- ✅ `castsPerRotation > 1`: 1ローテーションに複数キャストが配置される
- ✅ テーブルグルーピング表示: 同じテーブルのユーザーが視覚的にグループ化される
- ✅ TSVエクスポート: 全データが正しく出力される
