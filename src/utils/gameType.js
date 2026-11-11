// A game's type from the API's is_playoffs (every game from week 14 on) and playoff_tier (ESPN's
// bracket label). Only winners-bracket games are playoff games; the other week-14+ games (the
// consolation ladders) are the toilet bowl.
export const isPlayoffGame = g => g.playoff_tier === 'WINNERS_BRACKET'
export const isToiletGame  = g => !!g.is_playoffs && g.playoff_tier !== 'WINNERS_BRACKET'

export const TOILET_LABEL = 'Toilet'

// For a caption: ' · PO', ' · Toilet' or ''.
export function gameTagSuffix(game) {
    if (isPlayoffGame(game)) return ' · PO'
    if (isToiletGame(game))  return ` · ${TOILET_LABEL}`
    return ''
}
