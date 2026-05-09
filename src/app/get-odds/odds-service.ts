import axios from 'axios';
import * as dotenv from 'dotenv';
import { Sport, SportConfig } from '../utils/enums/sport';

dotenv.config();

export interface OddsMatch {
    id: string;
    homeTeam: string;
    awayTeam: string;
    commenceTime: string;
    sport: string;
    odds: {
        home: number;
        draw?: number;
        away: number;
        bookmaker: string;
    } | null;
}

export interface OddsCache {
    data: OddsMatch[];
    fetchedAt: string;
    sport: Sport;
    requestsRemaining?: number;
}

export class OddsService {
    private cache: Map<Sport, OddsCache> = new Map();
    private readonly apiKey: string;
    private readonly baseUrl = 'https://api.the-odds-api.com/v4';

    constructor() {
        this.apiKey = process.env.apiKey || '';
        if (!this.apiKey) {
            throw new Error('Brakuje apiKey w .env');
        }
    }

    public async getOdds(sport: Sport): Promise<OddsCache> {
        const cached = this.cache.get(sport);
        if (cached) return cached;
        return this.fetchAndCache(sport);
    }

    public async refreshOdds(sport: Sport): Promise<OddsCache> {
        return this.fetchAndCache(sport);
    }

    public getCacheStatus(): { sport: Sport; fetchedAt: string; count: number }[] {
        return Array.from(this.cache.entries()).map(([sport, cache]) => ({
            sport,
            fetchedAt: cache.fetchedAt,
            count: cache.data.length
        }));
    }

    private async fetchAndCache(sport: Sport): Promise<OddsCache> {
        const config = SportConfig[sport];
        const response = await axios.get(`${this.baseUrl}/sports/${sport}/odds/`, {
            params: {
                apiKey: this.apiKey,
                regions: config.region,
                markets: 'h2h',
                oddsFormat: 'decimal'
            }
        });

        const requestsRemaining = Number(response.headers['x-requests-remaining']) || undefined;
        const matches = this.normalizeMatches(response.data, sport);

        const result: OddsCache = {
            data: matches,
            fetchedAt: new Date().toISOString(),
            sport,
            requestsRemaining
        };

        this.cache.set(sport, result);
        console.log(`[OddsService] Pobrano ${matches.length} meczów dla ${config.label}. Pozostało requestów: ${requestsRemaining}`);
        return result;
    }

    private normalizeMatches(data: any[], sport: Sport): OddsMatch[] {
        return data.map(match => {
            const bookmaker = match.bookmakers?.[0];
            const market = bookmaker?.markets?.[0];
            const outcomes: any[] = market?.outcomes || [];

            let homeOdds: number | null = null;
            let awayOdds: number | null = null;
            let drawOdds: number | undefined;

            for (const outcome of outcomes) {
                if (outcome.name === match.home_team) {
                    homeOdds = outcome.price;
                } else if (outcome.name === match.away_team) {
                    awayOdds = outcome.price;
                } else if (outcome.name === 'Draw') {
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
                    ? { home: homeOdds, draw: drawOdds, away: awayOdds, bookmaker: bookmaker?.title || 'Bukmacher' }
                    : null
            };
        });
    }
}
