import cors from 'cors';
import express, { Express, Request, Response } from 'express';
import path from 'path';
import { HybridPredictionModel } from './get-odds/hybrid-prediction-model';
import { OddsService } from './get-odds/odds-service';
import { RecommendedBet, RecommendedService } from './get-odds/recommended-service';
import { LEAGUE_KEY_TO_SPORT, Sport, SportConfig } from './utils/enums/sport';

export class DashboardServer {
    private app: Express;
    private predictionModel: HybridPredictionModel;
    private oddsService: OddsService;
    private recommendedService: RecommendedService;
    private recommendedBets: RecommendedBet[] = [];
    private port: number = parseInt(process.env.PORT || '3000', 10);

    constructor() {
        this.app = express();
        this.predictionModel = new HybridPredictionModel();
        this.oddsService = new OddsService();
        this.recommendedService = new RecommendedService(this.predictionModel);
        this.setupMiddleware();
        this.setupRoutes();
    }

    /**
     * Setup Express middleware
     */
    private setupMiddleware(): void {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static(path.join(process.cwd(), 'public')));
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

        // Recommended bets (computed daily by cron)
        this.app.get('/api/recommended', (_req: Request, res: Response) => {
            res.json(this.recommendedBets);
        });

        // Serve index.html for all other routes
        this.app.get('*', (req: Request, res: Response) => {
            res.sendFile(path.join(process.cwd(), 'public/index.html'));
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
        console.log('[Cron] pobieranie kursów dla wszystkich lig...');
        for (const sport of Object.values(Sport)) {
            try {
                await this.oddsService.refreshOdds(sport);
            } catch (err) {
                console.error(`[Cron] błąd dla ${sport}:`, err);
            }
        }
        await this.computeRecommendedBets();
        console.log('[Cron] gotowe');
    }

    private async initOnStartup(): Promise<void> {
        const caches = this.oddsService.getAllCaches();

        if (caches.size === 0) {
            console.log('[Startup] Brak cache — pobieram kursy dla wszystkich lig...');
            await this.fetchAllLeagues();
            return;
        }

        // Check if cached data is new format (has consensusProbability)
        let hasConsensus = false;
        for (const [, cache] of caches) {
            if (cache.data.some(m => m.consensusProbability)) { hasConsensus = true; break; }
        }

        if (!hasConsensus) {
            console.log('[Startup] Cache jest w starym formacie (bez consensus) — odświeżam...');
            await this.fetchAllLeagues();
        } else {
            console.log('[Startup] Cache OK — przeliczam polecane...');
            await this.computeRecommendedBets();
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
