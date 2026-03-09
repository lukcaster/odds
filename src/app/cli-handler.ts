import inquirer from 'inquirer';
import { EloValidator } from './get-odds/elo-validator';
import { HybridPredictionModel } from './get-odds/hybrid-prediction-model';
import { OmegaCalculator } from './get-odds/omega-calculator';

const nflTeams = [
    'Kansas City Chiefs',
    'Buffalo Bills',
    'San Francisco 49ers',
    'Detroit Lions',
    'Green Bay Packers',
    'Dallas Cowboys',
    'Philadelphia Eagles',
    'Baltimore Ravens',
    'Cincinnati Bengals',
    'Los Angeles Rams',
    'New Orleans Saints',
    'Tampa Bay Buccaneers',
    'Minnesota Vikings',
    'Chicago Bears',
    'Los Angeles Chargers',
    'Denver Broncos',
    'Las Vegas Raiders',
    'Houston Texans',
    'Indianapolis Colts',
    'Tennessee Titans',
    'Jacksonville Jaguars',
    'Washington Commanders',
    'New York Giants',
    'Pittsburgh Steelers',
    'Cleveland Browns',
    'Miami Dolphins',
    'New England Patriots',
    'New York Jets',
    'Arizona Cardinals',
    'Seattle Seahawks'
];

export class OddsCalculatorCLI {
    private predictionModel: HybridPredictionModel;
    private calculator: OmegaCalculator;

    constructor() {
        this.predictionModel = new HybridPredictionModel();
        this.calculator = new OmegaCalculator();
    }

    /**
     * Główne menu CLI
     */
    public async start(): Promise<void> {
        console.log('\n');
        console.log('╔════════════════════════════════════════════════════════════════════╗');
        console.log('║          🏈 NFL ODDS CALCULATOR - KELLY CRITERION 🏈              ║');
        console.log('║                 Hybrid Model (ELO + Stats + Momentum)              ║');
        console.log('╚════════════════════════════════════════════════════════════════════╝\n');

        let running = true;
        while (running) {
            const { action } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'action',
                    message: 'Co chcesz zrobić?',
                    choices: [
                        { name: '🏈 Analiza meczów z API (the-odds-api.com)', value: 'api' },
                        { name: '🎯 Ręczna analiza (podaj drużyny)', value: 'manual' },
                        { name: '📊 Wyświetl ELO Rankings', value: 'rankings' },
                        { name: '🌐 Porównaj ELO z online', value: 'validate-elo' },
                        { name: '⚙️  Ustaw wagi modelu (ELO/Stats/Momentum)', value: 'weights' },
                        { name: '🔄 Aktualizuj ELO po meczu', value: 'update-elo' },
                        { name: '❌ Wyjdź', value: 'exit' }
                    ],
                    pageSize: 10
                }
            ]);

            switch (action) {
                case 'api':
                    await this.analyzeFromAPI();
                    break;
                case 'manual':
                    await this.manualAnalysis();
                    break;
                case 'rankings':
                    this.displayRankings();
                    break;
                case 'validate-elo':
                    await this.validateEloAgainstOnline();
                    break;
                case 'weights':
                    await this.setWeights();
                    break;
                case 'update-elo':
                    await this.updateELOAfterGame();
                    break;
                case 'exit':
                    console.log('\n👋 Do widzenia! Good luck making that money! 🤑\n');
                    running = false;
                    break;
            }
        }
    }

    /**
     * Analiza meczów z API
     */
    private async analyzeFromAPI(): Promise<void> {
        console.log('\n📡 Pobieranie danych z the-odds-api.com...\n');
        try {
            await this.calculator.calculate();
        } catch (error) {
            console.error('❌ Błąd podczas pobierania z API:', error);
        }
        await this.pause();
    }

    /**
     * Ręczna analiza - użytkownik wprowadza drużyny
     */
    private async manualAnalysis(): Promise<void> {
        const { homeTeam } = await inquirer.prompt([
            {
                type: 'autocomplete',
                name: 'homeTeam',
                message: 'Drużyna domowa:',
                source: (answersSoFar: any, input: string) => {
                    input = input || '';
                    const filtered = nflTeams.filter(team =>
                        team.toLowerCase().includes(input.toLowerCase())
                    );
                    return Promise.resolve(filtered);
                }
            }
        ]);

        const { awayTeam } = await inquirer.prompt([
            {
                type: 'autocomplete',
                name: 'awayTeam',
                message: 'Drużyna wyjazdowa:',
                source: (answersSoFar: any, input: string) => {
                    input = input || '';
                    const filtered = nflTeams.filter(team =>
                        team.toLowerCase().includes(input.toLowerCase()) && team !== homeTeam
                    );
                    return Promise.resolve(filtered);
                }
            }
        ]);

        const { odds } = await inquirer.prompt([
            {
                type: 'number',
                name: 'odds',
                message: 'Kurs (decimal format, np. 1.90):',
                default: 1.90,
                validate: (value: any) => {
                    const num = parseFloat(value);
                    return num > 0 ? true : 'Kurs musi być większy od 0';
                }
            }
        ]);

        console.log('\n🔍 Analizuję mecz...\n');
        await this.predictionModel.displayMatchAnalysis(homeTeam, awayTeam);

        // Kelly calculation
        const prediction = await this.predictionModel.getPredictionAsync(homeTeam, awayTeam);
        if (prediction !== null) {
            const { kellyBet, fractionalKelly, isValueBet } = await this.calculateKelly(odds, prediction);

            console.log('\n💰 KELLY CRITERION');
            console.log('═'.repeat(50));
            console.log(`   Kurs: ${odds.toFixed(2)}`);
            console.log(`   Predicted: ${(prediction * 100).toFixed(1)}%`);
            console.log(`   Full Kelly: ${(kellyBet * 100).toFixed(2)}%`);
            console.log(`   Fractional Kelly (1/4): ${(fractionalKelly * 100).toFixed(2)}%`);

            if (isValueBet) {
                console.log(`   ✥ SOLID - Postawiaj ${(fractionalKelly * 100).toFixed(2)}% bankrolla!`);
            } else {
                console.log(`   ❌ Brak value - PASS na tym obstawieniu`);
            }
            console.log('═'.repeat(50));
        }

        await this.pause();
    }

    /**
     * Wyświetl ELO rankings
     */
    private displayRankings(): void {
        console.log('\n');
        this.predictionModel.displayTeamRankings();
        console.log('\n');
    }

    /**
     * Porównaj ELO z online ratingami
     */
    private async validateEloAgainstOnline(): Promise<void> {
        console.log('\n🌐 Porównuję Twoje ELO ratings z online sources...\n');

        try {
            const validator = new EloValidator(this.predictionModel.getEloSystem());
            const results = await validator.validateAgainstOnline();

            if (results.length > 0) {
                validator.displayValidationStats(results);
            }
        } catch (error) {
            console.error('❌ Błąd podczas porównywania ELO:', error);
        }

        await this.pause();
    }

    /**
     * Ustaw wagi modelu
     */
    private async setWeights(): Promise<void> {
        const { eloWeight, statsWeight, momentumWeight } = await inquirer.prompt([
            {
                type: 'number',
                name: 'eloWeight',
                message: 'Waga ELO Rating (0-100):',
                default: 50,
                validate: this.validateWeight
            },
            {
                type: 'number',
                name: 'statsWeight',
                message: 'Waga Team Stats (0-100):',
                default: 35,
                validate: this.validateWeight
            },
            {
                type: 'number',
                name: 'momentumWeight',
                message: 'Waga Momentum (0-100):',
                default: 15,
                validate: this.validateWeight
            }
        ]);

        this.predictionModel.setWeights(eloWeight, statsWeight, momentumWeight);
        console.log('\n✅ Wagi zaktualizowane!\n');
        await this.pause();
    }

    /**
     * Aktualizuj ELO po meczu
     */
    private async updateELOAfterGame(): Promise<void> {
        const { homeTeam } = await inquirer.prompt([
            {
                type: 'autocomplete',
                name: 'homeTeam',
                message: 'Drużyna domowa:',
                source: (answersSoFar: any, input: string) => {
                    input = input || '';
                    const filtered = nflTeams.filter(team =>
                        team.toLowerCase().includes(input.toLowerCase())
                    );
                    return Promise.resolve(filtered);
                }
            }
        ]);

        const { awayTeam } = await inquirer.prompt([
            {
                type: 'autocomplete',
                name: 'awayTeam',
                message: 'Drużyna wyjazdowa:',
                source: (answersSoFar: any, input: string) => {
                    input = input || '';
                    const filtered = nflTeams.filter(team =>
                        team.toLowerCase().includes(input.toLowerCase()) && team !== homeTeam
                    );
                    return Promise.resolve(filtered);
                }
            }
        ]);

        const { winner } = await inquirer.prompt([
            {
                type: 'list',
                name: 'winner',
                message: 'Która drużyna wygrała?',
                choices: [
                    { name: `🏠 ${homeTeam} (Domu)`, value: 'home' },
                    { name: `🚗 ${awayTeam} (Wyjazdowa)`, value: 'away' }
                ]
            }
        ]);

        const homeWin = winner === 'home';
        this.predictionModel.updateEloAfterGame(homeTeam, awayTeam, homeWin);
        console.log('\n✅ ELO ratings zaktualizowane!\n');
        await this.pause();
    }

    /**
     * Helper: Calculate Kelly
     */
    private async calculateKelly(
        odds: number,
        probability: number
    ): Promise<{ kellyBet: number; fractionalKelly: number; isValueBet: boolean }> {
        const impliedProb = 1 / odds;
        const kellyBet = Math.max(0, (odds * probability - (1 - probability)) / (odds - 1));
        const fractionalKelly = kellyBet / 4;
        const isValueBet = probability > impliedProb;

        return { kellyBet, fractionalKelly, isValueBet };
    }

    /**
     * Helper: Validate weight input
     */
    private validateWeight(value: any): boolean | string {
        const num = parseFloat(value);
        return num >= 0 && num <= 100 ? true : 'Waga musi być między 0-100';
    }

    /**
     * Helper: Pause for user input
     */
    private async pause(): Promise<void> {
        await inquirer.prompt([
            {
                type: 'input',
                name: 'continue',
                message: 'Naciśnij ENTER aby wrócić do menu...'
            }
        ]);
    }
}
