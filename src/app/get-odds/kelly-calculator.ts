/**
 * Konwersja decimal odds na implied probability
 * @param decimalOdds - kursy w formacie decimal (np. 1.90)
 * @returns Prawdopodobieństwo z zakresu 0-1
 */
export function decimalOddsToImpliedProbability(decimalOdds: number): number {
    if (decimalOdds <= 0) {
        throw new Error('Decimal odds muszą być większe od 0');
    }
    return 1 / decimalOdds;
}

/**
 * Kelly Criterion - oblicza odsetek bankrolla do postawienia
 * Formuła: f* = (bp - q) / b
 * @param decimalOdds - kursy w formacie decimal
 * @param yourProbability - Twoje przewidywane prawdopodobieństwo (0-1)
 * @returns Odsetek bankrolla do postawienia (0-1)
 */
export function kellyBet(decimalOdds: number, yourProbability: number): number {
    if (decimalOdds <= 0) {
        throw new Error('Decimal odds muszą być większe od 0');
    }
    if (yourProbability < 0 || yourProbability > 1) {
        throw new Error('Prawdopodobieństwo musi być z zakresu 0-1');
    }

    const b = decimalOdds - 1; // win/loss ratio
    const p = yourProbability;
    const q = 1 - yourProbability;

    const kelly = (b * p - q) / b;

    // Kelly nigdy nie powinien być ujemny (nie ma value w zagraaniu)
    return Math.max(0, kelly);
}

/**
 * Bezpieczna wersja Kelly - zazwyczaj podział przez 4 (fractional Kelly)
 * Zmniejsza ryzyko ruiny finansowej
 * @param decimalOdds - kursy w formacie decimal
 * @param yourProbability - Twoje przewidywane prawdopodobieństwo (0-1)
 * @param fraction - Domyślnie 4 (Kelly/4)
 * @returns Odsetek bankrolla do postawienia
 */
export function fractionalKelly(
    decimalOdds: number,
    yourProbability: number,
    fraction: number = 4
): number {
    const fullKelly = kellyBet(decimalOdds, yourProbability);
    return fullKelly / fraction;
}

/**
 * Sprawdza czy jest "value" w obstawieniu
 * Value = Twoja szansa > Implied odds
 * @param decimalOdds - kursy w formacie decimal
 * @param yourProbability - Twoje przewidywane prawdopodobieństwo (0-1)
 * @returns true jeśli jest value, false jeśli nie
 */
export function isValueBet(decimalOdds: number, yourProbability: number): boolean {
    const impliedProbability = decimalOddsToImpliedProbability(decimalOdds);
    return yourProbability > impliedProbability;
}

/**
 * Zwraca margin bukmachera (overround) - ile procent bukmacher zarabia
 * @param decimalOdds - kursy w formacie decimal
 * @returns Margin jako procent (np. 0.05 = 5%)
 */
export function calculateBookmakerMargin(decimalOdds: number[]): number {
    const impliedOdds = decimalOdds.map(odds => decimalOddsToImpliedProbability(odds));
    const totalImplied = impliedOdds.reduce((a, b) => a + b, 0);
    return totalImplied - 1;
}

export interface BetRecommendation {
    team: string;
    odds: number;
    impliedProbability: number;
    yourEstimate: number;
    hasValue: boolean;
    kellyPercentage: number;
    fractionalKellyPercentage: number;
    recommendation: string;
}
