/**
 * ELO Rating System dla NFL
 * Każda drużyna ma rating, który się zmienia po meczach
 * Na podstawie: https://en.wikipedia.org/wiki/Elo_rating_system
 */
export class EloRatingSystem {
    private teamRatings: Map<string, number> = new Map();
    private K = 32; // Speed factor (32 dla NFL zwykle)
    private homeFieldAdvantage = 65; // punkty ELO advantage dla domu

    constructor() {
        // Bez hardkodu — ratingi wgrywane sa z realnych wynikow
        // (PowerRankingService → setRatings). Nieznana druzyna = 1500.
    }

    /**
     * Wgraj ratingi policzone z realnych wynikow (zastepuje poprzednie).
     */
    public setRatings(ratings: Map<string, number>): void {
        if (!ratings || ratings.size === 0) return;
        this.teamRatings = new Map(ratings);
        console.log(`📊 ELO NFL zasilone realnymi wynikami: ${ratings.size} drużyn`);
    }

    /**
     * Pobierz aktualny rating drużyny
     */
    public getTeamRating(teamName: string): number {
        return this.teamRatings.get(teamName) || 1500; // Default 1500
    }

    /**
     * Oblicz prawdopodobieństwo zwycięstwa dla drużyny domowej
     * Gdy ELO1 = ELO2, szansa = 50% + home field advantage (~65 points ELO)
     */
    public calculateWinProbability(homeTeam: string, awayTeam: string): number {
        const homeElo = this.getTeamRating(homeTeam);
        const awayElo = this.getTeamRating(awayTeam);

        // Dodaj home field advantage do ELO domu
        const adjustedHomeElo = homeElo + this.homeFieldAdvantage;

        // Wzór ELO na prawdopodobieństwo
        const eloRatioDiff = adjustedHomeElo - awayElo;
        const probability = 1 / (1 + Math.pow(10, -eloRatioDiff / 400));

        return probability;
    }

    /**
     * Aktualizuj ratings po meczu
     * @param homeTeam - drużyna domowa
     * @param awayTeam - drużyna wyjazdowa
     * @param homeWin - czy domu wygrała?
     */
    public updateRatingsAfterGame(
        homeTeam: string,
        awayTeam: string,
        homeWin: boolean
    ): void {
        const homeElo = this.getTeamRating(homeTeam);
        const awayElo = this.getTeamRating(awayTeam);

        // Expected score
        const adjustedHomeElo = homeElo + this.homeFieldAdvantage;
        const expectedHome = 1 / (1 + Math.pow(10, (awayElo - adjustedHomeElo) / 400));
        const expectedAway = 1 - expectedHome;

        // Actual score
        const actualHome = homeWin ? 1 : 0;
        const actualAway = homeWin ? 0 : 1;

        // Nowy rating
        const newHomeElo = homeElo + this.K * (actualHome - expectedHome);
        const newAwayElo = awayElo + this.K * (actualAway - expectedAway);

        this.teamRatings.set(homeTeam, newHomeElo);
        this.teamRatings.set(awayTeam, newAwayElo);

        console.log(`📊 ELO Updated: ${homeTeam} (${homeElo.toFixed(0)} → ${newHomeElo.toFixed(0)}) vs ${awayTeam} (${awayElo.toFixed(0)} → ${newAwayElo.toFixed(0)})`);
    }

    /**
     * Zwróć wszystkie drużyny z ratingami (sortowane)
     */
    public getAllRatings(): Array<{ team: string; rating: number }> {
        return Array.from(this.teamRatings.entries())
            .map(([team, rating]) => ({ team, rating }))
            .sort((a, b) => b.rating - a.rating);
    }

    /**
     * Wyświetl top drużyn
     */
    public displayTopTeams(count: number = 10): void {
        console.log(`\n🏆 TOP ${count} DRUŻYN (wg ELO):`);
        const ratings = this.getAllRatings();
        ratings.slice(0, count).forEach((item, index) => {
            console.log(`${index + 1}. ${item.team}: ${item.rating.toFixed(0)}`);
        });
    }
}
