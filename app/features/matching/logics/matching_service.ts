// features/matching/logics/matching_service.ts

import type { UserBean, CastBean, MatchingMode } from "../../../stores/AppContext";

/**
 * マッチング結果の1枠分を表すインターフェース
 */
export interface MatchedCast {
  cast: CastBean;
  rank: number; // 1:第1希望, 2:第2希望, 3:第3希望, 0:希望外
}

/** 1テーブル分のスロット（当選者 or 空テーブル） */
export interface TableSlot {
  user: UserBean | null;
  matches: MatchedCast[];
}

export type MatchingResult = {
  userMap: Map<string, MatchedCast[]>;
  /** 通常営業で総テーブル数指定時のみ。空テーブル含む全スロット */
  tableSlots?: TableSlot[];
};

export class MatchingService {
  /**
   * マッチング実行（ローテーション数可変）
   *
   * - totalTables 指定時（通常営業）：総テーブル数に合わせて空スロットも含めローテ／配置する
   * - ローテーションは「循環方式」：テーブル順にキャストがずれていく
   *
   * @param winners 当選者リスト
   * @param allCasts 全キャストリスト
   * @param mode マッチング方式（循環 or ランダム）
   * @param rotationCount ローテーション数（例: 2 or 3）
   * @param totalTables 通常営業時の総テーブル数（空テーブル含む）。指定時は tableSlots を返す
   */
  static runMatching(
    winners: UserBean[],
    allCasts: CastBean[],
    mode: MatchingMode,
    rotationCount: number = 2,
    totalTables?: number,
  ): MatchingResult {
    const userMap = new Map<string, MatchedCast[]>();
    let tableSlots: TableSlot[] | undefined;

    // 出勤しているキャストのみ対象
    const activeCasts = allCasts.filter((c) => c.is_present);

    if (winners.length === 0 || activeCasts.length === 0) {
      return { userMap };
    }

    // ローテーション数（最低1）
    const ROUNDS = Math.max(1, rotationCount || 1);

    // ローテーションの起点を少しでもランダムにするため、キャスト配列自体をシャッフル
    const shuffledCasts = [...activeCasts].sort(() => Math.random() - 0.5);

    // 希望ランク→スコア
    const rankWeights: Record<number, number> = {
      1: 100, // 第1希望
      2: 70, // 第2希望
      3: 40, // 第3希望
    };
    const defaultWeight = 10; // 希望外（0ランク）の重み

    const isNg = (user: UserBean, cast: CastBean): boolean => {
      return cast.ng_users?.includes(user.x_id) || cast.ng_users?.includes(user.name);
    };

    const getPreferenceRank = (user: UserBean, castName: string): number => {
      if (!user.casts || user.casts.length === 0) return 0;
      const idx = user.casts.indexOf(castName);
      if (idx === -1) return 0;
      // 0,1,2 を 第1〜第3希望としてそれ以降は「希望外」とみなす
      return idx >= 0 && idx <= 2 ? idx + 1 : 0;
    };

    const weightedRandomIndex = (items: { weight: number }[]): number => {
      const total = items.reduce((sum, it) => sum + it.weight, 0);
      if (total <= 0) {
        // すべての weight が 0 以下の場合は均等ランダム
        return Math.floor(Math.random() * items.length);
      }
      let r = Math.random() * total;
      for (let i = 0; i < items.length; i++) {
        r -= items[i].weight;
        if (r <= 0) {
          return i;
        }
      }
      return items.length - 1;
    };

    if (mode === 'rotation') {
      // --- 「行全体が1つずつずれていく」循環ローテーション ---
      //
      // 前提:
      // - winners の行順を「テーブル順」とみなし、ローテーションごとに
      //   キャストの並び全体が1つずつずれていく。
      // - 1ローテーションあたり同一キャストは1人まで（＝最初のローテーション時点で重複しない）。
      //
      // 実装イメージ:
      // - baseCasts: 「第1ローテーション」のキャスト並び（シャッフルしてランダム性を付与）
      // - offset: baseCasts をどこから開始するか（0〜baseCasts.length-1）を総当たりし、
      //           「全ローテーション分の満足度合計」が高い offset ほど選ばれやすくする。
      // - rotation r（0 始まり）のとき 行 i には baseCasts[(offset + i - r + baseCasts.length) % baseCasts.length]

      const userCount = winners.length;
      const castCount = shuffledCasts.length;
      // 通常営業で総テーブル数指定時は全テーブル（空含む）をスロット数に。全キャストでローテする
      const slotCount = totalTables != null && totalTables > 0 ? Math.max(totalTables, userCount) : Math.min(userCount, castCount);
      const baseCasts = totalTables != null && totalTables > 0 ? shuffledCasts : shuffledCasts.slice(0, Math.min(userCount, castCount));
      const scoringRows = Math.min(userCount, baseCasts.length);

      function buildTableSlots(
        baseCasts: CastBean[],
        winners: UserBean[],
        ROUNDS: number,
        chosenOffset: number,
        slotCount: number,
      ): TableSlot[] {
        const slots: TableSlot[] = [];
        for (let row = 0; row < slotCount; row++) {
          const history: MatchedCast[] = [];
          const user = row < winners.length ? winners[row] : null;
          for (let r = 0; r < ROUNDS; r++) {
            const idx = (chosenOffset + row - r + baseCasts.length) % baseCasts.length;
            const cast = baseCasts[idx];
            const prefRank = user ? getPreferenceRank(user, cast.name) : 0;
            const rank = prefRank >= 1 && prefRank <= 3 ? prefRank : 0;
            history.push({ cast, rank });
          }
          slots.push({ user: user ?? null, matches: history });
        }
        return slots;
      }

      type OffsetCandidate = { offset: number; weight: number };
      const offsetCandidates: OffsetCandidate[] = [];

      for (let offset = 0; offset < baseCasts.length; offset++) {
        let totalScore = 0;
        let valid = true;

        for (let row = 0; row < scoringRows; row++) {
          const user = winners[row];

          for (let r = 0; r < ROUNDS; r++) {
            const idx = (offset + row - r + baseCasts.length) % baseCasts.length;
            const cast = baseCasts[idx];

            // いずれかのローテーションで NG があればこの offset は不適
            if (isNg(user, cast)) {
              valid = false;
              break;
            }

            const prefRank = getPreferenceRank(user, cast.name);
            const weight = rankWeights[prefRank] ?? defaultWeight;
            totalScore += weight;
          }

          if (!valid) break;
        }

        if (valid) {
          offsetCandidates.push({ offset, weight: totalScore });
        }
      }

      if (offsetCandidates.length === 0) {
        const chosenOffset = 0;
        for (let row = 0; row < scoringRows; row++) {
          const user = winners[row];
          const history: MatchedCast[] = [];
          for (let r = 0; r < ROUNDS; r++) {
            const idx = (chosenOffset + row - r + baseCasts.length) % baseCasts.length;
            const cast = baseCasts[idx];
            const prefRank = isNg(user, cast) ? 0 : getPreferenceRank(user, cast.name);
            const rank = prefRank >= 1 && prefRank <= 3 ? prefRank : 0;
            history.push({ cast, rank });
          }
          userMap.set(user.x_id, history);
        }
        if (totalTables != null && totalTables > 0) {
          tableSlots = buildTableSlots(baseCasts, winners, ROUNDS, chosenOffset, slotCount);
        }
        return { userMap, tableSlots };
      }

      const chosenOffset = offsetCandidates[weightedRandomIndex(offsetCandidates)].offset;

      for (let row = 0; row < scoringRows; row++) {
        const user = winners[row];
        const history: MatchedCast[] = [];
        for (let r = 0; r < ROUNDS; r++) {
          const idx = (chosenOffset + row - r + baseCasts.length) % baseCasts.length;
          const cast = baseCasts[idx];
          const prefRank = getPreferenceRank(user, cast.name);
          const rank = prefRank >= 1 && prefRank <= 3 ? prefRank : 0;
          history.push({ cast, rank });
        }
        userMap.set(user.x_id, history);
      }
      if (totalTables != null && totalTables > 0) {
        tableSlots = buildTableSlots(baseCasts, winners, ROUNDS, chosenOffset, slotCount);
      }
      return { userMap, tableSlots };
    }

    // --- ランダムマッチング（希望優先・同一ラウンド重複なし） ---
    //
    // - 各ラウンドごとに「キャスト1人あたり1ユーザー」になるように割り当てる。
    // - Round2 では「まだ第1〜第3希望が当たっていないユーザー」を優先的に処理し、
    //   できる限り全員に最低1枠は第1〜第3希望が当たるようにする。

    const hasPreferredInHistory = (history: MatchedCast[]): boolean =>
      history.some((m) => m.rank >= 1 && m.rank <= 3);

    const resultMap = new Map<string, MatchedCast[]>();
    winners.forEach((w) => resultMap.set(w.x_id, []));

    for (let round = 0; round < ROUNDS; round++) {
      let availableThisRound = [...shuffledCasts];

      // ラウンドごとにユーザー順をシャッフル
      const shuffledWinnersForRound = [...winners].sort(() => Math.random() - 0.5);

      // まだ誰も希望を取れていないユーザーを前に出す
      const needsPreferred: UserBean[] = [];
      const others: UserBean[] = [];

      for (const user of shuffledWinnersForRound) {
        const history = resultMap.get(user.x_id) ?? [];
        if (hasPreferredInHistory(history)) {
          others.push(user);
        } else {
          needsPreferred.push(user);
        }
      }

      const orderedUsers = [...needsPreferred, ...others];

      for (const user of orderedUsers) {
        const history = resultMap.get(user.x_id) ?? [];

        // まず第1〜第3希望の中から、まだこのユーザーが取っていない＆このラウンドで空いているキャストを探す
        type PreferredCandidate = { cast: CastBean; rank: number; weight: number };
        const preferredCandidates: PreferredCandidate[] = [];

        if (user.casts && user.casts.length > 0) {
          for (let i = 0; i < Math.min(3, user.casts.length); i++) {
            const wantedName = user.casts[i];
            // 空文字列はスキップ
            if (!wantedName || wantedName.trim() === '') continue;
            
            const cast = availableThisRound.find(
              (c) =>
                c.name === wantedName &&
                !isNg(user, c) &&
                !history.some((h) => h.cast.name === c.name),
            );
            if (cast) {
              const rank = i + 1;
              const weight = rankWeights[rank] ?? defaultWeight;
              preferredCandidates.push({ cast, rank, weight });
            }
          }
        }

        let selected: { cast: CastBean; rank: number } | null = null;

        if (preferredCandidates.length > 0) {
          // 希望キャストの中から重み付きランダムで1人を選ぶ
          const idx = weightedRandomIndex(preferredCandidates);
          const c = preferredCandidates[idx];
          selected = { cast: c.cast, rank: c.rank };
        } else {
          // 希望がすべて埋まっている / 取れない場合は、NG ではない残りキャストからランダムに 1 人
          const fallbackCandidates = availableThisRound.filter(
            (c) =>
              !isNg(user, c) && !history.some((h) => h.cast.name === c.name),
          );

          if (fallbackCandidates.length > 0) {
            const idx = Math.floor(Math.random() * fallbackCandidates.length);
            const c = fallbackCandidates[idx];
            selected = { cast: c, rank: 0 }; // 希望外
          }
        }

        if (selected) {
          const updatedHistory = [...history, { cast: selected.cast, rank: selected.rank }];
          resultMap.set(user.x_id, updatedHistory);
          // このラウンドのキャスト重複を避けるため、プールから除外
          availableThisRound = availableThisRound.filter((c) => c.name !== selected!.cast.name);
        }
      }
    }

    return { userMap: resultMap };
  }
}