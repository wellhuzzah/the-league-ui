import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchAllTeams } from '../api/teams'
import { getH2H } from '../api/matchups'

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
                                    </tr>
                                </thead>
                                <tbody>
                                    {games.map((g, i) => {
                                        const aWon = g.winner === 'A'
                                        const bWon = g.winner === 'B'
                                        return (
                                            <tr key={i}>
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
                                            </tr>
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
