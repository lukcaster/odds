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
  /** 'void' = zwrot stawki (push) — np. handicap trafiony dokladnie w linie. */
  result?: 'pending' | 'won' | 'lost' | 'void';
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

/** Handicap, np. 'spread_home_-6.5' -> { side: 'home', line: '-6.5' }. */
export function parseSpread(outcome: string) {
  const m = /^spread_(home|away)_(-?\d+(?:\.\d+)?)$/.exec(outcome);
  return m ? { side: m[1] as 'home' | 'away', line: m[2] } : null;
}

/** Linia handicapu zawsze ze znakiem: '-6.5', '+3'. */
const signed = (line: string) => (parseFloat(line) > 0 ? `+${line}` : line);

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
  const sp = parseSpread(o);
  if (sp) return `${sp.side === 'home' ? 'Dom' : 'Goście'} ${signed(sp.line)}`;
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
  const sp = parseSpread(o);
  if (sp) return `Handicap: ${sp.side === 'home' ? 'dom' : 'goście'} ${signed(sp.line)}`;
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
  if (parseSpread(t)) return '📏';
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
  // Zwroty stawki (push) sa rozstrzygniete, ale nie licza sie do bilansu
  // ani do win rate — kasa wraca, wiec nie zawyzaja/zanizaja ROI.
  const voided = placed.filter(b => b.result === 'void');
  const wins = settled.filter(b => b.result === 'won');
  const staked = settled.reduce((s, b) => s + b.betAmt, 0);
  const profit = settled.reduce((s, b) => s + (b.result === 'won' ? b.betAmt * (b.odds - 1) : -b.betAmt), 0);
  return {
    placedCount: placed.length,
    settledCount: settled.length,
    winsCount: wins.length,
    voidCount: voided.length,
    pendingCount: placed.length - settled.length - voided.length,
    winRate: settled.length ? (wins.length / settled.length) * 100 : 0,
    staked,
    profit,
    roi: staked > 0 ? (profit / staked) * 100 : 0,
  };
}

export const leagueName = (key: string) => leagueByKey(key)?.label || key;

export const fmtDateTime = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(iso).toLocaleString('pl-PL', opts);
