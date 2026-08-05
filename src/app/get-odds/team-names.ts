/**
 * Wspólna normalizacja nazw drużyn.
 * ESPN i The-Odds-API nazywają drużyny inaczej — tu sprowadzamy je do
 * jednej formy, żeby tabela, wyniki i kursy mówiły tym samym językiem.
 */

// ESPN → The-Odds-API
export const NAME_MAP: Record<string, string> = {
    // Premier League
    'Manchester City FC':         'Manchester City',
    'Manchester United FC':       'Manchester United',
    'Arsenal FC':                 'Arsenal',
    'Liverpool FC':               'Liverpool',
    'Chelsea FC':                 'Chelsea',
    'Tottenham Hotspur':          'Tottenham Hotspur',
    'Newcastle United FC':        'Newcastle United',
    'Aston Villa FC':             'Aston Villa',
    'Brighton & Hove Albion FC':  'Brighton and Hove Albion',
    'West Ham United FC':         'West Ham United',
    'Wolverhampton Wanderers FC': 'Wolverhampton Wanderers',
    'Fulham FC':                  'Fulham',
    'Crystal Palace FC':          'Crystal Palace',
    'Brentford FC':               'Brentford',
    'Nottingham Forest FC':       'Nottingham Forest',
    'Everton FC':                 'Everton',
    'Leicester City FC':          'Leicester City',
    'Southampton FC':             'Southampton',
    'Ipswich Town FC':            'Ipswich Town',
    'AFC Bournemouth':            'Bournemouth',
    // La Liga
    'FC Barcelona':               'Barcelona',
    'Real Madrid CF':             'Real Madrid',
    'Club Atlético de Madrid':    'Atletico Madrid',
    'Atletico de Madrid':         'Atletico Madrid',
    'Real Sociedad de Fútbol':    'Real Sociedad',
    'Athletic Club':              'Athletic Club Bilbao',
    'Villarreal CF':              'Villarreal',
    'Real Betis Balompié':        'Real Betis',
    'Sevilla FC':                 'Sevilla',
    'Valencia CF':                'Valencia',
    'Celta de Vigo':              'Celta Vigo',
    'Rayo Vallecano de Madrid':   'Rayo Vallecano',
    'UD Las Palmas':              'Las Palmas',
    'RCD Mallorca':               'Mallorca',
    'RCD Espanyol de Barcelona':  'Espanyol',
    'Deportivo Alavés':           'Alaves',
    'Girona FC':                  'Girona',
    'Getafe CF':                  'Getafe',
    'UD Almería':                 'Almeria',
    // Bundesliga
    'FC Bayern München':          'Bayern Munich',
    'Bayer 04 Leverkusen':        'Bayer Leverkusen',
    'VfB Stuttgart':              'Stuttgart',
    'SC Freiburg':                'Freiburg',
    'TSG Hoffenheim':             'Hoffenheim',
    'FSV Mainz 05':               'Mainz 05',
    '1. FC Union Berlin':         'Union Berlin',
    '1. FC Köln':                 'FC Koln',
    'FC Augsburg':                'Augsburg',
    'VfL Wolfsburg':              'Wolfsburg',
    'SV Werder Bremen':           'Werder Bremen',
    'Borussia Mönchengladbach':   'Borussia Monchengladbach',
    'VfL Bochum 1848':            'Bochum',
    'Darmstadt 98':               'Darmstadt',
    'FC Heidenheim 1846':         'Heidenheim',
    'SV Darmstadt 98':            'Darmstadt',
};

/** Zamień nazwę ESPN na kanoniczną (wg NAME_MAP), jak nie ma — zwróć oryginał. */
export function normalizeTeamName(name: string): string {
    return NAME_MAP[name] ?? name;
}

/** Klucz do luźnego porównywania: małe litery, bez znaków specjalnych. */
export function teamKey(s: string): string {
    return s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');
}

/** Czy dwie nazwy to (prawdopodobnie) ta sama drużyna. */
export function looseMatch(a: string, b: string): boolean {
    const ka = teamKey(normalizeTeamName(a));
    const kb = teamKey(normalizeTeamName(b));
    if (!ka || !kb) return false;
    return ka === kb || ka.includes(kb) || kb.includes(ka);
}
