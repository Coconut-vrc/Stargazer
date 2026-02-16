# Stargazer - Technical Specification

**Version:** 2.3  
**Last Updated:** 2026-02-17  
**Project Type:** Desktop Application (Tauri 2 + React + TypeScript)

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Data Models](#data-models)
4. [Matching System](#matching-system)
5. [Matching Algorithms](#matching-algorithms)
6. [NG (Not Good) User Management](#ng-not-good-user-management)
7. [Lottery System](#lottery-system)
8. [Data Persistence](#data-persistence)
9. [UI/UX Specifications](#uiux-specifications)
10. [Export Functionality](#export-functionality)

---

## 1. Overview

### 1.1 Purpose

Stargazer is a **fully offline desktop application** for managing lottery draws and cast-user matching for entertainment events (e.g., VRChat events, fan meetings). It operates entirely locally without external APIs or authentication.

### 1.2 Key Features

- **Lottery System**: Random selection of winners from applicants with guaranteed winner support
- **Matching System**: Four distinct matching algorithms (M000-M003) for pairing winners with casts
- **NG User Management**: Prevent or warn about incompatible cast-user pairings
- **Data Import/Export**: TSV/CSV import for applicants, TSV export for results
- **Fully Offline**: All data stored locally in `%LOCALAPPDATA%\CosmoArtsStore\Stargazer`

### 1.3 Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Tauri 2 (Rust)
- **Styling**: Vanilla CSS (Discord-inspired dark theme)
- **Data Storage**: JSON files (local filesystem)

---

## 2. System Architecture

### 2.1 Project Structure

```
Stargazer/
├── desktop/
│   ├── src/                    # React frontend
│   │   ├── features/
│   │   │   ├── matching/       # Matching system
│   │   │   │   ├── logics/     # Matching algorithms
│   │   │   │   ├── types/      # Type definitions
│   │   │   │   └── stores/     # State management
│   │   │   ├── lottery/        # Lottery system
│   │   │   ├── import/         # Data import
│   │   │   ├── cast/           # Cast management
│   │   │   └── ng-user/        # NG user management
│   │   ├── common/             # Shared utilities
│   │   ├── components/         # Reusable UI components
│   │   └── layout/             # App layout
│   └── src-tauri/              # Rust backend
└── docs/                       # Documentation
```

### 2.2 Data Flow

```
User Input (TSV/CSV)
    ↓
Import Parser → Validation
    ↓
In-Memory Repository (React State)
    ↓
Lottery Algorithm → Winners
    ↓
Matching Algorithm → Cast Assignments
    ↓
Export (TSV) / Display (UI)
    ↓
Local Storage (JSON) ← Tauri Backend
```

### 2.3 State Management

- **AppContext**: Global state using React Context API
  - `repository`: In-memory data store for applicants, casts, NG users
  - `currentWinners`: Selected lottery winners
  - `matchingResult`: Cast-user matching results
  - `matchingSettings`: Matching configuration

---

## 3. Data Models

### 3.1 UserBean (Applicant/Winner)

```typescript
interface UserBean {
  name: string;              // User's display name
  x_id: string;              // X (Twitter) ID (with or without @)
  casts?: string[];          // Ordered list of preferred casts (1st, 2nd, 3rd, ...)
  isGuaranteed?: boolean;    // Guaranteed winner flag
}
```

### 3.2 CastBean

```typescript
interface CastBean {
  name: string;              // Cast's name
  is_present: boolean;       // Attendance status (true = available)
  contact_urls?: string[];   // Contact URLs (X profile, etc.)
  ng_users?: string[];       // Legacy NG user list (deprecated)
  ng_entries?: NGUserEntry[]; // NG user entries (username + accountId)
}
```

### 3.3 NGUserEntry

```typescript
interface NGUserEntry {
  username?: string;         // Display name
  accountId?: string;        // X account ID (without @)
}
```

### 3.4 MatchedCast

```typescript
interface MatchedCast {
  cast: CastBean;            // Assigned cast
  rank: number;              // Preference rank (1 = 1st choice, 0 = not in preferences)
  isNGWarning?: boolean;     // NG warning flag (warn mode only)
  ngReason?: string;         // NG reason message
}
```

### 3.5 TableSlot (M001/M002/M003)

```typescript
interface TableSlot {
  user: UserBean | null;     // User at this slot (null = vacant)
  matches: MatchedCast[];    // Cast assignments per rotation
  tableIndex?: number;       // Table number (M003 only)
}
```

### 3.6 MatchingResult

```typescript
interface MatchingResult {
  userMap: Map<string, MatchedCast[]>;  // User ID → Cast assignments
  tableSlots?: TableSlot[];             // Table-based layout (M001/M002/M003)
}
```

---

## 4. Matching System

### 4.1 Matching Type Codes

| Code | Name | Description |
|------|------|-------------|
| **M000** | No Matching | Winners only, no cast assignment |
| **M001** | Random Matching | Random assignment with weighted preferences |
| **M002** | Rotation Matching | Circular rotation of casts across tables |
| **M003** | Multiple Matching | Multiple users per table, multiple casts per rotation |

### 4.2 Matching Parameters

```typescript
interface MatchingRunOptions {
  rotationCount: number;        // Number of rotations (rounds)
  totalTables?: number;         // Total tables (M001/M002)
  usersPerTable?: number;       // Users per table (M003)
  castsPerRotation?: number;    // Casts per rotation (M003)
}
```

### 4.3 NG Judgment Types

```typescript
type NGJudgmentType = 'either' | 'both';
```

- **`either`**: NG if username OR accountId matches
- **`both`**: NG only if both username AND accountId match

### 4.4 NG Matching Behaviors

```typescript
type NGMatchingBehavior = 'exclude' | 'warn';
```

- **`exclude`**: Automatically exclude NG pairings from matching
- **`warn`**: Allow NG pairings but highlight with warning

---

## 5. Matching Algorithms

### 5.1 M000: No Matching

**Purpose**: Display lottery winners without cast assignment.

**Logic**:
- Returns empty `userMap`
- No cast assignments

**Use Case**: Events where winners are selected but cast assignment is manual.

---

### 5.2 M001: Random Matching

**Purpose**: Random cast assignment with preference weighting.

**Parameters**:
- `rotationCount`: Number of rotations
- `totalTables`: Total table count (includes vacant tables)

**Algorithm**:

1. **Initialization**
   - Calculate vacant table count: `vacantCount = totalTables - winners.length`
   - Shuffle active casts randomly

2. **Per-Rotation Processing**
   ```
   For each rotation r:
     1. Shuffle casts randomly
     2. Consume vacantCount casts (simulate vacant tables)
     3. Shuffle winners randomly
     4. Separate winners into:
        - needsPreferred: No 1st-3rd choice in history
        - others: Already have 1st-3rd choice
     5. Process needsPreferred first, then others
   ```

3. **Per-User Assignment**
   ```
   For each user:
     1. Find available 1st-3rd choice casts (not in history, not NG)
     2. If found:
        - Weight by rank: 1st=100, 2nd=70, 3rd=40
        - Select using weighted random
     3. Else:
        - Select from remaining casts (not in history, not NG)
        - Rank = preference rank or 0 (not in preferences)
     4. Remove selected cast from available pool
   ```

4. **Output**
   - `userMap`: User ID → Cast assignments
   - `tableSlots`: Winners + vacant slots

**Preference Weighting**:
```typescript
const RANK_WEIGHTS = { 1: 100, 2: 70, 3: 40 };
const DEFAULT_WEIGHT = 10;
```

**NG Handling**:
- **Exclude mode**: Skip NG casts during selection
- **Warn mode**: Allow NG casts, flag after matching

---

### 5.3 M002: Rotation Matching

**Purpose**: Circular rotation of casts across tables.

**Parameters**:
- `rotationCount`: Number of rotations
- `totalTables`: Total table count (includes vacant tables)

**Algorithm**:

1. **Initialization**
   - Shuffle active casts randomly
   - Select first `totalTables` casts as base rotation: `baseCasts`

2. **Optimal Offset Selection**
   ```
   For each possible offset (0 to baseCasts.length - 1):
     1. Calculate total preference score for all users
     2. For each user at slot i:
        For each rotation r:
          castIndex = (offset + i - r) % baseCasts.length
          cast = baseCasts[castIndex]
          score += RANK_WEIGHTS[preferenceRank] ?? DEFAULT_WEIGHT
     3. If any NG violation (exclude mode), skip this offset
     4. Store offset with total score as weight
   ```

3. **Weighted Random Offset Selection**
   - Select offset using weighted random based on preference scores

4. **Cast Assignment**
   ```
   For each slot i (0 to totalTables - 1):
     user = winners[i] if i < winners.length else null
     For each rotation r:
       castIndex = (chosenOffset + i - r) % baseCasts.length
       cast = baseCasts[castIndex]
       rank = preferenceRank(user, cast) or 0
       Assign cast to user
   ```

5. **Output**
   - `userMap`: User ID → Cast assignments
   - `tableSlots`: All slots (winners + vacant)

**Rotation Formula**:
```
castIndex(slot, rotation, offset) = (offset + slot - rotation) mod baseCasts.length
```

**Example** (3 tables, 3 casts, 3 rotations, offset=0):
```
        Rotation 1  Rotation 2  Rotation 3
Table 1    Cast A      Cast C      Cast B
Table 2    Cast B      Cast A      Cast C
Table 3    Cast C      Cast B      Cast A
```

---

### 5.4 M003: Multiple Matching

**Purpose**: Multiple users per table, multiple casts per rotation, with unit-based rotation.

**Parameters**:
- `usersPerTable`: Number of users per table (e.g., 2)
- `castsPerRotation`: Number of casts per rotation (e.g., 2)
- `rotationCount`: Number of rotations

**Constraints**:
- `winners.length % usersPerTable == 0` (must divide evenly)
- `activeCasts.length % castsPerRotation == 0` (must divide evenly)
- `unitCount >= tableCount` (prevent duplicate cast assignments in same rotation)

**Algorithm**:

1. **Validation**
   ```
   tableCount = winners.length / usersPerTable
   unitCount = activeCasts.length / castsPerRotation
   
   if unitCount < tableCount:
     ERROR: Not enough units to avoid duplicates
   ```

2. **Table and Unit Formation**
   ```
   1. Shuffle winners randomly
   2. Split into tables:
      tables[t] = winners[t * usersPerTable : (t+1) * usersPerTable]
   
   3. Shuffle casts randomly
   4. Split into units (fixed cast groups):
      units[u] = casts[u * castsPerRotation : (u+1) * castsPerRotation]
   ```

3. **Per-Rotation Unit Assignment**
   ```
   For each rotation r:
     1. Calculate preference score for each table-unit pair:
        For each table t:
          For each unit u (not yet used in this rotation):
            score = 0
            For each user in table[t]:
              For each cast in unit[u]:
                rank = preferenceRank(user, cast)
                score += RANK_WEIGHTS[rank] ?? DEFAULT_WEIGHT
            
            If any NG violation (exclude mode):
              score = 0 (exclude this unit)
            
            Store (table, unit, score)
     
     2. Weighted random assignment:
        While unassigned tables exist:
          Select (table, unit) pair using weighted random
          Assign unit to table for this rotation
          Mark unit as used for this rotation
   ```

4. **Cast Assignment to Users**
   ```
   For each table t:
     For each rotation r:
       unit = assignedUnits[t][r]
       For each user in table[t]:
         For each cast in unit:
           rank = preferenceRank(user, cast) or 0
           Assign cast to user
   ```

5. **Output**
   - `userMap`: User ID → Cast assignments (flattened)
   - `tableSlots`: Each slot contains user + all cast assignments
     - `tableIndex`: Table number (1-indexed)

**Example** (2 users/table, 2 casts/rotation, 3 rotations):

```
Table 1: [User1, User2]
  Rotation 1: [CastA, CastB]
  Rotation 2: [CastE, CastF]
  Rotation 3: [CastC, CastD]

Table 2: [User3, User4]
  Rotation 1: [CastC, CastD]
  Rotation 2: [CastA, CastB]
  Rotation 3: [CastE, CastF]
```

**Display Layout** (Improved):
- Each table is displayed as a single row
- Users within the table are stacked vertically
- Casts for each user are displayed horizontally

```
Table 1
  User1 @x1  | CastA CastB | CastE CastF | CastC CastD |
  User2 @x2  | CastA CastB | CastE CastF | CastC CastD |
─────────────────────────────────────────────────────────
Table 2
  User3 @x3  | CastC CastD | CastA CastB | CastE CastF |
  User4 @x4  | CastC CastD | CastA CastB | CastE CastF |
```

---

## 6. NG (Not Good) User Management

### 6.1 Purpose

Prevent or warn about incompatible cast-user pairings based on:
- User's display name
- User's X (Twitter) account ID

### 6.2 NG Entry Structure

```typescript
interface NGUserEntry {
  username?: string;    // Display name (case-insensitive partial match)
  accountId?: string;   // X account ID (exact match, @ is normalized)
}
```

### 6.3 NG Judgment Logic

```typescript
function isUserNGForCast(
  user: UserBean,
  cast: CastBean,
  ngJudgmentType: NGJudgmentType
): boolean {
  if (!cast.ng_entries || cast.ng_entries.length === 0) return false;
  
  for (const entry of cast.ng_entries) {
    const usernameMatch = entry.username && 
      user.name.toLowerCase().includes(entry.username.toLowerCase());
    
    const accountIdMatch = entry.accountId && 
      normalizeAccountId(user.x_id) === normalizeAccountId(entry.accountId);
    
    if (ngJudgmentType === 'either') {
      if (usernameMatch || accountIdMatch) return true;
    } else { // 'both'
      if (usernameMatch && accountIdMatch) return true;
    }
  }
  
  return false;
}

function normalizeAccountId(id: string): string {
  return id.replace(/^@/, '').toLowerCase();
}
```

### 6.4 NG Matching Behaviors

#### Exclude Mode (`ngMatchingBehavior = 'exclude'`)
- NG pairings are **automatically excluded** during matching
- Algorithm skips NG casts when assigning to users
- No NG pairings in final result

#### Warn Mode (`ngMatchingBehavior = 'warn'`)
- NG pairings are **allowed** but flagged
- After matching, `isNGWarning` flag is set on `MatchedCast`
- UI displays warning icon (⚠) with reason

### 6.5 NG Reason Messages

```typescript
function getNGReasonForCast(castName: string): string {
  return `${castName} is marked as NG for this user`;
}
```

---

## 7. Lottery System

### 7.1 Purpose

Randomly select winners from applicants with support for guaranteed winners.

### 7.2 Lottery Algorithm

```typescript
function runLottery(
  applicants: UserBean[],
  winnerCount: number
): UserBean[] {
  const guaranteed = applicants.filter(u => u.isGuaranteed);
  const regular = applicants.filter(u => !u.isGuaranteed);
  
  if (guaranteed.length >= winnerCount) {
    // Shuffle and take first winnerCount
    return shuffle(guaranteed).slice(0, winnerCount);
  }
  
  const remainingSlots = winnerCount - guaranteed.length;
  const selectedRegular = shuffle(regular).slice(0, remainingSlots);
  
  return [...guaranteed, ...selectedRegular];
}
```

### 7.3 Guaranteed Winners

- Users marked with `isGuaranteed = true` are always selected
- If guaranteed count exceeds `winnerCount`, guaranteed users are shuffled and truncated
- Guaranteed winners are selected first, then regular applicants fill remaining slots

---

## 8. Data Persistence

### 8.1 Storage Location

```
%LOCALAPPDATA%\CosmoArtsStore\Stargazer\
├── cast/
│   └── cast.json          # Cast data
├── template/
│   └── *.json             # Import templates (column mappings)
└── ng_user/
    └── ng_users.json      # NG user data (deprecated)
```

### 8.2 Cast Data Format (`cast.json`)

```json
{
  "casts": [
    {
      "name": "Cast A",
      "is_attend": true,
      "urls": ["https://x.com/cast_a"],
      "ng_entries": [
        {
          "username": "BadUser",
          "accountId": "12345"
        }
      ]
    }
  ]
}
```

**Legacy Format Support**:
- `is_present` → `is_attend`
- `ng_username` / `ng_userid` arrays → `ng_entries`

### 8.3 Import Templates

Column mappings are saved per TSV header to auto-restore on re-import.

```json
{
  "header": "Name\tX ID\tCast1\tCast2\tCast3",
  "mapping": {
    "nameColumn": 0,
    "xIdColumn": 1,
    "castColumns": [2, 3, 4]
  }
}
```

### 8.4 First-Time Setup

On first launch, if `%LOCALAPPDATA%\CosmoArtsStore\Stargazer` does not exist:

1. Display modal:
   ```
   初回起動
   
   データ保存のため
   %localAppData%\CosmoArtsStore\Stargazer
   を作成します。よろしいですか？
   
   ※同意すると以降は必要ファイルが欠損していた場合自動で生成されます。
   ```

2. On confirmation:
   - Create directory structure
   - Initialize empty `cast.json`

3. On subsequent launches:
   - Auto-create missing files/directories

---

## 9. UI/UX Specifications

### 9.1 Theme

- **Discord-inspired dark theme**
- Color scheme:
  - Background: `#2b2d31`
  - Surface: `#383a40`
  - Primary: `#5865f2`
  - Text: `#dbdee1`
  - Muted: `#949ba4`

### 9.2 Navigation

- **Sidebar navigation** (desktop) / **Hamburger menu** (mobile)
- Pages:
  - データ管理 (Data Management)
  - キャスト・NG管理 (Cast & NG Management)
  - ガイド (Guide)

### 9.3 Matching Display

#### M000: Winner List
- Simple table: Name, X ID

#### M001/M002: Table-Based View
- Table number (grouped rows)
- User name, X ID
- Cast assignments per rotation
- NG warning icon (⚠) if applicable

#### M003: Grouped Table View
- **One row per table**
- Users stacked vertically within table
- Casts displayed horizontally per user
- Table number displayed once per table

### 9.4 Cast View (M003)

Alternative view showing cast assignments per rotation:

```
Cast A
  Rotation 1: User1 @x1, User2 @x2
  Rotation 2: User3 @x3, User4 @x4
  ...
```

---

## 10. Export Functionality

### 10.1 TSV Export Format

#### Table-Based Export (M001/M002/M003)

```tsv
テーブル番号	当選者	X ID	1ローテ目 キャスト	1ローテ目 希望順位	2ローテ目 キャスト	2ローテ目 希望順位	...
1	User1	@user1	Cast A	第1希望	Cast C	希望外	...
1	User2	@user2	Cast A	第2希望	Cast C	第1希望	...
2	User3	@user3	Cast B	第1希望	Cast A	第3希望	...
```

**M003 with Multiple Casts**:
- Multiple casts per rotation are joined with `, `
- Example: `Cast A, Cast B` for `castsPerRotation = 2`

#### Cast-Based Export (M003)

```tsv
キャスト名	1ローテ目 ユーザー	1ローテ目 X ID	1ローテ目 希望順位	2ローテ目 ユーザー	...
Cast A	User1, User2	@user1, @user2	第1希望, 第2希望	User3, User4	...
```

### 10.2 Backup Export

On matching execution, a backup TSV is automatically saved to:
```
%LOCALAPPDATA%\CosmoArtsStore\Stargazer\matching_YYYYMMDD_HHMMSS.tsv
```

---

## 11. Implementation Notes

### 11.1 Weighted Random Selection

```typescript
function weightedRandomIndex(items: { weight: number }[]): number {
  const total = items.reduce((sum, it) => sum + it.weight, 0);
  if (total <= 0) return Math.floor(Math.random() * items.length);
  
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= items[i].weight;
    if (r <= 0) return i;
  }
  return items.length - 1;
}
```

### 11.2 Preference Rank Calculation

```typescript
function getPreferenceRank(user: UserBean, castName: string): number {
  if (!user.casts || user.casts.length === 0) return 0;
  const idx = user.casts.indexOf(castName);
  return idx >= 0 ? idx + 1 : 0; // 1-indexed, 0 = not in preferences
}
```

### 11.3 Shuffle Utility

```typescript
function shuffle<T>(array: T[]): T[] {
  return [...array].sort(() => Math.random() - 0.5);
}
```

---

## 12. Error Handling

### 12.1 Validation Errors

- **M003 User Count Mismatch**: `winners.length % usersPerTable !== 0`
  - Error: "ユーザー数不整合: {count} は {usersPerTable} で割り切れません"
  - Return empty result

- **M003 Cast Count Mismatch**: `activeCasts.length % castsPerRotation !== 0`
  - Error: "キャスト数不整合: {count} は {castsPerRotation} で割り切れません"
  - Return empty result

- **M003 Unit Shortage**: `unitCount < tableCount`
  - Error: "ユニット数不足: {unitCount}ユニット < {tableCount}テーブル"
  - Return empty result

### 12.2 Import Errors

- **Invalid TSV Format**: Display error modal with details
- **Missing Required Columns**: Prompt user to map columns
- **Duplicate Headers**: Auto-restore previous mapping if available

---

## 13. Future Enhancements

### 13.1 Planned Features

- [ ] Multi-language support (English, Japanese)
- [ ] Advanced NG rules (time-based, conditional)
- [ ] Matching history tracking
- [ ] Statistical analysis of matching results
- [ ] Custom preference weighting

### 13.2 Known Limitations

- **M003**: Requires exact divisibility of users and casts
- **M002**: Limited to single cast per rotation
- **NG Matching**: Partial name matching may cause false positives

---

## 14. Glossary

| Term | Definition |
|------|------------|
| **Cast** | Performer or character available for matching |
| **Winner** | User selected in lottery |
| **Rotation** | Round of cast assignments (e.g., 3 rotations = 3 rounds) |
| **Table** | Physical or virtual seating arrangement |
| **Unit** | Fixed group of casts (M003 only) |
| **NG User** | User incompatible with specific cast |
| **Preference Rank** | User's preference order for casts (1st, 2nd, 3rd, ...) |
| **Weighted Random** | Random selection with probability based on weights |

---

## 15. References

- **Tauri Documentation**: https://tauri.app/
- **React Documentation**: https://react.dev/
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/

---

**End of Technical Specification**
