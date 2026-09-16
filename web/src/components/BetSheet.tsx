import { useEffect, useState } from 'react';
import { useApp } from '../store';
import { fetchPredict } from '../api';
import { build1x2Picks, getBankroll, kellyFraction, outcomeFullLabel, Pick } from '../helpers';

const clampProb = (p: number) => Math.min(0.99, Math.max(0.01, p));

export function BetSheet() {
  const { sheet, closeSheet, profile, updateHistory, showToast } = useApp();
  const match = sheet!.match;
  const preselect = sheet!.preselect;
  const bankroll = getBankroll(profile);
  // Typy podane z zewnatrz (np. analiza meczu) maja pierwszenstwo nad 1X2 z kursow.
  const outcomes = sheet!.picks?.length ? sheet!.picks : build1x2Picks(match);
  const picksLabel = sheet!.picksLabel || '1 — Wybierz wynik który chcesz obstawić';

  const [selected, setSelected] = useState<Pick | null>(null);
  const [userProb, setUserProb] = useState(0.5);
  const [nflProb, setNflProb] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => { requestAnimationFrame(() => setOpen(true)); }, []);

  // NFL: prefetch predykcji modelu
  useEffect(() => {
    if (match.league === 'nfl') {
      fetchPredict(match.homeTeam, match.awayTeam)
        .then(d => { if (d?.homeWinProbability != null) setNflProb(d.homeWinProbability); })
        .catch(() => {});
    }
  }, [match]);

  // Preselect z rekomendacji / analizy meczu
  useEffect(() => {
    if (!preselect) return;
    const oc = outcomes.find(o => o.type === preselect.type)
      || { type: preselect.type, label: outcomeFullLabel(preselect.type), odds: preselect.odds };
    setSelected(oc);
    setUserProb(clampProb(preselect.prob));
  }, []);

  const select = (oc: Pick) => {
    setSelected(oc);
    const implied = 1 / oc.odds;
    // Prob z modelu (analiza meczu) > predykcja NFL > wycena buka.
    let def = oc.prob ?? implied;
    if (oc.prob == null && match.league === 'nfl' && nflProb != null) {
      def = oc.type === 'home' ? nflProb : oc.type === 'away' ? 1 - nflProb : implied;
    }
    setUserProb(clampProb(def));
  };

  const close = () => { setOpen(false); setTimeout(closeSheet, 300); };

  const save = () => {
    if (!selected) return;
    const kelly = kellyFraction(selected.odds, userProb);
    const betAmt = Math.round(bankroll * kelly / 4);
    const hasValue = userProb > 1 / selected.odds && kelly > 0;
    const bet = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date: new Date().toISOString(),
      commenceTime: match.commenceTime || null,
      league: match.league,
      match: `${match.homeTeam} vs ${match.awayTeam}`,
      home: match.homeTeam,
      away: match.awayTeam,
      outcome: selected.type,
      odds: selected.odds,
      userProb,
      betAmt,
      hasValue,
      result: 'pending' as const,
    };
    updateHistory(h => [bet, ...h].slice(0, 50));
    showToast(hasValue ? `Zapisano: ${betAmt} PLN` : 'Zapisano: PASS');
    close();
  };

  // Verdict
  const implied = selected ? 1 / selected.odds : 0;
  const kelly = selected ? kellyFraction(selected.odds, userProb) : 0;
  const betAmt = Math.round(bankroll * kelly / 4);
  const hasValue = selected ? userProb > implied && kelly > 0 : false;
  const profit = Math.round(betAmt * (selected ? selected.odds - 1 : 0));

  const time = new Date(match.commenceTime).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  const date = new Date(match.commenceTime).toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
  const modelSource = selected?.prob != null
    ? 'wg modelu'
    : match.league === 'nfl' && nflProb != null && selected && selected.type !== 'draw'
      ? 'wg modelu ELO'
      : 'możesz zmienić ↑';

  return (
    <>
      <div id="overlay" style={{ display: 'block' }} onClick={close} />
      <div id="sheet" className={open ? 'open' : ''}>
        <div className="sheet-handle" />
        <div className="sheet-header">
          <span className="sheet-close" onClick={close}>✕</span>
          <div className="sheet-match-time">{date}, {time}</div>
          <div className="sheet-match-title">{match.homeTeam} vs {match.awayTeam}</div>
        </div>

        <div className="sheet-section">
          <div className="sheet-section-label">{picksLabel}</div>
          <div className="outcome-row">
            {outcomes.map(oc => (
              <div key={oc.type} className={`outcome-btn${oc.estimated ? ' est' : ''}${selected?.type === oc.type ? ' selected' : ''}`} onClick={() => select(oc)}>
                {oc.marketLabel && <div className="outcome-btn-market">{oc.marketLabel}</div>}
                <div className="outcome-btn-label">{oc.label}</div>
                <div className="outcome-btn-odds">{oc.estimated ? '~' : ''}{oc.odds.toFixed(2)}</div>
                <div className="outcome-btn-implied">{oc.estimated ? 'szac. z 1X2' : `${(100 / oc.odds).toFixed(0)}% wg buka`}</div>
              </div>
            ))}
          </div>
        </div>

        {selected && (
          <div className="sheet-section">
            <div className="sheet-section-label">2 — Oceń szansę i sprawdź czy warto</div>
            <div className="prob-row">
              <div className="prob-box">
                <div className="prob-box-lbl">Bukmacher wycenia<br />szansę na:</div>
                <div className="prob-box-val">{(implied * 100).toFixed(0)}%</div>
                <div className="prob-box-sub">kurs {selected.odds.toFixed(2)}</div>
              </div>
              <div className="prob-box yours">
                <div className="prob-box-lbl">Twoja ocena<br />szansy:</div>
                <div className="prob-box-val">{Math.round(userProb * 100)}%</div>
                <div className="prob-box-sub">{modelSource}</div>
              </div>
            </div>
            <div className="slider-lbl">Przesuń suwak jeśli uważasz, że rzeczywista szansa jest <strong>wyższa lub niższa</strong>:</div>
            <div className="slider-row">
              <span className="slider-edge">1%</span>
              <input type="range" min={1} max={99} value={Math.round(userProb * 100)} onChange={e => setUserProb(parseInt(e.target.value) / 100)} />
              <span className="slider-edge">99%</span>
            </div>
            <div className={`verdict ${hasValue ? 'value' : 'no-value'}`}>
              <div className="verdict-icon">{hasValue ? '✅' : '❌'}</div>
              <div className="verdict-title">{hasValue ? 'WARTO POSTAWIĆ' : 'NIE STAWIAJ'}</div>
              <div className="verdict-amount">{hasValue ? (betAmt > 0 ? `${betAmt} PLN` : '< 1 PLN') : 'Brak value'}</div>
              {hasValue && <div className="verdict-sub">z bankrolla {bankroll.toLocaleString('pl-PL')} PLN</div>}
              {hasValue && <div><div className="verdict-profit">Możliwy zysk: +{profit} PLN</div></div>}
              <div className="verdict-explain">
                {hasValue
                  ? `Twoja ocena (${Math.round(userProb * 100)}%) jest wyższa niż wycena bukmachera (${Math.round(implied * 100)}%) — statystycznie opłaca się stawiać.`
                  : userProb <= implied
                    ? `Bukmacher wycenia szansę wyżej (${Math.round(implied * 100)}%) niż Ty (${Math.round(userProb * 100)}%). Nie opłaca się.`
                    : 'Różnica między Twoją oceną a kursem jest zbyt mała, żeby stawiać.'}
              </div>
            </div>
            <button className="save-bet-btn" onClick={save}>💾 Zapisz zakład w historii</button>
          </div>
        )}
      </div>
    </>
  );
}
