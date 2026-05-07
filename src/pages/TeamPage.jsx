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
    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">TEAM PAGES</h1>
                <p className="page-subtitle">Select an owner to view their full history</p>
            </div>

            <div className="card">
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Owner</th>
                                <th>Seasons</th>
                                <th>W</th>
                                <th>L</th>
                                <th>Win%</th>
                                <th>PF</th>
                                <th>Titles</th>
                                <th>Sackos</th>
                                <th>First</th>
                                <th>Last</th>
                            </tr>
                        </thead>
                        <tbody>
                            {teams.map(t => (
                                <tr
                                    key={t.team_id}
                                    onClick={() => onSelect(t.team_id)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <td style={{ fontWeight: 600 }}>
                                        {t.owner}
                                        {t.championships > 0 && (
                                            <span className="badge badge-champion" style={{ marginLeft: '0.5rem' }}>
                                                {'🏆'.repeat(Math.min(t.championships, 3))}
                                            </span>
                                        )}
                                    </td>
                                    <td>{t.seasons_played}</td>
                                    <td style={{ color: 'var(--color-win)' }}>{t.total_wins}</td>
                                    <td style={{ color: 'var(--color-loss)' }}>{t.total_losses}</td>
                                    <td>
                                        <WinPct wins={t.total_wins} losses={t.total_losses} />
                                    </td>
                                    <td>{t.total_points_for.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
                                    <td>{t.championships || '—'}</td>
                                    <td>{t.sackos || '—'}</td>
                                    <td style={{ color: 'var(--color-text-muted)' }}>{t.first_season}</td>
                                    <td style={{ color: 'var(--color-text-muted)' }}>{t.last_season}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
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
