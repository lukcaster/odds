import { useEffect, useState } from 'react';
import { useApp } from '../store';
import { Header } from '../components/Header';
import { fetchAnalysis } from '../api';
import { getBankroll, fmtDateTime, Pick } from '../helpers';

export function MatchDetail({ params }: { params: { match: any; league: string } }) {
  const { match, league } = params;
  const { profile, navigate, openSheet } = useApp();
  const [data, setData] = useState<any>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const bankroll = getBankroll(profile);

  useEffect(() => {
    (async () => {
      try { setData(await fetchAnalysis(match.id, league, match.homeTeam, match.awayTeam)); setState('ok'); }
      catch { setState('error'); }
    })();
  }, [match, league]);

  const time = fmtDateTime(match.commenceTime, { hour: '2-digit', minute: '2-digit' });
  const date = fmtDateTime(match.commenceTime, { weekday: 'long', day: 'numeric', month: 'long' });
  const recs = data?.recommendations || [];

  // Te same typy trafiaja do arkusza zakladu, co karty na ekranie — klikniety
  // jest tylko preselectowany, reszta zostaje do przelaczenia.
  const picks: Pick[] = recs
    .filter((r: any) => r.outcomeType)
    .map((r: any) => ({
      type: r.outcomeType,
      label: r.outcomeLabel,
      odds: r.odds,
      prob: r.ourProbability,
      marketLabel: r.marketLabel,
      bookmakerName: r.bookmakerName,
    }));

  const placeBet = (rec: any) => openSheet({
    match: { ...match, league },
    picks,
    picksLabel: '1 — Wybierz typ z analizy modelu',
    preselect: { type: rec.outcomeType, odds: rec.odds, prob: rec.ourProbability },
  });

  return (
    <>
      <Header title="Analiza meczu" sub={`${date}, ${time}`} onBack={() => navigate('matches', { league })} />
      <div className="match-detail-body">
        <div className="match-detail-hero">
          <div className="match-detail-teams">
            <span>{match.homeTeam}</span>
            <span className="match-detail-vs">vs</span>
            <span>{match.awayTeam}</span>
          </div>
          <div className="match-detail-time">{date} · {time}</div>
          {data?.xgHome != null && (
            <div className="match-detail-xg" style={{ display: 'inline-flex' }}>
              <span>xG dom: <span>{data.xgHome.toFixed(2)}</span></span>
              <span>xG goście: <span>{data.xgAway.toFixed(2)}</span></span>
            </div>
          )}
        </div>

        <div>
          {state === 'loading' && <div className="analysis-loading"><div className="spinner" /><p>Analizuję rynki zakładów...</p><p className="sub">Pobieranie kursów i obliczanie modelu Poissona</p></div>}
          {state === 'error' && <div className="analysis-empty">⚠️ Błąd połączenia z serwerem</div>}
          {state === 'ok' && (!recs.length
            ? <>
              <div className="analysis-section-label">Top 3 bety (wg Kelly Criterion)</div>
              <div className="analysis-empty">Brak wyraźnej przewagi nad bukmacherem w żadnym z {data.marketsChecked ?? 0} sprawdzonych rynków.<br /><br />Użyj kalkulatora własnego poniżej lub poczekaj na lepszą okazję.</div>
            </>
            : <>
              <div className="analysis-section-label">Top {recs.length} bety wg modelu ({data.marketsChecked ?? 0} rynków sprawdzonych)</div>
              {recs.map((bet: any) => {
                const betAmt = Math.round(bankroll * bet.fractionalKelly);
                const kellyPct = (bet.fractionalKelly * 100).toFixed(1);
                const rc = bet.rank === 1 ? 'r1' : bet.rank === 2 ? 'r2' : 'r3';
                const clickable = !!bet.outcomeType;
                return (
                  <div key={bet.rank} className={`bet-card rank-${bet.rank}`}
                    style={clickable ? undefined : { cursor: 'default' }}
                    onClick={clickable ? () => placeBet(bet) : undefined}>
                    <div className="bet-card-top">
                      <div className={`bet-rank-badge ${rc}`}>{bet.rank}</div>
                      <div className="bet-market-label">{bet.marketLabel}</div>
                      <div className="bet-bm-label">{bet.bookmakerName}</div>
                    </div>
                    <div className="bet-outcome">{bet.outcomeLabel}</div>
                    <div className="bet-stats">
                      <div className="bet-stat"><div className="bet-stat-lbl">Kurs</div><div className="bet-stat-val">{bet.odds.toFixed(2)}</div></div>
                      <div className="bet-stat"><div className="bet-stat-lbl">Model vs Buk</div><div className="bet-stat-val good">{(bet.ourProbability * 100).toFixed(0)}% vs {(bet.impliedProbability * 100).toFixed(0)}%</div></div>
                      <div className="bet-stat"><div className="bet-stat-lbl">Edge</div><div className="bet-stat-val good">+{bet.edgePercent.toFixed(1)}%</div></div>
                    </div>
                    <div className="bet-stake">
                      <div>
                        <div className="bet-stake-lbl">Proponowany zakład (Kelly ¼)</div>
                        <div style={{ fontSize: 11, color: 'var(--primary-dark)', marginTop: 1 }}>~{kellyPct}% bankrolla</div>
                      </div>
                      <div className="bet-stake-amt">{betAmt > 0 ? betAmt + ' PLN' : '< 1 PLN'}</div>
                    </div>
                    {clickable && <div className="bet-card-cta">📝 Kliknij, aby postawić →</div>}
                  </div>
                );
              })}
            </>)}
        </div>

        <button className="manual-calc-btn" onClick={() => openSheet({ match: { ...match, league } })}>
          ⚙️ Kalkulator własny (1X2)
        </button>
      </div>
    </>
  );
}
