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
        this.initializeAllTeams();
    }

    /**
     * Inicjalizuj wszystkie drużyny NFL z bazowymi ratingami
     * Zaktualizuje się w trakcie sezonu
     */
    private initializeAllTeams(): void {
        // Sezon 2025 - startowe ratings (możesz zaktualizować)
        const teams: Record<string, number> = {
            // AFC East
            'Kansas City Chiefs': 1680,
            'Buffalo Bills': 1620,
            'Miami Dolphins': 1560,
            'New England Patriots': 1520,

            // AFC North
            'Baltimore Ravens': 1600,
            'Cincinnati Bengals': 1580,
            'Pittsburgh Steelers': 1550,
            'Cleveland Browns': 1540,

            // AFC South
            'Houston Texans': 1570,
            'Indianapolis Colts': 1530,
            'Jacksonville Jaguars': 1510,
            'Tennessee Titans': 1500,

            // AFC West
            'Los Angeles Chargers': 1550,
            'Denver Broncos': 1540,
            'Las Vegas Raiders': 1480,

            // NFC East
            'Philadelphia Eagles': 1650,
            'Dallas Cowboys': 1620,
            'Washington Commanders': 1540,
            'New York Giants': 1500,

            // NFC North
            'Detroit Lions': 1640,
            'Green Bay Packers': 1600,
            'Minnesota Vikings': 1570,
            'Chicago Bears': 1510,

            // NFC South
            'San Francisco 49ers': 1660,
            'New Orleans Saints': 1560,
            'Tampa Bay Buccaneers': 1550,
            'Atlanta Falcons': 1480,

            // NFC West
            'Los Angeles Rams': 1580,
            'Seattle Seahawks': 1520
        };

        Object.entries(teams).forEach(([team, rating]) => {
            this.teamRatings.set(team, rating);
        });
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
