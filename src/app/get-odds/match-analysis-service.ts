import axios from 'axios';
import * as dotenv from 'dotenv';
import { Sport, SportConfig } from '../utils/enums/sport';
import { SoccerPredictionModel, isSoccerSport } from './soccer-prediction-model';
import { HybridPredictionModel } from './hybrid-prediction-model';

dotenv.config();

export interface MatchBetRecommendation {
    rank: number;
    marketKey: string;
    marketLabel: string;
    outcomeLabel: string;
    odds: number;
    bookmakerName: string;
    ourProbability: number;
    impliedProbability: number;
    kellyFraction: number;
    fractionalKelly: number;
    edgePercent: number;
}

export interface MatchAnalysis {
    matchId: string;
    homeTeam: string;
    awayTeam: string;
    sport: Sport;
    xgHome?: number;
    xgAway?: number;
    recommendations: MatchBetRecommendation[];
    marketsChecked: number;
    computedAt: string;
}

const MIN_EDGE   = 0.02;   // 2% minimum edge
const MIN_KELLY  = 0.005;  // 0.5% Kelly
const MAX_KELLY  = 0.30;   // safety cap before fractioning
const MAX_GOALS  = 9;

export class MatchAnalysisService {
    private readonly apiKey: string;
    private readonly baseUrl = 'https://api.the-odds-api.com/v4';

    constructor(
        private soccerModel: SoccerPredictionModel,
        private predictionModel: HybridPredictionModel
    ) {
        this.apiKey = process.env.apiKey || '';
    }

    public async analyzeMatch(
        eventId: string,
        sport: Sport,
        homeTeam: string,
        awayTeam: string
    ): Promise<MatchAnalysis> {
        const config = SportConfig[sport];

        // Fetch multi-market odds for this specific event
        const markets = isSoccerSport(sport)
            ? 'h2h,totals,btts,double_chance'
            : 'h2h,spreads,totals';

        let bookmakers: any[] = [];
        try {
            const res = await axios.get(`${this.baseUrl}/sports/${sport}/events/${eventId}/odds`, {
                params: { apiKey: this.apiKey, regions: config.region, markets, oddsFormat: 'decimal' }
            });
            bookmakers = res.data?.bookmakers ?? [];
            console.log(`[MatchAnalysis] ${homeTeam} vs ${awayTeam}: ${bookmakers.length} bukmacherów`);
        } catch (err: any) {
            console.error(`[MatchAnalysis] błąd API: ${err?.message}`);
        }

        // Get model probabilities
        let xgHome: number | undefined;
        let xgAway: number | undefined;
        let modelProbs: Record<string, number> = {};

        if (isSoccerSport(sport)) {
            const pred = await this.soccerModel.predict(homeTeam, awayTeam, sport).catch(() => null);
            if (pred) {
                xgHome = pred.lambdaHome;
                xgAway = pred.lambdaAway;
                modelProbs = this.computeSoccerProbs(pred.lambdaHome, pred.lambdaAway, homeTeam, awayTeam);
                console.log(`[MatchAnalysis] xG: dom=${xgHome.toFixed(2)} goście=${xgAway.toFixed(2)}`);
            }
        } else if (sport === Sport.NFL) {
            const p = await this.predictionModel.getPredictionAsync(homeTeam, awayTeam).catch(() => null);
            if (p != null) {
                modelProbs[`h2h_${homeTeam}`] = p;
                modelProbs[`h2h_${awayTeam}`] = 1 - p;
            }
        }

        // Scan all bookmakers + markets and find value
        const candidates: Omit<MatchBetRecommendation, 'rank'>[] = [];
        let marketsChecked = 0;

        for (const bm of bookmakers) {
            for (const mkt of bm.markets ?? []) {
                for (const outcome of mkt.outcomes ?? []) {
                    marketsChecked++;
                    if (outcome.price <= 1.01) continue;

                    const modelKey = this.buildModelKey(mkt.key, outcome, homeTeam, awayTeam);
                    const modelProb = modelProbs[modelKey];
                    if (modelProb == null) continue;

                    const impliedProb = 1 / outcome.price;
                    const edge = modelProb - impliedProb;
                    const b = outcome.price - 1;
                    const kelly = Math.min(MAX_KELLY, (b * modelProb - (1 - modelProb)) / b);

                    if (edge <= MIN_EDGE || kelly <= MIN_KELLY) continue;

                    candidates.push({
                        marketKey:    mkt.key,
                        marketLabel:  this.marketLabel(mkt.key, outcome.point),
                        outcomeLabel: this.outcomeLabel(mkt.key, outcome, homeTeam, awayTeam),
                        odds:         outcome.price,
                        bookmakerName: bm.title,
                        ourProbability:    modelProb,
                        impliedProbability: impliedProb,
                        kellyFraction:   kelly,
                        fractionalKelly: kelly / 4,
                        edgePercent:     edge * 100
                    });
                }
            }
        }

        // Deduplicate: keep best odds per (market + outcome)
        const best = new Map<string, Omit<MatchBetRecommendation, 'rank'>>();
        for (const c of candidates) {
            const key = `${c.marketKey}_${c.outcomeLabel}`;
            const existing = best.get(key);
            if (!existing || c.odds > existing.odds) best.set(key, c);
        }

        const top3 = Array.from(best.values())
            .sort((a, b) => b.kellyFraction - a.kellyFraction)
            .slice(0, 3)
            .map((bet, i) => ({ ...bet, rank: i + 1 }));

        console.log(`[MatchAnalysis] marketsChecked=${marketsChecked} candidates=${candidates.length} top3=${top3.length}`);

        return { matchId: eventId, homeTeam, awayTeam, sport, xgHome, xgAway, recommendations: top3, marketsChecked, computedAt: new Date().toISOString() };
    }

    // ── Soccer: full Poisson distribution across all markets ──────────────────

    private computeSoccerProbs(lH: number, lA: number, home: string, away: string): Record<string, number> {
        const probs: Record<string, number> = {};

        // Joint goal matrix
        const joint: number[][] = Array.from({ length: MAX_GOALS + 1 }, (_, h) =>
            Array.from({ length: MAX_GOALS + 1 }, (_, a) => poissonPMF(h, lH) * poissonPMF(a, lA))
        );

        // 1X2
        let hw = 0, dr = 0, aw = 0;
        for (let h = 0; h <= MAX_GOALS; h++) {
            for (let a = 0; a <= MAX_GOALS; a++) {
                if (h > a) hw += joint[h][a];
                else if (h === a) dr += joint[h][a];
                else aw += joint[h][a];
            }
        }
        const total = hw + dr + aw;
        probs[`h2h_${home}`] = hw / total;
        probs['h2h_Draw']    = dr / total;
        probs[`h2h_${away}`] = aw / total;

        // Double chance
        probs[`dc_${home}/Draw`]  = (hw + dr) / total;
        probs[`dc_Draw/${away}`]  = (dr + aw) / total;
        probs[`dc_${home}/${away}`] = (hw + aw) / total;
        // also store short forms
        probs['dc_1X'] = (hw + dr) / total;
        probs['dc_X2'] = (dr + aw) / total;
        probs['dc_12'] = (hw + aw) / total;

        // Totals over/under
        for (const line of [0.5, 1.5, 2.5, 3.5, 4.5]) {
            let over = 0;
            for (let h = 0; h <= MAX_GOALS; h++) {
                for (let a = 0; a <= MAX_GOALS; a++) {
                    if (h + a > line) over += joint[h][a];
                }
            }
            probs[`totals_${line}_Over`]  = over;
            probs[`totals_${line}_Under`] = 1 - over;
        }

        // BTTS
        const bttsYes = (1 - Math.exp(-lH)) * (1 - Math.exp(-lA));
        probs['btts_Yes'] = bttsYes;
        probs['btts_No']  = 1 - bttsYes;

        return probs;
    }

    // ── Key builders ──────────────────────────────────────────────────────────

    private buildModelKey(mktKey: string, outcome: any, home: string, away: string): string {
        const name = outcome.name as string;
        switch (mktKey) {
            case 'h2h':
                return `h2h_${name}`;  // name IS the team name or 'Draw'
            case 'double_chance':
                // API can return '1X', 'X2', '12' OR team-name variants
                if (name === '1X' || name === 'X2' || name === '12') return `dc_${name}`;
                return `dc_${name}`;  // team-name variant stored with same key
            case 'totals':
                if (outcome.point == null) return '';
                return `totals_${outcome.point}_${name}`; // name = 'Over' | 'Under'
            case 'btts':
                return `btts_${name}`; // name = 'Yes' | 'No'
            default:
                return '';
        }
    }

    // ── Labels ────────────────────────────────────────────────────────────────

    private marketLabel(mktKey: string, point?: number): string {
        switch (mktKey) {
            case 'h2h':           return 'Wynik meczu';
            case 'double_chance': return 'Podwójna szansa';
            case 'totals':        return `Suma goli ${point ?? ''}`.trim();
            case 'btts':          return 'Obie drużyny strzelą';
            case 'spreads':       return 'Handicap';
            default:              return mktKey;
        }
    }

    private outcomeLabel(mktKey: string, outcome: any, home: string, away: string): string {
        const name = outcome.name as string;
        if (mktKey === 'h2h') {
            if (name === home) return `${home} wygra`;
            if (name === away) return `${away} wygra`;
            if (name === 'Draw') return 'Remis';
        }
        if (mktKey === 'totals') {
            const dir = name === 'Over' ? 'Ponad' : 'Poniżej';
            return `${dir} ${outcome.point} goli`;
        }
        if (mktKey === 'btts') {
            return name === 'Yes' ? 'Tak — obie drużyny strzelą' : 'Nie — co najmniej jedna nie strzeli';
        }
        if (mktKey === 'double_chance') {
            if (name === '1X') return `${home} lub Remis`;
            if (name === 'X2') return `Remis lub ${away}`;
            if (name === '12') return `${home} lub ${away}`;
            return name;
        }
        return name;
    }
}

function poissonPMF(k: number, lambda: number): number {
    if (lambda <= 0) return k === 0 ? 1 : 0;
    let logP = -lambda + k * Math.log(lambda);
    for (let i = 1; i <= k; i++) logP -= Math.log(i);
    return Math.exp(logP);
}
