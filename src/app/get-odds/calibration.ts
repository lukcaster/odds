/**
 * Kalibracja prognoz — temperature scaling.
 *
 * PROBLEM: backtest pokazal, ze modele sa PRZEKONANE O SWOJEJ RACJI bardziej,
 * niz na to zasluguja. Model mowil 73% i zdarzalo sie 36%. To nie jest blad
 * kosmetyczny: Kelly stawia tym wiecej, im pewniejszy jest model, a `MIN_EDGE`
 * selekcjonuje dokladnie te prognozy, w ktorych model przebija rynek — czyli
 * te przeszacowane. Niekalibrowany model systematycznie przepala bankroll.
 *
 * ROZWIAZANIE: podnosimy kazde prawdopodobienstwo do potegi 1/T i normalizujemy.
 *   T = 1  -> bez zmian
 *   T > 1  -> rozklad splaszczony, model mniej pewny siebie
 *   T < 1  -> rozklad zaostrzony
 *
 * Dla dwoch wynikow jest to dokladnie skalowanie logitu (Platt bez przesuniecia),
 * dla trzech — jego naturalne rozszerzenie. Jeden parametr, wiec malo miejsca na
 * przeuczenie, i nie rusza KOLEJNOSCI wynikow — tylko pewnosc.
 *
 * Wartosci T dobrane sa backtestem: `npm run backtest -- --calibrate`.
 */

/** Rozklad po kalibracji. Zwraca nowa tablice, nie modyfikuje wejscia. */
export function applyTemperature(probs: number[], T: number): number[] {
    if (!(T > 0) || T === 1) return [...probs];
    const powered = probs.map(p => Math.pow(Math.max(p, 1e-12), 1 / T));
    const sum = powered.reduce((a, b) => a + b, 0);
    return sum > 0 ? powered.map(p => p / sum) : [...probs];
}

/** Wersja dla jednego prawdopodobienstwa (reszta = 1 - p). */
export function calibrateBinary(p: number, T: number): number {
    return applyTemperature([p, 1 - p], T)[0];
}

/**
 * PILKA (Poisson + ELO, rozklad 1X2).
 *
 * Dobrane `npm run backtest -- --calibrate` na 1207 prognozach z czterech lig.
 * Pulujemy ligi, bo ~300 meczow na lige to za malo na osobne T. Log loss po
 * ligach razem: 1.0540 (T=1) -> 1.0439 (T=1.40), krzywa plaska miedzy 1.25 i 1.60.
 * Optimum per liga rozstrzelone (La Liga 1.25, Bundesliga 1.25, PL 1.60,
 * Ekstraklasa 2.50) — to kolejny dowod, ze Ekstraklasa ma zepsute dane, a nie
 * ze potrzebuje innej temperatury.
 */
export const SOCCER_TEMPERATURE = 1.40;

/**
 * NFL (ELO, rozklad dwuwynikowy).
 *
 * BACKTEST MOWI: ZADNEJ KALIBRACJI. T=1.00 wygralo, kazde T>1 pogarszalo log
 * loss (0.6295 -> 0.6307 przy 1.10, 0.6465 przy 2.00). Po dobraniu movDivisor=3
 * i home=40 model jest w srodku zakresu dobrze skalibrowany.
 *
 * WAZNE: to NIE znaczy, ze problem skrajnych marginesow zniknal. Log loss jest
 * zdominowany przez mecze typowe, a prognoz powyzej 90% bylo w probce... jedna.
 * Metryka po prostu nie widzi ogona. Podkrecanie T zepsuloby mecze typowe, zeby
 * naprawic coz, czego nie potrafimy zmierzyc — dlatego ogon ograniczamy osobno,
 * twardym limitem marginesu w nfl-spread-model.ts.
 */
export const NFL_TEMPERATURE = 1.0;
