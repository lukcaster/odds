import { useState } from 'react';
import { useApp } from '../store';

export function Disclaimer() {
  const { profile, navigate } = useApp();
  const [checked, setChecked] = useState(false);

  const agree = () => {
    if (!checked) return;
    localStorage.setItem('agreedDisclaimer', new Date().toISOString());
    navigate(profile?.nickname ? 'menu' : 'profile-setup');
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.2rem' }}>
      <div style={{ background: '#fff', borderRadius: '1rem', padding: '1.5rem', maxWidth: 400, width: '100%', maxHeight: '88vh', overflowY: 'auto', color: '#1a1f2e', fontSize: '0.93rem', lineHeight: 1.55 }}>
        <div style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.9rem' }}>⚠️ Zanim zaczniesz</div>
        <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '0.6rem', padding: '0.8rem', marginBottom: '0.9rem', fontWeight: 700, color: '#9a3412' }}>
          🔞 Aplikacja tylko dla osób pełnoletnich (18+).
        </div>
        <p style={{ margin: '0 0 0.8rem', color: '#475569' }}>
          To narzędzie <strong>informacyjno-rozrywkowe</strong>. Nie przyjmuje zakładów, nie obraca pieniędzmi
          i <strong>nie jest poradą finansową ani gwarancją wygranej</strong>. Prognozy i kursy mogą być
          nieaktualne — zawsze sprawdź je u bukmachera.
        </p>
        <p style={{ margin: '0 0 0.8rem', color: '#475569' }}>
          Hazard wiąże się z ryzykiem utraty pieniędzy i może uzależniać. Obstawiaj wyłącznie kwoty,
          na których stratę Cię stać. Jeśli czujesz, że tracisz kontrolę — <strong>poszukaj pomocy</strong>
          (np. bezpłatny Telefon Zaufania „Uzależnienia behawioralne": 801 889 880).
        </p>
        <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', margin: '0.6rem 0 1rem', fontSize: '0.88rem', color: '#334155', cursor: 'pointer' }}>
          <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} style={{ marginTop: '0.2rem', width: 18, height: 18, flexShrink: 0 }} />
          <span>Mam ukończone 18 lat i rozumiem, że to narzędzie informacyjne, a nie zachęta do gry.</span>
        </label>
        <button onClick={agree} disabled={!checked}
          style={{ width: '100%', padding: '0.8rem', border: 'none', borderRadius: '0.6rem', background: checked ? '#1565c0' : '#94a3b8', color: '#fff', fontWeight: 700, fontSize: '0.98rem', cursor: checked ? 'pointer' : 'not-allowed' }}>
          Wejdź
        </button>
      </div>
    </div>
  );
}
