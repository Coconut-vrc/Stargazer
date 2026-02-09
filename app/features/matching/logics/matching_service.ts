// features/matching/logics/matching_service.ts

import { UserBean, CastBean } from "../../../stores/AppContext";

export class MatchingService {
  /**
   * マッチング実行 (2ラウンド制)
   * 希望1 → 希望2 → 希望3 の順で重みをつけて優先マッチングを行う
   * @param winners 当選者リスト
   * @param allCasts 全キャストリスト
   */
  static runMatching(winners: UserBean[], allCasts: CastBean[]): Map<string, CastBean[]> {
    const result = new Map<string, CastBean[]>();

    // 出勤しているキャストのみ対象 [cite: 350]
    const activeCasts = allCasts.filter(c => c.is_present);

    // 各ユーザーの履歴結果を初期化 [cite: 350]
    winners.forEach(w => result.set(w.x_id, []));

    // ラウンド1〜2の2回実行 [cite: 351]
    for (let round = 0; round < 2; round++) {
      // このラウンドでまだどこにも配置されていないキャストのプール [cite: 351]
      let availableInThisRound = [...activeCasts];

      // 特定のユーザーが常に優先されないよう、ラウンドごとにユーザーをシャッフル [cite: 352]
      const shuffledWinners = [...winners].sort(() => Math.random() - 0.5);

      for (const user of shuffledWinners) {
        const history = result.get(user.x_id) || [];
        let selectedCast: CastBean | undefined = undefined;

        // --- 1. 第一〜第三優先：希望キャストの中から順に探す --- 
        // user.casts は [希望1, 希望2, 希望3] の順で格納されている前提
        if (user.casts && user.casts.length > 0) {
          for (const wantedCastName of user.casts) {
            selectedCast = availableInThisRound.find(cast => 
              cast.name === wantedCastName && // 名前が一致
              !history.some(prev => prev.name === cast.name) && // 過去ラウンドで会っていない
              !cast.ng_users?.includes(user.x_id) && // NGチェック(ID)
              !cast.ng_users?.includes(user.name)    // NGチェック(名前)
            );
            if (selectedCast) break; // 見つかったら次の希望は見ない
          }
        }

        // --- 2. 第二優先：希望外だが手が空いているキャストから探す --- [cite: 355]
        if (!selectedCast) {
          selectedCast = availableInThisRound.find(cast => 
            !history.some(prev => prev.name === cast.name) && 
            !cast.ng_users?.includes(user.x_id) && 
            !cast.ng_users?.includes(user.name)
          );
        }

        if (selectedCast) {
          // 履歴に追加 [cite: 356]
          history.push(selectedCast);
          result.set(user.x_id, history);
          
          // このラウンドのプールから除外（同じラウンド内の重複を防止） [cite: 356]
          availableInThisRound = availableInThisRound.filter(c => c.name !== selectedCast!.name);
        }
      }
    }

    return result;
  }
}