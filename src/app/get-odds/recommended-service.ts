import { OddsCache } from './odds-service';
import { HybridPredictionModel } from './hybrid-prediction-model';
import { Sport, SportConfig, SPORT_TO_LEAGUE_KEY } from '../utils/enums/sport';

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
    outcomeType: 'home' | 'draw' | 'away';
    outcomeLabel: string;
    odds: number;
    bookmakerName: string;
    ourProbability: number;
    impliedProbability: number;
    kellyFraction: number;
    fractionalKelly: number;
    edgePercent: number;
    probabilitySource: 'model' | 'consensus';
    bookmakerCount: number;
}

const MIN_EDGE = 0.025;   // minimum 2.5% edge to include
const MIN_KELLY = 0.005;  // minimum 0.5% Kelly

export class RecommendedService {
    private predictionModel: HybridPredictionModel;

    constructor(predictionModel: HybridPredictionModel) {
        this.predictionModel = predictionModel;
    }

    public async computeRecommended(cacheMap: Map<Sport, OddsCache>): Promise<RecommendedBet[]> {
        const candidates: Omit<RecommendedBet, 'rank'>[] = [];

        for (const [sport, cache] of cacheMap) {
            const config = SportConfig[sport];

            for (const match of cache.data) {
                if (!match.odds) continue;

                let homeProb: number;
                let awayProb: number;
                let drawProb: number | undefined;
                let source: 'model' | 'consensus';
                let bookmakerCount: number;

                if (sport === Sport.NFL) {
                    const prediction = await this.predictionModel.getPredictionAsync(
                        match.homeTeam, match.awayTeam
                    ).catch(() => null);
                    if (prediction == null) continue;
                    homeProb = prediction;
                    awayProb = 1 - prediction;
                    source = 'model';
                    bookmakerCount = 1;
                } else {
                    // Use multi-bookmaker consensus if available (fresh fetch),
                    // otherwise fall back to single-bookmaker no-vig (old cache)
                    const consensus = match.consensusProbability ?? this.noVigFromOdds(match.odds);
                    homeProb = consensus.home;
                    awayProb = consensus.away;
                    drawProb = consensus.draw;
                    source = 'consensus';
                    bookmakerCount = match.consensusProbability?.bookmakerCount ?? 1;
                }

                const outcomes: Array<{ type: 'home' | 'draw' | 'away'; label: string; odds: number; prob: number }> = [
                    { type: 'home', label: match.homeTeam, odds: match.odds.home, prob: homeProb },
                    { type: 'away', label: match.awayTeam, odds: match.odds.away, prob: awayProb },
                ];
                if (match.odds.draw != null && drawProb != null) {
                    outcomes.push({ type: 'draw', label: 'Remis', odds: match.odds.draw, prob: drawProb });
                }

                for (const o of outcomes) {
                    const b = o.odds - 1;
                    const kelly = (b * o.prob - (1 - o.prob)) / b;
                    const impliedProb = 1 / o.odds;
                    const edge = o.prob - impliedProb;

                    if (kelly <= MIN_KELLY || edge <= MIN_EDGE) continue;

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
                        outcomeType: o.type,
                        outcomeLabel: o.label,
                        odds: o.odds,
                        bookmakerName: match.odds.bookmaker,
                        ourProbability: o.prob,
                        impliedProbability: impliedProb,
                        kellyFraction: kelly,
                        fractionalKelly: kelly / 4,
                        edgePercent: edge * 100,
                        probabilitySource: source,
                        bookmakerCount
                    });
                }
            }
        }

        return candidates
            .sort((a, b) => b.kellyFraction - a.kellyFraction)
            .slice(0, 10)
            .map((bet, i) => ({ ...bet, rank: i + 1 }));
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
