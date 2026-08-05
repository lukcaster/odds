import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { Sport } from '../utils/enums/sport';
import { normalizeTeamName } from './team-names';

export interface MatchResult {
    id: string;
    date: string;      // ISO
    home: string;
    away: string;
    homeScore: number;
    awayScore: number;
}

interface ResultsCache {
    sport: Sport;
    matches: MatchResult[];
    finalizedDays: string[];   // YYYYMMDD dni juz domkniete (nie refetchujemy)
    updatedAt: string;
}

// Sciezki ESPN per sport: {sportPath}/{leagueCode}
const ESPN_PATH: Partial<Record<Sport, { sportPath: string; code: string }>> = {
    [Sport.EKSTRAKLASA]:    { sportPath: 'soccer',   code: 'pol.1' },
    [Sport.PREMIER_LEAGUE]: { sportPath: 'soccer',   code: 'eng.1' },
    [Sport.LALIGA]:         { sportPath: 'soccer',   code: 'esp.1' },
    [Sport.BUNDESLIGA]:     { sportPath: 'soccer',   code: 'ger.1' },
    [Sport.NFL]:            { sportPath: 'football', code: 'nfl'   },
};

const CACHE_FILE = path.join(process.cwd(), 'results-cache.json');

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.espn.com/',
    'Origin': 'https://www.espn.com',
};

export class ResultsService {
    private cache: Map<Sport, ResultsCache> = new Map();
    private debugLogged = new Set<Sport>();

    constructor() {
        this.loadFromDisk();
    }

    public isSupported(sport: Sport): boolean {
        return !!ESPN_PATH[sport];
    }

    public getResults(sport: Sport): MatchResult[] {
        return this.cache.get(sport)?.matches ?? [];
    }

    /**
     * Dociaga brakujace/najswiezsze dni i zwraca pelna liste wynikow sezonu.
     * Dni z przeszlosci raz pobrane sa "domkniete" i pomijane przy kolejnych odswiezeniach.
     */
    public async refresh(sport: Sport): Promise<MatchResult[]> {
        const cfg = ESPN_PATH[sport];
        if (!cfg) return [];

        const existing = this.cache.get(sport)
            ?? { sport, matches: [], finalizedDays: [], updatedAt: new Date().toISOString() };
        const byId = new Map<string, MatchResult>(existing.matches.map(m => [m.id, m]));
        const finalized = new Set<string>(existing.finalizedDays);

        const todayKey = dayKey(new Date());
        const yesterdayKey = dayKey(addDays(new Date(), -1));
        const days = this.seasonDays(sport);

        let fetched = 0, added = 0;
        for (const day of days) {
            // Domkniete dni z przeszlosci pomijamy (dzis i wczoraj zawsze odswiezamy).
            if (finalized.has(day) && day !== todayKey && day !== yesterdayKey) continue;

            let events: any[];
            try {
                events = await this.fetchDay(sport, cfg.sportPath, cfg.code, day);
                fetched++;
            } catch (err: any) {
                console.warn(`[Results] ${sport} ${day} blad: ${err?.message}`);
                continue;
            }

            let dayHasEvents = false;
            let allCompleted = true;
            for (const ev of events) {
                dayHasEvents = true;
                const parsed = this.parseEvent(ev);
                if (!parsed) { allCompleted = false; continue; }
                if (!byId.has(parsed.id)) added++;
                byId.set(parsed.id, parsed);
            }

            // Dzien z przeszlosci, w ktorym wszystko juz zakonczone → domykamy.
            if (day < todayKey && (!dayHasEvents || allCompleted)) finalized.add(day);
        }

        const matches = Array.from(byId.values())
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const record: ResultsCache = {
            sport,
            matches,
            finalizedDays: Array.from(finalized),
            updatedAt: new Date().toISOString(),
        };
        this.cache.set(sport, record);
        this.saveToDisk();
        console.log(`[Results] ${sport}: dni pobrane=${fetched}, nowych meczow=${added}, lacznie=${matches.length}`);
        return matches;
    }

    private async fetchDay(sport: Sport, sportPath: string, code: string, day: string): Promise<any[]> {
        const url = `https://site.api.espn.com/apis/site/v2/sports/${sportPath}/${code}/scoreboard?dates=${day}`;
        const r = await axios.get(url, { timeout: 8000, headers: HEADERS });
        const data = r.data ?? {};

        if (!this.debugLogged.has(sport)) {
            this.debugLogged.add(sport);
            console.log(`[Results] ${sport} raw top-level keys: ${Object.keys(data).join(', ')}`);
        }

        return Array.isArray(data.events) ? data.events : [];
    }

    private parseEvent(ev: any): MatchResult | null {
        const comp = ev?.competitions?.[0];
        if (!comp) return null;

        const completed =
            comp?.status?.type?.completed === true ||
            ev?.status?.type?.completed === true ||
            comp?.status?.type?.state === 'post';
        if (!completed) return null;

        const competitors: any[] = comp.competitors ?? [];
        const homeC = competitors.find(c => c.homeAway === 'home');
        const awayC = competitors.find(c => c.homeAway === 'away');
        if (!homeC || !awayC) return null;

        const home = homeC?.team?.displayName ?? homeC?.team?.name;
        const away = awayC?.team?.displayName ?? awayC?.team?.name;
        const hs = Number(homeC?.score);
        const as = Number(awayC?.score);
        if (!home || !away || !Number.isFinite(hs) || !Number.isFinite(as)) return null;

        return {
            id: String(ev.id),
            date: ev.date ?? comp.date ?? new Date().toISOString(),
            home: normalizeTeamName(home),
            away: normalizeTeamName(away),
            homeScore: hs,
            awayScore: as,
        };
    }

    /** Lista dni YYYYMMDD od poczatku sezonu do dzis. */
    private seasonDays(sport: Sport): string[] {
        const start = this.seasonStart(sport);
        const today = new Date();
        const out: string[] = [];
        for (let d = new Date(start); d <= today; d = addDays(d, 1)) {
            out.push(dayKey(d));
        }
        return out;
    }

    private seasonStart(sport: Sport): Date {
        const now = new Date();
        const year = now.getFullYear();
        // Pilka: sezon startuje ~lipiec; NFL ~sierpien/wrzesien.
        const startMonth = sport === Sport.NFL ? 7 /*sierpien*/ : 6 /*lipiec*/;
        const s = new Date(year, startMonth, 1);
        if (s > now) s.setFullYear(year - 1);
        return s;
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

function dayKey(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}${m}${day}`;
}

function addDays(d: Date, n: number): Date {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
}
