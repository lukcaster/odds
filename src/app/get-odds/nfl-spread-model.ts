/**
 * Model handicapu punktowego (spreadu) dla NFL.
 *
 * Model predykcji daje tylko P(wygrana gospodarzy). Zakladamy, ze margines
 * punktowy ma rozklad normalny o stalej sigmie, co pozwala przejsc z szansy
 * wygranej na szanse pokrycia dowolnej linii:
 *
 *   P(wygrana) = Phi(mu / sigma)          =>  mu = sigma * Phi^-1(P)
 *   P(pokrycie linii p) = Phi((margines_druzyny + p) / sigma)
 *
 * UWAGA: to przeksztalcenie NIE wnosi nowej informacji — edge na spreadzie
 * jest pochodna edge'u na moneyline i przyjetej sigmy. Rozklad marginesow
 * w NFL ma dodatkowo piki na 3 i 7 punktach, ktorych normalny nie oddaje,
 * wiec akurat przy tych kluczowych liczbach jest najmniej dokladny.
 */

/** Odchylenie standardowe marginesu punktowego w NFL (~13.5 pkt). */
export const NFL_MARGIN_SIGMA = 13.5;

/** Dystrybuanta rozkladu normalnego (Abramowitz-Stegun 26.2.17). */
export function normalCdf(z: number): number {
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989422804014327 * Math.exp(-z * z / 2);
    const p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
    return z > 0 ? 1 - p : p;
}

/** Odwrotnosc normalCdf — bisekcja, wystarczajaco dokladna i bez magicznych stalych. */
export function normalQuantile(p: number): number {
    let lo = -6, hi = 6;
    for (let i = 0; i < 60; i++) {
        const mid = (lo + hi) / 2;
        if (normalCdf(mid) < p) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
}

/** Oczekiwany margines gospodarzy w punktach (dodatni = faworyt). */
export function expectedHomeMargin(pHome: number): number {
    return NFL_MARGIN_SIGMA * normalQuantile(pHome);
}

/**
 * Szansa, ze wskazana strona pokryje swoja linie handicapu.
 * `line` to punkt od bukmachera dla TEJ strony (np. -6.5 dla faworyta).
 */
export function coverProbability(pHome: number, side: 'home' | 'away', line: number): number {
    const mu = expectedHomeMargin(pHome);
    const teamMargin = side === 'home' ? mu : -mu;
    return normalCdf((teamMargin + line) / NFL_MARGIN_SIGMA);
}

/** Linia handicapu ze znakiem: '-6.5', '+3'. */
export function formatLine(point: number): string {
    return point > 0 ? `+${point}` : String(point);
}
