import cors from 'cors';
import express, { Express, Request, Response } from 'express';
import path from 'path';
import { HybridPredictionModel } from './get-odds/hybrid-prediction-model';

export class DashboardServer {
    private app: Express;
    private predictionModel: HybridPredictionModel;
    private port: number = 3000;

    constructor() {
        this.app = express();
        this.predictionModel = new HybridPredictionModel();
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
        });
    }

    /**
     * Get port number
     */
    public getPort(): number {
        return this.port;
    }
}
