"use strict";
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
exports.DashboardServer = void 0;
var cors_1 = require("cors");
var express_1 = require("express");
var path_1 = require("path");
var hybrid_prediction_model_1 = require("./get-odds/hybrid-prediction-model");
var odds_service_1 = require("./get-odds/odds-service");
var sport_1 = require("./utils/enums/sport");
var DashboardServer = /** @class */ (function () {
    function DashboardServer() {
        this.port = parseInt(process.env.PORT || '3000', 10);
        this.app = (0, express_1.default)();
        this.predictionModel = new hybrid_prediction_model_1.HybridPredictionModel();
        this.oddsService = new odds_service_1.OddsService();
        this.setupMiddleware();
        this.setupRoutes();
    }
    /**
     * Setup Express middleware
     */
    DashboardServer.prototype.setupMiddleware = function () {
        this.app.use((0, cors_1.default)());
        this.app.use(express_1.default.json());
        this.app.use(express_1.default.static(path_1.default.join(process.cwd(), 'public')));
    };
    /**
     * Setup API routes
     */
    DashboardServer.prototype.setupRoutes = function () {
        var _this = this;
        // Health check
        this.app.get('/api/health', function (req, res) {
            res.json({ status: 'OK', timestamp: new Date().toISOString() });
        });
        // Get ELO Rankings
        this.app.get('/api/rankings', function (req, res) {
            try {
                var rankings = _this.predictionModel.getAllTeamRatings();
                res.json(rankings);
            }
            catch (error) {
                res.status(500).json({ error: 'Failed to fetch rankings' });
            }
        });
        // Get prediction for a match
        this.app.get('/api/predict', function (req, res) { return __awaiter(_this, void 0, void 0, function () {
            var _a, homeTeam, awayTeam, prediction, error_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        _a = req.query, homeTeam = _a.homeTeam, awayTeam = _a.awayTeam;
                        if (!homeTeam || !awayTeam) {
                            return [2 /*return*/, res.status(400).json({
                                    error: 'Missing homeTeam or awayTeam parameter'
                                })];
                        }
                        return [4 /*yield*/, this.predictionModel.getPredictionAsync(homeTeam, awayTeam)];
                    case 1:
                        prediction = _b.sent();
                        res.json({
                            homeTeam: homeTeam,
                            awayTeam: awayTeam,
                            homeWinProbability: prediction,
                            awayWinProbability: prediction ? 1 - prediction : null
                        });
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _b.sent();
                        res.status(500).json({ error: 'Failed to generate prediction' });
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        }); });
        // Get team stats
        this.app.get('/api/stats/:team', function (req, res) { return __awaiter(_this, void 0, void 0, function () {
            var team, stats, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        team = Array.isArray(req.params.team) ? req.params.team[0] : req.params.team;
                        return [4 /*yield*/, this.predictionModel.getTeamStats(team)];
                    case 1:
                        stats = _a.sent();
                        res.json(stats);
                        return [3 /*break*/, 3];
                    case 2:
                        error_2 = _a.sent();
                        res.status(500).json({ error: 'Failed to fetch team stats' });
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        }); });
        // Update ELO after game
        this.app.post('/api/update-elo', function (req, res) {
            try {
                var _a = req.body, homeTeam = _a.homeTeam, awayTeam = _a.awayTeam, homeWin = _a.homeWin;
                if (!homeTeam || !awayTeam || homeWin === undefined) {
                    return res.status(400).json({
                        error: 'Missing required fields: homeTeam, awayTeam, homeWin'
                    });
                }
                _this.predictionModel.updateEloAfterGame(homeTeam, awayTeam, homeWin);
                res.json({
                    message: 'ELO ratings updated successfully',
                    homeTeam: homeTeam,
                    awayTeam: awayTeam,
                    winner: homeWin ? homeTeam : awayTeam
                });
            }
            catch (error) {
                res.status(500).json({ error: 'Failed to update ELO' });
            }
        });
        // Calculate Kelly Criterion
        this.app.get('/api/kelly', function (req, res) {
            try {
                var _a = req.query, odds = _a.odds, probability = _a.probability;
                if (!odds || !probability) {
                    return res.status(400).json({
                        error: 'Missing odds or probability parameter'
                    });
                }
                var decimalOdds = parseFloat(odds);
                var prob = parseFloat(probability);
                if (decimalOdds <= 0 || prob < 0 || prob > 1) {
                    return res.status(400).json({
                        error: 'Invalid odds or probability values'
                    });
                }
                var impliedProb = 1 / decimalOdds;
                var kelly = Math.max(0, (decimalOdds * prob - (1 - prob)) / (decimalOdds - 1));
                var fractionalKelly = kelly / 4;
                var hasValue = prob > impliedProb;
                res.json({
                    odds: decimalOdds,
                    yourProbability: prob,
                    impliedProbability: impliedProb,
                    fullKelly: kelly,
                    fractionalKelly: fractionalKelly,
                    hasValue: hasValue,
                    recommendation: hasValue ? "Postawiaj ".concat((fractionalKelly * 100).toFixed(2), "%") : 'PASS'
                });
            }
            catch (error) {
                res.status(500).json({ error: 'Failed to calculate Kelly' });
            }
        });
        // Get model weights
        this.app.get('/api/model-weights', function (req, res) {
            try {
                var weights = _this.predictionModel.getModelWeights();
                res.json(weights);
            }
            catch (error) {
                res.status(500).json({ error: 'Failed to fetch model weights' });
            }
        });
        // Get available leagues
        this.app.get('/api/leagues', function (_req, res) {
            var leagues = Object.entries(sport_1.LEAGUE_KEY_TO_SPORT).map(function (_a) {
                var key = _a[0], sport = _a[1];
                return ({
                    key: key,
                    sport: sport,
                    label: sport_1.SportConfig[sport].label,
                    flag: sport_1.SportConfig[sport].flag,
                    hasDraw: sport_1.SportConfig[sport].hasDraw
                });
            });
            res.json(leagues);
        });
        // Get odds for a league (with cache)
        this.app.get('/api/odds', function (req, res) { return __awaiter(_this, void 0, void 0, function () {
            var league, sport, result, error_3;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        league = req.query.league;
                        sport = (_a = sport_1.LEAGUE_KEY_TO_SPORT[league]) !== null && _a !== void 0 ? _a : sport_1.Sport.NFL;
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.oddsService.getOdds(sport)];
                    case 2:
                        result = _b.sent();
                        res.json(result);
                        return [3 /*break*/, 4];
                    case 3:
                        error_3 = _b.sent();
                        res.status(500).json({ error: 'Błąd pobierania kursów', details: error_3 === null || error_3 === void 0 ? void 0 : error_3.message });
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        }); });
        // Force refresh odds (costs 1 API request)
        this.app.post('/api/odds/refresh', function (req, res) { return __awaiter(_this, void 0, void 0, function () {
            var league, sport, result, error_4;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        league = req.body.league;
                        sport = (_a = sport_1.LEAGUE_KEY_TO_SPORT[league]) !== null && _a !== void 0 ? _a : sport_1.Sport.NFL;
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.oddsService.refreshOdds(sport)];
                    case 2:
                        result = _b.sent();
                        res.json(result);
                        return [3 /*break*/, 4];
                    case 3:
                        error_4 = _b.sent();
                        res.status(500).json({ error: 'Błąd odświeżania kursów', details: error_4 === null || error_4 === void 0 ? void 0 : error_4.message });
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        }); });
        // Cache status
        this.app.get('/api/cache-status', function (_req, res) {
            res.json(_this.oddsService.getCacheStatus());
        });
        // Serve index.html for all other routes
        this.app.get('*', function (req, res) {
            res.sendFile(path_1.default.join(process.cwd(), 'public/index.html'));
        });
    };
    /**
     * Start the server
     */
    DashboardServer.prototype.start = function () {
        var _this = this;
        this.app.listen(this.port, function () {
            console.log('\n');
            console.log('╔════════════════════════════════════════════════════════════════════╗');
            console.log('║                   🏈 DASHBOARD SERVER RUNNING 🏈                   ║');
            console.log("\u2551                   \uD83D\uDCCA http://localhost:".concat(_this.port, "                       \u2551"));
            console.log('╚════════════════════════════════════════════════════════════════════╝');
            console.log('\n💡 Otwórz przeglądarkę и przejdź na http://localhost:3000\n');
        });
    };
    /**
     * Get port number
     */
    DashboardServer.prototype.getPort = function () {
        return this.port;
    };
    return DashboardServer;
}());
exports.DashboardServer = DashboardServer;
