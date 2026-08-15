import { OddsCache } from './odds-service';
import { HybridPredictionModel } from './hybrid-prediction-model';
import { SoccerPredictionModel, isSoccerSport } from './soccer-prediction-model';
import { Sport, SportConfig, SPORT_TO_LEAGUE_KEY } from '../utils/enums/sport';

export type OutcomeType = 'home' | 'draw' | 'away' | '1X' | '12' | 'X2';

export interface RecommendedBet {
    rank: number;
    matchId: string;
    leagueKey: string;
    sport: Sport;
    sportLabel: string;
    countryFlag: string;
    sportIcon: string;
    homeTeam: string;
    awayTeam: string;
    commenceTime: string;
    outcomeType: OutcomeType;
    outcomeLabel: string;
    odds: number;
    estimatedOdds: boolean;   // true dla double chance (kurs liczony z 1X2)
    bookmakerName: string;
    ourProbability: number;
    impliedProbability: number;
    kellyFraction: number;
    fractionalKelly: number;
    edgePercent: number;
    probabilitySource: 'model' | 'consensus';
    bookmakerCount: number;
}

const MIN_EDGE = 0.015;        // minimum 1.5% edge to include
const MIN_KELLY = 0.005;       // minimum 0.5% Kelly
const ROUND_WINDOW_DAYS = 4;   // "następna kolejka": mecze w N dni od najbliższego meczu ligi
const MAX_DAYS_AHEAD = 14;     // twardy limit: nie polecaj meczów dalej niż N dni (np. NFL zaczyna sezon we wrześniu)

interface Single {
    type: 'home' | 'draw' | 'away';
    label: string;
    odds: number;
    prob: number;
    kelly: number;
    edge: number;
    implied: number;
}

export class RecommendedService {
    constructor(
        private predictionModel: HybridPredictionModel,
        private soccerModel: SoccerPredictionModel
    ) {}

    public async computeRecommended(cacheMap: Map<Sport, OddsCache>): Promise<RecommendedBet[]> {
        const candidates: Omit<RecommendedBet, 'rank'>[] = [];

        for (const [sport, cache] of cacheMap) {
            const config = SportConfig[sport];

            // Okno "następna kolejka": kotwica na najwcześniejszym nadchodzącym meczu ligi.
            const startFloor = new Date(); startFloor.setHours(0, 0, 0, 0);
            const floorMs = startFloor.getTime();
            const upcoming = cache.data.filter(m => m.odds && new Date(m.commenceTime).getTime() >= floorMs);
            if (!upcoming.length) {
                console.log(`[Recommended] ${config.label}: brak nadchodzących meczów`);
                continue;
            }
            const earliest = Math.min(...upcoming.map(m => new Date(m.commenceTime).getTime()));
            const maxAhead = floorMs + MAX_DAYS_AHEAD * 86400000;
            if (earliest > maxAhead) {
                console.log(`[Recommended] ${config.label}: najbliższy mecz za >${MAX_DAYS_AHEAD} dni (${new Date(earliest).toLocaleDateString('pl-PL')}) — pomijam`);
                continue;
            }
            const roundEnd = Math.min(earliest + ROUND_WINDOW_DAYS * 86400000, maxAhead);
            console.log(`[Recommended] ${config.label}: ${cache.data.length} w cache | kolejka od ${new Date(earliest).toLocaleDateString('pl-PL')} do ${new Date(roundEnd).toLocaleDateString('pl-PL')}`);

            let skippedWrongWeek = 0, skippedNoOdds = 0, skippedNoModel = 0, skippedNoEdge = 0, added = 0;

            for (const match of cache.data) {
                const t = new Date(match.commenceTime).getTime();
                if (t < floorMs || t > roundEnd) { skippedWrongWeek++; continue; }
                if (!match.odds) { skippedNoOdds++; continue; }

                let homeProb: number, awayProb: number;
                let drawProb: number | undefined;
                let source: 'model' | 'consensus';
                let bookmakerCount: number;

                if (sport === Sport.NFL) {
                    const prediction = await this.predictionModel.getPredictionAsync(match.homeTeam, match.awayTeam).catch(() => null);
                    if (prediction == null) { skippedNoModel++; continue; }
                    homeProb = prediction; awayProb = 1 - prediction;
                    source = 'model'; bookmakerCount = 1;
                } else if (isSoccerSport(sport)) {
                    const prediction = await this.soccerModel.predict(match.homeTeam, match.awayTeam, sport).catch(() => null);
                    if (prediction) {
                        homeProb = prediction.homeWin; awayProb = prediction.awayWin; drawProb = prediction.draw;
                        source = 'model'; bookmakerCount = prediction.teamFound ? 1 : 0;
                    } else {
                        const c = match.consensusProbability ?? this.noVigFromOdds(match.odds);
                        homeProb = c.home; awayProb = c.away; drawProb = c.draw;
                        source = 'consensus'; bookmakerCount = match.consensusProbability?.bookmakerCount ?? 1;
                    }
                } else {
                    const c = match.consensusProbability ?? this.noVigFromOdds(match.odds);
                    homeProb = c.home; awayProb = c.away;
                    source = 'consensus'; bookmakerCount = match.consensusProbability?.bookmakerCount ?? 1;
                }

                // Najlepsze dostępne kursy (line shopping); fallback do wyświetlanych.
                const bestOdds = match.bestOdds ?? match.odds;
                const hasDraw = match.odds.draw != null && drawProb != null && (bestOdds!.draw ?? match.odds.draw) != null;

                const singles: Single[] = [
                    this.mkSingle('home', match.homeTeam, bestOdds!.home, homeProb),
                    this.mkSingle('away', match.awayTeam, bestOdds!.away, awayProb),
                ];
                if (hasDraw) {
                    singles.push(this.mkSingle('draw', 'Remis', (bestOdds!.draw ?? match.odds.draw)!, drawProb!));
                }

                for (const s of singles) {
                    console.log(`  [${config.label}] ${match.homeTeam} vs ${match.awayTeam} | ${s.type}: prob=${(s.prob*100).toFixed(1)}% odds=${s.odds.toFixed(2)} edge=${(s.edge*100).toFixed(1)}% src=${source}`);
                }

                const passing = singles.filter(s => s.kelly > MIN_KELLY && s.edge > MIN_EDGE);
                if (!passing.length) { skippedNoEdge++; continue; }

                // Jeden bet na mecz. Jeśli value jest na ≥2 wynikach (np. remis i wygrana),
                // proponujemy DOUBLE CHANCE łączący dwa najmocniejsze — zamiast sprzecznej pary.
                let chosen: {
                    type: OutcomeType; label: string; odds: number; prob: number;
                    kelly: number; edge: number; implied: number; estimated: boolean;
                };

                if (passing.length >= 2 && hasDraw) {
                    const top2 = [...passing].sort((a, b) => b.edge - a.edge).slice(0, 2);
                    const dc = this.mkDoubleChance(top2[0], top2[1], match.homeTeam, match.awayTeam);
                    if (dc && dc.kelly > MIN_KELLY && dc.edge > MIN_EDGE) {
                        chosen = dc;
                    } else {
                        const best = [...passing].sort((a, b) => b.kelly - a.kelly)[0];
                        chosen = { ...best, estimated: false };
                    }
                } else {
                    const best = [...passing].sort((a, b) => b.kelly - a.kelly)[0];
                    chosen = { ...best, estimated: false };
                }

                added++;
                candidates.push({
                    matchId: match.id,
                    leagueKey: SPORT_TO_LEAGUE_KEY[sport],
                    sport,
                    sportLabel: config.label,
                    countryFlag: config.countryFlag,
                    sportIcon: config.sportIcon,
                    homeTeam: match.homeTeam,
                    awayTeam: match.awayTeam,
                    commenceTime: match.commenceTime,
                    outcomeType: chosen.type,
                    outcomeLabel: chosen.label,
                    odds: chosen.odds,
                    estimatedOdds: chosen.estimated,
                    bookmakerName: match.odds.bookmaker,
                    ourProbability: chosen.prob,
                    impliedProbability: chosen.implied,
                    kellyFraction: chosen.kelly,
                    fractionalKelly: chosen.kelly / 4,
                    edgePercent: chosen.edge * 100,
                    probabilitySource: source,
                    bookmakerCount
                });
            }
            console.log(`[Recommended] ${config.label}: wrongWeek=${skippedWrongWeek} noOdds=${skippedNoOdds} noModel=${skippedNoModel} noEdge=${skippedNoEdge} added=${added}`);
        }

        console.log(`[Recommended] łącznie kandydatów: ${candidates.length}`);
        return candidates
            .sort((a, b) => b.kellyFraction - a.kellyFraction)
            .slice(0, 10)
            .map((bet, i) => ({ ...bet, rank: i + 1 }));
    }

    private mkSingle(type: 'home' | 'draw' | 'away', label: string, odds: number, prob: number): Single {
        const b = odds - 1;
        const kelly = b > 0 ? (b * prob - (1 - prob)) / b : 0;
        return { type, label, odds, prob, kelly, edge: prob - 1 / odds, implied: 1 / odds };
    }

    /** Double chance z dwóch pojedynczych wyników: kurs (Oa·Ob)/(Oa+Ob), prob = suma. */
    private mkDoubleChance(a: Single, b: Single, homeTeam: string, awayTeam: string) {
        const set = new Set([a.type, b.type]);
        let type: OutcomeType, label: string;
        if (set.has('home') && set.has('draw'))      { type = '1X'; label = `${homeTeam} lub remis`; }
        else if (set.has('draw') && set.has('away')) { type = 'X2'; label = `Remis lub ${awayTeam}`; }
        else if (set.has('home') && set.has('away')) { type = '12'; label = `${homeTeam} lub ${awayTeam}`; }
        else return null;

        const odds = (a.odds * b.odds) / (a.odds + b.odds);
        const prob = a.prob + b.prob;
        const bb = odds - 1;
        const kelly = bb > 0 ? (bb * prob - (1 - prob)) / bb : 0;
        return { type, label, odds, prob, kelly, edge: prob - 1 / odds, implied: 1 / odds, estimated: true };
    }

    private noVigFromOdds(odds: { home: number; draw?: number; away: number }) {
        const vigSum = 1 / odds.home + 1 / odds.away + (odds.draw ? 1 / odds.draw : 0);
        return {
            home: (1 / odds.home) / vigSum,
            away: (1 / odds.away) / vigSum,
            draw: odds.draw ? (1 / odds.draw) / vigSum : undefined,
            bookmakerCount: 1
        };
    }
}
