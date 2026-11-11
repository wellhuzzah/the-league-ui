// NFL win percentage: a tie counts as half a win and half a loss. 0 with no games.
export const winPct = (wins, losses, draws = 0) => {
    const games = wins + losses + draws
    return games ? (wins + draws / 2) / games : 0
}

// .667 style
export const pct3 = (p) => p.toFixed(3).replace(/^0/, '')
