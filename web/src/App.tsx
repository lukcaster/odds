import { useApp } from './store';
import { Disclaimer } from './screens/Disclaimer';
import { ProfileSetup } from './screens/ProfileSetup';
import { Menu } from './screens/Menu';
import { Bets } from './screens/Bets';
import { Power } from './screens/Power';
import { Leagues } from './screens/Leagues';
import { Matches } from './screens/Matches';
import { MatchDetail } from './screens/MatchDetail';
import { Recommended } from './screens/Recommended';
import { ProfileEdit } from './screens/ProfileEdit';
import { BetSheet } from './components/BetSheet';
import { BetDetailModal } from './components/BetDetailModal';
import { KellyModal } from './components/KellyModal';
import { HelpModal } from './components/HelpModal';

const SCREENS: Record<string, React.ComponentType<any>> = {
  'disclaimer': Disclaimer,
  'profile-setup': ProfileSetup,
  'menu': Menu,
  'bets': Bets,
  'power': Power,
  'leagues': Leagues,
  'matches': Matches,
  'match-detail': MatchDetail,
  'recommended': Recommended,
  'profile-edit': ProfileEdit,
};

export function App() {
  const { screen, toast, sheet, betDetailId, helpOpen, kellyInfo } = useApp();
  const Screen = SCREENS[screen.name] || Menu;

  return (
    <>
      <div className="screen active">
        <Screen params={screen.params} />
      </div>
      {sheet && <BetSheet />}
      {betDetailId && <BetDetailModal />}
      {kellyInfo && <KellyModal />}
      {helpOpen && <HelpModal />}
      {toast && <div className="toast show">{toast}</div>}
    </>
  );
}
