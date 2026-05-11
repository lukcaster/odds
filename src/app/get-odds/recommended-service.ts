import { OddsCache } from './odds-service';
import { HybridPredictionModel } from './hybrid-prediction-model';
import { SoccerPredictionModel, isSoccerSport } from './soccer-prediction-model';
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
    constructor(
        private predictionModel: HybridPredictionModel,
        private soccerModel: SoccerPredictionModel
    ) {}

    public async computeRecommended(cacheMap: Map<Sport, OddsCache>): Promise<RecommendedBet[]> {
        const candidates: Omit<RecommendedBet, 'rank'>[] = [];

        console.log(`[Recommended] przetwarzam ${cacheMap.size} lig`);

        for (const [sport, cache] of cacheMap) {
            const config = SportConfig[sport];
            console.log(`[Recommended] ${config.label}: ${cache.data.length} meczów w cache`);

            let skippedNoOdds = 0, skippedNoModel = 0, skippedNoEdge = 0, added = 0;

            for (const match of cache.data) {
                if (!match.odds) { skippedNoOdds++; continue; }

                let homeProb: number;
                let awayProb: number;
                let drawProb: number | undefined;
                let source: 'model' | 'consensus';
                let bookmakerCount: number;

                if (sport === Sport.NFL) {
                    const prediction = await this.predictionModel.getPredictionAsync(
                        match.homeTeam, match.awayTeam
                    ).catch(() => null);
                    if (prediction == null) { skippedNoModel++; continue; }
                    homeProb = prediction;
                    awayProb = 1 - prediction;
                    source = 'model';
                    bookmakerCount = 1;
                } else if (isSoccerSport(sport)) {
                    const prediction = await this.soccerModel.predict(match.homeTeam, match.awayTeam, sport).catch(() => null);
                    if (prediction) {
                        homeProb = prediction.homeWin;
                        awayProb = prediction.awayWin;
                        drawProb = prediction.draw;
                        source = 'model';
                        bookmakerCount = prediction.teamFound ? 1 : 0;
                    } else {
                        // Soccer model unavailable — fall back to consensus
                        const consensus = match.consensusProbability ?? this.noVigFromOdds(match.odds);
                        homeProb = consensus.home;
                        awayProb = consensus.away;
                        drawProb = consensus.draw;
                        source = 'consensus';
                        bookmakerCount = match.consensusProbability?.bookmakerCount ?? 1;
                    }
                } else {
                    // NBA i inne — consensus
                    const consensus = match.consensusProbability ?? this.noVigFromOdds(match.odds);
                    homeProb = consensus.home;
                    awayProb = consensus.away;
                    source = 'consensus';
                    bookmakerCount = match.consensusProbability?.bookmakerCount ?? 1;
                }

                // Use BEST available odds for comparison (finds genuine line shopping value)
                // Fall back to displayed odds if bestOdds not available
                const bestOdds = match.bestOdds ?? match.odds;

                const outcomes: Array<{ type: 'home' | 'draw' | 'away'; label: string; bestOdds: number; displayOdds: number; prob: number }> = [
                    { type: 'home', label: match.homeTeam, bestOdds: bestOdds!.home, displayOdds: match.odds.home, prob: homeProb },
                    { type: 'away', label: match.awayTeam, bestOdds: bestOdds!.away, displayOdds: match.odds.away, prob: awayProb },
                ];
                if (match.odds.draw != null && drawProb != null) {
                    outcomes.push({ type: 'draw', label: 'Remis', bestOdds: bestOdds!.draw ?? match.odds.draw, displayOdds: match.odds.draw, prob: drawProb });
                }

                for (const o of outcomes) {
                    const b = o.bestOdds - 1;
                    const kelly = (b * o.prob - (1 - o.prob)) / b;
                    const impliedProb = 1 / o.bestOdds;
                    const edge = o.prob - impliedProb;
                    const bkCount = match.consensusProbability?.bookmakerCount ?? 1;
                    console.log(`  [${config.label}] ${match.homeTeam} vs ${match.awayTeam} | ${o.type}: prob=${(o.prob*100).toFixed(1)}% bestOdds=${o.bestOdds.toFixed(2)} implied=${(impliedProb*100).toFixed(1)}% edge=${(edge*100).toFixed(1)}% src=${source}/${bkCount}bk`);

                    if (kelly <= MIN_KELLY || edge <= MIN_EDGE) { skippedNoEdge++; continue; }

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
                        outcomeType: o.type,
                        outcomeLabel: o.label,
                        odds: o.bestOdds,
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
            console.log(`[Recommended] ${config.label}: noOdds=${skippedNoOdds} noModel=${skippedNoModel} noEdge=${skippedNoEdge} added=${added}`);
        }

        console.log(`[Recommended] łącznie kandydatów: ${candidates.length}`);
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
