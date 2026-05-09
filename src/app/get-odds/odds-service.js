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
exports.OddsService = void 0;
var axios_1 = require("axios");
var dotenv = require("dotenv");
var sport_1 = require("../utils/enums/sport");
dotenv.config();
var OddsService = /** @class */ (function () {
    function OddsService() {
        this.cache = new Map();
        this.baseUrl = 'https://api.the-odds-api.com/v4';
        this.apiKey = process.env.apiKey || '';
        if (!this.apiKey) {
            throw new Error('Brakuje apiKey w .env');
        }
    }
    OddsService.prototype.getOdds = function (sport) {
        return __awaiter(this, void 0, void 0, function () {
            var cached;
            return __generator(this, function (_a) {
                cached = this.cache.get(sport);
                if (cached)
                    return [2 /*return*/, cached];
                return [2 /*return*/, this.fetchAndCache(sport)];
            });
        });
    };
    OddsService.prototype.refreshOdds = function (sport) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.fetchAndCache(sport)];
            });
        });
    };
    OddsService.prototype.getCacheStatus = function () {
        return Array.from(this.cache.entries()).map(function (_a) {
            var sport = _a[0], cache = _a[1];
            return ({
                sport: sport,
                fetchedAt: cache.fetchedAt,
                count: cache.data.length
            });
        });
    };
    OddsService.prototype.fetchAndCache = function (sport) {
        return __awaiter(this, void 0, void 0, function () {
            var config, response, requestsRemaining, matches, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        config = sport_1.SportConfig[sport];
                        return [4 /*yield*/, axios_1.default.get("".concat(this.baseUrl, "/sports/").concat(sport, "/odds/"), {
                                params: {
                                    apiKey: this.apiKey,
                                    regions: config.region,
                                    markets: 'h2h',
                                    oddsFormat: 'decimal'
                                }
                            })];
                    case 1:
                        response = _a.sent();
                        requestsRemaining = Number(response.headers['x-requests-remaining']) || undefined;
                        matches = this.normalizeMatches(response.data, sport);
                        result = {
                            data: matches,
                            fetchedAt: new Date().toISOString(),
                            sport: sport,
                            requestsRemaining: requestsRemaining
                        };
                        this.cache.set(sport, result);
                        console.log("[OddsService] Pobrano ".concat(matches.length, " mecz\u00F3w dla ").concat(config.label, ". Pozosta\u0142o request\u00F3w: ").concat(requestsRemaining));
                        return [2 /*return*/, result];
                }
            });
        });
    };
    OddsService.prototype.normalizeMatches = function (data, sport) {
        return data.map(function (match) {
            var _a, _b;
            var bookmaker = (_a = match.bookmakers) === null || _a === void 0 ? void 0 : _a[0];
            var market = (_b = bookmaker === null || bookmaker === void 0 ? void 0 : bookmaker.markets) === null || _b === void 0 ? void 0 : _b[0];
            var outcomes = (market === null || market === void 0 ? void 0 : market.outcomes) || [];
            var homeOdds = null;
            var awayOdds = null;
            var drawOdds;
            for (var _i = 0, outcomes_1 = outcomes; _i < outcomes_1.length; _i++) {
                var outcome = outcomes_1[_i];
                if (outcome.name === match.home_team) {
                    homeOdds = outcome.price;
                }
                else if (outcome.name === match.away_team) {
                    awayOdds = outcome.price;
                }
                else if (outcome.name === 'Draw') {
                    drawOdds = outcome.price;
                }
            }
            return {
                id: match.id,
                homeTeam: match.home_team,
                awayTeam: match.away_team,
                commenceTime: match.commence_time,
                sport: match.sport_key,
                odds: homeOdds && awayOdds
                    ? { home: homeOdds, draw: drawOdds, away: awayOdds, bookmaker: (bookmaker === null || bookmaker === void 0 ? void 0 : bookmaker.title) || 'Bukmacher' }
                    : null
            };
        });
    };
    return OddsService;
}());
exports.OddsService = OddsService;
