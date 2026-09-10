import { useApp } from '../store';

export function HelpModal() {
  const { setHelpOpen } = useApp();
  const close = () => setHelpOpen(false);
  const h = { fontWeight: 700, margin: '0.4rem 0 0.3rem' } as React.CSSProperties;
  const p = { margin: '0 0 0.9rem', color: '#475569' } as React.CSSProperties;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.2rem' }}
      onClick={e => { if (e.target === e.currentTarget) close(); }}>
      <div style={{ background: '#fff', borderRadius: '1rem', padding: '1.4rem', maxWidth: 400, width: '100%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', color: '#1a1f2e', fontSize: '0.94rem', lineHeight: 1.55 }}>
        <div style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.9rem' }}>⚡ Jak korzystać z apki?</div>
        <p style={p}>Apka szuka <strong>value betów</strong> — sytuacji, gdy nasza ocena szansy na wynik jest wyższa niż ta, którą wycenia bukmacher. To Twoja przewaga (<em>edge</em>).</p>
        <div style={h}>🏠 Ekran główny</div>
        <p style={p}>Podsumowanie Twoich zakładów: ile postawionych, wygrane, bilans kasy, ROI i wykres zysku w czasie.</p>
        <div style={h}>🧾 Moje zakłady</div>
        <p style={p}>Historia z podziałem na <strong>oczekujące / wygrane / przegrane</strong>. Zakłady na rozegrane mecze rozstrzygają się automatycznie z wyników, a status zawsze możesz zmienić ręcznie (klik w zakład → szczegóły). Widać tam datę meczu i możesz poprawić kurs, jeśli u buka był inny.</p>
        <div style={h}>🎯 Polecane</div>
        <p style={p}>Top zakłady z najbliższej kolejki, posortowane wg Kryterium Kelly'ego.</p>
        <div style={h}>📊 Power Ranking</div>
        <p style={p}>Siła drużyn liczona wg <strong>ELO z realnych wyników</strong> meczów. Możesz dać 👍/👎, czy zgadzasz się z pozycją drużyny — to opinia społeczności, nie zmienia samego algorytmu.</p>
        <div style={h}>⚽ Graj</div>
        <p style={p}>Wybierz ligę i przejrzyj mecze z kursami. Wejdź w mecz, żeby zobaczyć analizę modelu — <strong>kliknij w proponowany typ, żeby go zapisać</strong>. Oprócz 1X2 obsługujemy podwójną szansę, <strong>sumę goli (ponad/poniżej)</strong> i „obie drużyny strzelą". Możesz też policzyć własny zakład 1X2.</p>
        <div style={h}>💰 Ile stawiać?</div>
        <p style={p}>Kwota zakładu to <strong>frakcyjny Kelly (¼)</strong> liczony od Twojego bankrolla z profilu. Ostrożne podejście, które ogranicza ryzyko.</p>
        <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '0.6rem', padding: '0.7rem 0.8rem', margin: '0.4rem 0 1rem', fontSize: '0.85rem', color: '#9a3412' }}>
          ⚠️ Kursy bywają nieaktualne — zawsze sprawdź je u bukmachera przed zakładem. Narzędzie informacyjne, tylko 18+. Gra to ryzyko, obstawiaj odpowiedzialnie.
        </div>
        <button onClick={close} style={{ width: '100%', padding: '0.75rem', border: 'none', borderRadius: '0.6rem', background: '#1565c0', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' }}>Jasne, działam!</button>
      </div>
    </div>
  );
}
