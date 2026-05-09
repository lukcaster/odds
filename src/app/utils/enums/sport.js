"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEAGUE_KEY_TO_SPORT = exports.SportConfig = exports.Sport = void 0;
var Sport;
(function (Sport) {
    Sport["NFL"] = "americanfootball_nfl";
    Sport["EKSTRAKLASA"] = "soccer_poland_ekstraklasa";
    Sport["LALIGA"] = "soccer_spain_la_liga";
    Sport["PREMIER_LEAGUE"] = "soccer_england_premier_league";
    Sport["BUNDESLIGA"] = "soccer_germany_bundesliga";
})(Sport || (exports.Sport = Sport = {}));
exports.SportConfig = (_a = {},
    _a[Sport.NFL] = { region: 'us', label: 'NFL', hasDraw: false, flag: '🏈' },
    _a[Sport.EKSTRAKLASA] = { region: 'eu', label: 'Ekstraklasa', hasDraw: true, flag: '🇵🇱' },
    _a[Sport.LALIGA] = { region: 'eu', label: 'La Liga', hasDraw: true, flag: '🇪🇸' },
    _a[Sport.PREMIER_LEAGUE] = { region: 'uk', label: 'Premier League', hasDraw: true, flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
    _a[Sport.BUNDESLIGA] = { region: 'eu', label: 'Bundesliga', hasDraw: true, flag: '🇩🇪' },
    _a);
exports.LEAGUE_KEY_TO_SPORT = {
    'nfl': Sport.NFL,
    'ekstraklasa': Sport.EKSTRAKLASA,
    'laliga': Sport.LALIGA,
    'premier_league': Sport.PREMIER_LEAGUE,
    'bundesliga': Sport.BUNDESLIGA
};
