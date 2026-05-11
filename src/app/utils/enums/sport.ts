
export enum Sport {
    NFL            = 'americanfootball_nfl',
    NBA            = 'basketball_nba',
    EKSTRAKLASA    = 'soccer_poland_ekstraklasa',
    LALIGA         = 'soccer_spain_la_liga',
    PREMIER_LEAGUE = 'soccer_england_premier_league',
    BUNDESLIGA     = 'soccer_germany_bundesliga'
}

export const SportConfig: Record<Sport, {
    region: string;
    label: string;
    hasDraw: boolean;
    countryFlag: string;
    sportIcon: string;
    flag: string;  // combined countryFlag+sportIcon for backward compat
}> = {
    [Sport.NFL]:           { region: 'us', label: 'NFL',           hasDraw: false, countryFlag: '🇺🇸', sportIcon: '🏈', flag: '🇺🇸🏈' },
    [Sport.NBA]:           { region: 'us', label: 'NBA',           hasDraw: false, countryFlag: '🇺🇸', sportIcon: '🏀', flag: '🇺🇸🏀' },
    [Sport.EKSTRAKLASA]:   { region: 'eu', label: 'Ekstraklasa',   hasDraw: true,  countryFlag: '🇵🇱', sportIcon: '⚽', flag: '🇵🇱⚽' },
    [Sport.LALIGA]:        { region: 'eu', label: 'La Liga',        hasDraw: true,  countryFlag: '🇪🇸', sportIcon: '⚽', flag: '🇪🇸⚽' },
    [Sport.PREMIER_LEAGUE]:{ region: 'uk', label: 'Premier League', hasDraw: true,  countryFlag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', sportIcon: '⚽', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿⚽' },
    [Sport.BUNDESLIGA]:    { region: 'eu', label: 'Bundesliga',     hasDraw: true,  countryFlag: '🇩🇪', sportIcon: '⚽', flag: '🇩🇪⚽' }
};

export const LEAGUE_KEY_TO_SPORT: Record<string, Sport> = {
    'nfl':            Sport.NFL,
    'nba':            Sport.NBA,
    'ekstraklasa':    Sport.EKSTRAKLASA,
    'laliga':         Sport.LALIGA,
    'premier_league': Sport.PREMIER_LEAGUE,
    'bundesliga':     Sport.BUNDESLIGA
};

export const SPORT_TO_LEAGUE_KEY: Record<Sport, string> = {
    [Sport.NFL]:           'nfl',
    [Sport.NBA]:           'nba',
    [Sport.EKSTRAKLASA]:   'ekstraklasa',
    [Sport.LALIGA]:        'laliga',
    [Sport.PREMIER_LEAGUE]:'premier_league',
    [Sport.BUNDESLIGA]:    'bundesliga'
};
