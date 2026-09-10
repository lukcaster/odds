import { leagueByKey } from './constants';

export interface Bet {
  id: string;
  date: string;
  commenceTime?: string | null;
  league: string;
  match: string;
  home?: string;
  away?: string;
  outcome: string;
  odds: number;
  userProb?: number;
  betAmt: number;
  hasValue?: boolean;
  result?: 'pending' | 'won' | 'lost';
  homeScore?: number;
  awayScore?: number;
}

/**
 * Jeden mozliwy typ do obstawienia — wspolny jezyk arkusza zakladu.
 * Zrodlem moze byc kalkulator 1X2 (kursy z listy meczow) albo analiza modelu
 * (dowolny rynek: 1X2, podwojna szansa, suma goli, BTTS).
 */
export interface Pick {
  /** Kanoniczny typ, ten sam co na serwerze: 'home', 'X2', 'over_2.5', 'btts_yes'... */
  type: string;
  label: string;
  odds: number;
  /** Kurs policzony przez nas z 1X2, a nie wzięty wprost od buka. */
  estimated?: boolean;
  /** Prawdopodobienstwo wg modelu — jesli znane, ustawia suwak. */
  prob?: number;
  marketLabel?: string;
  bookmakerName?: string;
}

export interface Profile {
  nickname: string;
  maxBet: number;
  history: Bet[];
}

export const getBankroll = (profile: Profile | null) => profile?.maxBet || 1000;

export const kellyFraction = (odds: number, prob: number) => {
  const b = odds - 1;
  return b > 0 ? Math.max(0, (b * prob - (1 - prob)) / b) : 0;
};

/** Suma goli, np. 'over_2.5' -> { dir: 'over', line: 2.5 }. */
export function parseTotals(outcome: string) {
  const m = /^(over|under)_(\d+(?:\.\d+)?)$/.exec(outcome);
  return m ? { dir: m[1] as 'over' | 'under', line: m[2] } : null;
}

/** Krotka etykieta typu — do list i historii zakladow. */
export function outcomeLabelOf(o: string): string {
  const fixed: Record<string, string> = {
    home: '1', away: '2', draw: 'X', '1X': '1X', '12': '12', X2: 'X2',
    btts_yes: 'BTTS: Tak', btts_no: 'BTTS: Nie',
  };
  if (fixed[o]) return fixed[o];
  const t = parseTotals(o);
  if (t) return `${t.dir === 'over' ? 'Ponad' : 'Poniżej'} ${t.line}`;
  return o;
}

/** Pelna etykieta typu — do arkusza zakladu i modali. */
export function outcomeFullLabel(o: string): string {
  const fixed: Record<string, string> = {
    home: '1 — Dom', away: '2 — Goście', draw: 'X — Remis',
    '1X': '1X — Dom/remis', '12': '12 — Dom/goście', X2: 'X2 — Remis/goście',
    btts_yes: 'Obie strzelą — Tak', btts_no: 'Obie strzelą — Nie',
  };
  if (fixed[o]) return fixed[o];
  const t = parseTotals(o);
  if (t) return `${t.dir === 'over' ? 'Ponad' : 'Poniżej'} ${t.line} goli`;
  return o;
}

export function outcomeIcon(t: string): string {
  const fixed: Record<string, string> = {
    home: '🏠', away: '✈️', draw: '🤝',
    '1X': '🛡️', '12': '🛡️', X2: '🛡️',
    btts_yes: '⚽', btts_no: '🚫',
  };
  if (fixed[t]) return fixed[t];
  const tot = parseTotals(t);
  if (tot) return tot.dir === 'over' ? '📈' : '📉';
  return '🎯';
}

export function relWhen(commenceTime: string) {
  const now = new Date();
  const md = new Date(commenceTime);
  const d0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const d1 = new Date(md.getFullYear(), md.getMonth(), md.getDate());
  const days = Math.round((d1.getTime() - d0.getTime()) / 86400000);
  const when = days <= 0 ? 'dziś' : days === 1 ? 'jutro' : `za ${days} dni`;
  return { when, far: days >= 7 };
}

export function betHomeAway(bet: Bet) {
  if (bet.home && bet.away) return { home: bet.home, away: bet.away };
  const parts = (bet.match || '').split(' vs ');
  return { home: parts[0] || '', away: parts[1] || '' };
}

export function computeStats(history: Bet[]) {
  const placed = history.filter(b => b.betAmt > 0);
  const settled = placed.filter(b => b.result === 'won' || b.result === 'lost');
  const wins = settled.filter(b => b.result === 'won');
  const staked = settled.reduce((s, b) => s + b.betAmt, 0);
  const profit = settled.reduce((s, b) => s + (b.result === 'won' ? b.betAmt * (b.odds - 1) : -b.betAmt), 0);
  return {
    placedCount: placed.length,
    settledCount: settled.length,
    winsCount: wins.length,
    pendingCount: placed.length - settled.length,
    winRate: settled.length ? (wins.length / settled.length) * 100 : 0,
    staked,
    profit,
    roi: staked > 0 ? (profit / staked) * 100 : 0,
  };
}

export const leagueName = (key: string) => leagueByKey(key)?.label || key;

export const fmtDateTime = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(iso).toLocaleString('pl-PL', opts);
