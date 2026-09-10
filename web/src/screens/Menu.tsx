import { useEffect } from 'react';
import { useApp } from '../store';
import { Header } from '../components/Header';
import { computeStats, Bet } from '../helpers';

function ProfitChart({ cumulative }: { cumulative: number[] }) {
  const w = 300, h = 120, pad = 10;
  const series = [0, ...cumulative];
  const min = Math.min(...series, 0), max = Math.max(...series, 0);
  const range = (max - min) || 1;
  const stepX = (w - 2 * pad) / (series.length - 1 || 1);
  const X = (i: number) => pad + i * stepX;
  const Y = (v: number) => h - pad - ((v - min) / range) * (h - 2 * pad);
  const pts = series.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`);
  const zeroY = Y(0).toFixed(1);
  const last = series[series.length - 1];
  const color = last >= 0 ? '#2e7d32' : '#c62828';
  const area = `M${X(0).toFixed(1)},${zeroY} L${pts.join(' L')} L${X(series.length - 1).toFixed(1)},${zeroY} Z`;
  return (
    <svg className="dash-chart" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <line x1={pad} y1={zeroY} x2={w - pad} y2={zeroY} stroke="#cbd5e1" strokeWidth={1} strokeDasharray="3 3" />
      <path d={area} fill={color} opacity={0.12} />
      <path d={`M${pts.join(' L')}`} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function Dashboard() {
  const { profile } = useApp();
  const history: Bet[] = profile?.history || [];
  const s = computeStats(history);

  if (!s.placedCount) {
    return (
      <div className="dash">
        <div className="dash-card"><div className="dash-empty">
          📊 Brak zakładów.<br />Kliknij <strong>Graj</strong> i postaw pierwszy — statystyki pojawią się tutaj.
        </div></div>
      </div>
    );
  }

  const money = (v: number) => (v >= 0 ? '+' : '') + Math.round(v).toLocaleString('pl-PL') + ' zł';
  const cls = (v: number) => (v > 0 ? 'pos' : v < 0 ? 'neg' : '');

  const settledChrono = history
    .filter(b => b.betAmt > 0 && (b.result === 'won' || b.result === 'lost'))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let run = 0;
  const cumulative = settledChrono.map(b => (run += b.result === 'won' ? b.betAmt * (b.odds - 1) : -b.betAmt));

  return (
    <div className="dash">
      <div className="dash-stats">
        <div className="dash-stat">
          <div className="dash-stat-val">{s.placedCount}</div>
          <div className="dash-stat-lbl">Postawione</div>
          <div className="dash-stat-sub">{s.pendingCount} oczekuje · {s.settledCount} rozstrzygnięte</div>
        </div>
        <div className="dash-stat">
          <div className="dash-stat-val">{s.winsCount}<span style={{ fontSize: 14, color: 'var(--text-dim)' }}>/{s.settledCount}</span></div>
          <div className="dash-stat-lbl">Wygrane</div>
          <div className="dash-stat-sub">win rate {s.winRate.toFixed(0)}%</div>
        </div>
        <div className="dash-stat">
          <div className={`dash-stat-val ${cls(s.profit)}`}>{money(s.profit)}</div>
          <div className="dash-stat-lbl">Bilans</div>
          <div className="dash-stat-sub">postawiono {Math.round(s.staked).toLocaleString('pl-PL')} zł</div>
        </div>
        <div className="dash-stat">
          <div className={`dash-stat-val ${cls(s.roi)}`}>{s.roi >= 0 ? '+' : ''}{s.roi.toFixed(1)}%</div>
          <div className="dash-stat-lbl">ROI</div>
          <div className="dash-stat-sub">zwrot z postawionej kasy</div>
        </div>
      </div>
      <div className="dash-card">
        <div className="dash-card-title">Zysk w czasie <small>{s.settledCount} rozstrzygniętych</small></div>
        {cumulative.length >= 2
          ? <ProfitChart cumulative={cumulative} />
          : <div className="dash-pending-note">Za mało rozstrzygniętych zakładów na wykres —<br />rozstrzygnij co najmniej 2 (auto po meczu albo ręcznie w „Moje zakłady").</div>}
      </div>
    </div>
  );
}

function Card({ icon, title, desc, onClick }: { icon: string; title: string; desc: string; onClick: () => void }) {
  return (
    <button className="menu-card" onClick={onClick}>
      <div className="menu-card-icon">{icon}</div>
      <div className="menu-card-text">
        <div className="menu-card-title">{title}</div>
        <div className="menu-card-desc">{desc}</div>
      </div>
      <span className="menu-card-chevron">›</span>
    </button>
  );
}

export function Menu() {
  const { profile, navigate, settlePending, setHelpOpen } = useApp();

  useEffect(() => { settlePending(); }, [settlePending]);

  return (
    <>
      <Header title="⚡ Odds Calc" sub={undefined}
        action={<button className="header-action-btn" title="Jak korzystać z apki?" onClick={() => setHelpOpen(true)}>?</button>} />
      <div className="menu-body">
        <div className="menu-greeting">
          <div className="menu-greeting-hello">Cześć,</div>
          <div className="menu-greeting-name">{profile?.nickname || '—'}</div>
        </div>
        <Dashboard />
        <Card icon="🎯" title="Polecane" desc="Top 10 zakładów wg Kelly Criterion" onClick={() => navigate('recommended')} />
        <Card icon="📊" title="Power Ranking" desc="Siła drużyn wg ELO z realnych wyników" onClick={() => navigate('power')} />
        <Card icon="⚽" title="Graj" desc="Wybierz ligę i sprawdź kursy" onClick={() => navigate('leagues')} />
        <Card icon="🧾" title="Moje zakłady" desc="Historia i statusy — oczekujące / wygrane / przegrane" onClick={() => navigate('bets')} />
        <Card icon="👤" title="Profil" desc="Edytuj dane i bankroll" onClick={() => navigate('profile-edit')} />
      </div>
    </>
  );
}
