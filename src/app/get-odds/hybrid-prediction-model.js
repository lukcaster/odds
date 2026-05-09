"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HybridPredictionModel = void 0;
var elo_rating_system_1 = require("./elo-rating-system");
var prediction_model_1 = require("./prediction-model");
var stats_scraper_1 = require("./stats-scraper");
/**
 * Hybrid Prediction Model
 * Kombinuje:
 * 1. ELO Rating (zmienia się po każdym meczu)
 * 2. Aktualne statystyki drużyn (ofensa, defensa, turnovers)
 * 3. Home field advantage
 */
var HybridPredictionModel = /** @class */ (function (_super) {
    __extends(HybridPredictionModel, _super);
    function HybridPredictionModel() {
        var _this = _super.call(this) || this;
        _this.eloWeight = 0.5; // 50% wagi na ELO
        _this.statsWeight = 0.35; // 35% wagi na statystyki
        _this.momentumWeight = 0.15; // 15% wagi na momentum (recent form)
        _this.elo = new elo_rating_system_1.EloRatingSystem();
        _this.statsScraper = new stats_scraper_1.StatsScraperNFL();
        return _this;
    }
    /**
     * Zwróć ELO system (do walidacji)
     */
    HybridPredictionModel.prototype.getEloSystem = function () {
        return this.elo;
    };
    /**
     * Główna metoda - zwraca prawdopodobieństwo zwycięstwa drużyny domowej
     */
    HybridPredictionModel.prototype.getPredictionAsync = function (homeTeam, awayTeam) {
        return __awaiter(this, void 0, void 0, function () {
            var eloProbability, statsProbability, momentumProbability, finalProbability, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        eloProbability = this.elo.calculateWinProbability(homeTeam, awayTeam);
                        return [4 /*yield*/, this.calculateStatsBasedProbability(homeTeam, awayTeam)];
                    case 1:
                        statsProbability = _a.sent();
                        momentumProbability = this.calculateMomentum(homeTeam, awayTeam);
                        finalProbability = eloProbability * this.eloWeight +
                            statsProbability * this.statsWeight +
                            momentumProbability * this.momentumWeight;
                        return [2 /*return*/, Math.max(0.01, Math.min(0.99, finalProbability))];
                    case 2:
                        error_1 = _a.sent();
                        console.error("B\u0142\u0105d w hybrid prediction: ".concat(error_1));
                        return [2 /*return*/, null];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Synchroniczna wersja - w razie potrzeby szybkiego kalkulowania
     * Używa ELO + cached stats
     */
    HybridPredictionModel.prototype.getPredictionSync = function (homeTeam, awayTeam) {
        return this.elo.calculateWinProbability(homeTeam, awayTeam);
    };
    /**
     * Kalkuluj prawdopodobieństwo na podstawie statystyk offensywnych/defensywnych
     */
    HybridPredictionModel.prototype.calculateStatsBasedProbability = function (homeTeam, awayTeam) {
        return __awaiter(this, void 0, void 0, function () {
            var homeStats, awayStats, homeStrength, awayStrength, totalStrength, homeWinProb;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.statsScraper.getTeamStats(homeTeam)];
                    case 1:
                        homeStats = _a.sent();
                        return [4 /*yield*/, this.statsScraper.getTeamStats(awayTeam)];
                    case 2:
                        awayStats = _a.sent();
                        homeStrength = this.statsScraper.calculateTeamStrength(homeStats);
                        awayStrength = this.statsScraper.calculateTeamStrength(awayStats);
                        totalStrength = homeStrength + awayStrength;
                        homeWinProb = homeStrength / totalStrength;
                        // Dodaj home field advantage (3-5 punktów = ~3% szansy)
                        return [2 /*return*/, Math.min(homeWinProb + 0.03, 0.99)];
                }
            });
        });
    };
    /**
     * Momentum - ostatnie wyniki (możemy rozszerzyć na recent form)
     * Na teraz zwraca 0.5 (neutralne), można dodać real data
     */
    HybridPredictionModel.prototype.calculateMomentum = function (homeTeam, awayTeam) {
        // TODO: Pobieraj ostatnie 5 wyników i liczysz trend
        // Na razie zwraca neutralność
        return 0.5;
    };
    /**
     * Zaktualizuj ratings ELO po meczu
     * Używaj tego gdy wiesz wyniki
     */
    HybridPredictionModel.prototype.updateEloAfterGame = function (homeTeam, awayTeam, homeWin) {
        this.elo.updateRatingsAfterGame(homeTeam, awayTeam, homeWin);
    };
    /**
     * Wyświetl analitykę dla meczu
     */
    HybridPredictionModel.prototype.displayMatchAnalysis = function (homeTeam, awayTeam) {
        return __awaiter(this, void 0, void 0, function () {
            var homeStats, awayStats, homeElo, awayElo, homeStrength, awayStrength, prediction, matchup;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.statsScraper.getTeamStats(homeTeam)];
                    case 1:
                        homeStats = _a.sent();
                        return [4 /*yield*/, this.statsScraper.getTeamStats(awayTeam)];
                    case 2:
                        awayStats = _a.sent();
                        homeElo = this.elo.getTeamRating(homeTeam);
                        awayElo = this.elo.getTeamRating(awayTeam);
                        homeStrength = this.statsScraper.calculateTeamStrength(homeStats);
                        awayStrength = this.statsScraper.calculateTeamStrength(awayStats);
                        prediction = this.getPredictionSync(homeTeam, awayTeam) || 0.5;
                        console.log("\n\uD83D\uDCC8 DEEP ANALYSIS: ".concat(homeTeam, " vs ").concat(awayTeam));
                        console.log('═'.repeat(80));
                        console.log("\n\uD83C\uDFE0 HOME TEAM: ".concat(homeTeam));
                        console.log("   ELO Rating: ".concat(homeElo.toFixed(0)));
                        console.log("   Team Strength: ".concat(homeStrength.toFixed(1)));
                        console.log("   Points For: ".concat(homeStats.pointsFor.toFixed(1), " | Against: ").concat(homeStats.pointsAgainst.toFixed(1)));
                        console.log("   Pass Yards: ".concat(homeStats.passYardsFor.toFixed(0), " for / ").concat(homeStats.passYardsAgainst.toFixed(0), " against"));
                        console.log("   3rd Down %: ".concat(homeStats.thirdDownPercent.toFixed(0), "% | Red Zone: ").concat(homeStats.redZonePercent.toFixed(0), "%"));
                        console.log("   Turnover Margin: ".concat(homeStats.turnoverMargin.toFixed(1)));
                        console.log("\n\uD83D\uDE97 AWAY TEAM: ".concat(awayTeam));
                        console.log("   ELO Rating: ".concat(awayElo.toFixed(0)));
                        console.log("   Team Strength: ".concat(awayStrength.toFixed(1)));
                        console.log("   Points For: ".concat(awayStats.pointsFor.toFixed(1), " | Against: ").concat(awayStats.pointsAgainst.toFixed(1)));
                        console.log("   Pass Yards: ".concat(awayStats.passYardsFor.toFixed(0), " for / ").concat(awayStats.passYardsAgainst.toFixed(0), " against"));
                        console.log("   3rd Down %: ".concat(awayStats.thirdDownPercent.toFixed(0), "% | Red Zone: ").concat(awayStats.redZonePercent.toFixed(0), "%"));
                        console.log("   Turnover Margin: ".concat(awayStats.turnoverMargin.toFixed(1)));
                        console.log("\n\uD83C\uDFAF PREDICTION");
                        console.log("   Home Win Probability: ".concat((prediction * 100).toFixed(1), "%"));
                        console.log("   Away Win Probability: ".concat(((1 - prediction) * 100).toFixed(1), "%"));
                        matchup = homeStrength > awayStrength ? '✅ Home Favored' : '⚠️  Away Competitive';
                        console.log("   Matchup: ".concat(matchup));
                        console.log('═'.repeat(80));
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Wyświetl rankings drużyn
     */
    HybridPredictionModel.prototype.displayTeamRankings = function () {
        this.elo.displayTopTeams(10);
    };
    /**
     * Zmień wagi komponentów (do testowania)
     */
    HybridPredictionModel.prototype.setWeights = function (elo, stats, momentum) {
        var total = elo + stats + momentum;
        if (total !== 1) {
            console.warn('⚠️  Suma wag powinna być 1.0, normalizuję automatycznie');
        }
        this.eloWeight = elo / total;
        this.statsWeight = stats / total;
        this.momentumWeight = momentum / total;
        console.log("\u2699\uFE0F  Weights updated: ELO=".concat(this.eloWeight.toFixed(2), ", Stats=").concat(this.statsWeight.toFixed(2), ", Momentum=").concat(this.momentumWeight.toFixed(2)));
    };
    /**
     * Pobierz wszystkie rating ELO (dla dashboarda)
     */
    HybridPredictionModel.prototype.getAllTeamRatings = function () {
        return this.elo.getAllRatings();
    };
    /**
     * Pobierz statystyki drużyny (dla dashboarda)
     */
    HybridPredictionModel.prototype.getTeamStats = function (teamName) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.statsScraper.getTeamStats(teamName)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * Pobierz wagi modelu (dla dashboarda)
     */
    HybridPredictionModel.prototype.getModelWeights = function () {
        return {
            elo: this.eloWeight,
            stats: this.statsWeight,
            momentum: this.momentumWeight
        };
    };
    return HybridPredictionModel;
}(prediction_model_1.PredictionModel));
exports.HybridPredictionModel = HybridPredictionModel;
