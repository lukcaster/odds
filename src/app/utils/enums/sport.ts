
export enum Sport {
    NFL = 'americanfootball_nfl',
    EKSTRAKLASA = 'soccer_poland_ekstraklasa',
    LALIGA = 'soccer_spain_la_liga',
    PREMIER_LEAGUE = 'soccer_england_premier_league',
    BUNDESLIGA = 'soccer_germany_bundesliga'
}

export const SportConfig: Record<Sport, { region: string; label: string; hasDraw: boolean; flag: string }> = {
    [Sport.NFL]:           { region: 'us', label: 'NFL',           hasDraw: false, flag: '🏈' },
    [Sport.EKSTRAKLASA]:   { region: 'eu', label: 'Ekstraklasa',   hasDraw: true,  flag: '🇵🇱' },
    [Sport.LALIGA]:        { region: 'eu', label: 'La Liga',        hasDraw: true,  flag: '🇪🇸' },
    [Sport.PREMIER_LEAGUE]:{ region: 'uk', label: 'Premier League', hasDraw: true,  flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
    [Sport.BUNDESLIGA]:    { region: 'eu', label: 'Bundesliga',     hasDraw: true,  flag: '🇩🇪' }
};

export const LEAGUE_KEY_TO_SPORT: Record<string, Sport> = {
    'nfl':            Sport.NFL,
    'ekstraklasa':    Sport.EKSTRAKLASA,
    'laliga':         Sport.LALIGA,
    'premier_league': Sport.PREMIER_LEAGUE,
    'bundesliga':     Sport.BUNDESLIGA
};
