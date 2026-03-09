/**
 * Interfejs do definiowania swoich predykcji dla meczów
 */
export interface TeamPrediction {
    homeTeam: string;
    awayTeam: string;
    homeProbability: number; // 0-1, np. 0.60 = 60% szans dla gospodarzy
}

/**
 * Prosty model predykcyjny - możesz go rozszerzyć swoim kodem
 */
export class PredictionModel {
    private predictions: Map<string, number> = new Map();

    constructor() {
        this.loadDefaultPredictions();
    }

    /**
     * Załaduj domyślne predykcje (przykład)
     * Tutaj mogą być Twoje modele: AI, statystyka itp.
     */
    private loadDefaultPredictions(): void {
        // Format klucza: "HomeTeam vs AwayTeam"
        // Wartość: prawdopodobieństwo że zwyciężą gospodarze

        // Przykłady - zastąp ich swoim modelami
        this.predictions.set("Kansas City Chiefs vs San Francisco 49ers", 0.52);
        this.predictions.set("Buffalo Bills vs Kansas City Chiefs", 0.45);
        this.predictions.set("Dallas Cowboys vs Philadelphia Eagles", 0.55);
        this.predictions.set("Green Bay Packers vs Detroit Lions", 0.48);
    }

    /**
     * Pobierz prawdopodobieństwo dla konkretnego meczu
     * Jeśli nie ma predykcji, zwraca null (wtedy będziesz musiał podać ręcznie)
     */
    public getPrediction(homeTeam: string, awayTeam: string): number | null {
        const key = `${homeTeam} vs ${awayTeam}`;
        return this.predictions.get(key) || null;
    }

    /**
     * Dodaj swoją predykcję
     */
    public addPrediction(
        homeTeam: string,
        awayTeam: string,
        homeProbability: number
    ): void {
        if (homeProbability < 0 || homeProbability > 1) {
            throw new Error('Prawdopodobieństwo musi być z zakresu 0-1');
        }
        const key = `${homeTeam} vs ${awayTeam}`;
        this.predictions.set(key, homeProbability);
    }

    /**
     * Zwróć obstawkę dla drużyny (nie zawsze są w "home team")
     * Jeśli obstawiasz away team, musisz znegować: (1 - homeProbability)
     */
    public getTeamProbability(teamName: string, homeTeam: string, awayTeam: string): number | null {
        const homePrediction = this.getPrediction(homeTeam, awayTeam);

        if (homePrediction === null) {
            return null;
        }

        if (teamName === homeTeam) {
            return homePrediction;
        } else if (teamName === awayTeam) {
            return 1 - homePrediction;
        }

        return null;
    }

    /**
     * Wyświetl wszystkie załadowane predykcje
     */
    public listAll(): void {
        console.log('\n📋 Załadowane predykcje:');
        this.predictions.forEach((prob, match) => {
            console.log(`   ${match}: ${(prob * 100).toFixed(1)}% (gospodarze)`);
        });
    }
}
