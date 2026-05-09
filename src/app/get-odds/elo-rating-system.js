"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EloRatingSystem = void 0;
/**
 * ELO Rating System dla NFL
 * Każda drużyna ma rating, który się zmienia po meczach
 * Na podstawie: https://en.wikipedia.org/wiki/Elo_rating_system
 */
var EloRatingSystem = /** @class */ (function () {
    function EloRatingSystem() {
        this.teamRatings = new Map();
        this.K = 32; // Speed factor (32 dla NFL zwykle)
        this.homeFieldAdvantage = 65; // punkty ELO advantage dla domu
        this.initializeAllTeams();
    }
    /**
     * Inicjalizuj wszystkie drużyny NFL z bazowymi ratingami
     * Zaktualizuje się w trakcie sezonu
     */
    EloRatingSystem.prototype.initializeAllTeams = function () {
        var _this = this;
        // Sezon 2025 - startowe ratings (możesz zaktualizować)
        var teams = {
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
        Object.entries(teams).forEach(function (_a) {
            var team = _a[0], rating = _a[1];
            _this.teamRatings.set(team, rating);
        });
    };
    /**
     * Pobierz aktualny rating drużyny
     */
    EloRatingSystem.prototype.getTeamRating = function (teamName) {
        return this.teamRatings.get(teamName) || 1500; // Default 1500
    };
    /**
     * Oblicz prawdopodobieństwo zwycięstwa dla drużyny domowej
     * Gdy ELO1 = ELO2, szansa = 50% + home field advantage (~65 points ELO)
     */
    EloRatingSystem.prototype.calculateWinProbability = function (homeTeam, awayTeam) {
        var homeElo = this.getTeamRating(homeTeam);
        var awayElo = this.getTeamRating(awayTeam);
        // Dodaj home field advantage do ELO domu
        var adjustedHomeElo = homeElo + this.homeFieldAdvantage;
        // Wzór ELO na prawdopodobieństwo
        var eloRatioDiff = adjustedHomeElo - awayElo;
        var probability = 1 / (1 + Math.pow(10, -eloRatioDiff / 400));
        return probability;
    };
    /**
     * Aktualizuj ratings po meczu
     * @param homeTeam - drużyna domowa
     * @param awayTeam - drużyna wyjazdowa
     * @param homeWin - czy domu wygrała?
     */
    EloRatingSystem.prototype.updateRatingsAfterGame = function (homeTeam, awayTeam, homeWin) {
        var homeElo = this.getTeamRating(homeTeam);
        var awayElo = this.getTeamRating(awayTeam);
        // Expected score
        var adjustedHomeElo = homeElo + this.homeFieldAdvantage;
        var expectedHome = 1 / (1 + Math.pow(10, (awayElo - adjustedHomeElo) / 400));
        var expectedAway = 1 - expectedHome;
        // Actual score
        var actualHome = homeWin ? 1 : 0;
        var actualAway = homeWin ? 0 : 1;
        // Nowy rating
        var newHomeElo = homeElo + this.K * (actualHome - expectedHome);
        var newAwayElo = awayElo + this.K * (actualAway - expectedAway);
        this.teamRatings.set(homeTeam, newHomeElo);
        this.teamRatings.set(awayTeam, newAwayElo);
        console.log("\uD83D\uDCCA ELO Updated: ".concat(homeTeam, " (").concat(homeElo.toFixed(0), " \u2192 ").concat(newHomeElo.toFixed(0), ") vs ").concat(awayTeam, " (").concat(awayElo.toFixed(0), " \u2192 ").concat(newAwayElo.toFixed(0), ")"));
    };
    /**
     * Zwróć wszystkie drużyny z ratingami (sortowane)
     */
    EloRatingSystem.prototype.getAllRatings = function () {
        return Array.from(this.teamRatings.entries())
            .map(function (_a) {
            var team = _a[0], rating = _a[1];
            return ({ team: team, rating: rating });
        })
            .sort(function (a, b) { return b.rating - a.rating; });
    };
    /**
     * Wyświetl top drużyn
     */
    EloRatingSystem.prototype.displayTopTeams = function (count) {
        if (count === void 0) { count = 10; }
        console.log("\n\uD83C\uDFC6 TOP ".concat(count, " DRU\u017BYN (wg ELO):"));
        var ratings = this.getAllRatings();
        ratings.slice(0, count).forEach(function (item, index) {
            console.log("".concat(index + 1, ". ").concat(item.team, ": ").concat(item.rating.toFixed(0)));
        });
    };
    return EloRatingSystem;
}());
exports.EloRatingSystem = EloRatingSystem;
