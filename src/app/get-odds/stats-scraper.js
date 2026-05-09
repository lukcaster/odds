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
exports.StatsScraperNFL = void 0;
var axios_1 = require("axios");
/**
 * Scraper statystyk z NFL.com i ESPN
 * Pobiera aktualne statystyki drużyn
 */
var StatsScraperNFL = /** @class */ (function () {
    function StatsScraperNFL() {
        // Cache dla statystyk (aby nie spamować API)
        this.statsCache = new Map();
        this.cacheExpiry = 3600000; // 1 godzina
    }
    /**
     * Pobierz statystyki drużyny
     * Próbuje: ESPN API → Fallback do default stats
     */
    StatsScraperNFL.prototype.getTeamStats = function (teamName) {
        return __awaiter(this, void 0, void 0, function () {
            var cached, stats, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        cached = this.statsCache.get(teamName);
                        if (cached) {
                            return [2 /*return*/, cached];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.fetchFromEspnStats(teamName)];
                    case 2:
                        stats = _a.sent();
                        this.statsCache.set(teamName, stats);
                        return [2 /*return*/, stats];
                    case 3:
                        error_1 = _a.sent();
                        console.warn("\u26A0\uFE0F  B\u0142\u0105d pobierania statystyk dla ".concat(teamName, ", u\u017Cywam defaults"));
                        return [2 /*return*/, this.getDefaultStats(teamName)];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Pobierz z ESPN Stats API
     * https://site.api.espn.com/v2/site/nfl/teams/{team}
     */
    StatsScraperNFL.prototype.fetchFromEspnStats = function (teamName) {
        return __awaiter(this, void 0, void 0, function () {
            var teamCode, response, data, error_2;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        teamCode = this.teamNameToCode(teamName);
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, axios_1.default.get("https://site.api.espn.com/v2/site/nfl/teams/".concat(teamCode), { timeout: 5000 })];
                    case 2:
                        response = _b.sent();
                        data = response.data;
                        // Jeśli dostępne są statystyki, parsuj je
                        if ((_a = data.team) === null || _a === void 0 ? void 0 : _a.stats) {
                            return [2 /*return*/, {
                                    team: teamName,
                                    pointsFor: data.team.stats.pointsFor || 24.5,
                                    pointsAgainst: data.team.stats.pointsAgainst || 22.3,
                                    passYardsFor: data.team.stats.passYardsFor || 245,
                                    passYardsAgainst: data.team.stats.passYardsAgainst || 220,
                                    rushYardsFor: data.team.stats.rushYardsFor || 120,
                                    rushYardsAgainst: data.team.stats.rushYardsAgainst || 115,
                                    turnoverMargin: data.team.stats.turnoverMargin || 0,
                                    thirdDownPercent: data.team.stats.thirdDownPercent || 40,
                                    redZonePercent: data.team.stats.redZonePercent || 55
                                }];
                        }
                        return [2 /*return*/, this.getDefaultStats(teamName)];
                    case 3:
                        error_2 = _b.sent();
                        throw new Error("Failed to fetch ESPN stats: ".concat(error_2));
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Domyślne statystyki dla każdej drużyny (oparte na 2024 sezonie)
     * Możesz zaktualizować na bieżąco
     */
    StatsScraperNFL.prototype.getDefaultStats = function (teamName) {
        // Statystyki 2024 - zaktualizujemy w sezonie
        var defaultStatsDB = {
            'Kansas City Chiefs': {
                team: 'Kansas City Chiefs',
                pointsFor: 25.1,
                pointsAgainst: 19.8,
                passYardsFor: 235,
                passYardsAgainst: 215,
                rushYardsFor: 135,
                rushYardsAgainst: 108,
                turnoverMargin: 1.2,
                thirdDownPercent: 44,
                redZonePercent: 62
            },
            'San Francisco 49ers': {
                team: 'San Francisco 49ers',
                pointsFor: 28.3,
                pointsAgainst: 18.5,
                passYardsFor: 260,
                passYardsAgainst: 195,
                rushYardsFor: 142,
                rushYardsAgainst: 98,
                turnoverMargin: 1.5,
                thirdDownPercent: 46,
                redZonePercent: 65
            },
            'Buffalo Bills': {
                team: 'Buffalo Bills',
                pointsFor: 24.8,
                pointsAgainst: 20.2,
                passYardsFor: 250,
                passYardsAgainst: 220,
                rushYardsFor: 110,
                rushYardsAgainst: 120,
                turnoverMargin: 0.8,
                thirdDownPercent: 42,
                redZonePercent: 58
            },
            'Detroit Lions': {
                team: 'Detroit Lions',
                pointsFor: 27.5,
                pointsAgainst: 21.1,
                passYardsFor: 280,
                passYardsAgainst: 240,
                rushYardsFor: 120,
                rushYardsAgainst: 110,
                turnoverMargin: 0.5,
                thirdDownPercent: 45,
                redZonePercent: 60
            },
            // Dla innych drużyn - averages
            'DEFAULT': {
                team: teamName,
                pointsFor: 23.5,
                pointsAgainst: 23.5,
                passYardsFor: 240,
                passYardsAgainst: 240,
                rushYardsFor: 120,
                rushYardsAgainst: 120,
                turnoverMargin: 0,
                thirdDownPercent: 40,
                redZonePercent: 56
            }
        };
        return defaultStatsDB[teamName] || defaultStatsDB['DEFAULT'];
    };
    /**
     * Konwertuj nazwę drużyny na kod ESPN
     */
    StatsScraperNFL.prototype.teamNameToCode = function (teamName) {
        var codeMap = {
            'Kansas City Chiefs': 'kc',
            'Buffalo Bills': 'buf',
            'San Francisco 49ers': 'sf',
            'Detroit Lions': 'det',
            'Green Bay Packers': 'gb',
            'Dallas Cowboys': 'dal',
            'Philadelphia Eagles': 'phi',
            'Los Angeles Rams': 'la',
            'Cincinnati Bengals': 'cin',
            'Baltimore Ravens': 'bal',
            'Pittsburgh Steelers': 'pit',
            'Cleveland Browns': 'cle',
            'Houston Texans': 'hou',
            'New York Jets': 'nyj',
            'New England Patriots': 'ne',
            'Miami Dolphins': 'mia',
            'New York Giants': 'nyg',
            'Washington Commanders': 'wsh',
            'New Orleans Saints': 'no',
            'Tampa Bay Buccaneers': 'tb',
            'Atlanta Falcons': 'atl',
            'Minnesota Vikings': 'min',
            'Chicago Bears': 'chi',
            'Los Angeles Chargers': 'lac',
            'Denver Broncos': 'den',
            'Indianapolis Colts': 'ind',
            'Tennessee Titans': 'ten',
            'Jacksonville Jaguars': 'jax',
            'Las Vegas Raiders': 'lv',
            'Arizona Cardinals': 'ari',
            'Seattle Seahawks': 'sea'
        };
        return codeMap[teamName] || 'nfl';
    };
    /**
     * Oblicz "strength" drużyny na podstawie statystyk
     * Wyższa liczba = lepsza drużyna
     */
    StatsScraperNFL.prototype.calculateTeamStrength = function (stats) {
        var offenseScore = (stats.pointsFor / 30) * 40; // Max 30 pts per game
        var defenseScore = ((45 - stats.pointsAgainst) / 45) * 30; // Lower is better
        var turnoverScore = Math.min(stats.turnoverMargin * 5, 10);
        var efficiencyScore = ((stats.thirdDownPercent + stats.redZonePercent) / 100) * 20;
        return offenseScore + defenseScore + turnoverScore + efficiencyScore;
    };
    /**
     * Wyczyść cache
     */
    StatsScraperNFL.prototype.clearCache = function () {
        this.statsCache.clear();
        console.log('📦 Stats cache cleared');
    };
    return StatsScraperNFL;
}());
exports.StatsScraperNFL = StatsScraperNFL;
