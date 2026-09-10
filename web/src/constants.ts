export const API = '';

export interface League {
  key: string;
  label: string;
  flag: string;
  sportIcon: string;
  hasDraw: boolean;
}

export const LEAGUES: League[] = [
  { key: 'nfl',            label: 'NFL',            flag: '🇺🇸', sportIcon: '🏈', hasDraw: false },
  { key: 'nba',            label: 'NBA',            flag: '🇺🇸', sportIcon: '🏀', hasDraw: false },
  { key: 'ekstraklasa',    label: 'Ekstraklasa',    flag: '🇵🇱', sportIcon: '⚽', hasDraw: true  },
  { key: 'laliga',         label: 'La Liga',        flag: '🇪🇸', sportIcon: '⚽', hasDraw: true  },
  { key: 'premier_league', label: 'Premier League', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', sportIcon: '⚽', hasDraw: true  },
  { key: 'bundesliga',     label: 'Bundesliga',     flag: '🇩🇪', sportIcon: '⚽', hasDraw: true  },
];

export const POWER_LEAGUE_KEYS = ['ekstraklasa', 'premier_league', 'laliga', 'bundesliga', 'nfl', 'nba'];
export const POWER_LEAGUES = LEAGUES.filter(l => POWER_LEAGUE_KEYS.includes(l.key));

export const leagueByKey = (key: string) => LEAGUES.find(l => l.key === key);
