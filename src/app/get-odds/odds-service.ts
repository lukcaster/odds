import axios from 'axios';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
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

const CACHE_FILE = path.join(process.cwd(), 'odds-cache.json');
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h

export class OddsService {
    private cache: Map<Sport, OddsCache> = new Map();
    private readonly apiKey: string;
    private readonly baseUrl = 'https://api.the-odds-api.com/v4';

    constructor() {
        this.apiKey = process.env.apiKey || '';
        if (!this.apiKey) throw new Error('Brakuje apiKey w .env');
        this.loadCacheFromDisk();
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
        this.saveCacheToDisk();
        console.log(`[OddsService] Pobrano ${matches.length} meczów dla ${config.label}. Pozostało requestów: ${requestsRemaining}`);
        return result;
    }

    private normalizeMatches(data: any[], sport: Sport): OddsMatch[] {
        return data.map(match => {
            const bookmaker = match.bookmakers?.[0];
            const market    = bookmaker?.markets?.[0];
            const outcomes: any[] = market?.outcomes || [];

            let homeOdds: number | null = null;
            let awayOdds: number | null = null;
            let drawOdds: number | undefined;

            for (const outcome of outcomes) {
                if (outcome.name === match.home_team)       homeOdds = outcome.price;
                else if (outcome.name === match.away_team)  awayOdds = outcome.price;
                else if (outcome.name === 'Draw')           drawOdds = outcome.price;
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

    private loadCacheFromDisk(): void {
        try {
            if (!fs.existsSync(CACHE_FILE)) return;
            const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
            const entries: OddsCache[] = JSON.parse(raw);
            const cutoff = Date.now() - CACHE_MAX_AGE_MS;
            for (const entry of entries) {
                if (new Date(entry.fetchedAt).getTime() > cutoff) {
                    this.cache.set(entry.sport, entry);
                }
            }
            console.log(`[OddsService] Wczytano cache z dysku (${this.cache.size} lig)`);
        } catch {
            // uszkodzony plik — zignoruj
        }
    }

    private saveCacheToDisk(): void {
        try {
            const entries = Array.from(this.cache.values());
            fs.writeFileSync(CACHE_FILE, JSON.stringify(entries, null, 2), 'utf-8');
        } catch (err) {
            console.warn('[OddsService] Nie udało się zapisać cache na dysk:', err);
        }
    }
}
