import { useState } from 'react';
import { useApp } from '../store';
import { Header } from '../components/Header';

export function ProfileEdit() {
  const { profile, saveProfile, navigate, showToast } = useApp();
  const [nickname, setNickname] = useState(profile?.nickname || '');
  const [maxBet, setMaxBet] = useState(String(profile?.maxBet ?? 1000));

  const save = () => {
    const nick = nickname.trim();
    if (!nick) { showToast('Wpisz nick!'); return; }
    saveProfile({ ...(profile as any), nickname: nick, maxBet: parseFloat(maxBet) || 1000 });
    showToast('Zapisano!');
    navigate('menu');
  };

  return (
    <>
      <Header title="Profil" onBack={() => navigate('menu')} />
      <div className="profile-edit-body">
        <div className="input-group">
          <div className="input-label">Nick</div>
          <input className="input-field" type="text" maxLength={20} value={nickname} onChange={e => setNickname(e.target.value)} />
        </div>
        <div className="input-group">
          <div className="input-label">Bankroll (PLN)</div>
          <input className="input-field" type="number" min={1} inputMode="numeric" value={maxBet} onChange={e => setMaxBet(e.target.value)} />
        </div>
        <button className="btn-primary" onClick={save}>Zapisz zmiany</button>

        <button className="menu-card" style={{ marginTop: 16 }} onClick={() => navigate('bets')}>
          <div className="menu-card-icon">🧾</div>
          <div className="menu-card-text">
            <div className="menu-card-title">Moje zakłady</div>
            <div className="menu-card-desc">Historia i statusy zakładów</div>
          </div>
          <span className="menu-card-chevron">›</span>
        </button>
      </div>
    </>
  );
}
