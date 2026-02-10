export interface UserBean {
  timestamp: string;
  name: string;
  x_id: string;
  first_flag: string;
  casts: string[];
  note: string;
  is_pair_ticket: boolean;
  raw_extra: any[];
}

export interface CastBean {
  name: string;
  is_present: boolean;
  ng_users: string[];
}

export type MatchingResult = Map<string, unknown>;


