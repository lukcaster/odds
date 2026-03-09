import { EloRatingSystem } from "./elo-rating-system";
import { PredictionModel } from "./prediction-model";
import { StatsScraperNFL } from "./stats-scraper";

/**
 * Hybrid Prediction Model
 * Kombinuje:
 * 1. ELO Rating (zmienia się po każdym meczu)
 * 2. Aktualne statystyki drużyn (ofensa, defensa, turnovers)
 * 3. Home field advantage
 */
export class HybridPredictionModel extends PredictionModel {
    private elo: EloRatingSystem;
    private statsScraper: StatsScraperNFL;
    private eloWeight = 0.5;          // 50% wagi na ELO
    private statsWeight = 0.35;       // 35% wagi na statystyki
    private momentumWeight = 0.15;    // 15% wagi na momentum (recent form)

    constructor() {
        super();
        this.elo = new EloRatingSystem();
        this.statsScraper = new StatsScraperNFL();
    }

    /**
     * Zwróć ELO system (do walidacji)
     */
    public getEloSystem(): EloRatingSystem {
        return this.elo;
    }

    /**
     * Główna metoda - zwraca prawdopodobieństwo zwycięstwa drużyny domowej
     */
    public async getPredictionAsync(homeTeam: string, awayTeam: string): Promise<number | null> {
        try {
            // 1. Komponenta ELO (50%)
            const eloProbability = this.elo.calculateWinProbability(homeTeam, awayTeam);

            // 2. Komponenta statystyk (35%)
            const statsProbability = await this.calculateStatsBasedProbability(homeTeam, awayTeam);

            // 3. Komponenta momentum (15%)
            const momentumProbability = this.calculateMomentum(homeTeam, awayTeam);

            // Połącz wszystkie komponenty
            const finalProbability =
                eloProbability * this.eloWeight +
                statsProbability * this.statsWeight +
                momentumProbability * this.momentumWeight;

            return Math.max(0.01, Math.min(0.99, finalProbability));
        } catch (error) {
            console.error(`Błąd w hybrid prediction: ${error}`);
            return null;
        }
    }

    /**
     * Synchroniczna wersja - w razie potrzeby szybkiego kalkulowania
     * Używa ELO + cached stats
     */
    public getPredictionSync(homeTeam: string, awayTeam: string): number | null {
        return this.elo.calculateWinProbability(homeTeam, awayTeam);
    }

    /**
     * Kalkuluj prawdopodobieństwo na podstawie statystyk offensywnych/defensywnych
     */
    private async calculateStatsBasedProbability(
        homeTeam: string,
        awayTeam: string
    ): Promise<number> {
        const homeStats = await this.statsScraper.getTeamStats(homeTeam);
        const awayStats = await this.statsScraper.getTeamStats(awayTeam);

        // Strength-based model
        const homeStrength = this.statsScraper.calculateTeamStrength(homeStats);
        const awayStrength = this.statsScraper.calculateTeamStrength(awayStats);

        const totalStrength = homeStrength + awayStrength;
        const homeWinProb = homeStrength / totalStrength;

        // Dodaj home field advantage (3-5 punktów = ~3% szansy)
        return Math.min(homeWinProb + 0.03, 0.99);
    }

    /**
     * Momentum - ostatnie wyniki (możemy rozszerzyć na recent form)
     * Na teraz zwraca 0.5 (neutralne), można dodać real data
     */
    private calculateMomentum(homeTeam: string, awayTeam: string): number {
        // TODO: Pobieraj ostatnie 5 wyników i liczysz trend
        // Na razie zwraca neutralność
        return 0.5;
    }

    /**
     * Zaktualizuj ratings ELO po meczu
     * Używaj tego gdy wiesz wyniki
     */
    public updateEloAfterGame(
        homeTeam: string,
        awayTeam: string,
        homeWin: boolean
    ): void {
        this.elo.updateRatingsAfterGame(homeTeam, awayTeam, homeWin);
    }

    /**
     * Wyświetl analitykę dla meczu
     */
    public async displayMatchAnalysis(homeTeam: string, awayTeam: string): Promise<void> {
        const homeStats = await this.statsScraper.getTeamStats(homeTeam);
        const awayStats = await this.statsScraper.getTeamStats(awayTeam);

        const homeElo = this.elo.getTeamRating(homeTeam);
        const awayElo = this.elo.getTeamRating(awayTeam);

        const homeStrength = this.statsScraper.calculateTeamStrength(homeStats);
        const awayStrength = this.statsScraper.calculateTeamStrength(awayStats);

        const prediction = this.getPredictionSync(homeTeam, awayTeam) || 0.5;

        console.log(`\n📈 DEEP ANALYSIS: ${homeTeam} vs ${awayTeam}`);
        console.log('═'.repeat(80));

        console.log(`\n🏠 HOME TEAM: ${homeTeam}`);
        console.log(`   ELO Rating: ${homeElo.toFixed(0)}`);
        console.log(`   Team Strength: ${homeStrength.toFixed(1)}`);
        console.log(`   Points For: ${homeStats.pointsFor.toFixed(1)} | Against: ${homeStats.pointsAgainst.toFixed(1)}`);
        console.log(`   Pass Yards: ${homeStats.passYardsFor.toFixed(0)} for / ${homeStats.passYardsAgainst.toFixed(0)} against`);
        console.log(`   3rd Down %: ${homeStats.thirdDownPercent.toFixed(0)}% | Red Zone: ${homeStats.redZonePercent.toFixed(0)}%`);
        console.log(`   Turnover Margin: ${homeStats.turnoverMargin.toFixed(1)}`);

        console.log(`\n🚗 AWAY TEAM: ${awayTeam}`);
        console.log(`   ELO Rating: ${awayElo.toFixed(0)}`);
        console.log(`   Team Strength: ${awayStrength.toFixed(1)}`);
        console.log(`   Points For: ${awayStats.pointsFor.toFixed(1)} | Against: ${awayStats.pointsAgainst.toFixed(1)}`);
        console.log(`   Pass Yards: ${awayStats.passYardsFor.toFixed(0)} for / ${awayStats.passYardsAgainst.toFixed(0)} against`);
        console.log(`   3rd Down %: ${awayStats.thirdDownPercent.toFixed(0)}% | Red Zone: ${awayStats.redZonePercent.toFixed(0)}%`);
        console.log(`   Turnover Margin: ${awayStats.turnoverMargin.toFixed(1)}`);

        console.log(`\n🎯 PREDICTION`);
        console.log(`   Home Win Probability: ${(prediction * 100).toFixed(1)}%`);
        console.log(`   Away Win Probability: ${((1 - prediction) * 100).toFixed(1)}%`);

        const matchup = homeStrength > awayStrength ? '✅ Home Favored' : '⚠️  Away Competitive';
        console.log(`   Matchup: ${matchup}`);

        console.log('═'.repeat(80));
    }

    /**
     * Wyświetl rankings drużyn
     */
    public displayTeamRankings(): void {
        this.elo.displayTopTeams(10);
    }

    /**
     * Zmień wagi komponentów (do testowania)
     */
    public setWeights(elo: number, stats: number, momentum: number): void {
        const total = elo + stats + momentum;
        if (total !== 1) {
            console.warn('⚠️  Suma wag powinna być 1.0, normalizuję automatycznie');
        }
        this.eloWeight = elo / total;
        this.statsWeight = stats / total;
        this.momentumWeight = momentum / total;
        console.log(`⚙️  Weights updated: ELO=${this.eloWeight.toFixed(2)}, Stats=${this.statsWeight.toFixed(2)}, Momentum=${this.momentumWeight.toFixed(2)}`);
    }

    /**
     * Pobierz wszystkie rating ELO (dla dashboarda)
     */
    public getAllTeamRatings(): Array<{ team: string; rating: number }> {
        return this.elo.getAllRatings();
    }

    /**
     * Pobierz statystyki drużyny (dla dashboarda)
     */
    public async getTeamStats(teamName: string) {
        return await this.statsScraper.getTeamStats(teamName);
    }

    /**
     * Pobierz wagi modelu (dla dashboarda)
     */
    public getModelWeights() {
        return {
            elo: this.eloWeight,
            stats: this.statsWeight,
            momentum: this.momentumWeight
        };
    }
}
