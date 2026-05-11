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
    bestOdds?: {
        home: number;
        draw?: number;
        away: number;
    };
    consensusProbability?: {
        home: number;
        draw?: number;
        away: number;
        bookmakerCount: number;
    };
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

    public getAllCaches(): Map<Sport, OddsCache> {
        return this.cache;
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
                    : null,
                bestOdds: this.computeBestOdds(match) ?? undefined,
                consensusProbability: this.computeConsensus(match) ?? undefined
            };
        });
    }

    private computeBestOdds(match: any): { home: number; draw?: number; away: number } | null {
        const bookmakers: any[] = match.bookmakers || [];
        let bestHome = 0, bestAway = 0, bestDraw = 0;

        for (const bm of bookmakers) {
            const mkt = bm.markets?.find((m: any) => m.key === 'h2h');
            if (!mkt) continue;
            for (const outcome of mkt.outcomes || []) {
                if (outcome.name === match.home_team)      bestHome = Math.max(bestHome, outcome.price);
                else if (outcome.name === match.away_team) bestAway = Math.max(bestAway, outcome.price);
                else if (outcome.name === 'Draw')          bestDraw = Math.max(bestDraw, outcome.price);
            }
        }

        if (!bestHome || !bestAway) return null;
        return { home: bestHome, draw: bestDraw > 0 ? bestDraw : undefined, away: bestAway };
    }

    private computeConsensus(match: any): { home: number; draw?: number; away: number; bookmakerCount: number } | null {
        const bookmakers: any[] = match.bookmakers || [];
        if (!bookmakers.length) return null;

        let homeSum = 0, awaySum = 0, drawSum = 0;
        let count = 0, drawCount = 0;

        for (const bm of bookmakers) {
            const mkt = bm.markets?.find((m: any) => m.key === 'h2h');
            if (!mkt) continue;

            let h: number | null = null, a: number | null = null, d: number | null = null;
            for (const outcome of mkt.outcomes || []) {
                if (outcome.name === match.home_team)      h = outcome.price;
                else if (outcome.name === match.away_team) a = outcome.price;
                else if (outcome.name === 'Draw')          d = outcome.price;
            }

            if (!h || !a) continue;

            // Remove bookmaker's vig, get fair probabilities
            const vigSum = 1 / h + 1 / a + (d ? 1 / d : 0);
            homeSum += (1 / h) / vigSum;
            awaySum += (1 / a) / vigSum;
            if (d) { drawSum += (1 / d) / vigSum; drawCount++; }
            count++;
        }

        if (!count) return null;

        return {
            home: homeSum / count,
            draw: drawCount > 0 ? drawSum / drawCount : undefined,
            away: awaySum / count,
            bookmakerCount: count
        };
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
