import { useEffect, useState, useCallback } from 'react';
import { useApp } from '../store';
import { Header } from '../components/Header';
import { POWER_LEAGUES, leagueByKey } from '../constants';
import { fetchPowerRanking, postSentiment } from '../api';
import { fmtDateTime } from '../helpers';

function myVotes(): any { try { return JSON.parse(localStorage.getItem('powerVotes') || '{}'); } catch { return {}; } }
function myVoteFor(league: string, team: string) { return (myVotes()[league] || {})[team] || null; }
function rememberVote(league: string, team: string, dir: string) {
  const v = myVotes(); v[league] = v[league] || {}; v[league][team] = dir;
  localStorage.setItem('powerVotes', JSON.stringify(v));
}

export function Power() {
  const { navigate } = useApp();
  const [league, setLeague] = useState('ekstraklasa');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [, force] = useState(0);

  const load = useCallback(async (lg: string, forceRefresh = false) => {
    setLoading(true);
    try { setData(await fetchPowerRanking(lg, forceRefresh)); } catch { setData(null); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(league); }, [league, load]);

  const vote = async (team: string, dir: 'up' | 'down') => {
    if (myVoteFor(league, team) === dir) return;
    rememberVote(league, team, dir);
    try { await postSentiment(league, team, dir); } catch { /* offline */ }
    force(x => x + 1);
    load(league);
  };

  const teams = data?.teams || [];
  const hasDraw = leagueByKey(league)?.hasDraw;
  const when = data?.updatedAt ? fmtDateTime(data.updatedAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
  const sub = teams.length ? `${teams.length} drużyn • ${data.matchesUsed} meczów • ${when}` : 'Siła drużyn wg ELO';

  return (
    <>
      <Header title="📊 Power Ranking" sub={sub} onBack={() => navigate('menu')}
        action={<button className="header-action-btn" disabled={loading} onClick={() => load(league, true)}>↻</button>} />
      <div className="power-tabs">
        {POWER_LEAGUES.map(l => (
          <button key={l.key} className={`power-tab ${l.key === league ? 'active' : ''}`} onClick={() => setLeague(l.key)}>
            {l.flag} {l.label}
          </button>
        ))}
      </div>
      <div className="power-body">
        {loading ? <div className="state-box"><div className="spinner" /><p>Ładowanie...</p></div>
          : !teams.length
            ? <div className="rec-empty"><div style={{ fontSize: 40, marginBottom: 12 }}>📊</div><p>Brak danych do rankingu.<br />Ranking liczy się z wyników meczów —<br />wróć po pierwszej kolejce albo kliknij ↻.</p></div>
            : <>
              {league === 'nba' && <div className="power-note" style={{ marginBottom: 8 }}>🏀 Ranking startowy wg sezonu 2025/26 — nowy sezon (od października) będzie go korygował na bieżąco.</div>}
              {teams.map((t: any) => {
                const mine = myVoteFor(league, t.team);
                const rec = hasDraw ? `${t.wins}-${t.draws}-${t.losses}` : `${t.wins}-${t.losses}`;
                const recLbl = hasDraw ? '(Z-R-P)' : '(Z-P)';
                const rankClass = t.rank === 1 ? 'top1' : t.rank === 2 ? 'top2' : t.rank === 3 ? 'top3' : '';
                return (
                  <div key={t.team} className="pr-row">
                    <div className={`pr-rank ${rankClass}`}>{t.rank}</div>
                    <div className="pr-main">
                      <div className="pr-team">{t.team}</div>
                      <div className="pr-meta">{t.games} m • {rec} {recLbl}
                        <span className="pr-form">{(t.form || []).map((f: string, i: number) => <span key={i} className={f}>{f}</span>)}</span>
                      </div>
                    </div>
                    <div className="pr-elo"><div className="pr-elo-val">{Math.round(t.rating)}</div><div className="pr-elo-lbl">ELO</div></div>
                    <div className="pr-vote">
                      <button className={`up ${mine === 'up' ? 'on' : ''}`} onClick={() => vote(t.team, 'up')}>👍 {t.up || 0}</button>
                      <button className={`down ${mine === 'down' ? 'on' : ''}`} onClick={() => vote(t.team, 'down')}>👎 {t.down || 0}</button>
                    </div>
                  </div>
                );
              })}
              <div className="power-note">👍/👎 to opinia społeczności — czy zgadzasz się z pozycją drużyny. Nie zmienia to samego algorytmu ELO, tylko pokazuje co myślą inni.</div>
            </>}
      </div>
    </>
  );
}
