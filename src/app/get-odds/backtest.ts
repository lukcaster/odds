/**
 * Backtest modeli predykcji na historii wynikow (backfill + /scores).
 *
 * Idea: przejezdzamy mecze ligi CHRONOLOGICZNIE i dla kazdego pytamy model
 * o prognoze, majac do dyspozycji WYLACZNIE mecze wczesniejsze. Dopiero potem
 * karmimy go wynikiem. Dzieki temu model nigdy nie oglada przyszlosci.
 *
 * Mierzymy trzy rzeczy:
 *  - KALIBRACJA — gdy model mowi 60%, czy zdarza sie to w 60% przypadkow?
 *    To najwazniejsze pytanie: cala logika Kelly'ego zaklada, ze `p` jest prawdziwe.
 *  - BRIER / LOG LOSS — jakosc prognoz, im mniej tym lepiej.
 *  - PORÓWNANIE Z BAZĄ — czy model bije zwykle "czestosci historyczne tej ligi".
 *    Model, ktory tego nie bije, nie wnosi nic ponad znajomosc rozkladu wynikow.
 */

import { EloEngine, EloOptions } from './elo-engine';
import { MatchResult, ResultsService, standingsFromResults } from './results-service';
import { isSoccerSport, SoccerPredictionModel } from './soccer-prediction-model';
import { ELO_OPTS } from './power-ranking-service';
import { RatingsService } from './ratings-service';
import { Sport, SportConfig } from '../utils/enums/sport';

export interface CalibrationBucket {
    lo: number;
    hi: number;
    count: number;
    meanPredicted: number;
    actualRate: number;
}

export interface BacktestReport {
    label: string;
    model: string;
    predicted: number;
    skipped: number;
    /** Brier score (im mniej tym lepiej) — model vs sama znajomosc czestosci w lidze. */
    brier: number;
    brierBaseline: number;
    logLoss: number;
    logLossBaseline: number;
    /** Trafienie najbardziej prawdopodobnego wyniku. */
    accuracy: number;
    accuracyBaseline: number;
    buckets: CalibrationBucket[];
}

/** Jedna para: co model obiecal i czy sie zdarzylo. */
interface Observation {
    p: number;
    happened: number; // 1 / 0, dla ELO takze 0.5 przy remisie
}

const outcomeOf = (r: MatchResult): 'home' | 'draw' | 'away' =>
    r.homeScore > r.awayScore ? 'home' : r.homeScore < r.awayScore ? 'away' : 'draw';

const chronological = (results: MatchResult[]): MatchResult[] =>
    [...results].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

function calibration(obs: Observation[], bands = 10): CalibrationBucket[] {
    const buckets: CalibrationBucket[] = [];
    for (let i = 0; i < bands; i++) {
        const lo = i / bands;
        const hi = (i + 1) / bands;
        // Ostatni kubelek domyka przedzial, zeby p=1.0 gdzies wpadlo.
        const inBand = obs.filter(o => o.p >= lo && (i === bands - 1 ? o.p <= hi : o.p < hi));
        if (!inBand.length) continue;
        buckets.push({
            lo, hi,
            count: inBand.length,
            meanPredicted: inBand.reduce((s, o) => s + o.p, 0) / inBand.length,
            actualRate: inBand.reduce((s, o) => s + o.happened, 0) / inBand.length,
        });
    }
    return buckets;
}

const clampP = (p: number) => Math.min(1 - 1e-9, Math.max(1e-9, p));

/**
 * Backtest modelu Poissona dla pilki — tego, ktory realnie napedza polecane.
 * Uzywamy PRAWDZIWEJ klasy SoccerPredictionModel, podstawiajac jej tylko
 * okrojona historie wynikow.
 */
export async function backtestSoccer(sport: Sport, all: MatchResult[], eloWeight?: number): Promise<BacktestReport> {
    const results = chronological(all);
    let prefix: MatchResult[] = [];

    // Podstawiamy ResultsService, ktory widzi tylko mecze sprzed danej kolejki.
    const stubResults = { getResults: () => prefix } as unknown as ResultsService;
    const model = new SoccerPredictionModel({} as RatingsService, stubResults);
    if (eloWeight != null) model.eloWeight = eloWeight;

    const obs: Observation[] = [];
    let skipped = 0, hits = 0, scored = 0;
    let brier = 0, logLoss = 0;

    for (let i = 0; i < results.length; i++) {
        prefix = results.slice(0, i);
        const match = results[i];
        const pred = prefix.length ? await model.predict(match.home, match.away, sport) : null;
        if (!pred) { skipped++; continue; }

        const actual = outcomeOf(match);
        const probs: Record<string, number> = { home: pred.homeWin, draw: pred.draw, away: pred.awayWin };

        for (const key of ['home', 'draw', 'away']) {
            obs.push({ p: probs[key], happened: key === actual ? 1 : 0 });
            brier += Math.pow(probs[key] - (key === actual ? 1 : 0), 2);
        }
        logLoss += -Math.log(clampP(probs[actual]));

        const best = (['home', 'draw', 'away'] as const).reduce((a, b) => (probs[a] >= probs[b] ? a : b));
        if (best === actual) hits++;
        scored++;
    }

    // Baza: czestosci 1/X/2 w tej samej probce (in-sample, wiec baza ma lekka fore).
    const counts = { home: 0, draw: 0, away: 0 };
    for (const r of results) counts[outcomeOf(r)]++;
    const base = {
        home: counts.home / results.length,
        draw: counts.draw / results.length,
        away: counts.away / results.length,
    };
    const baseBest = (['home', 'draw', 'away'] as const).reduce((a, b) => (base[a] >= base[b] ? a : b));

    let brierBase = 0, logLossBase = 0, hitsBase = 0;
    for (let i = 0; i < results.length; i++) {
        const actual = outcomeOf(results[i]);
        for (const key of ['home', 'draw', 'away'] as const) {
            brierBase += Math.pow(base[key] - (key === actual ? 1 : 0), 2);
        }
        logLossBase += -Math.log(clampP(base[actual]));
        if (baseBest === actual) hitsBase++;
    }

    return {
        label: SportConfig[sport].label,
        model: `Poisson + ELO (waga ELO ${(eloWeight ?? model.eloWeight).toFixed(2)})`,
        predicted: scored,
        skipped,
        brier: scored ? brier / scored : 0,
        brierBaseline: results.length ? brierBase / results.length : 0,
        logLoss: scored ? logLoss / scored : 0,
        logLossBaseline: results.length ? logLossBase / results.length : 0,
        accuracy: scored ? hits / scored : 0,
        accuracyBaseline: results.length ? hitsBase / results.length : 0,
        buckets: calibration(obs),
    };
}

/**
 * Pelny raport dla wszystkich lig, ktore maja dosc historii. Wspolne dla CLI
 * (`npm run backtest`) i endpointu `/api/backtest` — jedno zrodlo prawdy.
 * Nie dotyka sieci: czyta wylacznie wyniki z dysku.
 */
export async function runAllBacktests(resultsService: ResultsService): Promise<BacktestReport[]> {
    const reports: BacktestReport[] = [];
    for (const sport of Object.values(Sport)) {
        const results = resultsService.getResults(sport as Sport);
        if (results.length < MIN_SAMPLE) continue;

        if (isSoccerSport(sport as Sport)) {
            reports.push(await backtestSoccer(sport as Sport, results));
        }
        reports.push(backtestElo(sport as Sport, results, ELO_OPTS[sport as Sport]));
    }
    return reports;
}

/** Ponizej tylu meczow jakakolwiek ocena modelu jest bez sensu. */
export const MIN_SAMPLE = 50;

/**
 * Przejezdza backtest dla kilku wag ELO i zwraca raporty — pozwala dobrac
 * wage danymi zamiast na wyczucie.
 */
export async function sweepEloWeight(
    sport: Sport,
    all: MatchResult[],
    weights: number[]
): Promise<{ weight: number; report: BacktestReport }[]> {
    const out: { weight: number; report: BacktestReport }[] = [];
    for (const w of weights) {
        out.push({ weight: w, report: await backtestSoccer(sport, all, w) });
    }
    return out;
}

/**
 * Backtest silnika ELO. Remis liczy sie jako pol wygranej — tak samo, jak
 * traktuje go sam silnik przy aktualizacji ratingow.
 */
export function backtestElo(sport: Sport, all: MatchResult[], opts?: EloOptions): BacktestReport {
    const results = chronological(all);
    const engine = new EloEngine(opts);

    const obs: Observation[] = [];
    let skipped = 0, hits = 0, scored = 0, decisive = 0;
    let brier = 0, logLoss = 0;

    for (const match of results) {
        // Prognoza tylko gdy obie druzyny maja juz jakas historie.
        if (!engine.has(match.home) || !engine.has(match.away)) {
            skipped++;
            engine.feed(match);
            continue;
        }

        const p = engine.expectedHomeScore(match.home, match.away);
        const outcome = outcomeOf(match);
        const actual = outcome === 'home' ? 1 : outcome === 'draw' ? 0.5 : 0;

        obs.push({ p, happened: actual });
        brier += Math.pow(p - actual, 2);
        logLoss += -(actual * Math.log(clampP(p)) + (1 - actual) * Math.log(clampP(1 - p)));
        // Trafienia liczymy TYLKO na meczach rozstrzygnietych — przy remisie
        // pytanie "kto wygral" nie ma sensu i zawyzalo statystyke.
        if (outcome !== 'draw') {
            decisive++;
            if ((p >= 0.5) === (outcome === 'home')) hits++;
        }
        scored++;

        engine.feed(match);
    }

    // Baza: sredni wynik gospodarza w lidze (czyli sama przewaga gospodarza).
    const baseRate = results.reduce((s, r) => {
        const o = outcomeOf(r);
        return s + (o === 'home' ? 1 : o === 'draw' ? 0.5 : 0);
    }, 0) / (results.length || 1);

    let brierBase = 0, logLossBase = 0, hitsBase = 0, decisiveBase = 0;
    for (const r of results) {
        const o = outcomeOf(r);
        const actual = o === 'home' ? 1 : o === 'draw' ? 0.5 : 0;
        brierBase += Math.pow(baseRate - actual, 2);
        logLossBase += -(actual * Math.log(clampP(baseRate)) + (1 - actual) * Math.log(clampP(1 - baseRate)));
        if (o !== 'draw') {
            decisiveBase++;
            if ((baseRate >= 0.5) === (o === 'home')) hitsBase++;
        }
    }

    return {
        label: SportConfig[sport].label,
        model: `ELO (home +${opts?.home ?? 55}, K=${opts?.k ?? 24})`,
        predicted: scored,
        skipped,
        brier: scored ? brier / scored : 0,
        brierBaseline: results.length ? brierBase / results.length : 0,
        logLoss: scored ? logLoss / scored : 0,
        logLossBaseline: results.length ? logLossBase / results.length : 0,
        accuracy: decisive ? hits / decisive : 0,
        accuracyBaseline: decisiveBase ? hitsBase / decisiveBase : 0,
        buckets: calibration(obs),
    };
}
