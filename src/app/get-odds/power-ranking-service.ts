import * as fs from 'fs';
import * as path from 'path';
import { Sport, SPORT_TO_LEAGUE_KEY } from '../utils/enums/sport';
import { ResultsService } from './results-service';
import { EloEngine, EloTeam } from './elo-engine';

export interface PowerRankingEntry extends EloTeam {
    up: number;    // glosy "zgadzam sie"
    down: number;  // glosy "nie zgadzam sie"
}

export interface PowerRanking {
    league: string;
    sport: Sport;
    updatedAt: string;
    matchesUsed: number;
    teams: PowerRankingEntry[];
}

type SentimentStore = Record<string, Record<string, { up: number; down: number }>>;

const SENTIMENT_FILE = path.join(process.cwd(), 'sentiment.json');

export class PowerRankingService {
    private engines = new Map<Sport, EloEngine>();
    private rankings = new Map<Sport, PowerRanking>();
    private sentiment: SentimentStore = {};

    constructor(private resultsService: ResultsService) {
        this.loadSentiment();
    }

    public isSupported(sport: Sport): boolean {
        return this.resultsService.isSupported(sport);
    }

    public async refresh(sport: Sport): Promise<void> {
        if (!this.resultsService.isSupported(sport)) return;

        const results = await this.resultsService.refresh(sport);
        const engine = new EloEngine();
        engine.rebuild(results);
        this.engines.set(sport, engine);

        const teams: PowerRankingEntry[] = engine.getRankings().map(t => {
            const s = this.sentimentFor(sport, t.team);
            return { ...t, up: s.up, down: s.down };
        });

        this.rankings.set(sport, {
            league: SPORT_TO_LEAGUE_KEY[sport],
            sport,
            updatedAt: new Date().toISOString(),
            matchesUsed: results.length,
            teams,
        });
        console.log(`[PowerRanking] ${sport}: ${teams.length} druzyn z ${results.length} meczow`);
    }

    public async refreshAll(sports: Sport[]): Promise<void> {
        for (const sport of sports) {
            try {
                await this.refresh(sport);
            } catch (err: any) {
                console.error(`[PowerRanking] blad dla ${sport}: ${err?.message}`);
            }
        }
    }

    public getRanking(sport: Sport): PowerRanking | null {
        return this.rankings.get(sport) ?? null;
    }

    /** Mapa drużyna→rating ELO (do zasilenia modelu NFL). Pusta jesli brak danych. */
    public ratingsMap(sport: Sport): Map<string, number> {
        return this.engines.get(sport)?.ratingsMap() ?? new Map();
    }

    // ── Sentyment spolecznosci (obok algorytmu, nie miesza w matmie) ──
    public vote(sport: Sport, team: string, dir: 'up' | 'down'): { up: number; down: number } {
        const key = SPORT_TO_LEAGUE_KEY[sport];
        this.sentiment[key] ??= {};
        this.sentiment[key][team] ??= { up: 0, down: 0 };
        this.sentiment[key][team][dir]++;
        this.saveSentiment();

        // Zsynchronizuj liczniki w cache rankingu, jesli juz policzony.
        const ranking = this.rankings.get(sport);
        const entry = ranking?.teams.find(t => t.team === team);
        if (entry) { entry.up = this.sentiment[key][team].up; entry.down = this.sentiment[key][team].down; }

        return { ...this.sentiment[key][team] };
    }

    private sentimentFor(sport: Sport, team: string): { up: number; down: number } {
        const key = SPORT_TO_LEAGUE_KEY[sport];
        return this.sentiment[key]?.[team] ?? { up: 0, down: 0 };
    }

    private loadSentiment(): void {
        try {
            if (!fs.existsSync(SENTIMENT_FILE)) return;
            this.sentiment = JSON.parse(fs.readFileSync(SENTIMENT_FILE, 'utf-8')) || {};
        } catch { this.sentiment = {}; }
    }

    private saveSentiment(): void {
        try {
            fs.writeFileSync(SENTIMENT_FILE, JSON.stringify(this.sentiment, null, 2), 'utf-8');
        } catch (err) {
            console.warn('[PowerRanking] nie udalo sie zapisac sentymentu:', err);
        }
    }
}
