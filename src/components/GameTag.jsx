import { isPlayoffGame, isToiletGame, TOILET_LABEL } from '../utils/gameType'

// The tag for a game's type column: Playoffs (winners bracket and 3rd/5th/7th place) in gold,
// Toilet (the losers' ladder) in brown, `regular` for the regular season. Phones show the short
// form (PO, TB); tables.css picks which.
const Label = ({ full, short }) => (
    <><span className="t-full">{full}</span><span className="t-short" aria-hidden="true">{short}</span></>
)

export default function GameTag({ game, regular = null, style }) {
    if (isPlayoffGame(game)) return <span className="badge-tag gold" style={style}><Label full="Playoffs" short="PO" /></span>
    if (isToiletGame(game))  return <span className="badge-tag toilet" style={style}><Label full={TOILET_LABEL} short="TB" /></span>
    return regular
}
