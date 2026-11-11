// A game's type from the API's is_playoffs (every game from week 14 on) and playoff_tier (ESPN's
// bracket label). Playoff games are the winners bracket and its consolation ladder (3rd/5th/7th
// place); the losers' ladder is the toilet bowl.
const PLAYOFF_TIERS = ['WINNERS_BRACKET', 'WINNERS_CONSOLATION_LADDER']

export const isPlayoffGame = g => PLAYOFF_TIERS.includes(g.playoff_tier)
export const isToiletGame  = g => !!g.is_playoffs && !isPlayoffGame(g)

export const TOILET_LABEL = 'Toilet'

// For a caption: ' · PO', ' · Toilet' or ''.
export function gameTagSuffix(game) {
    if (isPlayoffGame(game)) return ' · PO'
    if (isToiletGame(game))  return ` · ${TOILET_LABEL}`
    return ''
}
