import inquirer from 'inquirer';
import { OddsCalculatorCLI } from "./cli-handler";
import { DashboardServer } from "./dashboard-server";

const start = async (): Promise<void> => {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║          🏈 NFL ODDS CALCULATOR - KELLY CRITERION 🏈              ║');
    console.log('║                 Hybrid Model (ELO + Stats + Momentum)              ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');

    const { mode } = await inquirer.prompt([
        {
            type: 'list',
            name: 'mode',
            message: 'Wybierz tryb pracy:',
            choices: [
                { name: '🖥️  CLI - Interaktywny interfejs w terminalu', value: 'cli' },
                { name: '📊 Dashboard - Web interface (http://localhost:3000)', value: 'dashboard' },
                { name: '🔀 Oba - Dashboard + CLI (w tle)', value: 'both' }
            ]
        }
    ]);

    if (mode === 'cli') {
        const cli = new OddsCalculatorCLI();
        await cli.start();
    } else if (mode === 'dashboard') {
        const server = new DashboardServer();
        server.start();
        // Keep server running
        await new Promise(() => { });
    } else if (mode === 'both') {
        const server = new DashboardServer();
        server.start();

        // Small delay before starting CLI
        await new Promise(resolve => setTimeout(resolve, 1000));

        const cli = new OddsCalculatorCLI();
        await cli.start();
    }
}

start().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});