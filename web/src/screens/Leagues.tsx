import { useApp } from '../store';
import { Header } from '../components/Header';
import { LEAGUES } from '../constants';

export function Leagues() {
  const { navigate } = useApp();
  return (
    <>
      <Header title="Wybierz ligę" onBack={() => navigate('menu')} />
      <div className="leagues-body">
        <div className="leagues-grid">
          {LEAGUES.map(l => (
            <div key={l.key} className="league-tile" onClick={() => navigate('matches', { league: l.key })}>
              <div className="league-tile-icons">
                <span className="league-tile-flag">{l.flag}</span>
                <span className="league-tile-sport">{l.sportIcon}</span>
              </div>
              <div className="league-tile-name">{l.label}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
