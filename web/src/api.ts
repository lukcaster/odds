import { API } from './constants';

async function getJson(url: string) {
  const res = await fetch(`${API}${url}`);
  return res.json();
}
async function postJson(url: string, body: any) {
  const res = await fetch(`${API}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

export const fetchOdds = (league: string) => getJson(`/api/odds?league=${league}`);
export const fetchRecommended = () => getJson(`/api/recommended`);
export const fetchPowerRanking = (league: string, force = false) =>
  getJson(`/api/power-ranking?league=${league}${force ? '&force=1' : ''}`);
export const fetchAnalysis = (eventId: string, league: string, homeTeam: string, awayTeam: string) =>
  getJson(`/api/match/${eventId}/analysis?league=${league}&homeTeam=${encodeURIComponent(homeTeam)}&awayTeam=${encodeURIComponent(awayTeam)}`);
export const fetchPredict = (homeTeam: string, awayTeam: string) =>
  getJson(`/api/predict?homeTeam=${encodeURIComponent(homeTeam)}&awayTeam=${encodeURIComponent(awayTeam)}`);
export const postSentiment = (league: string, team: string, dir: 'up' | 'down') =>
  postJson(`/api/sentiment`, { league, team, dir });
export const postSettle = (bets: any[]) => postJson(`/api/settle`, { bets });
export const fetchBacktest = (force = false) => getJson(`/api/backtest${force ? '?force=1' : ''}`);
