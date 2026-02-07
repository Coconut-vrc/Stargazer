import { UserBean, CastBean, Repository } from '../../../stores/AppContext';

interface MatchingResult {
  pair_no: string;
  user_a: UserBean;
  user_b: UserBean;
  t1: string;
  t1_info: string;
  t2: string;
  t2_info: string;
  t3: string;
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

    const pool = [...this.winners].sort(() => Math.random() - 0.5);
    const pairs: [UserBean, UserBean | null][] = [];

    for (let i = 0; i < pool.length; i += 2) {
      const u_a = pool[i];
      const u_b = i + 1 < pool.length ? pool[i + 1] : null;
      pairs.push([u_a, u_b]);
    }

    return this.generateSchedule(pairs, activeCasts);
  }

  private generateSchedule(pairs: [UserBean, UserBean | null][], activeCasts: string[]): MatchingResult[] {
    const results: MatchingResult[] = [];
    const usedByTurn: Set<string>[] = [new Set(), new Set(), new Set()];

    pairs.forEach(([u_a, u_b], index) => {
      const slots: (string | null)[] = [null, null, null];
      const assignedThisPair = new Set<string>();
      const turnOrder = [0, 1, 2].sort(() => Math.random() - 0.5);

      const getAvailableHopes = (hopes: string[], tIdx: number): string[] => {
        if (!hopes.length) return [];
        return hopes.filter(c => 
          activeCasts.includes(c) && 
          !usedByTurn[tIdx].has(c) && 
          !assignedThisPair.has(c)
        );
      };

      const hopesA = u_a.casts.filter(c => c && c.trim()).map(c => c.trim());
      
      for (const tIdx of turnOrder) {
        const available = getAvailableHopes(hopesA, tIdx);
        if (available.length) {
          const pick = available[Math.floor(Math.random() * available.length)];
          slots[tIdx] = pick;
          usedByTurn[tIdx].add(pick);
          assignedThisPair.add(pick);
          break;
        }
      }

      if (u_b) {
        const hopesB = u_b.casts.filter(c => c && c.trim()).map(c => c.trim());
        const remainingTurns = turnOrder.filter(t => slots[t] === null);
        
        for (const tIdx of remainingTurns) {
          const available = getAvailableHopes(hopesB, tIdx);
          if (available.length) {
            const pick = available[Math.floor(Math.random() * available.length)];
            slots[tIdx] = pick;
            usedByTurn[tIdx].add(pick);
            assignedThisPair.add(pick);
            break;
          }
        }
      }

      for (let tIdx = 0; tIdx < 3; tIdx++) {
        if (slots[tIdx] === null) {
          const freeCasts = activeCasts.filter(c => 
            !assignedThisPair.has(c) && !usedByTurn[tIdx].has(c)
          );
          
          if (freeCasts.length) {
            const pick = freeCasts[Math.floor(Math.random() * freeCasts.length)];
            slots[tIdx] = pick;
            usedByTurn[tIdx].add(pick);
            assignedThisPair.add(pick);
          } else {
            slots[tIdx] = '（空きなし）';
          }
        }
      }

      const emptyUser: UserBean = {
        timestamp: '', name: '---', x_id: '', first_flag: '', 
        casts: [], note: '', is_pair_ticket: false, raw_extra: []
      };

      const result: MatchingResult = {
        pair_no: `ペア${index + 1}`,
        user_a: u_a,
        user_b: u_b || emptyUser,
        t1: slots[0]!,
        t2: slots[1]!,
        t3: slots[2]!,
        t1_info: '',
        t2_info: '',
        t3_info: ''
      };

      ['t1', 't2', 't3'].forEach((tKey, tIdx) => {
        const cast = result[tKey as keyof Omit<MatchingResult, 'pair_no' | 'user_a' | 'user_b' | 't1_info' | 't2_info' | 't3_info'>];
        const info: string[] = [];
        
        if (u_a.casts.includes(cast as string)) info.push('A希望');
        if (u_b && u_b.casts.includes(cast as string)) info.push('B希望');
        
        result[`${tKey}_info` as 't1_info' | 't2_info' | 't3_info'] = 
          info.length ? `(${info.join(', ')})` : '';
      });

      results.push(result);
    });

    return results;
  }
}
