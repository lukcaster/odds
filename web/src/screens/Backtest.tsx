import { useEffect, useState, useCallback } from 'react';
import { useApp } from '../store';
import { Header } from '../components/Header';
import { fetchBacktest } from '../api';
import { fmtDateTime } from '../helpers';

interface Bucket { lo: number; hi: number; count: number; meanPredicted: number; actualRate: number; }
interface Report {
  label: string; model: string; predicted: number; skipped: number;
  brier: number; brierBaseline: number;
  logLoss: number; logLossBaseline: number;
  accuracy: number; accuracyBaseline: number;
  buckets: Bucket[];
}

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

/** Jeden przedział: co model obiecał vs co się faktycznie zdarzyło. */
function CalibrationRow({ b }: { b: Bucket }) {
  const diff = b.actualRate - b.meanPredicted;
  const off = Math.abs(diff) >= 0.05;
  // Przesada = model obiecywał więcej, niż dowiozła rzeczywistość.
  const tone = !off ? 'var(--text-dim)' : diff < 0 ? '#c62828' : '#f57c00';

  return (
    <div className="bt-row">
      <div className="bt-row-band">{pct(b.lo)}–{pct(b.hi)}</div>
      <div className="bt-row-bars">
        <div className="bt-bar-track">
          <div className="bt-bar said" style={{ width: `${b.meanPredicted * 100}%` }} />
        </div>
        <div className="bt-bar-track">
          <div className="bt-bar was" style={{ width: `${b.actualRate * 100}%`, background: tone }} />
        </div>
      </div>
      <div className="bt-row-nums">
        <div><strong>{pct(b.meanPredicted)}</strong> <span>obiecał</span></div>
        <div style={{ color: tone }}><strong>{pct(b.actualRate)}</strong> <span>było</span></div>
        <div className="bt-row-n">n={b.count}</div>
      </div>
    </div>
  );
}

function Metric({ label, value, baseline, lowerIsBetter = true }: {
  label: string; value: number; baseline: number; lowerIsBetter?: boolean;
}) {
  const better = lowerIsBetter ? value < baseline : value > baseline;
  return (
    <div className="bt-metric">
      <div className="bt-metric-lbl">{label}</div>
      <div className={`bt-metric-val ${better ? 'good' : 'bad'}`}>{value.toFixed(4)}</div>
      <div className="bt-metric-sub">baza {baseline.toFixed(4)}</div>
    </div>
  );
}

function ReportCard({ r }: { r: Report }) {
  const beatsBaseline = r.logLoss < r.logLossBaseline;
  return (
    <div className="bt-card">
      <div className="bt-card-head">
        <div>
          <div className="bt-card-title">{r.label}</div>
          <div className="bt-card-model">{r.model}</div>
        </div>
        <div className={`bt-verdict ${beatsBaseline ? 'ok' : 'bad'}`}>
          {beatsBaseline ? '✓ bije bazę' : '✗ gorszy od bazy'}
        </div>
      </div>

      <div className="bt-metrics">
        <Metric label="Brier" value={r.brier} baseline={r.brierBaseline} />
        <Metric label="Log loss" value={r.logLoss} baseline={r.logLossBaseline} />
        <div className="bt-metric">
          <div className="bt-metric-lbl">Trafienia</div>
          <div className={`bt-metric-val ${r.accuracy > r.accuracyBaseline ? 'good' : 'bad'}`}>{pct(r.accuracy)}</div>
          <div className="bt-metric-sub">baza {pct(r.accuracyBaseline)}</div>
        </div>
      </div>

      <div className="bt-sub">{r.predicted} prognoz · {r.skipped} pominiętych (za mało historii)</div>

      <div className="bt-cal-title">Kalibracja — czy „60%" naprawdę znaczy 60%?</div>
      {r.buckets.map(b => <CalibrationRow key={b.lo} b={b} />)}
    </div>
  );
}

export function Backtest() {
  const { navigate } = useApp();
  const [reports, setReports] = useState<Report[] | null>(null);
  const [computedAt, setComputedAt] = useState<string | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');

  const load = useCallback(async (force = false) => {
    setState('loading');
    try {
      const d = await fetchBacktest(force);
      setReports(d.reports || []);
      setComputedAt(d.computedAt || null);
      setState('ok');
    } catch { setState('error'); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const when = computedAt ? fmtDateTime(computedAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <>
      <Header title="🔬 Skuteczność modelu" sub={when ? `policzone ${when}` : 'backtest na historii wyników'}
        onBack={() => navigate('menu')}
        action={<button className="header-action-btn" disabled={state === 'loading'} onClick={() => load(true)}>↻</button>} />

      <div className="bt-body">
        <div className="bt-intro">
          Model dostaje mecze po kolei i typuje, widząc <strong>tylko wcześniejsze</strong> wyniki.
          Porównujemy go z „bazą", czyli samą znajomością tego, jak często w danej lidze wygrywa gospodarz.
          <strong> Model, który nie bije bazy, nie wnosi nic.</strong> Nie kosztuje to żadnych kredytów API.
        </div>

        {state === 'loading' && <div className="state-box"><div className="spinner" /><p>Przeliczam historię...</p></div>}
        {state === 'error' && <div className="state-box"><div className="icon">⚠️</div><p>Nie udało się policzyć backtestu</p></div>}
        {state === 'ok' && (!reports?.length
          ? <div className="rec-empty"><p>Za mało wyników w cache, żeby cokolwiek ocenić.<br />Otwórz Power Ranking, żeby dociągnąć mecze.</p></div>
          : reports.map(r => <ReportCard key={r.label + r.model} r={r} />))}
      </div>
    </>
  );
}
