import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getBracket } from '../api/seasons'

const fmt = (n) => Number(n).toFixed(1)
const cx = (...names) => names.filter(Boolean).join(' ')

// One line of a bracket card: a team (seed, owner, record, and the score once played), the
// unknown winner of an earlier game ("Winner #8/#9"), an empty line (TBD), or BYE.
function Line({ slot }) {
    if (!slot) return <div className="ln bye">BYE</div>
    if (slot.tbd) return <div className="ln tbd">TBD</div>
    if (slot.pending) return <div className="ln tbd">Winner #{slot.pending[0]}/#{slot.pending[1]}</div>
    return (
        <div className={cx('ln', slot.won === true && 'won', slot.won === false && 'lost')}>
            <span className="sd">#{slot.seed}</span>
            <Link className="ow" to={`/teams/${slot.team_id}`}>{slot.owner}</Link>
            <span className="rec">{slot.record}</span>
            {slot.score !== null && <span className="sc">{fmt(slot.score)}</span>}
        </div>
    )
}

// The Season page's Playoffs tab (in-progress season only): ESPN's seeds as a projected winners
// bracket once from_week weeks are done, the real one once the regular season is over.
export default function PlayoffBracket({ season }) {
    const [result, setResult] = useState(null)      // { season, data } | { season, failed: true }

    useEffect(() => {
        let live = true
        getBracket(season).then(
            data => { if (live) setResult({ season, data }) },
            ()   => { if (live) setResult({ season, failed: true }) },
        )
        return () => { live = false }
    }, [season])

    if (result?.season !== season) return <div className="rw-loading">Loading...</div>
    if (result.failed) return <p className="rw-note" style={{ color: 'var(--loss)' }}>Couldn&rsquo;t load the bracket. Try again.</p>
    const data = result.data

    if (data.mode === 'none' || data.mode === 'too_soon') {
        return (
            <div className="rw-empty">
                <h3>It&rsquo;s too soon, calm the fuck down.</h3>
                <p style={{ marginBottom: 0 }}>
                    The bracket shows up once week {data.from_week} is done
                    {data.through_week !== null && <> (through week {data.through_week} so far)</>}.
                </p>
            </div>
        )
    }

    const projected = data.mode === 'projected'
    return (
        <div className="rw-block rw-fill">
            <h2 className="rw-label">{projected ? 'Projected Bracket' : 'Playoff Bracket'}</h2>
            <p className="rw-note">
                {projected
                    ? <>If the season ended now: ESPN&rsquo;s seeds after week {data.through_week}. </>
                    : <>Final seeds. </>}
                Every round is reseeded, so the best seed left plays the worst.
            </p>
            <div className="rw-bracket" style={{ '--rounds': data.rounds.length }}>
                {data.rounds.map(r => (
                    <section key={r.week} className="rd">
                        <h3>{r.name}<span>Wk {r.week}</span></h3>
                        <div className="games">
                            {r.games.map((g, i) => (
                                <div key={i} className={cx('gm', g.slots.length === 1 && 'is-bye')}>
                                    <Line slot={g.slots[0]} />
                                    <Line slot={g.slots[1]} />
                                </div>
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </div>
    )
}
