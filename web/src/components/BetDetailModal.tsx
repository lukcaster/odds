import { useState } from 'react';
import { useApp } from '../store';
import { getBankroll, kellyFraction, leagueName, outcomeFullLabel, outcomeIcon, fmtDateTime } from '../helpers';

export function BetDetailModal() {
  const { betDetailId, closeBetDetail, profile, updateHistory, showToast } = useApp();
  const bet = (profile?.history || []).find(b => b.id === betDetailId);
  const [oddsStr, setOddsStr] = useState(bet ? bet.odds.toFixed(2) : '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  if (!bet) return null;

  const r = bet.result || 'pending';
  const placed = fmtDateTime(bet.date, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  const kickoff = bet.commenceTime ? fmtDateTime(bet.commenceTime, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : 'brak danych';
  const score = bet.homeScore != null && bet.awayScore != null ? `${bet.homeScore} : ${bet.awayScore}` : '—';

  const saveOdds = () => {
    const val = parseFloat(oddsStr);
    if (!val || val <= 1) { showToast('Kurs musi być > 1.00'); return; }
    const kelly = kellyFraction(val, bet.userProb || 0);
    const betAmt = Math.round(getBankroll(profile) * kelly / 4);
    updateHistory(h => h.map(b => b.id === bet.id ? { ...b, odds: val, betAmt } : b));
    showToast('Zaktualizowano kurs');
  };

  const setResult = (result: 'won' | 'lost' | 'pending') => {
    updateHistory(h => h.map(b => b.id === bet.id ? { ...b, result: b.result === result ? 'pending' : result } : b));
  };

  const remove = () => {
    updateHistory(h => h.filter(b => b.id !== bet.id));
    closeBetDetail();
    showToast('Usunięto zakład');
  };

  const stBtn = (active: boolean, c1: string) => ({
    flex: 1, padding: '0.6rem', border: `1px solid ${active ? c1 : '#cbd5e1'}`, borderRadius: '0.5rem',
    background: active ? (c1 === '#2e7d32' ? '#e8f5e9' : c1 === '#c62828' ? '#ffebee' : '#f1f5f9') : '#fff',
    color: active ? c1 : '#475569', fontWeight: 700, cursor: 'pointer',
  } as React.CSSProperties);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.2rem' }}
      onClick={e => { if (e.target === e.currentTarget) closeBetDetail(); }}>
      <div style={{ background: '#fff', borderRadius: '1rem', padding: '1.4rem', maxWidth: 380, width: '100%', maxHeight: '88vh', overflowY: 'auto', color: '#1a1f2e' }}>
        <div style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.2rem' }}>{bet.match}</div>
        <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '1rem' }}>{leagueName(bet.league)}</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.5rem 0.9rem', fontSize: '0.9rem', marginBottom: '1rem' }}>
          <span style={{ color: '#64748b' }}>📅 Mecz</span><strong>{kickoff}</strong>
          <span style={{ color: '#64748b' }}>📝 Postawiono</span><span>{placed}</span>
          <span style={{ color: '#64748b' }}>{outcomeIcon(bet.outcome)} Typ</span><strong>{outcomeFullLabel(bet.outcome)}</strong>
          <span style={{ color: '#64748b' }}>📊 Twoja ocena</span><span>{Math.round((bet.userProb || 0) * 100)}%</span>
          <span style={{ color: '#64748b' }}>🏁 Wynik meczu</span><span>{score}</span>
        </div>

        {bet.betAmt > 0 && <>
          <div style={{ background: '#f1f5f9', borderRadius: '0.6rem', padding: '0.8rem', marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>Kurs (możesz poprawić na ten z buka)</label>
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginTop: '0.4rem' }}>
              <input type="number" step="0.01" min="1.01" value={oddsStr} onChange={e => setOddsStr(e.target.value)}
                style={{ flex: 1, padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '0.5rem', fontSize: '1rem', fontWeight: 700 }} />
              <button onClick={saveOdds} style={{ padding: '0.5rem 0.9rem', border: 'none', borderRadius: '0.5rem', background: '#1565c0', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Zapisz</button>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem' }}>💰 Stawka (Kelly ¼): <strong>{bet.betAmt} PLN</strong></div>
          </div>

          <div style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600, marginBottom: '0.4rem' }}>Wynik zakładu</div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <button onClick={() => setResult('won')} style={stBtn(r === 'won', '#2e7d32')}>✓ wygrany</button>
            <button onClick={() => setResult('lost')} style={stBtn(r === 'lost', '#c62828')}>✗ przegrany</button>
            <button onClick={() => setResult('pending')} style={stBtn(r === 'pending', '#64748b')}>⏳ czeka</button>
          </div>
        </>}

        <button onClick={closeBetDetail} style={{ width: '100%', padding: '0.7rem', border: 'none', borderRadius: '0.6rem', background: '#e2e8f0', color: '#334155', fontWeight: 700, cursor: 'pointer' }}>Zamknij</button>

        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)}
            style={{ width: '100%', marginTop: '0.6rem', padding: '0.6rem', border: '1px solid #fecaca', borderRadius: '0.6rem', background: '#fff', color: '#c62828', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>
            🗑️ Usuń zakład
          </button>
        ) : (
          <div style={{ marginTop: '0.6rem', padding: '0.8rem', border: '1px solid #fecaca', borderRadius: '0.6rem', background: '#fff5f5' }}>
            <div style={{ fontSize: '0.86rem', color: '#9a3412', marginBottom: '0.6rem' }}>
              Usunąć ten zakład z historii? Zniknie też ze statystyk i tego nie da się cofnąć.
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={remove}
                style={{ flex: 1, padding: '0.6rem', border: 'none', borderRadius: '0.5rem', background: '#c62828', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                Tak, usuń
              </button>
              <button onClick={() => setConfirmDelete(false)}
                style={{ flex: 1, padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '0.5rem', background: '#fff', color: '#475569', fontWeight: 700, cursor: 'pointer' }}>
                Anuluj
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
