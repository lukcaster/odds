import { useState } from 'react';
import { useApp } from '../store';

export function ProfileSetup() {
  const { saveProfile, navigate, showToast } = useApp();
  const [nickname, setNickname] = useState('');
  const [maxBet, setMaxBet] = useState('');

  const done = () => {
    const nick = nickname.trim();
    if (!nick) { showToast('Wpisz nick!'); return; }
    saveProfile({ nickname: nick, maxBet: parseFloat(maxBet) || 1000, history: [] });
    navigate('menu');
  };

  return (
    <div className="profile-setup-wrap">
      <div className="profile-logo">⚡</div>
      <div className="profile-title">Odds Calculator</div>
      <div className="profile-subtitle">Ustaw profil, żeby zacząć</div>
      <div className="input-group">
        <div className="input-label">Twój nick</div>
        <input className="input-field" type="text" placeholder="np. Michał" maxLength={20}
          value={nickname} onChange={e => setNickname(e.target.value)} />
      </div>
      <div className="input-group">
        <div className="input-label">Maks. bankroll (PLN)</div>
        <input className="input-field" type="number" placeholder="np. 1000" min={1} inputMode="numeric"
          value={maxBet} onChange={e => setMaxBet(e.target.value)} />
      </div>
      <button className="btn-primary" style={{ maxWidth: 380 }} onClick={done}>Gotowe →</button>
    </div>
  );
}
