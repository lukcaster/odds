import { Page } from "playwright";
import { OdsResponse, odsResponseParser } from "../utils/ods-response-parser";
import { Outcome } from "../utils/outcome";
import { setPage } from "../utils/set-page";
import { getOdds } from "./get-us-nfl-odds";
import { HybridPredictionModel } from "./hybrid-prediction-model";
import {
    BetRecommendation,
    decimalOddsToImpliedProbability,
    fractionalKelly,
    isValueBet,
    kellyBet
} from "./kelly-calculator";

export class OmegaCalculator {
    private page!: Page;

    public async calculate(): Promise<void> {
        try {
            this.page = await setPage();
            const response = await getOdds(this.page);
            const apiResponse = await response.json();
            const parsedResponse = odsResponseParser.parse(apiResponse);
            const outcomes = this.getOutcomes(parsedResponse);

            await this.displayRecommendations(outcomes);

            await this.page.close();
        } catch (error) {
            console.error('Błąd podczas kalkulacji:', error);
            throw error;
        }
    }

    private getOutcomes(ods: OdsResponse): Outcome[] {
        const outcomes: Outcome[] = [];
        for (let outcome of ods) {
            outcomes.push(new Outcome(
                outcome.home_team,
                outcome.away_team,
                outcome.bookmakers[0].markets[0].outcomes[0].name,
                outcome.bookmakers[0].markets[0].outcomes[0].price,
                outcome.bookmakers[0].markets[0].outcomes[0].point
            ));
        }
        return outcomes;
    }

    private async displayRecommendations(outcomes: Outcome[]): Promise<void> {
        const predictionModel = new HybridPredictionModel();

        console.log('\n🏈 🤖 REKOMENDACJE OBSTAWIANIA NFL (HYBRID MODEL) 🤖 🏈\n');
        console.log('═'.repeat(80));
        console.log('Model: ELO Rating (50%) + Team Stats (35%) + Momentum (15%)\n');

        // Wyświetl rankings na początek
        predictionModel.displayTeamRankings();
        console.log('═'.repeat(80));

        for (let outcome of outcomes) {
            const impliedProb = decimalOddsToImpliedProbability(outcome.getPrice());
            const teamName = outcome.getName() === 'Home' ? outcome.getHomeTeam() : outcome.getAwayTeam();
            const isHome = outcome.getName() === 'Home';

            // Spróbuj pobrać predykcję z hybrid modelu
            let yourEstimate: number | null = null;
            if (isHome) {
                yourEstimate = await predictionModel.getPredictionAsync(
                    outcome.getHomeTeam(),
                    outcome.getAwayTeam()
                );
            } else {
                const homeProb = await predictionModel.getPredictionAsync(
                    outcome.getHomeTeam(),
                    outcome.getAwayTeam()
                );
                if (homeProb !== null) {
                    yourEstimate = 1 - homeProb;
                }
            }

            // Jeśli brak predykcji, użyj implied probability
            let predictionSource = '🤖 Hybrid Model';
            if (yourEstimate === null) {
                yourEstimate = impliedProb;
                predictionSource = '⚠️  Fallback to implied odds';
            }

            const kelly = kellyBet(outcome.getPrice(), yourEstimate);
            const fractKelly = fractionalKelly(outcome.getPrice(), yourEstimate);
            const hasValue = isValueBet(outcome.getPrice(), yourEstimate);

            const recommendation: BetRecommendation = {
                team: teamName,
                odds: outcome.getPrice(),
                impliedProbability: impliedProb,
                yourEstimate: yourEstimate,
                hasValue: hasValue,
                kellyPercentage: kelly,
                fractionalKellyPercentage: fractKelly,
                recommendation: this.generateRecommendation(hasValue, fractKelly)
            };

            this.logRecommendation(recommendation, predictionSource);
        }

        console.log('═'.repeat(80));
    }

    private generateRecommendation(hasValue: boolean, fractionalKelly: number): string {
        if (!hasValue) {
            return '❌ PASS - Brak value w tym obstawieniu';
        }

        if (fractionalKelly <= 0) {
            return '⚠️  PASS - Zbyt mały expected value';
        }

        if (fractionalKelly < 0.01) {
            return `⚠️  MICRO - Postawiaj max ${(fractionalKelly * 100).toFixed(2)}% bankrolla`;
        }

        if (fractionalKelly < 0.05) {
            return `✅ SMALL - Postawiaj ${(fractionalKelly * 100).toFixed(2)}% bankrolla`;
        }

        return `✥ SOLID - Postawiaj ${(fractionalKelly * 100).toFixed(2)}% bankrolla`;
    }

    private logRecommendation(rec: BetRecommendation, predictionSource: string = 'Model'): void {
        console.log(`\n📊 ${rec.team}`);
        console.log(`   Kurs: ${rec.odds.toFixed(2)}`);
        console.log(`   Implied probability: ${(rec.impliedProbability * 100).toFixed(1)}%`);
        console.log(`   Twoja estymacja: ${(rec.yourEstimate * 100).toFixed(1)}% (${predictionSource})`);
        console.log(`   Full Kelly: ${(rec.kellyPercentage * 100).toFixed(2)}%`);
        console.log(`   Fractional Kelly (1/4): ${(rec.fractionalKellyPercentage * 100).toFixed(2)}%`);
        console.log(`   ${rec.recommendation}`);
    }
}