import { useEffect, useState, useCallback } from 'react';
import { useApp } from '../store';
import { Header } from '../components/Header';
import { fetchRecommended, fetchOdds } from '../api';
import { getBankroll, relWhen, outcomeIcon, fmtDateTime } from '../helpers';

function RecCard({ bet, onClick, onInfo, bankroll }: any) {
  const time = fmtDateTime(bet.commenceTime, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const { when, far } = relWhen(bet.commenceTime);
  const kellyPct = (bet.fractionalKelly * 100).toFixed(1);
  const barWidth = Math.min(100, bet.fractionalKelly * 400).toFixed(0);
  const sourceLabel = bet.probabilitySource === 'model' ? 'wg modelu ELO' : `wg rynku (${bet.bookmakerCount} buki)`;
  const betAmt = Math.round(bankroll * bet.fractionalKelly);
  const rankClass = bet.rank === 1 ? 'top1' : bet.rank === 2 ? 'top2' : bet.rank === 3 ? 'top3' : '';

  return (
    <div className="rec-card" onClick={onClick}>
      <div className="rec-card-top">
        <div className={`rec-rank ${rankClass}`}>{bet.rank}</div>
        <div className="rec-league-badge">{bet.countryFlag} {bet.sportIcon} {bet.sportLabel}</div>
        <div className={`rec-source-badge ${bet.probabilitySource}`}>{sourceLabel}</div>
      </div>
      <div className="rec-match">{bet.homeTeam} vs {bet.awayTeam}</div>
      <div className="rec-time">{time} · <span className={`rec-when${far ? ' far' : ''}`}>{when}</span></div>
      <div className="rec-pick">{outcomeIcon(bet.outcomeType)} Typuj: <strong>{bet.outcomeLabel}</strong></div>
      {bet.estimatedOdds && <div className="rec-dc-note">🛡️ Double chance — kurs szacowany z 1X2 (konserwatywnie). Sprawdź realny kurs „double chance" u buka.</div>}
      <div className="rec-stats">
        <div className="rec-stat"><div className="rec-stat-lbl">Kurs{bet.estimatedOdds ? ' (szac.)' : ''}</div><div className="rec-stat-val">{bet.estimatedOdds ? '~' : ''}{bet.odds.toFixed(2)}</div></div>
        <div className="rec-stat"><div className="rec-stat-lbl">Szansa wg buka</div><div className="rec-stat-val">{(bet.impliedProbability * 100).toFixed(0)}%</div></div>
        <div className="rec-stat"><div className="rec-stat-lbl">Szansa wg modelu</div><div className="rec-stat-val positive">{(bet.ourProbability * 100).toFixed(0)}%</div></div>
        <div className="rec-stat"><div className="rec-stat-lbl">Edge</div><div className="rec-stat-val positive">+{bet.edgePercent.toFixed(1)}%</div></div>
      </div>
      <div className="rec-stake-wrap">
        <div className="rec-stake-lbl">Proponowany zakład</div>
        <div className="rec-stake-amt">💰 {betAmt > 0 ? betAmt + ' PLN' : '< 1 PLN'}</div>
        <div className="rec-stake-sub" onClick={(e) => { e.stopPropagation(); onInfo(betAmt, kellyPct); }}>
          ~{kellyPct}% Twojego bankrolla <span className="rec-info-badge">i</span>
        </div>
        <div className="rec-kelly-bar"><div className="rec-kelly-fill" style={{ width: `${barWidth}%` }} /></div>
      </div>
      <div className="rec-cta">📝 Kliknij, aby postawić →</div>
    </div>
  );
}

export function Recommended() {
  const { profile, navigate, openSheet, showToast, showKellyInfo } = useApp();
  const [bets, setBets] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const bankroll = getBankroll(profile);

  const load = useCallback(async () => {
    setLoading(true);
    try { setBets(await fetchRecommended()); } catch { setBets(null); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openBet = async (bet: any) => {
    try {
      const data = await fetchOdds(bet.leagueKey);
      const match = (data.data || []).find((m: any) => m.id === bet.matchId);
      if (!match || !match.odds) { showToast('Nie udało się wczytać kursów meczu'); return; }
      const dcPair: Record<string, string[]> = { '1X': ['home', 'draw'], '12': ['home', 'away'], 'X2': ['draw', 'away'] };
      let odds: number | null = null;
      if (dcPair[bet.outcomeType]) {
        const [a, b] = dcPair[bet.outcomeType].map(k => match.odds[k]);
        if (a != null && b != null) odds = (a * b) / (a + b);
      } else if (match.odds[bet.outcomeType] != null) odds = match.odds[bet.outcomeType];
      if (odds == null) { showToast('Nie udało się wczytać kursu tego typu'); return; }
      openSheet({ match: { ...match, league: bet.leagueKey }, preselect: { type: bet.outcomeType, odds, prob: bet.ourProbability } });
    } catch { showToast('Błąd połączenia z serwerem'); }
  };

  const onInfo = (betAmt: number, kellyPct: string) => showKellyInfo({ betAmt, kellyPct, bankroll });

  return (
    <>
      <Header title="🎯 Polecane" sub="Top 10 zakładów wg Kelly Criterion" onBack={() => navigate('menu')}
        action={<button className="header-action-btn" disabled={loading} onClick={load}>↻</button>} />
      <div className="recommended-body">
        {loading ? <div className="state-box"><div className="spinner" /><p>Ładowanie...</p></div>
          : !bets || !bets.length
            ? <div className="rec-empty"><div style={{ fontSize: 40, marginBottom: 12 }}>📭</div><p>Brak polecanych zakładów.<br />Załaduj kursy lig i wróć tu później.</p></div>
            : bets.map(bet => <RecCard key={bet.matchId + bet.outcomeType} bet={bet} bankroll={bankroll} onClick={() => openBet(bet)} onInfo={onInfo} />)}
      </div>
    </>
  );
}
