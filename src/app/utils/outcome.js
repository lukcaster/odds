"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Outcome = void 0;
var Outcome = /** @class */ (function () {
    function Outcome(home_team, away_team, name, price, point) {
        this.home_team = home_team;
        this.away_team = away_team;
        this.name = name;
        this.price = price;
        this.point = point;
        this.home_team = home_team;
        this.away_team = away_team;
        this.name = name;
        this.price = price;
        this.point = point;
    }
    Outcome.prototype.getOutcome = function () {
        return this;
    };
    return Outcome;
}());
exports.Outcome = Outcome;
