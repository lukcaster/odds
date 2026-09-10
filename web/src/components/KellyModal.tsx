import { useApp } from '../store';

export function KellyModal() {
  const { kellyInfo, showKellyInfo } = useApp();
  if (!kellyInfo) return null;
  const { betAmt, kellyPct, bankroll } = kellyInfo;
  const fullKellyPct = (parseFloat(kellyPct) * 4).toFixed(1);
  const close = () => showKellyInfo(null);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
      onClick={e => { if (e.target === e.currentTarget) close(); }}>
      <div style={{ background: '#1e2233', borderRadius: '1rem', padding: '1.5rem', maxWidth: 360, width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', color: '#e2e8f0', fontSize: '0.95rem', lineHeight: 1.6 }}>
        <div style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.8rem' }}>📊 Jak liczymy zakład?</div>
        <p style={{ margin: '0 0 0.8rem' }}>Korzystamy z <strong>Kryterium Kelly'ego</strong> — wzoru, który wyznacza optymalny rozmiar zakładu na podstawie Twojej przewagi nad bukmacherem.</p>
        <div style={{ background: '#0f1525', borderRadius: '0.6rem', padding: '0.8rem', marginBottom: '0.8rem', fontSize: '0.88rem' }}>
          <div>🏦 Twój bankroll: <strong>{bankroll} PLN</strong> (z ustawień profilu)</div>
          <div>📐 Kelly (¼): <strong>{kellyPct}% bankrolla</strong></div>
          <div>💰 Proponowany zakład: <strong>{betAmt > 0 ? betAmt + ' PLN' : '< 1 PLN'}</strong></div>
        </div>
        <p style={{ margin: '0 0 0.8rem', fontSize: '0.88rem', color: '#94a3b8' }}>
          Używamy <em>frakcyjnego Kelly (1/4)</em>, żeby ograniczyć ryzyko. Pełne Kelly wynosiłoby {fullKellyPct}% bankrolla — zbyt agresywne przy niepewnych prognozach. Bankroll możesz zmienić w zakładce Profil.
        </p>
        <button onClick={close} style={{ width: '100%', padding: '0.7rem', border: 'none', borderRadius: '0.6rem', background: '#3b82f6', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem' }}>Rozumiem</button>
      </div>
    </div>
  );
}
