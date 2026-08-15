import axios from 'axios';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { Sport } from '../utils/enums/sport';
import { TeamStanding } from './ratings-service';

dotenv.config();

export interface MatchResult {
    id: string;
    date: string;      // ISO (commence_time)
    home: string;
    away: string;
    homeScore: number;
    awayScore: number;
}

/**
 * Policz tabelę ligową z listy wyników (GP/W/D/L/GF/GA/pkt).
 * Nazwy drużyn = te same co w kursach (the-odds-api), więc SoccerPredictionModel
 * dopasuje je dokładnie, bez fuzzy-matcha. Zastępuje tabelę z ESPN (403).
 */
export function standingsFromResults(results: MatchResult[]): TeamStanding[] {
    const map = new Map<string, TeamStanding>();
    const ensure = (name: string): TeamStanding => {
        let t = map.get(name);
        if (!t) {
            t = { teamName: name, gamesPlayed: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
            map.set(name, t);
        }
        return t;
    };

    for (const r of results) {
        if (!r.home || !r.away) continue;
        const h = ensure(r.home);
        const a = ensure(r.away);
        h.gamesPlayed++; a.gamesPlayed++;
        h.goalsFor += r.homeScore; h.goalsAgainst += r.awayScore;
        a.goalsFor += r.awayScore; a.goalsAgainst += r.homeScore;
        if (r.homeScore > r.awayScore)      { h.wins++;  a.losses++; h.points += 3; }
        else if (r.homeScore < r.awayScore) { a.wins++;  h.losses++; a.points += 3; }
        else                                { h.draws++; a.draws++;  h.points++; a.points++; }
    }

    return Array.from(map.values());
}

interface ResultsCache {
    sport: Sport;
    matches: MatchResult[];
    updatedAt: string;
}

// Ligi obslugiwane przez the-odds-api /scores, dla ktorych liczymy ELO.
const SUPPORTED = new Set<Sport>([
    Sport.EKSTRAKLASA, Sport.PREMIER_LEAGUE, Sport.LALIGA, Sport.BUNDESLIGA, Sport.NFL, Sport.NBA,
]);

// Jednorazowy backfill historii (okno /scores to tylko ~3 dni, nie zlapie
// wczesniejszych kolejek). Pliki maja nazwy druzyn JUZ jak w kursach.
const BACKFILL_FILES: Partial<Record<Sport, string>> = {
    [Sport.EKSTRAKLASA]: 'ekstraklasa-backfill.json',
    [Sport.NBA]: 'nba-backfill.json',   // seed z sezonu 2025/26 (balldontlie)
};

const CACHE_FILE = path.join(process.cwd(), 'results-cache.json');

/** Klucz meczu do deduplikacji miedzy backfillem a /scores (dzien + druzyny). */
function matchKey(r: { date: string; home: string; away: string }): string {
    return `${r.date.slice(0, 10)}|${r.home}|${r.away}`;
}

/**
 * Zrodlo wynikow: the-odds-api endpoint /scores.
 * Zwraca wyniki z ostatnich ~3 dni (daysFrom max 3), wiec dociagamy je
 * regularnie i AKUMULUJEMY na dysku, budujac pelna historie sezonu z czasem.
 * Nazwy druzyn sa te same co w kursach (the-odds-api) — brak potrzeby mapowania.
 */
export class ResultsService {
    private cache: Map<Sport, ResultsCache> = new Map();
    private readonly apiKey: string;
    private readonly baseUrl = 'https://api.the-odds-api.com/v4';

    constructor() {
        this.apiKey = process.env.apiKey || '';
        this.loadFromDisk();
        this.applyBackfill();
    }

    public isSupported(sport: Sport): boolean {
        return SUPPORTED.has(sport);
    }

    public getResults(sport: Sport): MatchResult[] {
        return this.cache.get(sport)?.matches ?? [];
    }

    /** Znacznik czasu ostatniego odswiezenia (ms epoch). 0 = brak danych. */
    public updatedAtMs(sport: Sport): number {
        const at = this.cache.get(sport)?.updatedAt;
        return at ? new Date(at).getTime() : 0;
    }

    /**
     * Dociaga swieze wyniki (ostatnie ~3 dni) i scala je z historia na dysku.
     * Zwraca pelna, posortowana chronologicznie liste wynikow sezonu.
     */
    public async refresh(sport: Sport): Promise<MatchResult[]> {
        if (!SUPPORTED.has(sport)) return [];
        if (!this.apiKey) {
            console.warn('[Results] brak apiKey w .env — pomijam');
            return this.getResults(sport);
        }

        const existing = this.cache.get(sport)
            ?? { sport, matches: [], updatedAt: new Date().toISOString() };
        const byKey = new Map<string, MatchResult>(existing.matches.map(m => [matchKey(m), m]));

        let added = 0;
        try {
            const response = await axios.get(`${this.baseUrl}/sports/${sport}/scores/`, {
                params: { apiKey: this.apiKey, daysFrom: 3, dateFormat: 'iso' },
            });
            const remaining = response.headers['x-requests-remaining'];

            for (const game of response.data ?? []) {
                const parsed = this.parseGame(game);
                if (!parsed) continue;
                const k = matchKey(parsed);
                if (!byKey.has(k)) added++;
                byKey.set(k, parsed);   // nadpisz — wynik moze sie douzupelnic
            }
            console.log(`[Results] ${sport}: +${added} nowych (pozostalo requestow: ${remaining})`);
        } catch (err: any) {
            console.warn(`[Results] ${sport} blad /scores: ${err?.response?.status ?? err?.message}`);
        }

        const matches = Array.from(byKey.values())
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const record: ResultsCache = { sport, matches, updatedAt: new Date().toISOString() };
        this.cache.set(sport, record);
        this.saveToDisk();
        return matches;
    }

    private parseGame(game: any): MatchResult | null {
        if (!game || game.completed !== true) return null;
        const scores: any[] = game.scores;
        if (!Array.isArray(scores) || scores.length < 2) return null;

        const home = game.home_team;
        const away = game.away_team;
        if (!home || !away) return null;

        const findScore = (team: string): number => {
            const s = scores.find(x => x?.name === team);
            const n = Number(s?.score);
            return Number.isFinite(n) ? n : NaN;
        };
        const hs = findScore(home);
        const as = findScore(away);
        if (!Number.isFinite(hs) || !Number.isFinite(as)) return null;

        return {
            id: String(game.id),
            date: game.commence_time ?? new Date().toISOString(),
            home,
            away,
            homeScore: hs,
            awayScore: as,
        };
    }

    private applyBackfill(): void {
        for (const [sportStr, file] of Object.entries(BACKFILL_FILES)) {
            const sport = sportStr as Sport;
            const filePath = path.join(process.cwd(), file!);
            try {
                if (!fs.existsSync(filePath)) continue;
                const rows: Array<{ date: string; home: string; away: string; homeScore: number; awayScore: number }> =
                    JSON.parse(fs.readFileSync(filePath, 'utf-8'));

                const had = this.cache.has(sport);
                const existing = this.cache.get(sport) ?? { sport, matches: [], updatedAt: new Date(0).toISOString() };
                const byKey = new Map<string, MatchResult>(existing.matches.map(m => [matchKey(m), m]));

                let added = 0;
                for (const r of rows) {
                    if (!r.home || !r.away) continue;
                    if (!Number.isFinite(r.homeScore) || !Number.isFinite(r.awayScore)) continue;
                    const mr: MatchResult = {
                        id: `bf-${matchKey(r)}`, date: r.date, home: r.home, away: r.away,
                        homeScore: r.homeScore, awayScore: r.awayScore,
                    };
                    const k = matchKey(mr);
                    if (!byKey.has(k)) { byKey.set(k, mr); added++; }  // nie nadpisuj danych z /scores
                }

                const matches = Array.from(byKey.values())
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                // Swieza instalacja (bez wczesniejszego /scores) → stary timestamp,
                // by pierwsze otwarcie zakladki dociagnelo najnowsza kolejke z /scores.
                const updatedAt = had ? existing.updatedAt : new Date(0).toISOString();
                this.cache.set(sport, { sport, matches, updatedAt });
                if (added) { this.saveToDisk(); console.log(`[Results] backfill ${sport}: +${added} meczów z ${file}`); }
            } catch (err: any) {
                console.warn(`[Results] backfill ${sport} blad: ${err?.message}`);
            }
        }
    }

    private loadFromDisk(): void {
        try {
            if (!fs.existsSync(CACHE_FILE)) return;
            const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
            const entries: ResultsCache[] = JSON.parse(raw);
            for (const e of entries) this.cache.set(e.sport, e);
            console.log(`[Results] wczytano cache z dysku (${this.cache.size} lig)`);
        } catch { /* ignore corrupt */ }
    }

    private saveToDisk(): void {
        try {
            fs.writeFileSync(CACHE_FILE, JSON.stringify(Array.from(this.cache.values()), null, 2), 'utf-8');
        } catch (err) {
            console.warn('[Results] nie udalo sie zapisac cache:', err);
        }
    }
}
