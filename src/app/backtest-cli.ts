/**
 * Backtest modeli na historii wynikow. Odpalasz:
 *   npm run backtest            — raport dla wszystkich lig
 *   npm run backtest -- --sweep — dobor wagi ELO dla pilki
 *
 * Nie rusza zadnego API — czyta wylacznie results-cache.json i pliki backfillu.
 */
import { runAllBacktests, sweepEloWeight, MIN_SAMPLE, BacktestReport } from './get-odds/backtest';
import { ResultsService } from './get-odds/results-service';
import { isSoccerSport } from './get-odds/soccer-prediction-model';
import { Sport } from './utils/enums/sport';

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const WEIGHTS = [0, 0.25, 0.5, 0.75, 1];

function printReport(r: BacktestReport): void {
    const better = (model: number, base: number) => (model < base ? '✅ lepiej' : '❌ GORZEJ');
    console.log('');
    console.log(`── ${r.label} · ${r.model}`);
    console.log(`   prognoz: ${r.predicted}  (pominietych: ${r.skipped} — za malo historii)`);
    if (!r.predicted) { console.log('   brak danych do oceny'); return; }
    console.log(`   Brier:    ${r.brier.toFixed(4)}  vs baza ${r.brierBaseline.toFixed(4)}   ${better(r.brier, r.brierBaseline)}`);
    console.log(`   Log loss: ${r.logLoss.toFixed(4)}  vs baza ${r.logLossBaseline.toFixed(4)}   ${better(r.logLoss, r.logLossBaseline)}`);
    console.log(`   Trafienia: ${pct(r.accuracy)} vs baza ${pct(r.accuracyBaseline)}`);
    console.log('   Kalibracja (model mowil -> faktycznie sie zdarzylo):');
    for (const b of r.buckets) {
        const diff = b.actualRate - b.meanPredicted;
        const flag = Math.abs(diff) < 0.05 ? '  ' : diff > 0 ? '↑ za ostrozny' : '↓ PRZESADZA';
        const bar = '█'.repeat(Math.max(1, Math.round(b.count / 40)));
        console.log(`     ${pct(b.lo).padStart(6)}-${pct(b.hi).padEnd(6)} n=${String(b.count).padStart(4)} | mowil ${pct(b.meanPredicted).padStart(6)} -> bylo ${pct(b.actualRate).padStart(6)}  ${flag} ${bar}`);
    }
}

/** Szuka najlepszej wagi ELO dla pilki — decyduja dane, nie przeczucie. */
async function runSweep(rs: ResultsService): Promise<void> {
    console.log('');
    console.log('═══ DOBOR WAGI ELO (0 = sam Poisson, 1 = sam podzial z ELO) ═══');

    for (const sport of Object.values(Sport)) {
        if (!isSoccerSport(sport as Sport)) continue;
        const results = rs.getResults(sport as Sport);
        if (results.length < MIN_SAMPLE) continue;

        const runs = await sweepEloWeight(sport as Sport, results, WEIGHTS);
        const best = runs.reduce((a, b) => (a.report.logLoss <= b.report.logLoss ? a : b));
        console.log('');
        console.log(`── ${runs[0].report.label}  (baza: Brier ${runs[0].report.brierBaseline.toFixed(4)}, log loss ${runs[0].report.logLossBaseline.toFixed(4)})`);
        for (const { weight, report } of runs) {
            const mark = weight === best.weight ? ' <== najlepsza' : '';
            console.log(`   waga ${weight.toFixed(2)}: Brier ${report.brier.toFixed(4)}  log loss ${report.logLoss.toFixed(4)}  trafienia ${pct(report.accuracy)}${mark}`);
        }
    }

    console.log('');
    console.log('Wybieramy po log loss — karze pewne pomylki mocniej niz Brier, a o to chodzi przy Kellym.');
    console.log('');
}

(async () => {
    const rs = new ResultsService();

    if (process.argv.includes('--sweep')) {
        await runSweep(rs);
        return;
    }

    const reports: BacktestReport[] = await runAllBacktests(rs);

    console.log('');
    console.log('═══ BACKTEST MODELI (walk-forward, bez podgladania przyszlosci) ═══');
    reports.forEach(printReport);
    console.log('');
    console.log('Baza = sama znajomosc czestosci wynikow w lidze. Model, ktory jej nie bije, nie wnosi nic.');
    console.log('');
})();
