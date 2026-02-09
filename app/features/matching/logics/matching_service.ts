import { UserBean, CastBean } from "../../../stores/AppContext";

export class MatchingService {
  /**
   * マッチング実行 (2ラウンド制)
   * @param winners 当遷者リスト
   * @param allCasts 全キャストリスト
   */
  static runMatching(winners: UserBean[], allCasts: CastBean[]): Map<string, CastBean[]> {
    const result = new Map<string, CastBean[]>();
    // 出勤しているキャストのみ対象
    const activeCasts = allCasts.filter(c => c.is_present);

    // 各ユーザーの履歴結果を初期化
    winners.forEach(w => result.set(w.x_id, []));

    // ラウンド1〜2の2回実行
    for (let round = 0; round < 2; round++) {
      // このラウンドでまだどこにも配置されていないキャストのプール
      let availableInThisRound = [...activeCasts];

      // 特定のユーザーが常に優先されないよう、ラウンドごとにユーザーをシャッフル
      const shuffledWinners = [...winners].sort(() => Math.random() - 0.5);

      for (const user of shuffledWinners) {
        const history = result.get(user.x_id) || [];

        // --- 1. 第一優先：希望キャストの中から探す ---
        let selectedCast = availableInThisRound.find(cast => 
          user.casts?.includes(cast.name) && // ユーザーの希望に含まれているか
          !history.some(prev => prev.name === cast.name) && // 過去のラウンドで会っていないか
          !cast.ng_users?.includes(user.x_id) && // キャスト側のNGにIDが入っていないか
          !cast.ng_users?.includes(user.name)    // キャスト側のNGに名前が入っていないか
        );

        // --- 2. 第二優先：希望外だが手が空いているキャストから探す ---
        if (!selectedCast) {
          selectedCast = availableInThisRound.find(cast => 
            !history.some(prev => prev.name === cast.name) && 
            !cast.ng_users?.includes(user.x_id) && 
            !cast.ng_users?.includes(user.name)
          );
        }

        if (selectedCast) {
          // 履歴に追加
          history.push(selectedCast);
          result.set(user.x_id, history);
          
          // このラウンドのプールから除外（同じラウンド内の重複を防止）
          availableInThisRound = availableInThisRound.filter(c => c.name !== selectedCast!.name);
        }
      }
    }

    return result;
  }
}