import PosChip from './PosChip'
import TeamChip from './TeamChip'

// The seasons a player appears in Rockwood data, as "2010–2014" (or "2018" for one season): tells
// same-name players apart
const yearSpan = (seasons) =>
    seasons.length > 1 ? `${seasons[0]}–${seasons[seasons.length - 1]}` : String(seasons[0])

// "Which one?": the players a name search matched (/players/search rows), one button each.
export default function PlayerChooser({ players, onSelect }) {
    return (
        <div>
            <h2 className="rw-label">Which one?</h2>
            <div className="rw-choose">
                {players.map(p => (
                    <button key={p.espn_player_id} type="button" onClick={() => onSelect(p)}>
                        <span style={{ whiteSpace: 'nowrap' }}><PosChip position={p.position} /><TeamChip abbrev={p.nfl_team} name={p.nfl_team_name} variant="chip" title="NFL team now" /></span>
                        <span className="who">
                            {p.player_name}
                            {p.seasons?.length > 0 && (
                                <>
                                    <span className="dot" aria-hidden="true">·</span>
                                    <span className="yrs">{yearSpan(p.seasons)}</span>
                                </>
                            )}
                        </span>
                        <span className="stats">
                            {p.appearances > 0 && `${p.appearances} games`}
                            {p.appearances > 0 && p.drafted > 0 && ' · '}
                            {p.drafted > 0 && `drafted ${p.drafted}×`}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    )
}
