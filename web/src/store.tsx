import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { Bet, Pick, Profile, betHomeAway } from './helpers';
import { postSettle } from './api';

export type ScreenName =
  | 'disclaimer' | 'profile-setup' | 'menu' | 'bets' | 'power'
  | 'leagues' | 'matches' | 'match-detail' | 'recommended' | 'profile-edit';

interface Screen { name: ScreenName; params?: any; }

export interface SheetState {
  match: any;
  /** Typy do wyboru. Bez tego arkusz sam zbuduje 1X2 (+ podwojna szansa) z kursow meczu. */
  picks?: Pick[];
  /** Naglowek sekcji wyboru — domyslnie tekst kalkulatora 1X2. */
  picksLabel?: string;
  preselect?: { type: string; odds: number; prob: number };
}

interface AppState {
  profile: Profile | null;
  saveProfile: (p: Profile) => void;
  updateHistory: (fn: (h: Bet[]) => Bet[]) => void;
  screen: Screen;
  navigate: (name: ScreenName, params?: any) => void;
  toast: string | null;
  showToast: (msg: string) => void;
  settlePending: () => Promise<void>;
  // UI: bottom sheet + modale
  sheet: SheetState | null;
  openSheet: (s: SheetState) => void;
  closeSheet: () => void;
  betDetailId: string | null;
  openBetDetail: (id: string) => void;
  closeBetDetail: () => void;
  helpOpen: boolean;
  setHelpOpen: (v: boolean) => void;
  kellyInfo: { betAmt: number; kellyPct: string; bankroll: number } | null;
  showKellyInfo: (info: { betAmt: number; kellyPct: string; bankroll: number } | null) => void;
}

const Ctx = createContext<AppState>(null as any);
export const useApp = () => useContext(Ctx);

function loadProfile(): Profile | null {
  try {
    const p = JSON.parse(localStorage.getItem('profile') || 'null');
    if (p?.history?.length) {
      for (const b of p.history) {
        if (!b.id) b.id = `${new Date(b.date).getTime() || Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        if (!b.result) b.result = 'pending';
      }
    }
    return p;
  } catch {
    return null;
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(loadProfile);
  const agreed = !!localStorage.getItem('agreedDisclaimer');
  const initial: ScreenName = !agreed ? 'disclaimer' : profile?.nickname ? 'menu' : 'profile-setup';
  const [screen, setScreen] = useState<Screen>({ name: initial });
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<any>(null);
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [betDetailId, setBetDetailId] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [kellyInfo, showKellyInfo] = useState<{ betAmt: number; kellyPct: string; bankroll: number } | null>(null);

  // Zawsze aktualny profil dla callbackow, ktore nie chca sie re-tworzyc.
  const profileRef = useRef<Profile | null>(profile);
  profileRef.current = profile;

  const persist = useCallback((p: Profile | null) => {
    if (p) localStorage.setItem('profile', JSON.stringify(p));
  }, []);

  const saveProfile = useCallback((p: Profile) => {
    setProfile(p);
    persist(p);
  }, [persist]);

  const updateHistory = useCallback((fn: (h: Bet[]) => Bet[]) => {
    setProfile(prev => {
      if (!prev) return prev;
      const next = { ...prev, history: fn(prev.history || []) };
      persist(next);
      return next;
    });
  }, [persist]);

  const navigate = useCallback((name: ScreenName, params?: any) => setScreen({ name, params }), []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const settlePending = useCallback(async () => {
    const now = Date.now();
    const history: Bet[] = profileRef.current?.history || [];
    const pending = history.filter(b =>
      b.betAmt > 0 && b.result !== 'won' && b.result !== 'lost' && b.result !== 'void' &&
      b.commenceTime && new Date(b.commenceTime).getTime() <= now
    );
    if (!pending.length) return;
    const payload = pending.map(b => {
      const { home, away } = betHomeAway(b);
      return { id: b.id, league: b.league, home, away, outcome: b.outcome, commenceTime: b.commenceTime };
    }).filter(b => b.id && b.home && b.away);
    if (!payload.length) return;
    try {
      const data = await postSettle(payload);
      const map = new Map<string, any>((data.settled || []).map((s: any) => [s.id, s]));
      updateHistory(h => h.map(b => {
        const s = map.get(b.id);
        if (s && (s.result === 'won' || s.result === 'lost' || s.result === 'void')) {
          return { ...b, result: s.result, homeScore: s.homeScore, awayScore: s.awayScore };
        }
        return b;
      }));
    } catch { /* offline */ }
  }, [updateHistory]);

  return (
    <Ctx.Provider value={{
      profile, saveProfile, updateHistory, screen, navigate, toast, showToast, settlePending,
      sheet, openSheet: setSheet, closeSheet: () => setSheet(null),
      betDetailId, openBetDetail: setBetDetailId, closeBetDetail: () => setBetDetailId(null),
      helpOpen, setHelpOpen,
      kellyInfo, showKellyInfo,
    }}>
      {children}
    </Ctx.Provider>
  );
}
