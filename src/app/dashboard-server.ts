import cors from 'cors';
import express, { Express, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { HybridPredictionModel } from './get-odds/hybrid-prediction-model';
import { OddsService } from './get-odds/odds-service';
import { RecommendedBet, RecommendedService } from './get-odds/recommended-service';
import { RatingsService } from './get-odds/ratings-service';
import { SoccerPredictionModel } from './get-odds/soccer-prediction-model';
import { MatchAnalysisService } from './get-odds/match-analysis-service';
import { ResultsService } from './get-odds/results-service';
import { PowerRankingService } from './get-odds/power-ranking-service';
import { LEAGUE_KEY_TO_SPORT, Sport, SportConfig } from './utils/enums/sport';

export class DashboardServer {
    private app: Express;
    private predictionModel: HybridPredictionModel;
    private oddsService: OddsService;
    private ratingsService: RatingsService;
    private soccerModel: SoccerPredictionModel;
    private recommendedService: RecommendedService;
    private matchAnalysisService: MatchAnalysisService;
    private resultsService: ResultsService;
    private powerRankingService: PowerRankingService;
    private recommendedBets: RecommendedBet[] = [];
    private port: number = parseInt(process.env.PORT || '3000', 10);

    // Zbudowany frontend (Vite: web/ -> dist-web/).
    private static readonly WEB_ROOT = path.join(process.cwd(), 'dist-web');

    // Ligi, dla ktorych liczymy power ranking (ELO z realnych wynikow).
    private readonly powerSports: Sport[] = [
        Sport.EKSTRAKLASA, Sport.PREMIER_LEAGUE, Sport.LALIGA, Sport.BUNDESLIGA, Sport.NFL, Sport.NBA
    ];

    constructor() {
        this.app = express();
        this.predictionModel = new HybridPredictionModel();
        this.oddsService = new OddsService();
        this.ratingsService = new RatingsService();
        this.resultsService = new ResultsService();
        this.powerRankingService = new PowerRankingService(this.resultsService);
        this.soccerModel = new SoccerPredictionModel(this.ratingsService, this.resultsService);
        this.recommendedService = new RecommendedService(this.predictionModel, this.soccerModel);
        this.matchAnalysisService = new MatchAnalysisService(this.soccerModel, this.predictionModel);
        this.setupMiddleware();
        this.setupRoutes();
    }

    /**
     * Setup Express middleware
     */
    private setupMiddleware(): void {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static(DashboardServer.WEB_ROOT));
    }

    /**
     * Setup API routes
     */
    private setupRoutes(): void {
        // Health check
        this.app.get('/api/health', (req: Request, res: Response) => {
            res.json({ status: 'OK', timestamp: new Date().toISOString() });
        });

        // Get ELO Rankings
        this.app.get('/api/rankings', (req: Request, res: Response) => {
            try {
                const rankings = this.predictionModel.getAllTeamRatings();
                res.json(rankings);
            } catch (error) {
                res.status(500).json({ error: 'Failed to fetch rankings' });
            }
        });

        // Get prediction for a match
        this.app.get('/api/predict', async (req: Request, res: Response) => {
            try {
                const { homeTeam, awayTeam } = req.query;

                if (!homeTeam || !awayTeam) {
                    return res.status(400).json({
                        error: 'Missing homeTeam or awayTeam parameter'
                    });
                }

                const prediction = await this.predictionModel.getPredictionAsync(
                    homeTeam as string,
                    awayTeam as string
                );

                res.json({
                    homeTeam,
                    awayTeam,
                    homeWinProbability: prediction,
                    awayWinProbability: prediction ? 1 - prediction : null
                });
            } catch (error) {
                res.status(500).json({ error: 'Failed to generate prediction' });
            }
        });

        // Get team stats
        this.app.get('/api/stats/:team', async (req: Request, res: Response) => {
            try {
                const team = Array.isArray(req.params.team) ? req.params.team[0] : req.params.team;
                const stats = await this.predictionModel.getTeamStats(team);
                res.json(stats);
            } catch (error) {
                res.status(500).json({ error: 'Failed to fetch team stats' });
            }
        });

        // Update ELO after game
        this.app.post('/api/update-elo', (req: Request, res: Response) => {
            try {
                const { homeTeam, awayTeam, homeWin } = req.body;

                if (!homeTeam || !awayTeam || homeWin === undefined) {
                    return res.status(400).json({
                        error: 'Missing required fields: homeTeam, awayTeam, homeWin'
                    });
                }

                this.predictionModel.updateEloAfterGame(homeTeam, awayTeam, homeWin);

                res.json({
                    message: 'ELO ratings updated successfully',
                    homeTeam,
                    awayTeam,
                    winner: homeWin ? homeTeam : awayTeam
                });
            } catch (error) {
                res.status(500).json({ error: 'Failed to update ELO' });
            }
        });

        // Calculate Kelly Criterion
        this.app.get('/api/kelly', (req: Request, res: Response) => {
            try {
                const { odds, probability } = req.query;

                if (!odds || !probability) {
                    return res.status(400).json({
                        error: 'Missing odds or probability parameter'
                    });
                }

                const decimalOdds = parseFloat(odds as string);
                const prob = parseFloat(probability as string);

                if (decimalOdds <= 0 || prob < 0 || prob > 1) {
                    return res.status(400).json({
                        error: 'Invalid odds or probability values'
                    });
                }

                const impliedProb = 1 / decimalOdds;
                const kelly = Math.max(0, (decimalOdds * prob - (1 - prob)) / (decimalOdds - 1));
                const fractionalKelly = kelly / 4;
                const hasValue = prob > impliedProb;

                res.json({
                    odds: decimalOdds,
                    yourProbability: prob,
                    impliedProbability: impliedProb,
                    fullKelly: kelly,
                    fractionalKelly: fractionalKelly,
                    hasValue: hasValue,
                    recommendation: hasValue ? `Postawiaj ${(fractionalKelly * 100).toFixed(2)}%` : 'PASS'
                });
            } catch (error) {
                res.status(500).json({ error: 'Failed to calculate Kelly' });
            }
        });

        // Get model weights
        this.app.get('/api/model-weights', (req: Request, res: Response) => {
            try {
                const weights = this.predictionModel.getModelWeights();
                res.json(weights);
            } catch (error) {
                res.status(500).json({ error: 'Failed to fetch model weights' });
            }
        });

        // Get available leagues
        this.app.get('/api/leagues', (_req: Request, res: Response) => {
            const leagues = Object.entries(LEAGUE_KEY_TO_SPORT).map(([key, sport]) => ({
                key,
                sport,
                label: SportConfig[sport].label,
                flag: SportConfig[sport].flag,
                hasDraw: SportConfig[sport].hasDraw
            }));
            res.json(leagues);
        });

        // Get odds for a league (with cache)
        this.app.get('/api/odds', async (req: Request, res: Response) => {
            const league = req.query.league as string;
            const sport = LEAGUE_KEY_TO_SPORT[league] ?? Sport.NFL;
            try {
                const result = await this.oddsService.getOdds(sport);
                res.json(result);
            } catch (error: any) {
                res.status(500).json({ error: 'Błąd pobierania kursów', details: error?.message });
            }
        });

        // Cache status
        this.app.get('/api/cache-status', (_req: Request, res: Response) => {
            res.json(this.oddsService.getCacheStatus());
        });

        // Deep match analysis (fetches all markets, runs model, returns top 3 bets)
        this.app.get('/api/match/:eventId/analysis', async (req: Request, res: Response) => {
            const eventId  = String(req.params.eventId);
            const league   = String(req.query.league   ?? '');
            const homeTeam = String(req.query.homeTeam ?? '');
            const awayTeam = String(req.query.awayTeam ?? '');

            if (!league || !homeTeam || !awayTeam) {
                return res.status(400).json({ error: 'Brakuje league, homeTeam lub awayTeam' });
            }

            const sport = LEAGUE_KEY_TO_SPORT[league];
            if (!sport) {
                return res.status(400).json({ error: `Nieznana liga: ${league}` });
            }

            try {
                const analysis = await this.matchAnalysisService.analyzeMatch(eventId, sport, homeTeam, awayTeam);
                res.json(analysis);
            } catch (err: any) {
                res.status(500).json({ error: 'Błąd analizy meczu', details: err?.message });
            }
        });

        // Recommended bets (computed daily by cron)
        this.app.get('/api/recommended', (_req: Request, res: Response) => {
            res.json(this.recommendedBets);
        });

        // Power ranking (ELO z realnych wynikow) dla ligi — on-demand refresh
        this.app.get('/api/power-ranking', async (req: Request, res: Response) => {
            const league = String(req.query.league ?? '');
            const sport = LEAGUE_KEY_TO_SPORT[league];
            if (!sport) return res.status(400).json({ error: `Nieznana liga: ${league}` });
            if (!this.powerRankingService.isSupported(sport)) {
                return res.json({ league, sport, updatedAt: null, matchesUsed: 0, teams: [] });
            }
            const force = req.query.force === '1';
            try {
                if (force) await this.powerRankingService.refresh(sport);
                else       await this.powerRankingService.ensureFresh(sport);
                // Jesli to NFL — zasil model predykcji swiezym ELO.
                if (sport === Sport.NFL) {
                    this.predictionModel.setEloRatings(this.powerRankingService.ratingsMap(Sport.NFL));
                }
            } catch (err: any) {
                console.warn('[PowerRanking] ensureFresh blad:', err?.message);
            }
            const ranking = this.powerRankingService.getRanking(sport)
                ?? { league, sport, updatedAt: null, matchesUsed: 0, teams: [] };
            res.json(ranking);
        });

        // Rozstrzyganie zakladow z realnych wynikow (auto-settle). Obsluguje
        // pojedyncze (home/draw/away) i double chance (1X/12/X2).
        // WAZNE: dopasowanie po dacie meczu (nie samych nazwach), bo w danych
        // mamy cale zeszle sezony (backfill) — te same pary druzyn wystepuja
        // wielokrotnie. Bez tego zaklad na przyszly mecz dostawal wynik z zeszlego.
        this.app.post('/api/settle', async (req: Request, res: Response) => {
            const bets: Array<{ id: string; league: string; home: string; away: string; outcome: string; commenceTime?: string }> =
                Array.isArray(req.body?.bets) ? req.body.bets : [];
            if (!bets.length) return res.json({ settled: [] });

            // Dociagnij swieze wyniki (guarded) dla lig, w ktorych sa zaklady.
            const leagues = new Set(bets.map(b => b.league));
            for (const league of leagues) {
                const sport = LEAGUE_KEY_TO_SPORT[league];
                if (sport && this.powerRankingService.isSupported(sport)) {
                    try { await this.powerRankingService.ensureFresh(sport); } catch { /* offline — uzyj dysku */ }
                }
            }

            const now = Date.now();
            const MATCH_WINDOW_MS = 36 * 60 * 60 * 1000; // wynik musi byc w +-36h od terminu zakladu

            const settled = bets.map(bet => {
                const sport = LEAGUE_KEY_TO_SPORT[bet.league];
                if (!sport) return { id: bet.id, result: 'pending' };

                // Bez daty meczu nie zgadujemy (unikamy zlapania meczu z zeszlego sezonu).
                const betTime = bet.commenceTime ? new Date(bet.commenceTime).getTime() : NaN;
                if (!Number.isFinite(betTime)) return { id: bet.id, result: 'pending' };
                // Mecz jeszcze sie nie odbyl — na pewno brak wyniku.
                if (betTime > now) return { id: bet.id, result: 'pending' };

                const results = this.resultsService.getResults(sport);
                // Wybierz mecz tej pary druzyn NAJBLIZSZY dacie zakladu (w oknie).
                let best: { m: any; diff: number } | null = null;
                for (const r of results) {
                    if (r.home !== bet.home || r.away !== bet.away) continue;
                    const diff = Math.abs(new Date(r.date).getTime() - betTime);
                    if (diff <= MATCH_WINDOW_MS && (!best || diff < best.diff)) best = { m: r, diff };
                }
                if (!best) return { id: bet.id, result: 'pending' };

                const m = best.m;
                const won = settleOutcome(bet.outcome, m.homeScore, m.awayScore);
                // Nieznany typ zakladu — zostawiamy userowi do recznego rozstrzygniecia.
                if (won == null) return { id: bet.id, result: 'pending' };
                return { id: bet.id, result: won ? 'won' : 'lost', homeScore: m.homeScore, awayScore: m.awayScore };
            });
            res.json({ settled });
        });

        // Sentyment spolecznosci — glos na druzyne (zgadzam sie / nie)
        this.app.post('/api/sentiment', (req: Request, res: Response) => {
            const { league, team, dir } = req.body ?? {};
            const sport = LEAGUE_KEY_TO_SPORT[String(league ?? '')];
            if (!sport || !team || (dir !== 'up' && dir !== 'down')) {
                return res.status(400).json({ error: 'Wymagane: league, team, dir (up|down)' });
            }
            const counts = this.powerRankingService.vote(sport, String(team), dir);
            res.json({ team, ...counts });
        });

        // Manual refresh trigger (standings + odds + recommended)
        this.app.post('/api/refresh', async (_req: Request, res: Response) => {
            res.json({ status: 'started' });
            await this.fetchAllLeagues();
        });

        // SPA fallback - React router-less nawigacja zyje w kliencie
        this.app.get('*', (_req: Request, res: Response) => {
            const indexHtml = path.join(DashboardServer.WEB_ROOT, 'index.html');
            if (!fs.existsSync(indexHtml)) {
                res.status(503).send(
                    '<h1>Frontend nie jest zbudowany</h1>' +
                    '<p>Uruchom <code>npm run web:build</code> (produkcja) ' +
                    'albo <code>npm run web:dev</code> i wejdz na <a href="http://localhost:5173">localhost:5173</a>.</p>'
                );
                return;
            }
            res.sendFile(indexHtml);
        });
    }

    /**
     * Start the server
     */
    public start(): void {
        this.app.listen(this.port, () => {
            console.log('\n');
            console.log('╔════════════════════════════════════════════════════════════════════╗');
            console.log('║                   🏈 DASHBOARD SERVER RUNNING 🏈                   ║');
            console.log(`║                   📊 http://localhost:${this.port}                       ║`);
            console.log('╚════════════════════════════════════════════════════════════════════╝');
            console.log('\n💡 Otwórz przeglądarkę и przejdź na http://localhost:3000\n');

            this.startKeepAlive();
            this.scheduleDailyFetch();
            setTimeout(() => this.initOnStartup(), 2000);
        });
    }

    private scheduleDailyFetch(): void {
        const scheduleNext = () => {
            const now    = new Date();
            const target = new Date();
            target.setHours(3, 0, 0, 0);
            if (target <= now) target.setDate(target.getDate() + 1);
            const delay = target.getTime() - now.getTime();
            console.log(`[Cron] następne pobieranie kursów: ${target.toLocaleString('pl-PL')}`);
            setTimeout(async () => {
                await this.fetchAllLeagues();
                scheduleNext();
            }, delay);
        };
        scheduleNext();
    }

    private async fetchAllLeagues(): Promise<void> {
        console.log('[Cron] pobieranie kursów i standings...');
        for (const sport of Object.values(Sport)) {
            try {
                await this.oddsService.refreshOdds(sport);
            } catch (err: any) {
                console.error(`[Cron] błąd kursów dla ${sport}: ${err?.response?.status ?? ''} ${err?.response?.data?.message ?? err?.message}`);
            }
        }
        this.computePowerRankings();
        await this.computeRecommendedBets();
        console.log('[Cron] gotowe');
    }

    private async initOnStartup(): Promise<void> {
        // Standings liczymy z wyników (/scores + backfill), nie z ESPN (403).
        const caches = this.oddsService.getAllCaches();
        const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;

        const vals = Array.from(caches.values());
        const needsOddsRefresh =
            caches.size === 0 ||
            vals.some(c => new Date(c.fetchedAt).getTime() < twelveHoursAgo) ||
            vals.some(c => !c.data.some(m => m.consensusProbability));

        if (needsOddsRefresh) {
            console.log('[Startup] Odświeżam kursy (brak cache / stary format / >12h)...');
            for (const sport of Object.values(Sport)) {
                try { await this.oddsService.refreshOdds(sport); } catch (err: any) {
                    console.error(`[Startup] błąd kursów dla ${sport}: ${err?.response?.status ?? ''} ${err?.response?.data?.message ?? err?.message}`);
                }
            }
        } else {
            console.log('[Startup] Kursy świeże — pomijam fetch.');
        }

        this.computePowerRankings();
        await this.computeRecommendedBets();
    }

    private computePowerRankings(): void {
        try {
            // Buduj rankingi z danych na dysku — bez sieci (kredyty oszczedzamy;
            // swieze wyniki dociagane sa on-demand przy otwarciu zakladki ligi).
            console.log('[PowerRanking] budowanie rankingow ELO z cache na dysku...');
            this.powerRankingService.primeFromDisk(this.powerSports);
            // Zasil model NFL realnym ELO (zamiast dawnego hardkodu).
            this.predictionModel.setEloRatings(this.powerRankingService.ratingsMap(Sport.NFL));
        } catch (err) {
            console.error('[PowerRanking] blad:', err);
        }
    }

    private async computeRecommendedBets(): Promise<void> {
        try {
            console.log('[Recommended] obliczanie polecanych zakładów...');
            const caches = this.oddsService.getAllCaches();
            this.recommendedBets = await this.recommendedService.computeRecommended(caches);
            console.log(`[Recommended] gotowe — znaleziono ${this.recommendedBets.length} bets`);
        } catch (err) {
            console.error('[Recommended] błąd:', err);
        }
    }

    private startKeepAlive(): void {
        const renderUrl = process.env.RENDER_EXTERNAL_URL;
        if (!renderUrl) return; // tylko na Renderze

        const url = `${renderUrl}/api/health`;
        setInterval(async () => {
            try {
                const res = await fetch(url);
                console.log(`[KeepAlive] ping OK (${res.status})`);
            } catch (err) {
                console.warn('[KeepAlive] ping failed:', err);
            }
        }, 10 * 60 * 1000); // co 10 minut

        console.log(`[KeepAlive] aktywny → pinguje ${url} co 10 min`);
    }

    /**
     * Get port number
     */
    public getPort(): number {
        return this.port;
    }
}

/**
 * Czy zaklad wygral, na podstawie wyniku meczu.
 *   true  = wygrany, false = przegrany, null = nie umiemy rozstrzygnac.
 *
 * Typy musza sie zgadzac z `canonicalOutcome()` w match-analysis-service.ts
 * i z etykietami w web/src/helpers.ts.
 */
export function settleOutcome(outcome: string, homeScore: number, awayScore: number): boolean | null {
    const actual = homeScore > awayScore ? 'home' : homeScore < awayScore ? 'away' : 'draw';

    // 1X2
    if (outcome === 'home' || outcome === 'draw' || outcome === 'away') return outcome === actual;

    // Podwojna szansa
    const dcWin: Record<string, string[]> = { '1X': ['home', 'draw'], '12': ['home', 'away'], 'X2': ['draw', 'away'] };
    if (dcWin[outcome]) return dcWin[outcome].includes(actual);

    // Suma goli, np. 'over_2.5' / 'under_2.5'
    const totals = /^(over|under)_(\d+(?:\.\d+)?)$/.exec(outcome);
    if (totals) {
        const line = parseFloat(totals[2]);
        const sum = homeScore + awayScore;
        // Pelna linia trafiona co do gola = zwrot stawki. Model liczy tylko linie
        // polowkowe (x.5), wiec tu nie powinnismy trafic — zostawiamy userowi.
        if (sum === line) return null;
        return totals[1] === 'over' ? sum > line : sum < line;
    }

    // Obie druzyny strzela
    if (outcome === 'btts_yes') return homeScore > 0 && awayScore > 0;
    if (outcome === 'btts_no')  return homeScore === 0 || awayScore === 0;

    return null;
}
