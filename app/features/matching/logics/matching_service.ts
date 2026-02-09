// features/matching/logics/matching_service.ts

import { UserBean, CastBean } from "../../../stores/AppContext";

/**
 * マッチング結果の1枠分を表すインターフェース
 */
export interface MatchedCast {
  cast: CastBean;
  rank: number; // 1:第1希望, 2:第2希望, 3:第3希望, 0:希望外
}

export class MatchingService {
  /**
   * マッチング実行 (2ラウンド制)
   * 希望1 → 希望2 → 希望3 の順で重みをつけて優先マッチングを行う
   * @param winners 当選者リスト
   * @param allCasts 全キャストリスト
   */
  static runMatching(winners: UserBean[], allCasts: CastBean[]): Map<string, MatchedCast[]> {
    const result = new Map<string, MatchedCast[]>();

    // 出勤しているキャストのみ対象
    const activeCasts = allCasts.filter(c => c.is_present);

    // 各ユーザーの結果リストを初期化
    winners.forEach(w => result.set(w.x_id, []));

    // ラウンド1〜2の2回実行
    for (let round = 0; round < 2; round++) {
      // このラウンドでまだどこにも配置されていないキャストのプール
      let availableInThisRound = [...activeCasts];

      // 特定のユーザーが常に優先されないよう、ラウンドごとにユーザーをシャッフル
      const shuffledWinners = [...winners].sort(() => Math.random() - 0.5);

      for (const user of shuffledWinners) {
        const history = result.get(user.x_id) || [];
        let selectedCast: CastBean | undefined = undefined;
        let matchedRank = 0; // デフォルトは希望外(0)

        // --- 1. 第一〜第三優先：希望キャストの中から順に探す ---
        if (user.casts && user.casts.length > 0) {
          for (let i = 0; i < user.casts.length; i++) {
            const wantedCastName = user.casts[i];
            const found = availableInThisRound.find(cast => 
              cast.name === wantedCastName && 
              !history.some(prev => prev.cast.name === cast.name) && // 過去ラウンドと重複不可
              !cast.ng_users?.includes(user.x_id) && 
              !cast.ng_users?.includes(user.name)
            );
            
            if (found) {
              selectedCast = found;
              matchedRank = i + 1; // 配列の添字+1をランクとする
              break; 
            }
          }
        }

        // --- 2. 希望外：手が空いているキャストから探す ---
        if (!selectedCast) {
          selectedCast = availableInThisRound.find(cast => 
            !history.some(prev => prev.cast.name === cast.name) && 
            !cast.ng_users?.includes(user.x_id) && 
            !cast.ng_users?.includes(user.name)
          );
          matchedRank = 0; // 希望外
        }

        if (selectedCast) {
          // 履歴にキャストとランクのペアを追加
          history.push({ cast: selectedCast, rank: matchedRank });
          result.set(user.x_id, history);
          
          // このラウンドのプールから除外
          availableInThisRound = availableInThisRound.filter(c => c.name !== selectedCast!.name);
        }
      }
    }

    return result;
  }
}