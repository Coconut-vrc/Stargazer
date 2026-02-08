// features/matching/logics/matching_service.ts
import { UserBean, CastBean, Repository } from '../../../stores/AppContext';

interface MatchingResult {
  pair_no: string;
  user_a: UserBean;
  user_b: UserBean;
  t1: string;
  t2: string;
  t3: string;
  t1_info: string;
  t2_info: string;
  t3_info: string;
}

export class MatchingService {
  private winners: UserBean[];
  private repository: Repository;

  constructor(winners: UserBean[], repository: Repository) {
    this.winners = winners;
    this.repository = repository;
  }

  runMatching(): MatchingResult[] {
    if (!this.winners.length) return [];

    const activeCasts = this.repository.getAllCasts()
      .filter(c => c.is_present)
      .map(c => c.name);

    if (!activeCasts.length) {
      console.error('[ERROR] 出席中のキャストがいません。');
      return [];
    }

    // 当選者をシャッフル
    const pool = [...this.winners].sort(() => Math.random() - 0.5);
    
    // 1当選者につき1つのマッチング枠を作成
    const tableAssignments: UserBean[] = pool;

    return this.generateSchedule(tableAssignments, activeCasts);
  }

  private generateSchedule(assignments: UserBean[], activeCasts: string[]): MatchingResult[] {
    const results: MatchingResult[] = [];
    const usedByTurn: Set<string>[] = [new Set(), new Set(), new Set()];

    // 友人用の空席オブジェクトを事前に作成
    const emptyUser: UserBean = {
      timestamp: '',
      name: '（友人/空席）',
      x_id: '',
      first_flag: '',
      casts: [],
      note: '',
      is_pair_ticket: false,
      raw_extra: []
    };

    assignments.forEach((u_a, index) => {
      const slots: string[] = ['', '', ''];
      const assignedThisTable = new Set<string>();
      
      // ターンの割り当て順をランダム化
      const turnOrder = [0, 1, 2].sort(() => Math.random() - 0.5);

      const hopesA = u_a.casts.filter(c => c && c.trim()).map(c => c.trim());
      
      // 希望キャストの割り当て
      for (const tIdx of turnOrder) {
        const available = hopesA.filter(c => 
          activeCasts.includes(c) && 
          !usedByTurn[tIdx].has(c) && 
          !assignedThisTable.has(c)
        );

        if (available.length) {
          const pick = available[Math.floor(Math.random() * available.length)];
          slots[tIdx] = pick;
          usedByTurn[tIdx].add(pick);
          assignedThisTable.add(pick);
        }
      }

      // 空き枠の埋め合わせ
      for (let tIdx = 0; tIdx < 3; tIdx++) {
        if (slots[tIdx] === '') {
          const freeCasts = activeCasts.filter(c => 
            !assignedThisTable.has(c) && !usedByTurn[tIdx].has(c)
          );
          if (freeCasts.length) {
            const pick = freeCasts[Math.floor(Math.random() * freeCasts.length)];
            slots[tIdx] = pick;
            usedByTurn[tIdx].add(pick);
            assignedThisTable.add(pick);
          } else {
            slots[tIdx] = '（空きなし）';
          }
        }
      }

      // 結果オブジェクトの生成（型安全な代入）
      const result: MatchingResult = {
        pair_no: `テーブル${index + 1}`,
        user_a: u_a,
        user_b: emptyUser,
        t1: slots[0],
        t2: slots[1],
        t3: slots[2],
        t1_info: this.getInfo(u_a, slots[0]),
        t2_info: this.getInfo(u_a, slots[1]),
        t3_info: this.getInfo(u_a, slots[2]),
      };

      results.push(result);
    });

    return results;
  }

  private getInfo(user: UserBean, castName: string): string {
    if (!castName || castName === '（空きなし）') return '';
    const info: string[] = [];
    if (user.casts.map(c => c.trim()).includes(castName)) {
      info.push('本人希望');
    }
    return info.length ? `(${info.join(', ')})` : '';
  }
}