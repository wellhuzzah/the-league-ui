import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchAllTeams } from '../api/teams'
import { getH2H, getRandomH2H } from '../api/matchups'
import { getWeekBoxscores } from '../api/boxscores'

const fmt = (n) =>
    Number(n).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

export default function HeadToHead() {
    const { teamIdA, teamIdB } = useParams()
    const navigate = useNavigate()

    const [teams,    setTeams]    = useState([])
    const [selectA,  setSelectA]  = useState(teamIdA || '')
    const [selectB,  setSelectB]  = useState(teamIdB || '')
    const [h2h,      setH2h]      = useState(null)
    const [loading,  setLoading]  = useState(false)
    const [filter,   setFilter]   = useState('all') // all | regular | playoffs

    const [randomH2H,        setRandomH2H]        = useState(null)
    const [randomLoading,    setRandomLoading]    = useState(true)
    const [randomRefreshing, setRandomRefreshing] = useState(false)

    const [expandedGame,   setExpandedGame]   = useState(null) // "season-week" key
    const [boxScoreCache,  setBoxScoreCache]  = useState({})   // cache by "season-week"
    const [boxScoreLoading, setBoxScoreLoading] = useState(false)

    const handleGameClick = async (game) => {
        if (game.season < 2018) return  // no box score data pre-2018
        const key = `${game.season}-${game.week}`
        if (expandedGame === key) {
            setExpandedGame(null)
            return
        }
        setExpandedGame(key)
        if (boxScoreCache[key]) return  // already fetched
        setBoxScoreLoading(true)
        try {
            const data = await getWeekBoxscores(game.season, game.week)
            // Filter to just the two teams in this matchup
            const filtered = {
                ...data,
                teams: data.teams.filter(t =>
                    t.team_id === teamA?.team_id || t.team_id === teamB?.team_id
                )
            }
            setBoxScoreCache(prev => ({ ...prev, [key]: filtered }))
        } catch {
            // box score not available
        } finally {
            setBoxScoreLoading(false)
        }
    }

    useEffect(() => {
        getRandomH2H()
            .then(setRandomH2H)
            .finally(() => setRandomLoading(false))
    }, [])

    const handleRefreshRandom = async () => {
        setRandomRefreshing(true)
        try {
            const data = await getRandomH2H()
            setRandomH2H(data)
        } finally {
            setRandomRefreshing(false)
        }
    }

    // Load teams for selectors
    useEffect(() => {
        fetchAllTeams().then(setTeams)
    }, [])

    // Load H2H when both IDs are in URL
    useEffect(() => {
        if (!teamIdA || !teamIdB) return
        setSelectA(teamIdA)
        setSelectB(teamIdB)
        setLoading(true)
        getH2H(teamIdA, teamIdB)
            .then(setH2h)
            .finally(() => setLoading(false))
    }, [teamIdA, teamIdB])

    const handleGo = () => {
        if (selectA && selectB && selectA !== selectB) {
            navigate(`/h2h/${selectA}/${selectB}`)
        }
    }

    // Filter games
    const games = h2h?.games?.filter(g => {
        if (filter === 'regular')  return !g.is_playoffs
        if (filter === 'playoffs') return g.is_playoffs
        return true
    }) || []

    const teamA = teams.find(t => String(t.team_id) === String(selectA))
    const teamB = teams.find(t => String(t.team_id) === String(selectB))

    const aWins   = games.filter(g => g.winner === 'A').length
    const bWins   = games.filter(g => g.winner === 'B').length
    const ties    = games.filter(g => g.winner === 'TIE').length

    const selectStyle = {
        background: 'var(--color-surface-2)',
        border: '1px solid var(--color-border)',
        color: 'var(--color-text)',
        padding: '0.5rem 0.75rem',
        borderRadius: 'var(--radius)',
        fontFamily: 'var(--font-condensed)',
        fontSize: '1rem',
        cursor: 'pointer',
        flex: 1,
        minWidth: '140px',
    }

    return (
        <main className="page">
            <div className="page-header">
                <h1 className="page-title">Head-to-Head</h1>
                <p className="page-subtitle">All-time matchup records between any two owners</p>
            </div>

            {/* Owner selector */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <select value={selectA} onChange={e => setSelectA(e.target.value)} style={selectStyle}>
                        <option value="">Select owner A...</option>
                        {teams.map(t => (
                            <option key={t.team_id} value={String(t.team_id)}>{t.owner}</option>
                        ))}
                    </select>

                    <span style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '1.5rem',
                        color: 'var(--color-text-muted)',
                        flexShrink: 0,
                    }}>VS</span>

                    <select value={selectB} onChange={e => setSelectB(e.target.value)} style={selectStyle}>
                        <option value="">Select owner B...</option>
                        {teams.map(t => (
                            <option key={t.team_id} value={String(t.team_id)}>{t.owner}</option>
                        ))}
                    </select>

                    <button
                        onClick={handleGo}
                        disabled={!selectA || !selectB || selectA === selectB}
                        style={{
                            background: 'var(--color-accent)',
                            border: 'none',
                            borderRadius: 'var(--radius)',
                            color: '#fff',
                            fontFamily: 'var(--font-condensed)',
                            fontSize: '0.9rem',
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                            padding: '0.5rem 1.5rem',
                            cursor: (!selectA || !selectB || selectA === selectB) ? 'not-allowed' : 'pointer',
                            opacity: (!selectA || !selectB || selectA === selectB) ? 0.5 : 1,
                            textTransform: 'uppercase',
                            flexShrink: 0,
                        }}
                    >
                        Go
                    </button>
                </div>
            </div>

            {/* Random H2H card — only show when no active matchup loaded */}
            {!h2h && !loading && (
                <div className="card">
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '1.25rem',
                    }}>
                        <h2 className="card-title" style={{ margin: 0 }}>✦ Featured Rivalry</h2>
                        <button
                            onClick={handleRefreshRandom}
                            disabled={randomRefreshing || randomLoading}
                            style={{
                                background: 'var(--color-surface-2)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius)',
                                color: randomRefreshing ? 'var(--color-text-muted)' : 'var(--color-accent)',
                                fontFamily: 'var(--font-condensed)',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                letterSpacing: '0.08em',
                                padding: '0.35rem 0.85rem',
                                cursor: randomRefreshing ? 'wait' : 'pointer',
                                textTransform: 'uppercase',
                            }}
                        >
                            {randomRefreshing ? 'Loading...' : '↻ New Rivalry'}
                        </button>
                    </div>

                    {randomLoading ? (
                        <div style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-condensed)', padding: '1rem 0' }}>
                            Loading...
                        </div>
                    ) : randomH2H ? (
                        <>
                            {/* Owner matchup header */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr auto 1fr',
                                alignItems: 'center',
                                gap: '1rem',
                                marginBottom: '1.25rem',
                            }}>
                                <div>
                                    <div style={{
                                        fontFamily: 'var(--font-display)',
                                        fontSize: '1.5rem',
                                        letterSpacing: '0.04em',
                                        color: randomH2H.summary.team_a_wins > randomH2H.summary.team_b_wins
                                            ? 'var(--color-win)' : 'var(--color-text)',
                                    }}>
                                        {randomH2H.team_a.owner.toUpperCase()}
                                    </div>
                                    <div style={{
                                        fontFamily: 'var(--font-display)',
                                        fontSize: '2.5rem',
                                        lineHeight: 1,
                                        color: randomH2H.summary.team_a_wins > randomH2H.summary.team_b_wins
                                            ? 'var(--color-win)' : 'var(--color-text)',
                                    }}>
                                        {randomH2H.summary.team_a_wins}
                                    </div>
                                </div>

                                <div style={{ textAlign: 'center' }}>
                                    <div style={{
                                        fontFamily: 'var(--font-display)',
                                        fontSize: '1rem',
                                        color: 'var(--color-text-muted)',
                                        letterSpacing: '0.05em',
                                    }}>
                                        {randomH2H.summary.total_games} GAMES
                                    </div>
                                    {randomH2H.summary.ties > 0 && (
                                        <div style={{
                                            fontFamily: 'var(--font-condensed)',
                                            fontSize: '0.75rem',
                                            color: 'var(--color-text-muted)',
                                        }}>
                                            {randomH2H.summary.ties} tie{randomH2H.summary.ties !== 1 ? 's' : ''}
                                        </div>
                                    )}
                                    {randomH2H.summary.playoff_games > 0 && (
                                        <div style={{ marginTop: '0.4rem' }}>
                                            <span className="badge badge-champion">
                                                {randomH2H.summary.playoff_games} playoff{randomH2H.summary.playoff_games !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div style={{ textAlign: 'right' }}>
                                    <div style={{
                                        fontFamily: 'var(--font-display)',
                                        fontSize: '1.5rem',
                                        letterSpacing: '0.04em',
                                        color: randomH2H.summary.team_b_wins > randomH2H.summary.team_a_wins
                                            ? 'var(--color-win)' : 'var(--color-text)',
                                    }}>
                                        {randomH2H.team_b.owner.toUpperCase()}
                                    </div>
                                    <div style={{
                                        fontFamily: 'var(--font-display)',
                                        fontSize: '2.5rem',
                                        lineHeight: 1,
                                        color: randomH2H.summary.team_b_wins > randomH2H.summary.team_a_wins
                                            ? 'var(--color-win)' : 'var(--color-text)',
                                        textAlign: 'right',
                                    }}>
                                        {randomH2H.summary.team_b_wins}
                                    </div>
                                </div>
                            </div>

                            {/* Avg scores */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontFamily: 'var(--font-condensed)',
                                fontSize: '0.8rem',
                                color: 'var(--color-text-muted)',
                                marginBottom: '1.25rem',
                                paddingBottom: '1rem',
                                borderBottom: '1px solid var(--color-border)',
                            }}>
                                <span>
                                    Avg: <span style={{ color: 'var(--color-text)' }}>
                                        {randomH2H.summary.team_a_avg.toFixed(1)}
                                    </span>
                                </span>
                                <span style={{ color: 'var(--color-text-muted)' }}>pts per game</span>
                                <span>
                                    Avg: <span style={{ color: 'var(--color-text)' }}>
                                        {randomH2H.summary.team_b_avg.toFixed(1)}
                                    </span>
                                </span>
                            </div>

                            {/* Highlights */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {/* Biggest blowout */}
                                <div style={{
                                    background: 'var(--color-surface-2)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: 'var(--radius)',
                                    padding: '0.6rem 0.85rem',
                                    fontFamily: 'var(--font-condensed)',
                                    fontSize: '0.82rem',
                                }}>
                                    <span style={{ color: 'var(--color-text-muted)', textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.08em' }}>
                                        Biggest Blowout
                                    </span>
                                    <div style={{ marginTop: '0.2rem', color: 'var(--color-text)' }}>
                                        <span style={{ color: 'var(--color-win)', fontWeight: 700 }}>
                                            {randomH2H.highlights.biggest_margin.winner}
                                        </span>
                                        {' '}won by{' '}
                                        <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>
                                            {randomH2H.highlights.biggest_margin.margin.toFixed(1)} pts
                                        </span>
                                        {' '}· {randomH2H.highlights.biggest_margin.winner_score.toFixed(1)}–{randomH2H.highlights.biggest_margin.loser_score.toFixed(1)}
                                        {' '}· {randomH2H.highlights.biggest_margin.season} W{randomH2H.highlights.biggest_margin.week}
                                        {randomH2H.highlights.biggest_margin.is_playoffs && (
                                            <span className="badge badge-champion" style={{ marginLeft: '0.4rem' }}>Playoffs</span>
                                        )}
                                    </div>
                                </div>

                                {/* Closest game */}
                                <div style={{
                                    background: 'var(--color-surface-2)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: 'var(--radius)',
                                    padding: '0.6rem 0.85rem',
                                    fontFamily: 'var(--font-condensed)',
                                    fontSize: '0.82rem',
                                }}>
                                    <span style={{ color: 'var(--color-text-muted)', textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.08em' }}>
                                        Closest Game
                                    </span>
                                    <div style={{ marginTop: '0.2rem', color: 'var(--color-text)' }}>
                                        <span style={{ color: 'var(--color-win)', fontWeight: 700 }}>
                                            {randomH2H.highlights.closest_game.winner}
                                        </span>
                                        {' '}won by{' '}
                                        <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>
                                            {randomH2H.highlights.closest_game.margin.toFixed(1)} pts
                                        </span>
                                        {' '}· {randomH2H.highlights.closest_game.winner_score.toFixed(1)}–{randomH2H.highlights.closest_game.loser_score.toFixed(1)}
                                        {' '}· {randomH2H.highlights.closest_game.season} W{randomH2H.highlights.closest_game.week}
                                        {randomH2H.highlights.closest_game.is_playoffs && (
                                            <span className="badge badge-champion" style={{ marginLeft: '0.4rem' }}>Playoffs</span>
                                        )}
                                    </div>
                                </div>

                                {/* Best games */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '0.5rem',
                                }}>
                                    {[
                                        { label: randomH2H.team_a.owner, data: randomH2H.highlights.team_a_best },
                                        { label: randomH2H.team_b.owner, data: randomH2H.highlights.team_b_best },
                                    ].map(({ label, data }) => (
                                        <div key={label} style={{
                                            background: 'var(--color-surface-2)',
                                            border: '1px solid var(--color-border)',
                                            borderRadius: 'var(--radius)',
                                            padding: '0.6rem 0.85rem',
                                            fontFamily: 'var(--font-condensed)',
                                            fontSize: '0.82rem',
                                        }}>
                                            <span style={{ color: 'var(--color-text-muted)', textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.08em' }}>
                                                {label}'s Best
                                            </span>
                                            <div style={{ marginTop: '0.2rem' }}>
                                                <span style={{ color: 'var(--color-win)', fontWeight: 700 }}>
                                                    {data.score.toFixed(1)} pts
                                                </span>
                                                <span style={{ color: 'var(--color-text-muted)' }}>
                                                    {' '}· {data.season} W{data.week}
                                                </span>
                                                {data.is_playoffs && (
                                                    <span className="badge badge-champion" style={{ marginLeft: '0.4rem' }}>Playoffs</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Load full matchup CTA */}
                            <button
                                onClick={() => {
                                    setSelectA(String(randomH2H.team_a.team_id))
                                    setSelectB(String(randomH2H.team_b.team_id))
                                    navigate(`/h2h/${randomH2H.team_a.team_id}/${randomH2H.team_b.team_id}`)
                                }}
                                style={{
                                    marginTop: '1rem',
                                    width: '100%',
                                    background: 'none',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: 'var(--radius)',
                                    color: 'var(--color-text-muted)',
                                    fontFamily: 'var(--font-condensed)',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    letterSpacing: '0.08em',
                                    padding: '0.5rem',
                                    cursor: 'pointer',
                                    textTransform: 'uppercase',
                                    transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.borderColor = 'var(--color-accent)'
                                    e.currentTarget.style.color = 'var(--color-accent)'
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.borderColor = 'var(--color-border)'
                                    e.currentTarget.style.color = 'var(--color-text-muted)'
                                }}
                            >
                                View Full Matchup History →
                            </button>
                        </>
                    ) : null}
                </div>
            )}

            {loading && <div className="loading">Loading...</div>}

            {h2h && !loading && (
                <>
                    {/* Summary banner */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr auto 1fr',
                        gap: '1rem',
                        marginBottom: '1.5rem',
                        alignItems: 'center',
                    }}>
                        {/* Team A */}
                        <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
                            <div style={{
                                fontFamily: 'var(--font-display)',
                                fontSize: '1.3rem',
                                letterSpacing: '0.05em',
                                color: 'var(--color-text-muted)',
                                marginBottom: '0.5rem',
                            }}>
                                {teamA?.owner?.toUpperCase()}
                            </div>
                            <div style={{
                                fontFamily: 'var(--font-display)',
                                fontSize: '4rem',
                                lineHeight: 1,
                                color: aWins > bWins ? 'var(--color-win)' : aWins < bWins ? 'var(--color-loss)' : 'var(--color-text)',
                            }}>
                                {aWins}
                            </div>
                            <div style={{
                                fontFamily: 'var(--font-condensed)',
                                fontSize: '0.75rem',
                                color: 'var(--color-text-muted)',
                                letterSpacing: '0.1em',
                                marginTop: '0.25rem',
                            }}>
                                WINS
                            </div>
                        </div>

                        {/* Center stats */}
                        <div style={{ textAlign: 'center', minWidth: '120px' }}>
                            <div style={{
                                fontFamily: 'var(--font-display)',
                                fontSize: '1.2rem',
                                color: 'var(--color-text-muted)',
                                marginBottom: '0.5rem',
                            }}>
                                {games.length} GAMES
                            </div>
                            {ties > 0 && (
                                <div style={{
                                    fontFamily: 'var(--font-condensed)',
                                    fontSize: '0.8rem',
                                    color: 'var(--color-text-muted)',
                                }}>
                                    {ties} tie{ties !== 1 ? 's' : ''}
                                </div>
                            )}
                            {/* Filter buttons */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '1rem' }}>
                                {['all', 'regular', 'playoffs'].map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setFilter(f)}
                                        style={{
                                            background: filter === f ? 'var(--color-accent)' : 'var(--color-surface-2)',
                                            border: '1px solid var(--color-border)',
                                            borderRadius: 'var(--radius)',
                                            color: filter === f ? '#fff' : 'var(--color-text-muted)',
                                            fontFamily: 'var(--font-condensed)',
                                            fontSize: '0.72rem',
                                            fontWeight: 700,
                                            letterSpacing: '0.08em',
                                            padding: '0.3rem 0.6rem',
                                            cursor: 'pointer',
                                            textTransform: 'uppercase',
                                        }}
                                    >
                                        {f === 'all' ? 'All Games' : f === 'regular' ? 'Reg Season' : 'Playoffs'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Team B */}
                        <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
                            <div style={{
                                fontFamily: 'var(--font-display)',
                                fontSize: '1.3rem',
                                letterSpacing: '0.05em',
                                color: 'var(--color-text-muted)',
                                marginBottom: '0.5rem',
                            }}>
                                {teamB?.owner?.toUpperCase()}
                            </div>
                            <div style={{
                                fontFamily: 'var(--font-display)',
                                fontSize: '4rem',
                                lineHeight: 1,
                                color: bWins > aWins ? 'var(--color-win)' : bWins < aWins ? 'var(--color-loss)' : 'var(--color-text)',
                            }}>
                                {bWins}
                            </div>
                            <div style={{
                                fontFamily: 'var(--font-condensed)',
                                fontSize: '0.75rem',
                                color: 'var(--color-text-muted)',
                                letterSpacing: '0.1em',
                                marginTop: '0.25rem',
                            }}>
                                WINS
                            </div>
                        </div>
                    </div>

                    {/* Game log */}
                    <div className="card">
                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Season</th>
                                        <th>Week</th>
                                        <th style={{ textAlign: 'right' }}>{teamA?.owner}</th>
                                        <th style={{ textAlign: 'center' }}>vs</th>
                                        <th>{teamB?.owner}</th>
                                        <th>Margin</th>
                                        <th>Type</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {games.map((g, i) => {
                                        const aWon   = g.winner === 'A'
                                        const bWon   = g.winner === 'B'
                                        const key    = `${g.season}-${g.week}`
                                        const isOpen = expandedGame === key
                                        const hasBox = g.season >= 2018
                                        const cached = boxScoreCache[key]

                                        return (
                                            <>
                                                <tr
                                                    key={i}
                                                    onClick={() => handleGameClick(g)}
                                                    style={{
                                                        cursor: hasBox ? 'pointer' : 'default',
                                                        background: isOpen ? 'var(--color-surface-2)' : undefined,
                                                    }}
                                                    onMouseEnter={e => { if (hasBox) e.currentTarget.style.background = 'var(--color-surface-2)' }}
                                                    onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = '' }}
                                                >
                                                    <td>{g.season}</td>
                                                    <td style={{ color: 'var(--color-text-muted)' }}>W{g.week}</td>
                                                    <td style={{
                                                        textAlign: 'right',
                                                        fontWeight: aWon ? 700 : 400,
                                                        color: aWon ? 'var(--color-win)' : bWon ? 'var(--color-loss)' : 'var(--color-text)',
                                                    }}>
                                                        {fmt(g.team_a_score)}
                                                    </td>
                                                    <td style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8em' }}>—</td>
                                                    <td style={{
                                                        fontWeight: bWon ? 700 : 400,
                                                        color: bWon ? 'var(--color-win)' : aWon ? 'var(--color-loss)' : 'var(--color-text)',
                                                    }}>
                                                        {fmt(g.team_b_score)}
                                                    </td>
                                                    <td style={{ color: 'var(--color-text-muted)', fontSize: '0.85em' }}>
                                                        {fmt(g.margin)}
                                                    </td>
                                                    <td>
                                                        {g.is_playoffs
                                                            ? <span className="badge badge-champion">Playoffs</span>
                                                            : <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8em' }}>Reg</span>}
                                                    </td>
                                                    <td style={{ color: 'var(--color-text-muted)', fontSize: '0.75em' }}>
                                                        {hasBox ? (isOpen ? '▲' : '▼') : ''}
                                                    </td>
                                                </tr>

                                                {/* Expanded box score row */}
                                                {isOpen && (
                                                    <tr key={`${i}-box`}>
                                                        <td colSpan={8} style={{ padding: 0, background: 'var(--color-bg)' }}>
                                                            {boxScoreLoading && !cached ? (
                                                                <div style={{
                                                                    padding: '1rem',
                                                                    fontFamily: 'var(--font-condensed)',
                                                                    color: 'var(--color-text-muted)',
                                                                    fontSize: '0.85rem',
                                                                }}>
                                                                    Loading box score...
                                                                </div>
                                                            ) : cached ? (
                                                                <div style={{
                                                                    display: 'grid',
                                                                    gridTemplateColumns: '1fr 1fr',
                                                                    gap: '1px',
                                                                    background: 'var(--color-border)',
                                                                }}>
                                                                    {cached.teams.map(team => (
                                                                        <div key={team.owner} style={{
                                                                            background: 'var(--color-bg)',
                                                                            padding: '0.75rem 1rem',
                                                                        }}>
                                                                            <div style={{
                                                                                fontFamily: 'var(--font-condensed)',
                                                                                fontWeight: 700,
                                                                                letterSpacing: '0.06em',
                                                                                textTransform: 'uppercase',
                                                                                fontSize: '0.78rem',
                                                                                color: 'var(--color-accent)',
                                                                                marginBottom: '0.5rem',
                                                                            }}>
                                                                                {team.owner}
                                                                            </div>
                                                                            <table style={{ width: '100%', fontSize: '0.78rem' }}>
                                                                                <thead>
                                                                                    <tr>
                                                                                        <th style={{
                                                                                            textAlign: 'left',
                                                                                            padding: '0.2rem 0.4rem',
                                                                                            color: 'var(--color-text-muted)',
                                                                                            fontFamily: 'var(--font-condensed)',
                                                                                            fontWeight: 600,
                                                                                            fontSize: '0.68rem',
                                                                                            letterSpacing: '0.08em',
                                                                                            textTransform: 'uppercase',
                                                                                            borderBottom: '1px solid var(--color-border)',
                                                                                        }}>Player</th>
                                                                                        <th style={{
                                                                                            textAlign: 'left',
                                                                                            padding: '0.2rem 0.4rem',
                                                                                            color: 'var(--color-text-muted)',
                                                                                            fontFamily: 'var(--font-condensed)',
                                                                                            fontWeight: 600,
                                                                                            fontSize: '0.68rem',
                                                                                            letterSpacing: '0.08em',
                                                                                            textTransform: 'uppercase',
                                                                                            borderBottom: '1px solid var(--color-border)',
                                                                                        }}>Pos</th>
                                                                                        <th style={{
                                                                                            textAlign: 'right',
                                                                                            padding: '0.2rem 0.4rem',
                                                                                            color: 'var(--color-text-muted)',
                                                                                            fontFamily: 'var(--font-condensed)',
                                                                                            fontWeight: 600,
                                                                                            fontSize: '0.68rem',
                                                                                            letterSpacing: '0.08em',
                                                                                            textTransform: 'uppercase',
                                                                                            borderBottom: '1px solid var(--color-border)',
                                                                                        }}>Pts</th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody>
                                                                                    {team.players
                                                                                        .sort((a, b) => b.points_scored - a.points_scored)
                                                                                        .map((p, pi) => (
                                                                                            <tr key={pi} style={{
                                                                                                opacity: p.is_starter ? 1 : 0.5,
                                                                                            }}>
                                                                                                <td style={{
                                                                                                    padding: '0.2rem 0.4rem',
                                                                                                    color: 'var(--color-text)',
                                                                                                    fontWeight: p.is_starter ? 600 : 400,
                                                                                                }}>
                                                                                                    {p.player_name}
                                                                                                </td>
                                                                                                <td style={{
                                                                                                    padding: '0.2rem 0.4rem',
                                                                                                    color: 'var(--color-text-muted)',
                                                                                                    fontSize: '0.72rem',
                                                                                                }}>
                                                                                                    {p.position}
                                                                                                </td>
                                                                                                <td style={{
                                                                                                    padding: '0.2rem 0.4rem',
                                                                                                    textAlign: 'right',
                                                                                                    color: p.points_scored >= 20
                                                                                                        ? 'var(--color-win)'
                                                                                                        : p.points_scored <= 5
                                                                                                        ? 'var(--color-loss)'
                                                                                                        : 'var(--color-text)',
                                                                                                    fontWeight: p.is_starter ? 600 : 400,
                                                                                                }}>
                                                                                                    {Number(p.points_scored).toFixed(1)}
                                                                                                </td>
                                                                                            </tr>
                                                                                        ))}
                                                                                </tbody>
                                                                            </table>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div style={{
                                                                    padding: '0.75rem 1rem',
                                                                    fontFamily: 'var(--font-condensed)',
                                                                    color: 'var(--color-text-muted)',
                                                                    fontSize: '0.82rem',
                                                                }}>
                                                                    Box score data not available for this week.
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                )}
                                            </>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </main>
    )
}
