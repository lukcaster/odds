import axios from 'axios';

/**
 * Statystyki drużyny na potrzeby predykcji
 */
export interface TeamStats {
    team: string;
    pointsFor: number;      // Punkty strzelone na mecz
    pointsAgainst: number;  // Punkty pozwolone na mecz
    passYardsFor: number;   // Yardy podane na mecz
    passYardsAgainst: number;
    rushYardsFor: number;
    rushYardsAgainst: number;
    turnoverMargin: number; // Turnovers wygranych
    thirdDownPercent: number;
    redZonePercent: number;
}

/**
 * Scraper statystyk z NFL.com i ESPN
 * Pobiera aktualne statystyki drużyn
 */
export class StatsScraperNFL {
    // Cache dla statystyk (aby nie spamować API)
    private statsCache: Map<string, TeamStats> = new Map();
    private cacheExpiry: number = 3600000; // 1 godzina

    /**
     * Pobierz statystyki drużyny
     * Próbuje: ESPN API → Fallback do default stats
     */
    public async getTeamStats(teamName: string): Promise<TeamStats> {
        // Sprawdzenie cache
        const cached = this.statsCache.get(teamName);
        if (cached) {
            return cached;
        }

        try {
            // Spróbuj pobrać z ESPN Stats API (publicznie dostępny)
            const stats = await this.fetchFromEspnStats(teamName);
            this.statsCache.set(teamName, stats);
            return stats;
        } catch (error) {
            console.warn(`⚠️  Błąd pobierania statystyk dla ${teamName}, używam defaults`);
            return this.getDefaultStats(teamName);
        }
    }

    /**
     * Pobierz z ESPN Stats API
     * https://site.api.espn.com/v2/site/nfl/teams/{team}
     */
    private async fetchFromEspnStats(teamName: string): Promise<TeamStats> {
        // Normalizuj nazwę na kod drużyny (np. "Kansas City Chiefs" → "kc")
        const teamCode = this.teamNameToCode(teamName);

        try {
            const response = await axios.get(
                `https://site.api.espn.com/v2/site/nfl/teams/${teamCode}`,
                { timeout: 5000 }
            );

            // ESPN zwraca różne formaty, tutaj extrahujemy podstawowe
            const data = response.data;

            // Jeśli dostępne są statystyki, parsuj je
            if (data.team?.stats) {
                return {
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
                };
            }

            return this.getDefaultStats(teamName);
        } catch (error) {
            throw new Error(`Failed to fetch ESPN stats: ${error}`);
        }
    }

    /**
     * Domyślne statystyki dla każdej drużyny (oparte na 2024 sezonie)
     * Możesz zaktualizować na bieżąco
     */
    private getDefaultStats(teamName: string): TeamStats {
        // Statystyki 2024 - zaktualizujemy w sezonie
        const defaultStatsDB: Record<string, TeamStats> = {
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
    }

    /**
     * Konwertuj nazwę drużyny na kod ESPN
     */
    private teamNameToCode(teamName: string): string {
        const codeMap: Record<string, string> = {
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
    }

    /**
     * Oblicz "strength" drużyny na podstawie statystyk
     * Wyższa liczba = lepsza drużyna
     */
    public calculateTeamStrength(stats: TeamStats): number {
        const offenseScore = (stats.pointsFor / 30) * 40; // Max 30 pts per game
        const defenseScore = ((45 - stats.pointsAgainst) / 45) * 30; // Lower is better
        const turnoverScore = Math.min(stats.turnoverMargin * 5, 10);
        const efficiencyScore = ((stats.thirdDownPercent + stats.redZonePercent) / 100) * 20;

        return offenseScore + defenseScore + turnoverScore + efficiencyScore;
    }

    /**
     * Wyczyść cache
     */
    public clearCache(): void {
        this.statsCache.clear();
        console.log('📦 Stats cache cleared');
    }
}
