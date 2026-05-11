import { RatingsService, TeamStanding } from './ratings-service';
import { Sport } from '../utils/enums/sport';

export interface SoccerPrediction {
    homeWin: number;
    draw: number;
    awayWin: number;
    lambdaHome: number;
    lambdaAway: number;
    teamFound: boolean;
}

// Average goals per game for the HOME team in each league
// (total goals per game / 2, adjusted for home advantage)
const AVG_HOME_GOALS: Partial<Record<Sport, number>> = {
    [Sport.PREMIER_LEAGUE]: 1.42,
    [Sport.LALIGA]:          1.38,
    [Sport.BUNDESLIGA]:      1.60,
    [Sport.EKSTRAKLASA]:     1.45,
};
const AVG_AWAY_GOALS: Partial<Record<Sport, number>> = {
    [Sport.PREMIER_LEAGUE]: 1.10,
    [Sport.LALIGA]:          1.07,
    [Sport.BUNDESLIGA]:      1.25,
    [Sport.EKSTRAKLASA]:     1.12,
};

const SOCCER_SPORTS = new Set<Sport>([
    Sport.PREMIER_LEAGUE, Sport.LALIGA, Sport.BUNDESLIGA, Sport.EKSTRAKLASA
]);

export function isSoccerSport(sport: Sport): boolean {
    return SOCCER_SPORTS.has(sport);
}

export class SoccerPredictionModel {
    constructor(private ratingsService: RatingsService) {}

    public async predict(homeTeam: string, awayTeam: string, sport: Sport): Promise<SoccerPrediction | null> {
        if (!isSoccerSport(sport)) return null;

        try {
            const standings = await this.ratingsService.getStandings(sport);
            if (!standings.length) return null;

            const avgHomeGoals = AVG_HOME_GOALS[sport] ?? 1.35;
            const avgAwayGoals = AVG_AWAY_GOALS[sport] ?? 1.05;

            const home = this.findTeam(homeTeam, standings);
            const away = this.findTeam(awayTeam, standings);

            if (!home || !away) {
                console.warn(`[Soccer] team not found: ${!home ? homeTeam : awayTeam} — używam neutral`);
                return this.neutralPrediction(avgHomeGoals, avgAwayGoals);
            }

            // Compute league averages for attack/defense index
            const leagueAvgFor = avg(standings.map(t => goalsPerGame(t, 'for')));
            const leagueAvgAg  = avg(standings.map(t => goalsPerGame(t, 'against')));

            if (leagueAvgFor === 0 || leagueAvgAg === 0) {
                return this.neutralPrediction(avgHomeGoals, avgAwayGoals);
            }

            // Dixon-Coles style attack/defense indices
            const homeAttack  = goalsPerGame(home, 'for')     / leagueAvgFor;
            const homeDefense = goalsPerGame(home, 'against')  / leagueAvgAg;
            const awayAttack  = goalsPerGame(away, 'for')      / leagueAvgFor;
            const awayDefense = goalsPerGame(away, 'against')  / leagueAvgAg;

            // Expected goals
            const lambdaHome = Math.max(0.1, homeAttack * awayDefense * avgHomeGoals);
            const lambdaAway = Math.max(0.1, awayAttack * homeDefense * avgAwayGoals);

            console.log(`[Soccer] ${homeTeam} vs ${awayTeam}: xG home=${lambdaHome.toFixed(2)} away=${lambdaAway.toFixed(2)}`);

            return {
                ...this.poissonProbs(lambdaHome, lambdaAway),
                lambdaHome,
                lambdaAway,
                teamFound: true
            };
        } catch (err: any) {
            console.error(`[Soccer] błąd predykcji: ${err?.message}`);
            return null;
        }
    }

    private neutralPrediction(avgHome: number, avgAway: number): SoccerPrediction {
        return {
            ...this.poissonProbs(avgHome, avgAway),
            lambdaHome: avgHome,
            lambdaAway: avgAway,
            teamFound: false
        };
    }

    private findTeam(name: string, standings: TeamStanding[]): TeamStanding | null {
        // 1. Exact match
        const exact = standings.find(t => t.teamName === name);
        if (exact) return exact;

        // 2. Normalized match (lowercase, no special chars)
        const norm = normalize(name);
        return standings.find(t => {
            const n = normalize(t.teamName);
            return n === norm || n.includes(norm) || norm.includes(n);
        }) ?? null;
    }

    private poissonProbs(lambdaHome: number, lambdaAway: number): Pick<SoccerPrediction, 'homeWin' | 'draw' | 'awayWin'> {
        let homeWin = 0, draw = 0, awayWin = 0;
        const maxGoals = 9;

        for (let h = 0; h <= maxGoals; h++) {
            for (let a = 0; a <= maxGoals; a++) {
                const p = poissonPMF(h, lambdaHome) * poissonPMF(a, lambdaAway);
                if (h > a) homeWin += p;
                else if (h === a) draw += p;
                else awayWin += p;
            }
        }

        const total = homeWin + draw + awayWin;
        return {
            homeWin: homeWin / total,
            draw:    draw    / total,
            awayWin: awayWin / total,
        };
    }
}

function goalsPerGame(t: TeamStanding, dir: 'for' | 'against'): number {
    if (t.gamesPlayed === 0) return 1.2;
    return dir === 'for' ? t.goalsFor / t.gamesPlayed : t.goalsAgainst / t.gamesPlayed;
}

function avg(nums: number[]): number {
    if (!nums.length) return 0;
    return nums.reduce((s, n) => s + n, 0) / nums.length;
}

function normalize(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function poissonPMF(k: number, lambda: number): number {
    if (lambda <= 0) return k === 0 ? 1 : 0;
    let logP = -lambda + k * Math.log(lambda);
    for (let i = 1; i <= k; i++) logP -= Math.log(i);
    return Math.exp(logP);
}
