import { useEffect, useState } from 'react';
import { useApp } from '../store';
import { Header } from '../components/Header';
import { fetchOdds } from '../api';
import { leagueByKey } from '../constants';
import { fmtDateTime } from '../helpers';

export function Matches({ params }: { params: { league: string } }) {
  const league = params.league;
  const { navigate } = useApp();
  const [odds, setOdds] = useState<any[] | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const lg = leagueByKey(league);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchOdds(league);
        setOdds(data.data || []);
        setFetchedAt(data.fetchedAt || null);
      } catch { setError(true); }
    })();
  }, [league]);

  const groups: Record<string, any[]> = {};
  for (const m of odds || []) {
    const key = fmtDateTime(m.commenceTime, { weekday: 'long', day: 'numeric', month: 'long' });
    (groups[key] = groups[key] || []).push(m);
  }

  return (
    <>
      <Header title={`${lg?.flag}${lg?.sportIcon} ${lg?.label}`} sub="Dostępne mecze" onBack={() => navigate('leagues')} />
      <div className="matches-body">
        {fetchedAt && <div className="disclaimer" style={{ display: 'block' }}>⚠️ Kursy z {fmtDateTime(fetchedAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} — sprawdź przed postawieniem.</div>}
        {error ? <div className="state-box"><div className="icon">⚠️</div><p>Błąd połączenia z serwerem</p></div>
          : odds === null ? <div className="state-box"><div className="spinner" /><p>Ładowanie kursów...</p></div>
            : !odds.length ? <div className="state-box"><div className="icon">📭</div><p>Brak meczów.<br />Sezon może być nieaktywny.</p></div>
              : Object.entries(groups).map(([date, matches]) => (
                <div key={date}>
                  <div className="date-label">{date}</div>
                  <div className="matches-grid">
                    {matches.map(m => {
                      const time = fmtDateTime(m.commenceTime, { hour: '2-digit', minute: '2-digit' });
                      const hasDraw = m.odds?.draw != null;
                      return (
                        <div key={m.id} className="match-tile" onClick={() => navigate('match-detail', { match: { ...m, league }, league })}>
                          <div className="match-tile-time">{time}</div>
                          <div className="match-tile-home">{m.homeTeam}</div>
                          <div className="match-tile-vs">vs</div>
                          <div className="match-tile-away">{m.awayTeam}</div>
                          {m.odds && (
                            <div className="match-tile-odds">
                              <div className="odds-chip"><div className="odds-chip-lbl">1</div><div className="odds-chip-val">{m.odds.home.toFixed(2)}</div></div>
                              {hasDraw && <div className="odds-chip"><div className="odds-chip-lbl">X</div><div className="odds-chip-val">{m.odds.draw.toFixed(2)}</div></div>}
                              <div className="odds-chip"><div className="odds-chip-lbl">2</div><div className="odds-chip-val">{m.odds.away.toFixed(2)}</div></div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
      </div>
    </>
  );
}
