import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getDraftSeasons, getDraft, getDraftByTeam, getKeepers, searchPlayer } from '../api/draft'

const POS_COLORS = {
    QB:    'var(--color-accent)',
    RB:    'var(--color-win)',
    WR:    '#4a7bc9',
    TE:    '#9b6f4a',
    K:     '#7b7b9b',
    'D/ST':'#6f9b9b',
    UNK:   'var(--color-text-muted)',
}

function PosBadge({ position }) {
    return (
        <span style={{
            display: 'inline-block',
            fontFamily: 'var(--font-condensed)',
            fontSize: '0.65rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            padding: '0.1rem 0.35rem',
            borderRadius: '3px',
            background: `${POS_COLORS[position] || POS_COLORS.UNK}22`,
            color: POS_COLORS[position] || POS_COLORS.UNK,
            border: `1px solid ${POS_COLORS[position] || POS_COLORS.UNK}44`,
            marginRight: '0.4rem',
            verticalAlign: 'middle',
        }}>
            {position || '?'}
        </span>
    )
}

// ── Round-by-round board ──────────────────────────────────────────────────────

function DraftBoard({ data }) {
    const rounds = data.rounds
    const owners = [...new Set(
        rounds[0]?.picks.map(p => p.owner) || []
    )]

    const pickMap = {}
    rounds.forEach(r => {
        pickMap[r.round] = {}
        r.picks.forEach(p => {
            pickMap[r.round][p.pick_in_round] = p
        })
    })

    const numTeams = owners.length

    return (
        <div className="card">
            <div className="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th style={{ width: '50px' }}>Rd</th>
                            {Array.from({ length: numTeams }, (_, i) => (
                                <th key={i} style={{ minWidth: '130px' }}>Pick {i + 1}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rounds.map(r => (
                            <tr key={r.round}>
                                <td style={{
                                    fontFamily: 'var(--font-display)',
                                    fontSize: '1.1rem',
                                    color: 'var(--color-accent)',
                                    textAlign: 'center',
                                }}>
                                    {r.round}
                                </td>
                                {Array.from({ length: numTeams }, (_, i) => {
                                    const pick = pickMap[r.round]?.[i + 1]
                                    if (!pick) return <td key={i} style={{ color: 'var(--color-text-muted)' }}>—</td>
                                    return (
                                        <td key={i} style={{ verticalAlign: 'top', padding: '0.5rem 0.75rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.2rem' }}>
                                                <PosBadge position={pick.position} />
                                                {pick.is_keeper && (
                                                    <span style={{
                                                        fontSize: '0.6rem',
                                                        color: 'var(--color-champion)',
                                                        fontFamily: 'var(--font-condensed)',
                                                        letterSpacing: '0.06em',
                                                    }}>K</span>
                                                )}
                                            </div>
                                            <div style={{
                                                fontSize: '0.82rem',
                                                fontWeight: 600,
                                                color: 'var(--color-text)',
                                                lineHeight: 1.2,
                                            }}>
                                                {pick.player_name || '—'}
                                            </div>
                                            <div style={{
                                                fontSize: '0.72rem',
                                                color: 'var(--color-text-muted)',
                                                marginTop: '0.15rem',
                                            }}>
                                                {pick.owner}
                                            </div>
                                        </td>
                                    )
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

// ── By-team view ──────────────────────────────────────────────────────────────

function DraftByTeam({ data }) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {data.teams.map(team => (
                <div key={team.owner} className="card" style={{ padding: '1rem' }}>
                    <h3 style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '1.1rem',
                        letterSpacing: '0.05em',
                        color: 'var(--color-accent)',
                        marginBottom: '0.75rem',
                    }}>
                        {team.owner.toUpperCase()}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        {team.picks.map(pick => (
                            <div key={pick.overall_pick} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.25rem 0',
                                borderBottom: '1px solid var(--color-border)',
                            }}>
                                <span style={{
                                    fontFamily: 'var(--font-condensed)',
                                    fontSize: '0.75rem',
                                    color: 'var(--color-text-muted)',
                                    width: '60px',
                                    flexShrink: 0,
                                }}>
                                    R{pick.round_num}.{String(pick.pick_in_round).padStart(2, '0')}
                                </span>
                                <PosBadge position={pick.position} />
                                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                                    {pick.player_name || '—'}
                                </span>
                                {pick.is_keeper && (
                                    <span className="badge badge-champion" style={{ marginLeft: 'auto' }}>K</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}

// ── Player search ─────────────────────────────────────────────────────────────

function PlayerSearch() {
    const [query,     setQuery]     = useState('')
    const [results,   setResults]   = useState(null)
    const [searching, setSearching] = useState(false)

    const handleSearch = async (e) => {
        e.preventDefault()
        if (!query.trim()) return
        setSearching(true)
        try {
            const data = await searchPlayer(query.trim())
            setResults(data)
        } finally {
            setSearching(false)
        }
    }

    return (
        <div className="card">
            <h2 className="card-title">Player Draft History</h2>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search player name..."
                    style={{
                        flex: 1,
                        background: 'var(--color-surface-2)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius)',
                        color: 'var(--color-text)',
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.9rem',
                        padding: '0.5rem 0.75rem',
                        outline: 'none',
                    }}
                />
                <button
                    type="submit"
                    disabled={searching}
                    style={{
                        background: 'var(--color-accent)',
                        border: 'none',
                        borderRadius: 'var(--radius)',
                        color: '#fff',
                        fontFamily: 'var(--font-condensed)',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        padding: '0.5rem 1.25rem',
                        cursor: searching ? 'wait' : 'pointer',
                        textTransform: 'uppercase',
                    }}
                >
                    {searching ? 'Searching...' : 'Search'}
                </button>
            </form>

            {results && (
                results.times_drafted === 0 ? (
                    <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-condensed)' }}>
                        No results for "{results.query}"
                    </p>
                ) : (
                    <>
                        <p style={{
                            fontFamily: 'var(--font-condensed)',
                            color: 'var(--color-text-muted)',
                            fontSize: '0.85rem',
                            marginBottom: '1rem',
                        }}>
                            "{results.query}" — drafted {results.times_drafted} time{results.times_drafted !== 1 ? 's' : ''}
                        </p>
                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Season</th>
                                        <th>Player</th>
                                        <th>Pos</th>
                                        <th>Pick</th>
                                        <th>Round</th>
                                        <th>Owner</th>
                                        <th>Keeper</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {results.results.map((r, i) => (
                                        <tr key={i}>
                                            <td>{r.season}</td>
                                            <td style={{ fontWeight: 600 }}>{r.player_name}</td>
                                            <td><PosBadge position={r.position} /></td>
                                            <td style={{ color: 'var(--color-text-muted)' }}>#{r.overall_pick}</td>
                                            <td style={{ color: 'var(--color-text-muted)' }}>R{r.round_num}.{String(r.pick_in_round).padStart(2, '0')}</td>
                                            <td style={{ fontWeight: 600 }}>{r.owner}</td>
                                            <td>{r.is_keeper ? <span className="badge badge-champion">Keeper</span> : '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )
            )}
        </div>
    )
}

// ── Main export ───────────────────────────────────────────────────────────────

const TABS = ['board', 'byteam', 'search']
const TAB_LABELS = { board: 'Draft Board', byteam: 'By Team', search: 'Player Search' }

export default function Draft() {
    const { year } = useParams()
    const navigate  = useNavigate()

    const [seasons,      setSeasons]      = useState([])
    const [selectedYear, setSelectedYear] = useState(year || null)
    const [tab,          setTab]          = useState('board')
    const [boardData,    setBoardData]    = useState(null)
    const [teamData,     setTeamData]     = useState(null)
    const [loading,      setLoading]      = useState(true)

    // Load season list
    useEffect(() => {
        getDraftSeasons().then(data => {
            setSeasons(data)
            if (!selectedYear && data.length > 0) {
                const latest = String(data[0].season)
                setSelectedYear(latest)
                navigate(`/draft/${latest}`, { replace: true })
            }
        })
    }, [])

    // Load draft data when year or tab changes
    useEffect(() => {
        if (!selectedYear) return
        setLoading(true)

        if (tab === 'board') {
            getDraft(selectedYear)
                .then(setBoardData)
                .finally(() => setLoading(false))
        } else if (tab === 'byteam') {
            getDraftByTeam(selectedYear)
                .then(setTeamData)
                .finally(() => setLoading(false))
        } else {
            setLoading(false)
        }
    }, [selectedYear, tab])

    const handleYearChange = (e) => {
        const y = e.target.value
        setSelectedYear(y)
        setBoardData(null)
        setTeamData(null)
        navigate(`/draft/${y}`)
    }

    return (
        <main className="page">
            <div className="page-header" style={{ display: 'flex', alignItems: 'flex-end', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div>
                    <h1 className="page-title">Draft History</h1>
                    <p className="page-subtitle">Round-by-round picks, team breakdowns, and player search</p>
                </div>
                <select
                    value={selectedYear || ''}
                    onChange={handleYearChange}
                    style={{
                        background: 'var(--color-surface-2)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text)',
                        padding: '0.4rem 0.75rem',
                        borderRadius: 'var(--radius)',
                        fontFamily: 'var(--font-condensed)',
                        fontSize: '1rem',
                        marginBottom: '0.25rem',
                        cursor: 'pointer',
                    }}
                >
                    {seasons.map(s => (
                        <option key={s.season} value={String(s.season)}>
                            {String(s.season)}
                        </option>
                    ))}
                </select>
            </div>

            {/* Tab nav */}
            <div className="tab-nav" style={{ marginBottom: '1.5rem' }}>
                {TABS.map(t => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`tab-btn${tab === t ? ' active' : ''}`}
                    >
                        {TAB_LABELS[t]}
                    </button>
                ))}
            </div>

            {tab === 'search' ? (
                <PlayerSearch />
            ) : loading ? (
                <div className="loading">Loading...</div>
            ) : (
                <>
                    {tab === 'board'  && boardData && <DraftBoard data={boardData} />}
                    {tab === 'byteam' && teamData  && <DraftByTeam data={teamData} />}
                </>
            )}
        </main>
    )
}
