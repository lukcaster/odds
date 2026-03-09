import axios from 'axios';
import { EloRatingSystem } from './elo-rating-system';

/**
 * Porównuje Twoje ELO ratings z online źródłami
 * Wspiera: ESPN Power Rankings, Wikipedia, itp.
 */
export class EloValidator {
    private elo: EloRatingSystem;

    constructor(elo?: EloRatingSystem) {
        this.elo = elo || new EloRatingSystem();
    }

    /**
     * Pobierz ELO ratings z online źródła i porównaj z lokalnym
     */
    public async validateAgainstOnline(): Promise<ValidationResult[]> {
        console.log('\n📡 Pobieranie online ELO ratings...\n');

        const results: ValidationResult[] = [];

        try {
            // Opcja 1: Spróbuj ESPN Power Rankings (HTML scraping)
            console.log('🔍 Próbuję ESPN Power Rankings...');
            const espnRankings = await this.fetchEspnPowerRankings();

            if (espnRankings.size > 0) {
                console.log('\n✅ Pobrano ESPN Power Rankings!\n');
                const espnResults = await this.compareWithLocal(espnRankings, 'ESPN Power Rankings');
                results.push(...espnResults);
            }
        } catch (error) {
            console.warn('⚠️  ESPN scraping nie udał się\n');
        }

        // Jeśli nic się nie pobierze, pokazujemy lokalne ELO
        if (results.length === 0) {
            console.log('ℹ️  Nie mogłem pobrać online ratings, pokazuję lokalne ELO\n');
            return this.displayLocalElo();
        }

        return results;
    }

    /**
     * Pobiera Power Rankings z ESPN (HTML scraping)
     * ESPN Power Rankings: https://www.espn.com/nfl/powerrankings
     */
    private async fetchEspnPowerRankings(): Promise<Map<string, number>> {
        try {
            const response = await axios.get('https://www.espn.com/nfl/powerrankings', {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const html = response.data;

            // Prosta ekstrakcja rankingów z HTML (może wymagać aktualizacji gdy ESPN zmieni layout)
            const rankings = new Map<string, number>();

            // Szukaj wzoru: "1. Kansas City Chiefs" -> konwertuj rank na ELO equivalence
            const rankPattern = /(\d+)\.\s+([A-Za-z\s]+?)(?=<|$)/g;
            let match;
            let count = 0;

            // ESPN Power Rankings: #1 ≈ 1700 ELO, #32 ≈ 1300 ELO (przybliżenie)
            while ((match = rankPattern.exec(html)) !== null && count < 32) {
                const rank = parseInt(match[1]);
                const teamName = match[2].trim();
                const eloEquivalent = 1700 - (rank - 1) * 12.5; // Konwersja ranku na ELO

                if (teamName.length > 2 && teamName.length < 30) {
                    rankings.set(teamName, eloEquivalent);
                    count++;
                }
            }

            return rankings;
        } catch (error) {
            throw new Error(`ESPN Power Rankings fetch failed: ${error}`);
        }
    }

    /**
     * Pobiera ELO z FiveThirtyEight (jeśli dostępne dane)
     * Zwraca bardziej dokładne ELO niż power rankings
     */
    private async fetchFiveThirtyEightElo(): Promise<Map<string, number>> {
        try {
            const response = await axios.get(
                'https://projects.fivethirtyeight.com/nfl-api/nfl_elo.csv',
                { timeout: 10000 }
            );

            const lines = response.data.split('\n');
            const eloData = new Map<string, number>();

            // CSV format: date,season,neutral,playoff,team1,elo1,team2,elo2,...
            const latestRatings = new Map<string, number>();

            lines.forEach((line: string) => {
                if (!line.includes(',')) return;

                const parts = line.split(',');
                if (parts.length < 6) return;

                const team = parts[4]?.trim();
                const elo = parseFloat(parts[5]?.trim() || '0');

                if (team && !isNaN(elo)) {
                    // Trzymaj ostatni rating każdej drużyny
                    latestRatings.set(team, elo);
                }
            });

            return latestRatings;
        } catch (error) {
            throw new Error(`FiveThirtyEight ELO fetch failed: ${error}`);
        }
    }

    /**
     * Porównaj lokalne ELO z online
     */
    private async compareWithLocal(
        onlineRankings: Map<string, number>,
        source: string
    ): Promise<ValidationResult[]> {
        const allRatings = this.elo.getAllRatings();
        const results: ValidationResult[] = [];

        console.log(`\n📊 PORÓWNANIE: Twoje ELO vs ${source}\n`);
        console.log('DRUŻYNA'.padEnd(25) + '| TWOJE ELO | ONLINE | RÓŻNICA | STATUS');
        console.log('-'.repeat(80));

        allRatings.forEach(({ team, rating }) => {
            let onlineRating = onlineRankings.get(team);

            // Spróbuj znaleźć drużynę mimo zmian nazwy
            if (!onlineRating) {
                onlineRating = this.findTeamByAlias(team, onlineRankings);
            }

            if (onlineRating) {
                const diff = rating - onlineRating;
                const status =
                    Math.abs(diff) < 50 ? '✅ OK' :
                        diff > 50 ? '📈 TWOJE WYŻSZE' :
                            '📉 TWOJE NIŻSZE';

                console.log(
                    team.padEnd(25) +
                    `| ${rating.toFixed(0).padStart(9)} | ${onlineRating.toFixed(0).padStart(6)} | ${diff.toFixed(0).padStart(7)} | ${status}`
                );

                results.push({
                    team,
                    localElo: rating,
                    onlineElo: onlineRating || 0,
                    difference: diff,
                    source
                });
            }
        });

        return results;
    }

    /**
     * Wyświetl lokalne ELO (fallback)
     */
    private displayLocalElo(): ValidationResult[] {
        const allRatings = this.elo.getAllRatings();
        const results: ValidationResult[] = [];

        console.log('📊 RANKING DRUŻYN (lokalne ELO)\n');
        console.log('RANKING | DRUŻYNA'.padEnd(30) + '| ELO');
        console.log('-'.repeat(50));

        allRatings.forEach(({ team, rating }, index) => {
            console.log(
                `${(index + 1).toString().padEnd(7)} | ${team.padEnd(26)} | ${rating.toFixed(0)}`
            );

            results.push({
                team,
                localElo: rating,
                onlineElo: 0,
                difference: 0,
                source: 'Local'
            });
        });

        return results;
    }

    /**
     * Znajdź drużynę mimo zmian nazwy (aliasy)
     */
    private findTeamByAlias(teamName: string, rankings: Map<string, number>): number | undefined {
        const aliases: Record<string, string[]> = {
            'Kansas City Chiefs': ['KC', 'Kansas City'],
            'San Francisco 49ers': ['49ers', 'San Francisco'],
            'New England Patriots': ['Patriots', 'New England'],
            'Green Bay Packers': ['Green Bay', 'Packers'],
            // ... dodaj więcej jeśli potrzeba
        };

        const possibleNames = aliases[teamName] || [teamName];

        for (const name of possibleNames) {
            if (rankings.has(name)) {
                return rankings.get(name);
            }
        }

        return undefined;
    }

    /**
     * Wyświetl statystyki błędu średniego
     */
    public displayValidationStats(results: ValidationResult[]): void {
        const validResults = results.filter(r => r.onlineElo > 0);

        if (validResults.length === 0) {
            console.log('Brak danych do porównania');
            return;
        }

        const differences = validResults.map(r => Math.abs(r.difference));
        const avgError = differences.reduce((a, b) => a + b, 0) / differences.length;
        const maxError = Math.max(...differences);
        const minError = Math.min(...differences);

        console.log('\n\n📈 STATYSTYKI BŁĘDU\n');
        console.log(`Średnia różnica: ±${avgError.toFixed(0)} ELO`);
        console.log(`Maks różnica: ${maxError.toFixed(0)} ELO`);
        console.log(`Min różnica: ${minError.toFixed(0)} ELO`);
        console.log(`\nDrużyn porównanych: ${validResults.length}/32`);
    }

    /**
     * Zwróć ELO system dla dalszych operacji
     */
    public getEloSystem(): EloRatingSystem {
        return this.elo;
    }
}

/**
 * Rezultat porównania ELO
 */
export interface ValidationResult {
    team: string;
    localElo: number;
    onlineElo: number;
    difference: number;
    source: string;
}
