import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getSeasons, getStandings, getWeeklyScores, getLuck } from '../api/seasons'

const fmt = (n) =>
    Number(n).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

// ── Sort hook ─────────────────────────────────────────────────────────────────

function useSortable(data, defaultKey, defaultDir = 'desc') {
    const [sortKey, setSortKey] = useState(defaultKey)
    const [sortDir, setSortDir] = useState(defaultDir)

    const handleSort = useCallback((key) => {
        setSortDir(prev => key === sortKey ? (prev === 'desc' ? 'asc' : 'desc') : defaultDir)
        setSortKey(key)
    }, [sortKey, defaultDir])

    const sorted = [...(data || [])].sort((a, b) => {
        const av = a[sortKey], bv = b[sortKey]
        if (av === null || av === undefined) return 1
        if (bv === null || bv === undefined) return -1
        const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv
        return sortDir === 'asc' ? cmp : -cmp
    })

    return { sorted, sortKey, sortDir, handleSort }
}

// ── Sort header cell ──────────────────────────────────────────────────────────

function Th({ label, sortKey, currentKey, currentDir, onSort, style }) {
    const active = sortKey === currentKey
    return (
        <th
            onClick={() => onSort(sortKey)}
            style={{
                cursor: 'pointer',
                userSelect: 'none',
                color: active ? 'var(--color-accent)' : undefined,
                whiteSpace: 'nowrap',
                ...style,
            }}
        >
            {label}
            <span style={{ marginLeft: '0.3rem', opacity: active ? 1 : 0.3, fontSize: '0.7em' }}>
                {active ? (currentDir === 'asc' ? '▲' : '▼') : '▼'}
            </span>
        </th>
    )
}

// ── Main component ────────────────────────────────────────────────────────────

function SeasonPage() {
    const { year } = useParams()
    const navigate = useNavigate()

    const [seasons, setSeasons]           = useState([])
    const [standings, setStandings]       = useState([])
    const [weekly, setWeekly]             = useState([])
    const [luck, setLuck]                 = useState([])
    const [selectedYear, setSelectedYear] = useState(year || null)
    const [tab, setTab]                   = useState('standings')
    const [loading, setLoading]           = useState(true)

    const standingsSort = useSortable(standings, 'final_standing', 'asc')
    const luckSort      = useSortable(luck, 'luck', 'desc')

    // Weekly scores sorted by owner name by default, sortable by any week
    const [weeklySortKey, setWeeklySortKey] = useState('owner')
    const [weeklySortDir, setWeeklySortDir] = useState('asc')

    // Load season list once
    useEffect(() => {
        getSeasons().then(data => {
            setSeasons(data)
            if (!selectedYear && data.length > 0) {
                const latest = String(data[0].season)
                setSelectedYear(latest)
                navigate(`/seasons/${latest}`, { replace: true })
            }
        })
    }, [])

    // Load all data for selected year
    useEffect(() => {
        if (!selectedYear) return
        setLoading(true)
        Promise.all([
            getStandings(selectedYear),
            getWeeklyScores(selectedYear),
            getLuck(selectedYear),
        ]).then(([s, w, l]) => {
            setStandings(s)
            setWeekly(w)
            setLuck(l)
            setLoading(false)
        })
    }, [selectedYear])

    const handleYearChange = (e) => {
        const y = e.target.value
        setSelectedYear(y)
        navigate(`/seasons/${y}`)
    }

    // Build week-by-week structure
    const weeks  = [...new Set(weekly.map(r => r.week))].sort((a, b) => a - b)
    const owners = [...new Set(weekly.map(r => r.owner))].sort()

    const weeklyMap = {}
    weekly.forEach(r => {
        if (!weeklyMap[r.owner]) weeklyMap[r.owner] = {}
        weeklyMap[r.owner][r.week] = r
    })

    // Sort owners for weekly table
    const sortedOwners = [...owners].sort((a, b) => {
        if (weeklySortKey === 'owner') {
            const cmp = a.localeCompare(b)
            return weeklySortDir === 'asc' ? cmp : -cmp
        }
        const week = Number(weeklySortKey.replace('w', ''))
        const av = weeklyMap[a]?.[week]?.score ?? -Infinity
        const bv = weeklyMap[b]?.[week]?.score ?? -Infinity
        return weeklySortDir === 'asc' ? av - bv : bv - av
    })

    const handleWeeklySort = (key) => {
        setWeeklySortDir(prev => key === weeklySortKey ? (prev === 'desc' ? 'asc' : 'desc') : 'desc')
        setWeeklySortKey(key)
    }

    return (
        <main className="page">
            {/* Header */}
            <div className="page-header" style={{ display: 'flex', alignItems: 'flex-end', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div>
                    <h1 className="page-title">Season Standings</h1>
                    <p className="page-subtitle">Final standings, weekly scores, and bullshit index</p>
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
                {['standings', 'weekly', 'luck'].map(t => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`tab-btn${tab === t ? ' active' : ''}`}
                    >
                        {t === 'standings' ? 'Standings' : t === 'weekly' ? 'Weekly Scores' : 'Bullshit Index'}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="loading">Loading...</div>
            ) : (
                <>
                    {/* Standings tab */}
                    {tab === 'standings' && (
                        <div className="card">
                            <div className="table-wrap">
                                <table>
                                    <thead>
                                        <tr>
                                            <Th label="Place"  sortKey="final_standing" currentKey={standingsSort.sortKey} currentDir={standingsSort.sortDir} onSort={standingsSort.handleSort} />
                                            <Th label="Owner"  sortKey="owner"          currentKey={standingsSort.sortKey} currentDir={standingsSort.sortDir} onSort={standingsSort.handleSort} />
                                            <Th label="W"      sortKey="wins"           currentKey={standingsSort.sortKey} currentDir={standingsSort.sortDir} onSort={standingsSort.handleSort} />
                                            <Th label="L"      sortKey="losses"         currentKey={standingsSort.sortKey} currentDir={standingsSort.sortDir} onSort={standingsSort.handleSort} />
                                            <Th label="Win%"   sortKey="win_pct"        currentKey={standingsSort.sortKey} currentDir={standingsSort.sortDir} onSort={standingsSort.handleSort} />
                                            <Th label="PF"     sortKey="points_for"     currentKey={standingsSort.sortKey} currentDir={standingsSort.sortDir} onSort={standingsSort.handleSort} />
                                            <Th label="PA"     sortKey="points_against" currentKey={standingsSort.sortKey} currentDir={standingsSort.sortDir} onSort={standingsSort.handleSort} />
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {standingsSort.sorted.map(row => {
                                            const pct = row.wins + row.losses > 0
                                                ? (row.wins / (row.wins + row.losses)).toFixed(3).replace(/^0/, '')
                                                : '.000'
                                            return (
                                                <tr
                                                    key={row.owner}
                                                    onClick={() => navigate(`/teams/${row.team_id}`)}
                                                    style={{ cursor: 'pointer' }}
                                                >
                                                    <td style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-condensed)' }}>
                                                        #{row.final_standing}
                                                    </td>
                                                    <td style={{ fontWeight: 600 }}>{row.owner}</td>
                                                    <td style={{ color: 'var(--color-win)' }}>{row.wins}</td>
                                                    <td style={{ color: 'var(--color-loss)' }}>{row.losses}</td>
                                                    <td>{pct}</td>
                                                    <td>{fmt(row.points_for)}</td>
                                                    <td style={{ color: 'var(--color-text-muted)' }}>{fmt(row.points_against)}</td>
                                                    <td>
                                                        {row.championship && <span className="badge badge-champion">Champ</span>}
                                                        {row.sacko && <span className="badge badge-sacko">Sacko</span>}
                                                        {row.most_points && <span className="badge badge-points">Most PF</span>}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Weekly scores tab */}
                    {tab === 'weekly' && (
                        <div className="card">
                            <div className="table-wrap">
                                <table>
                                    <thead>
                                        <tr>
                                            <th
                                                onClick={() => handleWeeklySort('owner')}
                                                style={{
                                                    cursor: 'pointer',
                                                    userSelect: 'none',
                                                    color: weeklySortKey === 'owner' ? 'var(--color-accent)' : undefined,
                                                }}
                                            >
                                                Owner
                                                <span style={{ marginLeft: '0.3rem', opacity: weeklySortKey === 'owner' ? 1 : 0.3, fontSize: '0.7em' }}>
                                                    {weeklySortKey === 'owner' ? (weeklySortDir === 'asc' ? '▲' : '▼') : '▼'}
                                                </span>
                                            </th>
                                            {weeks.map(w => (
                                                <th
                                                    key={w}
                                                    onClick={() => handleWeeklySort(`w${w}`)}
                                                    style={{
                                                        textAlign: 'center',
                                                        cursor: 'pointer',
                                                        userSelect: 'none',
                                                        color: weeklySortKey === `w${w}` ? 'var(--color-accent)' : undefined,
                                                    }}
                                                >
                                                    W{w}
                                                    <span style={{ marginLeft: '0.2rem', opacity: weeklySortKey === `w${w}` ? 1 : 0.3, fontSize: '0.7em' }}>
                                                        {weeklySortKey === `w${w}` ? (weeklySortDir === 'asc' ? '▲' : '▼') : '▼'}
                                                    </span>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedOwners.map(owner => (
                                            <tr key={owner}>
                                                <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{owner}</td>
                                                {weeks.map(w => {
                                                    const entry = weeklyMap[owner]?.[w]
                                                    if (!entry) return (
                                                        <td key={w} style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>—</td>
                                                    )
                                                    return (
                                                        <td key={w} style={{
                                                            textAlign: 'center',
                                                            color: entry.won === true
                                                                ? 'var(--color-win)'
                                                                : entry.won === false
                                                                ? 'var(--color-loss)'
                                                                : 'var(--color-text-muted)',
                                                            fontSize: '0.85rem',
                                                        }}>
                                                            {fmt(entry.score)}
                                                        </td>
                                                    )
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Bullshit index tab */}
                    {tab === 'luck' && (
                        <div className="card">
                            <p style={{
                                fontFamily: 'var(--font-condensed)',
                                color: 'var(--color-text-muted)',
                                fontSize: '0.85rem',
                                marginBottom: '1rem',
                                letterSpacing: '0.03em',
                            }}>
                                Bullshit = actual wins minus expected wins based on weekly score vs rest of field.
                                Positive = lucky. Negative = unlucky.
                            </p>
                            <div className="table-wrap">
                                <table>
                                    <thead>
                                        <tr>
                                            <Th label="Owner"      sortKey="owner"         currentKey={luckSort.sortKey} currentDir={luckSort.sortDir} onSort={luckSort.handleSort} />
                                            <Th label="Actual W"   sortKey="actual_wins"   currentKey={luckSort.sortKey} currentDir={luckSort.sortDir} onSort={luckSort.handleSort} />
                                            <Th label="Expected W" sortKey="expected_wins" currentKey={luckSort.sortKey} currentDir={luckSort.sortDir} onSort={luckSort.handleSort} />
                                            <Th label="Bullshit"   sortKey="luck"          currentKey={luckSort.sortKey} currentDir={luckSort.sortDir} onSort={luckSort.handleSort} />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {luckSort.sorted.map(row => {
                                            const l = Number(row.luck)
                                            return (
                                                <tr key={row.owner}>
                                                    <td style={{ fontWeight: 600 }}>{row.owner}</td>
                                                    <td>{row.actual_wins}</td>
                                                    <td style={{ color: 'var(--color-text-muted)' }}>{row.expected_wins}</td>
                                                    <td style={{
                                                        color: l > 0 ? 'var(--color-win)' : l < 0 ? 'var(--color-loss)' : 'var(--color-text)',
                                                        fontWeight: 600,
                                                    }}>
                                                        {l > 0 ? '+' : ''}{l.toFixed(2)}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </main>
    )
}

export default SeasonPage
