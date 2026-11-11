import { isPlayoffGame, isToiletGame, TOILET_LABEL } from '../utils/gameType'

// The tag for a game's type column: playoffLabel ('PO' or 'Playoffs') for winners-bracket games,
// Toilet for consolation games, `regular` for the regular season.
export default function GameTag({ game, playoffLabel = 'PO', regular = null, style }) {
    if (isPlayoffGame(game)) return <span className="badge-tag gold" style={style}>{playoffLabel}</span>
    if (isToiletGame(game))  return <span className="badge-tag" style={style}>{TOILET_LABEL}</span>
    return regular
}
