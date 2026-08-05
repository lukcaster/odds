/**
 * Generyczny silnik ELO karmiony realnymi wynikami meczów.
 * Działa dla każdego sportu (piłka, NFL) — bez żadnych hardkodowanych
 * ratingów startowych. Każda drużyna startuje z BASE i zmienia rating
 * po każdym meczu, z uwzględnieniem rozmiaru zwycięstwa (margin of victory).
 *
 * Rebuild jest deterministyczny: zawsze karmimy pełną, posortowaną
 * chronologicznie listę wyników od zera — brak podwójnego liczenia.
 */

export interface EloOptions {
    base?: number;   // rating startowy nowej drużyny
    k?: number;      // współczynnik zmienności
    home?: number;   // przewaga gospodarza w punktach ELO
}

export interface EloTeam {
    rank: number;
    team: string;
    rating: number;
    games: number;
    wins: number;
    draws: number;
    losses: number;
    form: Array<'W' | 'D' | 'L'>;  // ostatnie mecze (najnowszy na końcu)
    goalsFor: number;
    goalsAgainst: number;
}

interface Entry {
    rating: number;
    games: number;
    wins: number;
    draws: number;
    losses: number;
    form: Array<'W' | 'D' | 'L'>;
    goalsFor: number;
    goalsAgainst: number;
}

export interface FedResult {
    date: string;      // ISO
    home: string;
    away: string;
    homeScore: number;
    awayScore: number;
}

const FORM_LEN = 5;

export class EloEngine {
    private teams = new Map<string, Entry>();
    private readonly base: number;
    private readonly k: number;
    private readonly home: number;

    constructor(opts: EloOptions = {}) {
        this.base = opts.base ?? 1500;
        this.k    = opts.k    ?? 24;
        this.home = opts.home ?? 55;
    }

    public reset(): void {
        this.teams.clear();
    }

    /** Przelicz cały ranking od zera z chronologicznej listy wyników. */
    public rebuild(results: FedResult[]): void {
        this.reset();
        const sorted = [...results].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        for (const r of sorted) this.feed(r);
    }

    /** Nakarm silnik pojedynczym wynikiem. */
    public feed(r: FedResult): void {
        if (!r.home || !r.away) return;
        if (!Number.isFinite(r.homeScore) || !Number.isFinite(r.awayScore)) return;

        const home = this.ensure(r.home);
        const away = this.ensure(r.away);

        const adjHome = home.rating + this.home;
        const expHome = 1 / (1 + Math.pow(10, (away.rating - adjHome) / 400));

        let actualHome: number;
        let hRes: 'W' | 'D' | 'L';
        let aRes: 'W' | 'D' | 'L';
        if (r.homeScore > r.awayScore)      { actualHome = 1;   hRes = 'W'; aRes = 'L'; home.wins++;  away.losses++; }
        else if (r.homeScore < r.awayScore) { actualHome = 0;   hRes = 'L'; aRes = 'W'; home.losses++; away.wins++;  }
        else                                { actualHome = 0.5; hRes = 'D'; aRes = 'D'; home.draws++;  away.draws++; }

        // Margin-of-victory: większa różnica bramek = większa zmiana ratingu.
        const movMult = 1 + Math.log(1 + Math.abs(r.homeScore - r.awayScore));
        const delta = this.k * movMult * (actualHome - expHome);

        home.rating += delta;
        away.rating -= delta;

        home.games++; away.games++;
        home.goalsFor += r.homeScore; home.goalsAgainst += r.awayScore;
        away.goalsFor += r.awayScore; away.goalsAgainst += r.homeScore;
        pushForm(home.form, hRes);
        pushForm(away.form, aRes);
    }

    public getRating(team: string): number {
        return this.teams.get(team)?.rating ?? this.base;
    }

    public has(team: string): boolean {
        return this.teams.has(team);
    }

    /** Ranking posortowany malejąco wg ratingu. */
    public getRankings(): EloTeam[] {
        return Array.from(this.teams.entries())
            .map(([team, e]) => ({ team, ...e }))
            .sort((a, b) => b.rating - a.rating)
            .map((e, i) => ({ rank: i + 1, ...e }));
    }

    /** Zrzut ratingów drużyna→rating (do zasilenia innych modeli, np. NFL). */
    public ratingsMap(): Map<string, number> {
        const m = new Map<string, number>();
        for (const [team, e] of this.teams) m.set(team, e.rating);
        return m;
    }

    private ensure(team: string): Entry {
        let e = this.teams.get(team);
        if (!e) {
            e = { rating: this.base, games: 0, wins: 0, draws: 0, losses: 0, form: [], goalsFor: 0, goalsAgainst: 0 };
            this.teams.set(team, e);
        }
        return e;
    }
}

function pushForm(form: Array<'W' | 'D' | 'L'>, r: 'W' | 'D' | 'L'): void {
    form.push(r);
    if (form.length > FORM_LEN) form.shift();
}
