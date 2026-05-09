"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PredictionModel = void 0;
/**
 * Prosty model predykcyjny - możesz go rozszerzyć swoim kodem
 */
var PredictionModel = /** @class */ (function () {
    function PredictionModel() {
        this.predictions = new Map();
        this.loadDefaultPredictions();
    }
    /**
     * Załaduj domyślne predykcje (przykład)
     * Tutaj mogą być Twoje modele: AI, statystyka itp.
     */
    PredictionModel.prototype.loadDefaultPredictions = function () {
        // Format klucza: "HomeTeam vs AwayTeam"
        // Wartość: prawdopodobieństwo że zwyciężą gospodarze
        // Przykłady - zastąp ich swoim modelami
        this.predictions.set("Kansas City Chiefs vs San Francisco 49ers", 0.52);
        this.predictions.set("Buffalo Bills vs Kansas City Chiefs", 0.45);
        this.predictions.set("Dallas Cowboys vs Philadelphia Eagles", 0.55);
        this.predictions.set("Green Bay Packers vs Detroit Lions", 0.48);
    };
    /**
     * Pobierz prawdopodobieństwo dla konkretnego meczu
     * Jeśli nie ma predykcji, zwraca null (wtedy będziesz musiał podać ręcznie)
     */
    PredictionModel.prototype.getPrediction = function (homeTeam, awayTeam) {
        var key = "".concat(homeTeam, " vs ").concat(awayTeam);
        return this.predictions.get(key) || null;
    };
    /**
     * Dodaj swoją predykcję
     */
    PredictionModel.prototype.addPrediction = function (homeTeam, awayTeam, homeProbability) {
        if (homeProbability < 0 || homeProbability > 1) {
            throw new Error('Prawdopodobieństwo musi być z zakresu 0-1');
        }
        var key = "".concat(homeTeam, " vs ").concat(awayTeam);
        this.predictions.set(key, homeProbability);
    };
    /**
     * Zwróć obstawkę dla drużyny (nie zawsze są w "home team")
     * Jeśli obstawiasz away team, musisz znegować: (1 - homeProbability)
     */
    PredictionModel.prototype.getTeamProbability = function (teamName, homeTeam, awayTeam) {
        var homePrediction = this.getPrediction(homeTeam, awayTeam);
        if (homePrediction === null) {
            return null;
        }
        if (teamName === homeTeam) {
            return homePrediction;
        }
        else if (teamName === awayTeam) {
            return 1 - homePrediction;
        }
        return null;
    };
    /**
     * Wyświetl wszystkie załadowane predykcje
     */
    PredictionModel.prototype.listAll = function () {
        console.log('\n📋 Załadowane predykcje:');
        this.predictions.forEach(function (prob, match) {
            console.log("   ".concat(match, ": ").concat((prob * 100).toFixed(1), "% (gospodarze)"));
        });
    };
    return PredictionModel;
}());
exports.PredictionModel = PredictionModel;
