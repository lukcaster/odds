import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { Sport } from '../utils/enums/sport';

export interface TeamStanding {
    teamName: string;
    gamesPlayed: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    points: number;
}

interface StandingsCache {
    sport: Sport;
    entries: TeamStanding[];
    fetchedAt: string;
}

// ESPN league codes for soccer
const ESPN_SOCCER: Partial<Record<Sport, string>> = {
    [Sport.PREMIER_LEAGUE]: 'eng.1',
    [Sport.LALIGA]:         'esp.1',
    [Sport.BUNDESLIGA]:     'ger.1',
    [Sport.EKSTRAKLASA]:    'pol.1',
};

const CACHE_FILE = path.join(process.cwd(), 'ratings-cache.json');
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

// Team name normalization: ESPN → The-Odds-API
const NAME_MAP: Record<string, string> = {
    // Premier League
    'Manchester City FC':         'Manchester City',
    'Manchester United FC':       'Manchester United',
    'Arsenal FC':                 'Arsenal',
    'Liverpool FC':               'Liverpool',
    'Chelsea FC':                 'Chelsea',
    'Tottenham Hotspur':          'Tottenham Hotspur',
    'Newcastle United FC':        'Newcastle United',
    'Aston Villa FC':             'Aston Villa',
    'Brighton & Hove Albion FC':  'Brighton and Hove Albion',
    'West Ham United FC':         'West Ham United',
    'Wolverhampton Wanderers FC': 'Wolverhampton Wanderers',
    'Fulham FC':                  'Fulham',
    'Crystal Palace FC':          'Crystal Palace',
    'Brentford FC':               'Brentford',
    'Nottingham Forest FC':       'Nottingham Forest',
    'Everton FC':                 'Everton',
    'Leicester City FC':          'Leicester City',
    'Southampton FC':             'Southampton',
    'Ipswich Town FC':            'Ipswich Town',
    'AFC Bournemouth':            'Bournemouth',
    // La Liga
    'FC Barcelona':               'Barcelona',
    'Real Madrid CF':             'Real Madrid',
    'Club Atlético de Madrid':    'Atletico Madrid',
    'Atletico de Madrid':         'Atletico Madrid',
    'Real Sociedad de Fútbol':    'Real Sociedad',
    'Athletic Club':              'Athletic Club Bilbao',
    'Villarreal CF':              'Villarreal',
    'Real Betis Balompié':        'Real Betis',
    'Sevilla FC':                 'Sevilla',
    'Valencia CF':                'Valencia',
    'Celta de Vigo':              'Celta Vigo',
    'Rayo Vallecano de Madrid':   'Rayo Vallecano',
    'UD Las Palmas':              'Las Palmas',
    'RCD Mallorca':               'Mallorca',
    'RCD Espanyol de Barcelona':  'Espanyol',
    'Deportivo Alavés':           'Alaves',
    'Girona FC':                  'Girona',
    'Getafe CF':                  'Getafe',
    'UD Almería':                 'Almeria',
    // Bundesliga
    'FC Bayern München':          'Bayern Munich',
    'Bayer 04 Leverkusen':        'Bayer Leverkusen',
    'VfB Stuttgart':              'Stuttgart',
    'SC Freiburg':                'Freiburg',
    'TSG Hoffenheim':             'Hoffenheim',
    'FSV Mainz 05':               'Mainz 05',
    '1. FC Union Berlin':         'Union Berlin',
    '1. FC Köln':                 'FC Koln',
    'FC Augsburg':                'Augsburg',
    'VfL Wolfsburg':              'Wolfsburg',
    'SV Werder Bremen':           'Werder Bremen',
    'Borussia Mönchengladbach':   'Borussia Monchengladbach',
    'VfL Bochum 1848':            'Bochum',
    'Darmstadt 98':               'Darmstadt',
    'FC Heidenheim 1846':         'Heidenheim',
    'SV Darmstadt 98':            'Darmstadt',
};

export class RatingsService {
    private cache: Map<Sport, StandingsCache> = new Map();
    private debugLogged = new Set<Sport>();

    constructor() {
        this.loadFromDisk();
    }

    public async getStandings(sport: Sport): Promise<TeamStanding[]> {
        const cached = this.cache.get(sport);
        if (cached) return cached.entries;
        return this.fetchAndCache(sport);
    }

    public async refreshAll(sports: Sport[]): Promise<void> {
        for (const sport of sports) {
            try {
                await this.fetchAndCache(sport);
            } catch (err: any) {
                console.error(`[Ratings] błąd dla ${sport}: ${err?.message}`);
            }
        }
    }

    private async fetchAndCache(sport: Sport): Promise<TeamStanding[]> {
        const leagueCode = ESPN_SOCCER[sport];
        if (!leagueCode) {
            console.warn(`[Ratings] brak ESPN kodu dla ${sport}`);
            return [];
        }

        const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${leagueCode}/standings`;
        const response = await axios.get(url, { timeout: 8000 });

        // Log raw structure first time to help debugging
        if (!this.debugLogged.has(sport)) {
            this.debugLogged.add(sport);
            const keys = Object.keys(response.data);
            console.log(`[Ratings] ${sport} raw top-level keys: ${keys.join(', ')}`);
        }

        const entries = this.parseResponse(response.data);
        const record: StandingsCache = { sport, entries, fetchedAt: new Date().toISOString() };
        this.cache.set(sport, record);
        this.saveToDisk();
        console.log(`[Ratings] ${sport}: pobrano ${entries.length} drużyn`);
        if (entries.length > 0) {
            const ex = entries[0];
            console.log(`[Ratings]   przykład: ${ex.teamName} GP=${ex.gamesPlayed} W=${ex.wins} D=${ex.draws} L=${ex.losses} GF=${ex.goalsFor} GA=${ex.goalsAgainst}`);
        }
        return entries;
    }

    private parseResponse(data: any): TeamStanding[] {
        // Try several known ESPN response shapes
        const rawEntries: any[] =
            data?.standings?.entries                    // soccer flat
            ?? data?.children?.[0]?.standings?.entries  // soccer nested
            ?? data?.standings?.[0]?.entries            // alt format
            ?? [];

        if (!rawEntries.length) {
            console.warn('[Ratings] nie znaleziono entries w odpowiedzi ESPN');
            return [];
        }

        return rawEntries
            .map(e => this.parseEntry(e))
            .filter((e): e is TeamStanding => e !== null);
    }

    private parseEntry(entry: any): TeamStanding | null {
        const teamName = entry?.team?.displayName ?? entry?.team?.name ?? '';
        if (!teamName) return null;

        const stats: any[] = entry?.stats ?? [];
        const getStat = (...names: string[]): number => {
            for (const n of names) {
                const found = stats.find((s: any) => s.name === n || s.displayName?.toLowerCase() === n.toLowerCase());
                if (found?.value != null) return Number(found.value);
            }
            return 0;
        };

        return {
            teamName:    this.normalizeName(teamName),
            gamesPlayed: getStat('gamesPlayed', 'played', 'gp'),
            wins:        getStat('wins', 'win', 'w'),
            draws:       getStat('ties', 'draws', 'draw', 'd'),
            losses:      getStat('losses', 'loss', 'l'),
            goalsFor:    getStat('pointsFor', 'goalsFor', 'gf', 'scored'),
            goalsAgainst:getStat('pointsAgainst', 'goalsAgainst', 'ga', 'conceded'),
            points:      getStat('points', 'pts', 'pt'),
        };
    }

    private normalizeName(name: string): string {
        return NAME_MAP[name] ?? name;
    }

    private loadFromDisk(): void {
        try {
            if (!fs.existsSync(CACHE_FILE)) return;
            const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
            const entries: StandingsCache[] = JSON.parse(raw);
            const cutoff = Date.now() - CACHE_MAX_AGE_MS;
            for (const e of entries) {
                if (new Date(e.fetchedAt).getTime() > cutoff) {
                    this.cache.set(e.sport, e);
                }
            }
            console.log(`[Ratings] wczytano cache z dysku (${this.cache.size} lig)`);
        } catch { /* ignore corrupt */ }
    }

    private saveToDisk(): void {
        try {
            fs.writeFileSync(CACHE_FILE, JSON.stringify(Array.from(this.cache.values()), null, 2), 'utf-8');
        } catch (err) {
            console.warn('[Ratings] nie udało się zapisać cache:', err);
        }
    }
}
