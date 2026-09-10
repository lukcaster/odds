import { useEffect, useState } from 'react';
import { useApp } from '../store';
import { Header } from '../components/Header';
import { Bet, leagueName, outcomeLabelOf, fmtDateTime } from '../helpers';

function BetRow({ bet, onClick }: { bet: Bet; onClick: () => void }) {
  const badge = { won: '✓ wygrany', lost: '✗ przegrany', pending: '⏳ oczekuje', void: '↩︎ zwrot stawki' } as Record<string, string>;
  const r = bet.result || 'pending';
  const score = bet.homeScore != null && bet.awayScore != null ? ` · wynik ${bet.homeScore}:${bet.awayScore}` : '';
  const kickoff = bet.commenceTime
    ? fmtDateTime(bet.commenceTime, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : 'termin nieznany';
  return (
    <div className="history-item" onClick={onClick} style={{ cursor: 'pointer' }}>
      <div className="history-item-row">
        <div className="history-item-match">{bet.match}</div>
        <div className="history-item-amount">{bet.betAmt} PLN</div>
      </div>
      <div className="history-item-meta">📅 {kickoff} · {leagueName(bet.league)}</div>
      <div className="history-item-meta">typ: {outcomeLabelOf(bet.outcome)} · kurs {bet.odds?.toFixed(2)}{score}</div>
      <div className="history-item-row" style={{ marginTop: 8, alignItems: 'center' }}>
        <span className={`hist-badge ${r}`}>{badge[r]}</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-dim)' }}>szczegóły ›</span>
      </div>
    </div>
  );
}

type Tab = 'pending' | 'won' | 'lost' | 'void';

export function Bets() {
  const { profile, navigate, settlePending, openBetDetail } = useApp();
  const [tab, setTab] = useState<Tab>('pending');

  useEffect(() => { settlePending(); }, [settlePending]);

  const history = (profile?.history || []).filter(b => b.betAmt > 0);
  const groups = {
    pending: history.filter(b => (b.result || 'pending') === 'pending'),
    won: history.filter(b => b.result === 'won'),
    lost: history.filter(b => b.result === 'lost'),
    void: history.filter(b => b.result === 'void'),
  };

  const tabDef: Array<{ key: Tab; label: string }> = [
    { key: 'pending', label: '⏳ Oczekujące' },
    { key: 'won', label: '✓ Wygrane' },
    { key: 'lost', label: '✗ Przegrane' },
    // Zwroty to rzadkosc (handicap trafiony w linie) — zakladka pojawia sie,
    // dopiero gdy jest co w niej pokazac.
    ...(groups.void.length ? [{ key: 'void' as Tab, label: '↩︎ Zwroty' }] : []),
  ];

  // Po usunieciu ostatniego zwrotu zakladka znika — nie zostawiaj pustego widoku.
  const active: Tab = tabDef.some(t => t.key === tab) ? tab : 'pending';
  const list = groups[active] || [];
  const sorted = [...list].sort((a, b) => {
    const ta = new Date(a.commenceTime || a.date).getTime();
    const tb = new Date(b.commenceTime || b.date).getTime();
    return active === 'pending' ? ta - tb : tb - ta;
  });

  const emptyMsg = {
    pending: 'Brak oczekujących zakładów.',
    won: 'Brak wygranych… jeszcze 😉',
    lost: 'Brak przegranych.',
    void: 'Brak zwrotów.',
  }[active];

  return (
    <>
      <Header title="🧾 Moje zakłady" sub={`${history.length} zakładów`} onBack={() => navigate('menu')} />
      <div className="bets-tabs">
        {tabDef.map(t => (
          <button key={t.key} className={`bets-tab ${active === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label} <span className="cnt">{groups[t.key].length}</span>
          </button>
        ))}
      </div>
      <div className="bets-body">
        {sorted.length === 0
          ? <div className="bets-empty">🧾<br />{emptyMsg}</div>
          : sorted.map(bet => <BetRow key={bet.id} bet={bet} onClick={() => openBetDetail(bet.id)} />)}
      </div>
    </>
  );
}
