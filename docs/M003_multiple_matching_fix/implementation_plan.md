# M003 複数マッチング修正 実装計画

## 概要
M003 (複数マッチング) において、テーブルグルーピング表示、複数キャスト対応、キャスト別ビューの修正を行う。

## 実装ステップ

### ステップ1: `MatchingRow` インターフェース拡張
`MatchingPage.tsx` の `MatchingRow` に `isFirstInTable` フラグを追加:

```typescript
interface MatchingRow {
  tableIndex?: number;
  user: UserBean | null;
  matches: MatchedCast[];
  isFirstInTable?: boolean; // 追加
}
```

### ステップ2: `matchingRows` 構築ロジック修正
`useMemo` で `matchingRows` を構築する際、テーブルごとにグルーピングし、各テーブルの最初のユーザーに `isFirstInTable: true` を設定:

```typescript
const matchingRows: MatchingRow[] = useMemo(() => {
  if (tableSlots != null && tableSlots.length > 0) {
    const rows: MatchingRow[] = [];
    let prevTableIndex: number | undefined = undefined;
    
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
    return rows;
  }
  return winners.map((u) => ({
    user: u,
    matches: matchingResult.get(u.x_id) ?? [],
  }));
}, [tableSlots, winners, matchingResult]);
```

### ステップ3: テーブル列の表示ロジック修正
`columns` 配列の最初の列 (テーブル番号/当選者列) で、`isFirstInTable` のときのみテーブル番号を表示:

```typescript
renderCell: (row) => (
  <td className="table-cell-padding">
    {row.isFirstInTable && row.tableIndex != null && (
      <div className="text-body-sm table-cell-table-index">
        テーブル {row.tableIndex}
      </div>
    )}
    {row.user ? (
      <>
        <div className="text-user-name">{row.user.name}</div>
        <XLinkInline
          xId={row.user.x_id}
          isCaution={isCautionUser(row.user, matchingSettings.caution.cautionUsers)}
        />
      </>
    ) : (
      <span className="text-unassigned">空</span>
    )}
  </td>
),
```

### ステップ4: ローテーション列で複数キャスト表示対応
`castsPerRotation > 1` のとき、各ローテーション列で複数のキャストを表示:

```typescript
renderCell: (row) => {
  const startIdx = roundIdx * castsPerRotation;
  const endIdx = startIdx + castsPerRotation;
  const slots = row.matches.slice(startIdx, endIdx);
  
  return (
    <td className="table-cell-padding">
      {slots.length > 0 ? (
        <div className="stack-vertical-4">
          {slots.map((slot, i) => {
            const isNG = slot?.isNGWarning === true;
            return (
              <div key={i} className={isNG ? 'matching-cell-ng-warning' : ''}>
                {isNG && (
                  <span className="matching-ng-icon" aria-label="NG警告" title={slot?.ngReason}>
                    ⚠
                  </span>
                )}
                <div className="text-body-sm">{slot.cast.name}</div>
                <div>{renderRankBadge(slot.rank)}</div>
              </div>
            );
          })}
        </div>
      ) : (
        <span className="text-unassigned">未配置</span>
      )}
    </td>
  );
},
```

### ステップ5: `CastViewRow` インターフェース修正
`perRound` を `CastAssignment[][]` に変更:

```typescript
interface CastViewRow {
  castName: string;
  perRound: CastAssignment[][]; // 変更: 1ローテに複数ユーザー対応
}
```

### ステップ6: `castViewRows` 構築ロジック修正
各ローテーションで複数ユーザーを保持できるように修正:

```typescript
const castViewRows: CastViewRow[] = useMemo(() => {
  const allCasts = repository.getAllCasts().filter((c) => c.is_present);
  const basePerRound = Array.from({ length: rotationCount }, () => [] as CastAssignment[]);
  const map = new Map<string, CastViewRow>();

  for (const cast of allCasts) {
    map.set(cast.name, { castName: cast.name, perRound: basePerRound.map(() => []) });
  }

  if (tableSlots != null && tableSlots.length > 0) {
    for (const slot of tableSlots) {
      if (!slot.user) continue;
      
      for (let r = 0; r < rotationCount; r++) {
        const startIdx = r * castsPerRotation;
        const endIdx = startIdx + castsPerRotation;
        const castsInRound = slot.matches.slice(startIdx, endIdx);
        
        for (const m of castsInRound) {
          if (!m) continue;
          const row = map.get(m.cast.name);
          if (row) {
            row.perRound[r].push({
              userName: slot.user.name,
              x_id: slot.user.x_id,
              rank: m.rank,
            });
          }
        }
      }
    }
  } else {
    for (const user of winners) {
      const history = matchingResult.get(user.x_id) ?? [];
      for (let r = 0; r < rotationCount; r++) {
        const slot = history[r];
        if (!slot) continue;
        const row = map.get(slot.cast.name);
        if (row) {
          row.perRound[r].push({
            userName: user.name,
            x_id: user.x_id,
            rank: slot.rank,
          });
        }
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => a.castName.localeCompare(b.castName, 'ja'));
}, [repository, winners, matchingResult, tableSlots, rotationCount, castsPerRotation]);
```

### ステップ7: キャスト別ビューの表示ロジック修正
複数ユーザーを表示:

```typescript
renderCell: (row: CastViewRow) => {
  const assignments = row.perRound[roundIdx];
  return (
    <td className="table-cell-padding">
      {assignments.length > 0 ? (
        <div className="stack-vertical-4">
          {assignments.map((assignment, i) => (
            <div key={i}>
              <div className="text-body-sm">{assignment.userName}</div>
              <XLinkInline
                xId={assignment.x_id}
                isCaution={isCautionUser(
                  { name: assignment.userName, x_id: assignment.x_id } as UserBean,
                  matchingSettings.caution.cautionUsers
                )}
              />
              <div>{renderRankBadge(assignment.rank)}</div>
            </div>
          ))}
        </div>
      ) : (
        <span className="text-unassigned">未配置</span>
      )}
    </td>
  );
},
```

### ステップ8: TSVエクスポート修正
`buildExportValues` と `useEffect` のバックアップ処理で、M003の場合に `tableIndex` を正しく出力し、`castsPerRotation > 1` のときに全キャストを出力:

```typescript
// tableSlots使用時
for (const slot of tableSlots) {
  const row: (string | number)[] = [
    slot.tableIndex ?? '?', // 修正: i + 1 → slot.tableIndex
    slot.user?.name ?? '空',
    slot.user?.x_id ?? ''
  ];
  for (let r = 0; r < rotationCount; r++) {
    const startIdx = r * castsPerRotation;
    const endIdx = startIdx + castsPerRotation;
    const castsInRound = slot.matches.slice(startIdx, endIdx);
    
    // 複数キャストを連結して出力
    const castNames = castsInRound.map(m => m?.cast.name ?? '').join(', ');
    const ranks = castsInRound.map(m => 
      m && m.rank >= 1 ? `第${m.rank}希望` : m ? '希望外' : ''
    ).join(', ');
    
    row.push(castNames, ranks);
  }
  values.push(row);
}
```

### ステップ9: CSS追加 (オプション)
テーブル間の区切り線を追加するためのCSS:

```css
.matching-table-separator {
  border-top: 2px solid var(--discord-border-color);
}
```

## 完了条件
- [x] `matchingRows` でテーブルごとにグルーピング
- [x] テーブル番号が各テーブルの最初の行にのみ表示
- [x] `castsPerRotation > 1` のとき、各ローテーション列で全キャストが表示
- [x] キャスト別ビューで1ローテに複数ユーザーが表示
- [x] TSVエクスポートで正しいテーブル番号と全キャストが出力
