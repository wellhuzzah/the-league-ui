import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchAllTeams, fetchTeam } from '../api/teams'
import { getTeamBestWeeks, getTeamPositionTotals } from '../api/boxscores'

// ── Helpers ──────────────────────────────────────────────────────────────────

function WinPct({ wins, losses }) {
    const pct = wins + losses > 0
        ? (wins / (wins + losses)).toFixed(3).replace(/^0/, '')
        : '.000'
    return <span>{pct}</span>
}

function StatBox({ label, value, accent }) {
    return (
        <div className="stat-box" style={accent ? { borderColor: 'var(--color-accent)' } : {}}>
            <div className="stat-box-value" style={accent ? { color: 'var(--color-accent)' } : {}}>
                {value}
            </div>
            <div className="stat-box-label">{label}</div>
        </div>
    )
}

// ── Team list view ────────────────────────────────────────────────────────────

function TeamList({ teams, onSelect }) {
    const [sortKey, setSortKey] = useState('win_pct')
    const [sortDir, setSortDir] = useState('desc')

    const handleSort = (key) => {
        setSortDir(prev => key === sortKey ? (prev === 'desc' ? 'asc' : 'desc') : 'desc')
        setSortKey(key)
    }

    const sorted = [...teams].sort((a, b) => {
        const av = a[sortKey], bv = b[sortKey]
        if (av === null || av === undefined) return 1
        if (bv === null || bv === undefined) return -1
        const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv
        return sortDir === 'asc' ? cmp : -cmp
    })

    // Compute league-wide superlatives for signature stats
    const maxWins   = Math.max(...teams.map(t => t.total_wins))
    const maxPF     = Math.max(...teams.map(t => t.total_points_for))
    const maxTitles = Math.max(...teams.map(t => t.championships))
    const maxSackos = Math.max(...teams.map(t => t.sackos))

    const getSignature = (t) => {
        if (t.championships === maxTitles && maxTitles > 0)
            return { label: 'Most Championships', value: `${t.championships}x Champ`, color: 'var(--color-champion)' }
        if (t.total_wins === maxWins)
            return { label: 'All-Time Wins Leader', value: `${t.total_wins} wins`, color: 'var(--color-win)' }
        if (t.total_points_for === maxPF)
            return { label: 'All-Time Points Leader', value: `${t.total_points_for.toFixed(1)} pts`, color: 'var(--color-accent)' }
        if (t.sackos === maxSackos && maxSackos > 0)
            return { label: 'Most Sackos', value: `${t.sackos}x Sacko`, color: 'var(--color-loss)' }
        if (t.win_pct >= 0.55)
            return { label: 'Win Rate', value: `${(t.win_pct * 100).toFixed(1)}%`, color: 'var(--color-win)' }
        if (t.seasons_played <= 2)
            return { label: 'League Veteran', value: `${t.seasons_played} season${t.seasons_played !== 1 ? 's' : ''}`, color: 'var(--color-text-muted)' }
        return { label: 'Points For', value: `${t.total_points_for.toFixed(1)} pts`, color: 'var(--color-accent)' }
    }

    const SORT_OPTIONS = [
        { key: 'total_wins',       label: 'Wins' },
        { key: 'win_pct',          label: 'Win %' },
        { key: 'total_points_for', label: 'Points' },
        { key: 'championships',    label: 'Titles' },
        { key: 'seasons_played',   label: 'Seasons' },
        { key: 'owner',            label: 'Name' },
    ]

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">TEAMS</h1>
                <p className="page-subtitle">17 owners · 2009–2025</p>
            </div>

            {/* Sort controls */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1.5rem',
                flexWrap: 'wrap',
            }}>
                <span style={{
                    fontFamily: 'var(--font-condensed)',
                    fontSize: '0.75rem',
                    color: 'var(--color-text-muted)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    marginRight: '0.25rem',
                }}>
                    Sort by
                </span>
                {SORT_OPTIONS.map(opt => (
                    <button
                        key={opt.key}
                        onClick={() => handleSort(opt.key)}
                        style={{
                            background: sortKey === opt.key ? 'var(--color-accent)' : 'var(--color-surface-2)',
                            border: `1px solid ${sortKey === opt.key ? 'var(--color-accent)' : 'var(--color-border)'}`,
                            borderRadius: 'var(--radius)',
                            color: sortKey === opt.key ? '#fff' : 'var(--color-text-muted)',
                            fontFamily: 'var(--font-condensed)',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            letterSpacing: '0.07em',
                            padding: '0.3rem 0.7rem',
                            cursor: 'pointer',
                            textTransform: 'uppercase',
                            transition: 'all 0.12s',
                        }}
                    >
                        {opt.label}
                        {sortKey === opt.key && (
                            <span style={{ marginLeft: '0.3rem', fontSize: '0.7em' }}>
                                {sortDir === 'asc' ? '▲' : '▼'}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Owner card grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '1rem',
            }}>
                {sorted.map(t => {
                    const sig = getSignature(t)
                    const winPct = t.total_wins + t.total_losses > 0
                        ? (t.total_wins / (t.total_wins + t.total_losses) * 100).toFixed(1)
                        : '0.0'

                    return (
                        <div
                            key={t.team_id}
                            onClick={() => onSelect(t.team_id)}
                            className="card"
                            style={{ cursor: 'pointer', transition: 'border-color 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-accent)'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                        >
                            {/* Owner name + badges */}
                            <div style={{ marginBottom: '0.75rem', paddingRight: '1rem' }}>
                                <div style={{
                                    fontFamily: 'var(--font-display)',
                                    fontSize: '1.4rem',
                                    letterSpacing: '0.04em',
                                    color: 'var(--color-text)',
                                    lineHeight: 1.1,
                                    marginBottom: '0.35rem',
                                }}>
                                    {t.owner.toUpperCase()}
                                </div>
                                <div style={{
                                    fontFamily: 'var(--font-condensed)',
                                    fontSize: '0.75rem',
                                    color: 'var(--color-text-muted)',
                                    letterSpacing: '0.05em',
                                }}>
                                    {t.seasons_played} season{t.seasons_played !== 1 ? 's' : ''}
                                    {t.first_season && ` · ${t.first_season}–${t.last_season}`}
                                </div>
                            </div>

                            {/* Win/loss bar */}
                            <div style={{ marginBottom: '0.75rem' }}>
                                <div style={{
                                    display: 'flex',
                                    height: '6px',
                                    borderRadius: '3px',
                                    overflow: 'hidden',
                                    gap: '1px',
                                    marginBottom: '0.35rem',
                                }}>
                                    <div style={{
                                        width: `${winPct}%`,
                                        background: 'var(--color-win)',
                                        borderRadius: '3px 0 0 3px',
                                    }} />
                                    <div style={{
                                        flex: 1,
                                        background: 'var(--color-loss)',
                                        opacity: 0.4,
                                        borderRadius: '0 3px 3px 0',
                                    }} />
                                </div>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontFamily: 'var(--font-condensed)',
                                    fontSize: '0.78rem',
                                }}>
                                    <span>
                                        <span style={{ color: 'var(--color-win)', fontWeight: 700 }}>{t.total_wins}</span>
                                        <span style={{ color: 'var(--color-text-muted)' }}>–</span>
                                        <span style={{ color: 'var(--color-loss)', fontWeight: 700 }}>{t.total_losses}</span>
                                    </span>
                                    <span style={{ color: 'var(--color-text-muted)' }}>{winPct}%</span>
                                </div>
                            </div>

                            {/* Key stats row */}
                            <div style={{
                                display: 'flex',
                                gap: '1rem',
                                marginBottom: '0.75rem',
                                fontFamily: 'var(--font-condensed)',
                                fontSize: '0.78rem',
                                color: 'var(--color-text-muted)',
                            }}>
                                <span>
                                    <span style={{ color: 'var(--color-text)' }}>
                                        {t.total_points_for.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                    </span>{' '}pts
                                </span>
                                {t.championships > 0 && (
                                    <span>
                                        {'🏆'.repeat(Math.min(t.championships, 4))}
                                        {t.championships > 4 && ` ×${t.championships}`}
                                    </span>
                                )}
                                {t.sackos > 0 && (
                                    <span style={{ color: 'var(--color-loss)' }}>
                                        {t.sackos} sacko{t.sackos !== 1 ? 's' : ''}
                                    </span>
                                )}
                            </div>

                            {/* Signature stat */}
                            <div style={{
                                borderTop: '1px solid var(--color-border)',
                                paddingTop: '0.6rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontFamily: 'var(--font-condensed)',
                                fontSize: '0.72rem',
                                letterSpacing: '0.05em',
                            }}>
                                <span style={{ color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                                    {sig.label}
                                </span>
                                <span style={{ color: sig.color, fontWeight: 700 }}>
                                    {sig.value}
                                </span>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// ── Individual team view ──────────────────────────────────────────────────────

function TeamDetail({ team, onBack }) {
    const [tab, setTab] = useState('seasons')
    const [bestWeeks,      setBestWeeks]      = useState([])
    const [positionTotals, setPositionTotals] = useState([])
    const [bsLoading,      setBsLoading]      = useState(false)
    const [bsLoaded,       setBsLoaded]       = useState(false)

    // Load box score data lazily when tab is first opened
    useEffect(() => {
        if (tab !== 'boxscores' || bsLoaded) return
        setBsLoading(true)
        Promise.all([
            getTeamBestWeeks(team.team_id, 20),
            getTeamPositionTotals(team.team_id),
        ]).then(([bw, pt]) => {
            setBestWeeks(bw)
            setPositionTotals(pt)
            setBsLoaded(true)
        }).finally(() => setBsLoading(false))
    }, [tab, bsLoaded, team.team_id])

    const c = team.career

    const formatPts = (n) =>
        Number(n).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

    return (
        <div className="page">
            {/* Header */}
            <div className="page-header">
                <button
                    onClick={onBack}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-text-muted)',
                        fontFamily: 'var(--font-condensed)',
                        fontSize: '0.85rem',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        marginBottom: '0.75rem',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                    }}
                >
                    ← All Teams
                </button>
                <h1 className="page-title">{team.owner.toUpperCase()}</h1>
                <p className="page-subtitle">
                    {c.seasons_played} seasons &nbsp;·&nbsp;
                    {c.first_season}–{c.last_season} &nbsp;·&nbsp;
                    {c.championships > 0
                        ? `${c.championships} championship${c.championships > 1 ? 's' : ''}`
                        : 'No championships'}
                </p>
            </div>

            {/* Career stat boxes */}
            <div className="stat-boxes" style={{ marginBottom: '2rem' }}>
                <StatBox label="Wins" value={c.total_wins} accent />
                <StatBox label="Losses" value={c.total_losses} />
                <StatBox label="Win %" value={<WinPct wins={c.total_wins} losses={c.total_losses} />} />
                <StatBox label="Points For" value={formatPts(c.total_points_for)} />
                <StatBox label="Avg Score" value={formatPts(c.avg_score)} />
                <StatBox label="Best Week" value={formatPts(c.highest_score)} />
                <StatBox label="Worst Week" value={formatPts(c.lowest_score)} />
                <StatBox label="Avg Finish" value={`#${c.avg_standing}`} />
                <StatBox label="Titles" value={c.championships || '—'} accent={c.championships > 0} />
                <StatBox label="Sackos" value={c.sackos || '—'} />
            </div>

            {/* Tab nav */}
            <div className="tab-nav" style={{ marginBottom: '1.5rem' }}>
                {['seasons', 'h2h', 'boxscores'].map(t => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`tab-btn${tab === t ? ' active' : ''}`}
                    >
                        {t === 'seasons' ? 'Season History' : t === 'h2h' ? 'Head-to-Head' : 'Box Scores'}
                    </button>
                ))}
            </div>

            {/* Season history tab */}
            {tab === 'seasons' && (
                <div className="card">
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Season</th>
                                    <th>W</th>
                                    <th>L</th>
                                    <th>Win%</th>
                                    <th>PF</th>
                                    <th>PA</th>
                                    <th>Finish</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {team.seasons.map(s => (
                                    <tr key={s.season}>
                                        <td style={{ fontWeight: 600 }}>{s.season}</td>
                                        <td style={{ color: 'var(--color-win)' }}>{s.wins}</td>
                                        <td style={{ color: 'var(--color-loss)' }}>{s.losses}</td>
                                        <td><WinPct wins={s.wins} losses={s.losses} /></td>
                                        <td>{formatPts(s.points_for)}</td>
                                        <td style={{ color: 'var(--color-text-muted)' }}>
                                            {formatPts(s.points_against)}
                                        </td>
                                        <td>
                                            #{s.final_standing}
                                            <span style={{
                                                color: 'var(--color-text-muted)',
                                                fontSize: '0.8em',
                                                marginLeft: '0.25rem'
                                            }}>
                                                of {s.teams_in_season}
                                            </span>
                                        </td>
                                        <td>
                                            {s.championship && (
                                                <span className="badge badge-champion">Champ</span>
                                            )}
                                            {s.sacko && (
                                                <span className="badge badge-sacko">Sacko</span>
                                            )}
                                            {s.most_points && (
                                                <span className="badge badge-points">Most Pts</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* H2H tab */}
            {tab === 'h2h' && (
                <div className="card">
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Opponent</th>
                                    <th>W</th>
                                    <th>L</th>
                                    <th>T</th>
                                    <th>Games</th>
                                    <th>Avg For</th>
                                    <th>Avg Against</th>
                                </tr>
                            </thead>
                            <tbody>
                                {team.h2h.map(h => (
                                    <tr key={h.opp_team_id}>
                                        <td style={{ fontWeight: 600 }}>{h.opponent}</td>
                                        <td style={{ color: 'var(--color-win)' }}>{h.wins}</td>
                                        <td style={{ color: 'var(--color-loss)' }}>{h.losses}</td>
                                        <td style={{ color: 'var(--color-text-muted)' }}>
                                            {h.ties || '—'}
                                        </td>
                                        <td>{h.total_games}</td>
                                        <td>{formatPts(h.avg_score_for)}</td>
                                        <td style={{ color: 'var(--color-text-muted)' }}>
                                            {formatPts(h.avg_score_against)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {/* Box Scores tab */}
            {tab === 'boxscores' && (
                bsLoading ? (
                    <div className="loading">Loading...</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                        {/* Best individual performances */}
                        <div className="card">
                            <h2 className="card-title">Top Individual Performances</h2>
                            <p style={{
                                fontFamily: 'var(--font-condensed)',
                                color: 'var(--color-text-muted)',
                                fontSize: '0.85rem',
                                marginBottom: '1rem',
                            }}>
                                Highest single-week scores by any player on this roster · 2018–2025
                            </p>
                            <div className="table-wrap">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Player</th>
                                            <th>Pos</th>
                                            <th>Pts</th>
                                            <th>Season</th>
                                            <th>Week</th>
                                            <th>Opponent</th>
                                            <th>Type</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {bestWeeks.map((row, i) => (
                                            <tr key={i}>
                                                <td style={{ color: 'var(--color-text-muted)' }}>{i + 1}</td>
                                                <td style={{ fontWeight: 600 }}>{row.player_name}</td>
                                                <td>
                                                    <span style={{
                                                        fontFamily: 'var(--font-condensed)',
                                                        fontSize: '0.72rem',
                                                        fontWeight: 700,
                                                        color: 'var(--color-accent)',
                                                    }}>
                                                        {row.position}
                                                    </span>
                                                </td>
                                                <td style={{
                                                    color: 'var(--color-accent)',
                                                    fontWeight: 700,
                                                    fontSize: '1.05em',
                                                }}>
                                                    {Number(row.points_scored).toFixed(1)}
                                                </td>
                                                <td>{row.season}</td>
                                                <td style={{ color: 'var(--color-text-muted)' }}>W{row.week}</td>
                                                <td style={{ color: 'var(--color-text-muted)' }}>{row.opponent}</td>
                                                <td>
                                                    {row.is_playoffs
                                                        ? <span className="badge badge-champion">Playoffs</span>
                                                        : <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8em' }}>Reg</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Position totals by season */}
                        <div className="card">
                            <h2 className="card-title">Points by Position per Season</h2>
                            <p style={{
                                fontFamily: 'var(--font-condensed)',
                                color: 'var(--color-text-muted)',
                                fontSize: '0.85rem',
                                marginBottom: '1rem',
                            }}>
                                Total points scored by each position group · 2018–2025
                            </p>
                            <div className="table-wrap">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Season</th>
                                            <th>QB</th>
                                            <th>RB</th>
                                            <th>WR</th>
                                            <th>TE</th>
                                            <th>K</th>
                                            <th>D/ST</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {positionTotals.map(s => {
                                            const byPos = {}
                                            s.positions.forEach(p => { byPos[p.position] = p.total_points })
                                            return (
                                                <tr key={s.season}>
                                                    <td style={{ fontWeight: 600 }}>{s.season}</td>
                                                    {['QB','RB','WR','TE','K','D/ST'].map(pos => (
                                                        <td key={pos} style={{ color: byPos[pos] ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
                                                            {byPos[pos] ? Number(byPos[pos]).toFixed(1) : '—'}
                                                        </td>
                                                    ))}
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                )
            )}
        </div>
    )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function TeamPage() {
    const { teamId } = useParams()
    const navigate = useNavigate()
    const [teams, setTeams] = useState([])
    const [team, setTeam] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (teamId) {
            setLoading(true)
            fetchTeam(Number(teamId))
                .then(setTeam)
                .finally(() => setLoading(false))
        } else {
            setLoading(true)
            fetchAllTeams()
                .then(setTeams)
                .finally(() => setLoading(false))
        }
    }, [teamId])

    const handleSelect = (id) => navigate(`/teams/${id}`)
    const handleBack   = () => navigate('/teams')

    if (loading) return <div className="loading">Loading...</div>

    return teamId && team
        ? <TeamDetail team={team} onBack={handleBack} />
        : <TeamList teams={teams} onSelect={handleSelect} />
}
