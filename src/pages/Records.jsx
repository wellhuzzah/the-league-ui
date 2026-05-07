import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    getAlltimeStandings,
    getHighestSeasonScores, getLowestSeasonScores,
    getBestSingleWeek, getWorstSingleWeek,
    getWinStreaks, getLossStreaks,
    getBiggestBlowouts, getClosestGames,
    getDraftByOwner,
    getHighestLosingScores, getLowestWinningScores,
} from '../api/records'

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

// ── Position breakdown bar ────────────────────────────────────────────────────

const POS_COLORS = {
    QB:   '#e07c4a',
    RB:   '#4a9b6f',
    WR:   '#4a7bc9',
    TE:   '#9b6f4a',
    K:    '#7b7b9b',
    'D/ST': '#6f9b9b',
    UNK:  '#555',
}

function PositionBar({ positions, total }) {
    const order = ['QB', 'RB', 'WR', 'TE', 'K', 'D/ST', 'UNK']
    return (
        <div style={{ display: 'flex', height: '20px', borderRadius: '3px', overflow: 'hidden', gap: '1px' }}>
            {order.map(pos => {
                const count = positions[pos] || 0
                if (!count) return null
                const pct = (count / total * 100).toFixed(1)
                return (
                    <div
                        key={pos}
                        title={`${pos}: ${count} (${pct}%)`}
                        style={{
                            width: `${pct}%`,
                            background: POS_COLORS[pos] || '#555',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.6rem',
                            color: 'rgba(255,255,255,0.8)',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {count > 3 ? pos : ''}
                    </div>
                )
            })}
        </div>
    )
}

// ── Main component ────────────────────────────────────────────────────────────

const TABS = ['standings', 'scoring', 'streaks', 'matchups', 'draft']
const TAB_LABELS = {
    standings: 'All-Time Standings',
    scoring:   'Scoring Records',
    streaks:   'Streaks',
    matchups:  'Game Records',
    draft:     'Draft Tendencies',
}

export default function Records() {
    const navigate = useNavigate()
    const [tab, setTab] = useState('standings')
    const [loading, setLoading] = useState(true)

    const [standings,   setStandings]   = useState([])
    const [highSeason,  setHighSeason]  = useState([])
    const [lowSeason,   setLowSeason]   = useState([])
    const [bestWeek,    setBestWeek]    = useState([])
    const [worstWeek,   setWorstWeek]   = useState([])
    const [winStreaks,  setWinStreaks]   = useState([])
    const [lossStreaks, setLossStreaks]  = useState([])
    const [blowouts,    setBlowouts]    = useState([])
    const [closest,     setClosest]     = useState([])
    const [draftOwners, setDraftOwners] = useState([])
    const [highestLosses, setHighestLosses] = useState([])
    const [lowestWins,    setLowestWins]    = useState([])

    const standingsSort  = useSortable(standings,   'win_pct',         'desc')
    const highSeasonSort = useSortable(highSeason, 'points_for',    'desc')
    const lowSeasonSort  = useSortable(lowSeason,  'points_for',    'asc')
    const bestWeekSort   = useSortable(bestWeek,   'score',         'desc')
    const worstWeekSort  = useSortable(worstWeek,  'score',         'asc')
    const winStreakSort  = useSortable(winStreaks,  'streak_length', 'desc')
    const lossStreakSort = useSortable(lossStreaks, 'streak_length', 'desc')
    const blowoutSort    = useSortable(blowouts,   'margin',        'desc')
    const closestSort    = useSortable(closest,    'margin',        'asc')
    const highestLossSort = useSortable(highestLosses, 'score',  'desc')
    const lowestWinSort   = useSortable(lowestWins,   'score',  'asc')

    useEffect(() => {
        Promise.all([
            getAlltimeStandings(),
            getHighestSeasonScores(),
            getLowestSeasonScores(),
            getBestSingleWeek(),
            getWorstSingleWeek(),
            getWinStreaks(),
            getLossStreaks(),
            getBiggestBlowouts(),
            getClosestGames(),
            getDraftByOwner(),
            getHighestLosingScores(),
            getLowestWinningScores(),
        ]).then(([st, hs, ls, bw, ww, ws, lss, bl, cl, dr, hl, lw]) => {
            setStandings(st)
            setHighSeason(hs)
            setLowSeason(ls)
            setBestWeek(bw)
            setWorstWeek(ww)
            setWinStreaks(ws)
            setLossStreaks(lss)
            setBlowouts(bl)
            setClosest(cl)
            setDraftOwners(dr)
            setHighestLosses(hl)
            setLowestWins(lw)
            setLoading(false)
        })
    }, [])

    if (loading) return <div className="loading">Loading...</div>

    return (
        <main className="page">
            <div className="page-header">
                <h1 className="page-title">All-Time Records</h1>
                <p className="page-subtitle">17 seasons · 2009–2025</p>
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

            {/* All-Time Standings */}
            {tab === 'standings' && (
                <div className="card">
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <Th label="Owner"   sortKey="owner"               currentKey={standingsSort.sortKey} currentDir={standingsSort.sortDir} onSort={standingsSort.handleSort} />
                                    <Th label="Seasons" sortKey="seasons_played"       currentKey={standingsSort.sortKey} currentDir={standingsSort.sortDir} onSort={standingsSort.handleSort} />
                                    <Th label="W"       sortKey="total_wins"           currentKey={standingsSort.sortKey} currentDir={standingsSort.sortDir} onSort={standingsSort.handleSort} />
                                    <Th label="L"       sortKey="total_losses"         currentKey={standingsSort.sortKey} currentDir={standingsSort.sortDir} onSort={standingsSort.handleSort} />
                                    <Th label="Win%"    sortKey="win_pct"              currentKey={standingsSort.sortKey} currentDir={standingsSort.sortDir} onSort={standingsSort.handleSort} />
                                    <Th label="PF"      sortKey="total_points_for"     currentKey={standingsSort.sortKey} currentDir={standingsSort.sortDir} onSort={standingsSort.handleSort} />
                                    <Th label="PA"      sortKey="total_points_against" currentKey={standingsSort.sortKey} currentDir={standingsSort.sortDir} onSort={standingsSort.handleSort} />
                                    <Th label="Titles"  sortKey="championships"        currentKey={standingsSort.sortKey} currentDir={standingsSort.sortDir} onSort={standingsSort.handleSort} />
                                    <Th label="Sackos"  sortKey="sackos"               currentKey={standingsSort.sortKey} currentDir={standingsSort.sortDir} onSort={standingsSort.handleSort} />
                                </tr>
                            </thead>
                            <tbody>
                                {standingsSort.sorted.map((row, i) => (
                                    <tr
                                        key={row.owner}
                                        onClick={() => navigate(`/teams/${row.team_id}`)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <td style={{ color: 'var(--color-text-muted)' }}>{i + 1}</td>
                                        <td style={{ fontWeight: 600 }}>{row.owner}</td>
                                        <td>{row.seasons_played}</td>
                                        <td style={{ color: 'var(--color-win)' }}>{row.total_wins}</td>
                                        <td style={{ color: 'var(--color-loss)' }}>{row.total_losses}</td>
                                        <td>{(row.win_pct * 100).toFixed(1)}%</td>
                                        <td>{fmt(row.total_points_for)}</td>
                                        <td style={{ color: 'var(--color-text-muted)' }}>{fmt(row.total_points_against)}</td>
                                        <td>
                                            {row.championships > 0
                                                ? <span className="badge badge-champion">{row.championships}</span>
                                                : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                                        </td>
                                        <td>
                                            {row.sackos > 0
                                                ? <span className="badge badge-sacko">{row.sackos}</span>
                                                : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Scoring Records */}
            {tab === 'scoring' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="card">
                        <h2 className="card-title">Highest Single-Week Scores</h2>
                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <Th label="Owner"  sortKey="owner"     currentKey={bestWeekSort.sortKey} currentDir={bestWeekSort.sortDir} onSort={bestWeekSort.handleSort} />
                                        <Th label="Score"  sortKey="score"     currentKey={bestWeekSort.sortKey} currentDir={bestWeekSort.sortDir} onSort={bestWeekSort.handleSort} />
                                        <Th label="Opp"    sortKey="opp_score" currentKey={bestWeekSort.sortKey} currentDir={bestWeekSort.sortDir} onSort={bestWeekSort.handleSort} />
                                        <Th label="Season" sortKey="season"    currentKey={bestWeekSort.sortKey} currentDir={bestWeekSort.sortDir} onSort={bestWeekSort.handleSort} />
                                        <Th label="Week"   sortKey="week"      currentKey={bestWeekSort.sortKey} currentDir={bestWeekSort.sortDir} onSort={bestWeekSort.handleSort} />
                                        <th>Playoffs</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bestWeekSort.sorted.map((row, i) => (
                                        <tr key={i}>
                                            <td style={{ fontWeight: 600 }}>{row.owner}</td>
                                            <td style={{ color: 'var(--color-accent)', fontWeight: 700 }}>{fmt(row.score)}</td>
                                            <td style={{ color: 'var(--color-text-muted)' }}>{fmt(row.opp_score)}</td>
                                            <td>{row.season}</td>
                                            <td>W{row.week}</td>
                                            <td>{row.is_playoffs ? <span className="badge badge-champion">Playoffs</span> : '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="card">
                        <h2 className="card-title">Lowest Single-Week Scores</h2>
                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <Th label="Owner"  sortKey="owner"     currentKey={worstWeekSort.sortKey} currentDir={worstWeekSort.sortDir} onSort={worstWeekSort.handleSort} />
                                        <Th label="Score"  sortKey="score"     currentKey={worstWeekSort.sortKey} currentDir={worstWeekSort.sortDir} onSort={worstWeekSort.handleSort} />
                                        <Th label="Opp"    sortKey="opp_score" currentKey={worstWeekSort.sortKey} currentDir={worstWeekSort.sortDir} onSort={worstWeekSort.handleSort} />
                                        <Th label="Season" sortKey="season"    currentKey={worstWeekSort.sortKey} currentDir={worstWeekSort.sortDir} onSort={worstWeekSort.handleSort} />
                                        <Th label="Week"   sortKey="week"      currentKey={worstWeekSort.sortKey} currentDir={worstWeekSort.sortDir} onSort={worstWeekSort.handleSort} />
                                        <th>Playoffs</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {worstWeekSort.sorted.map((row, i) => (
                                        <tr key={i}>
                                            <td style={{ fontWeight: 600 }}>{row.owner}</td>
                                            <td style={{ color: 'var(--color-loss)', fontWeight: 700 }}>{fmt(row.score)}</td>
                                            <td style={{ color: 'var(--color-text-muted)' }}>{fmt(row.opp_score)}</td>
                                            <td>{row.season}</td>
                                            <td>W{row.week}</td>
                                            <td>{row.is_playoffs ? <span className="badge badge-champion">Playoffs</span> : '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="card">
                        <h2 className="card-title">Highest Season Point Totals</h2>
                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <Th label="Owner"  sortKey="owner"          currentKey={highSeasonSort.sortKey} currentDir={highSeasonSort.sortDir} onSort={highSeasonSort.handleSort} />
                                        <Th label="PF"     sortKey="points_for"     currentKey={highSeasonSort.sortKey} currentDir={highSeasonSort.sortDir} onSort={highSeasonSort.handleSort} />
                                        <Th label="Season" sortKey="season"         currentKey={highSeasonSort.sortKey} currentDir={highSeasonSort.sortDir} onSort={highSeasonSort.handleSort} />
                                        <Th label="W"      sortKey="wins"           currentKey={highSeasonSort.sortKey} currentDir={highSeasonSort.sortDir} onSort={highSeasonSort.handleSort} />
                                        <Th label="L"      sortKey="losses"         currentKey={highSeasonSort.sortKey} currentDir={highSeasonSort.sortDir} onSort={highSeasonSort.handleSort} />
                                        <Th label="Finish" sortKey="final_standing" currentKey={highSeasonSort.sortKey} currentDir={highSeasonSort.sortDir} onSort={highSeasonSort.handleSort} />
                                    </tr>
                                </thead>
                                <tbody>
                                    {highSeasonSort.sorted.map((row, i) => (
                                        <tr key={i}>
                                            <td style={{ fontWeight: 600 }}>{row.owner}</td>
                                            <td style={{ color: 'var(--color-accent)', fontWeight: 700 }}>{fmt(row.points_for)}</td>
                                            <td>{row.season}</td>
                                            <td style={{ color: 'var(--color-win)' }}>{row.wins}</td>
                                            <td style={{ color: 'var(--color-loss)' }}>{row.losses}</td>
                                            <td>#{row.final_standing}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="card">
                        <h2 className="card-title">Lowest Season Point Totals</h2>
                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <Th label="Owner"  sortKey="owner"          currentKey={lowSeasonSort.sortKey} currentDir={lowSeasonSort.sortDir} onSort={lowSeasonSort.handleSort} />
                                        <Th label="PF"     sortKey="points_for"     currentKey={lowSeasonSort.sortKey} currentDir={lowSeasonSort.sortDir} onSort={lowSeasonSort.handleSort} />
                                        <Th label="Season" sortKey="season"         currentKey={lowSeasonSort.sortKey} currentDir={lowSeasonSort.sortDir} onSort={lowSeasonSort.handleSort} />
                                        <Th label="W"      sortKey="wins"           currentKey={lowSeasonSort.sortKey} currentDir={lowSeasonSort.sortDir} onSort={lowSeasonSort.handleSort} />
                                        <Th label="L"      sortKey="losses"         currentKey={lowSeasonSort.sortKey} currentDir={lowSeasonSort.sortDir} onSort={lowSeasonSort.handleSort} />
                                        <Th label="Finish" sortKey="final_standing" currentKey={lowSeasonSort.sortKey} currentDir={lowSeasonSort.sortDir} onSort={lowSeasonSort.handleSort} />
                                    </tr>
                                </thead>
                                <tbody>
                                    {lowSeasonSort.sorted.map((row, i) => (
                                        <tr key={i}>
                                            <td style={{ fontWeight: 600 }}>{row.owner}</td>
                                            <td style={{ color: 'var(--color-loss)', fontWeight: 700 }}>{fmt(row.points_for)}</td>
                                            <td>{row.season}</td>
                                            <td style={{ color: 'var(--color-win)' }}>{row.wins}</td>
                                            <td style={{ color: 'var(--color-loss)' }}>{row.losses}</td>
                                            <td>#{row.final_standing}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Streaks */}
            {tab === 'streaks' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="card">
                        <h2 className="card-title">Longest Win Streaks</h2>
                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <Th label="Owner"  sortKey="owner"         currentKey={winStreakSort.sortKey} currentDir={winStreakSort.sortDir} onSort={winStreakSort.handleSort} />
                                        <Th label="Streak" sortKey="streak_length" currentKey={winStreakSort.sortKey} currentDir={winStreakSort.sortDir} onSort={winStreakSort.handleSort} />
                                        <Th label="From"   sortKey="start_season"  currentKey={winStreakSort.sortKey} currentDir={winStreakSort.sortDir} onSort={winStreakSort.handleSort} />
                                        <th>Start</th>
                                        <th>End</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {winStreakSort.sorted.map((row, i) => (
                                        <tr key={i}>
                                            <td style={{ fontWeight: 600 }}>{row.owner}</td>
                                            <td style={{ color: 'var(--color-win)', fontWeight: 700, fontSize: '1.1em' }}>
                                                {row.streak_length}
                                            </td>
                                            <td>{row.start_season}</td>
                                            <td style={{ color: 'var(--color-text-muted)' }}>W{row.start_week}</td>
                                            <td style={{ color: 'var(--color-text-muted)' }}>{row.end_season} W{row.end_week}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="card">
                        <h2 className="card-title">Longest Losing Streaks</h2>
                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <Th label="Owner"  sortKey="owner"         currentKey={lossStreakSort.sortKey} currentDir={lossStreakSort.sortDir} onSort={lossStreakSort.handleSort} />
                                        <Th label="Streak" sortKey="streak_length" currentKey={lossStreakSort.sortKey} currentDir={lossStreakSort.sortDir} onSort={lossStreakSort.handleSort} />
                                        <Th label="From"   sortKey="start_season"  currentKey={lossStreakSort.sortKey} currentDir={lossStreakSort.sortDir} onSort={lossStreakSort.handleSort} />
                                        <th>Start</th>
                                        <th>End</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lossStreakSort.sorted.map((row, i) => (
                                        <tr key={i}>
                                            <td style={{ fontWeight: 600 }}>{row.owner}</td>
                                            <td style={{ color: 'var(--color-loss)', fontWeight: 700, fontSize: '1.1em' }}>
                                                {row.streak_length}
                                            </td>
                                            <td>{row.start_season}</td>
                                            <td style={{ color: 'var(--color-text-muted)' }}>W{row.start_week}</td>
                                            <td style={{ color: 'var(--color-text-muted)' }}>{row.end_season} W{row.end_week}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Game Records */}
            {tab === 'matchups' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="card">
                        <h2 className="card-title">Biggest Blowouts</h2>
                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <Th label="Winner" sortKey="winner"     currentKey={blowoutSort.sortKey} currentDir={blowoutSort.sortDir} onSort={blowoutSort.handleSort} />
                                        <Th label="Score"  sortKey="home_score" currentKey={blowoutSort.sortKey} currentDir={blowoutSort.sortDir} onSort={blowoutSort.handleSort} />
                                        <Th label="Loser"  sortKey="away_owner" currentKey={blowoutSort.sortKey} currentDir={blowoutSort.sortDir} onSort={blowoutSort.handleSort} />
                                        <Th label="Score"  sortKey="away_score" currentKey={blowoutSort.sortKey} currentDir={blowoutSort.sortDir} onSort={blowoutSort.handleSort} />
                                        <Th label="Margin" sortKey="margin"     currentKey={blowoutSort.sortKey} currentDir={blowoutSort.sortDir} onSort={blowoutSort.handleSort} />
                                        <Th label="Season" sortKey="season"     currentKey={blowoutSort.sortKey} currentDir={blowoutSort.sortDir} onSort={blowoutSort.handleSort} />
                                        <Th label="Week"   sortKey="week"       currentKey={blowoutSort.sortKey} currentDir={blowoutSort.sortDir} onSort={blowoutSort.handleSort} />
                                    </tr>
                                </thead>
                                <tbody>
                                    {blowoutSort.sorted.map((row, i) => {
                                        const winnerScore = row.winner === row.home_owner ? row.home_score : row.away_score
                                        const loserScore  = row.winner === row.home_owner ? row.away_score : row.home_score
                                        const loser       = row.winner === row.home_owner ? row.away_owner : row.home_owner
                                        return (
                                            <tr key={i}>
                                                <td style={{ fontWeight: 600, color: 'var(--color-win)' }}>{row.winner}</td>
                                                <td>{fmt(winnerScore)}</td>
                                                <td style={{ color: 'var(--color-text-muted)' }}>{loser}</td>
                                                <td style={{ color: 'var(--color-loss)' }}>{fmt(loserScore)}</td>
                                                <td style={{ color: 'var(--color-accent)', fontWeight: 700 }}>{fmt(row.margin)}</td>
                                                <td>{row.season}</td>
                                                <td>W{row.week}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="card">
                        <h2 className="card-title">Closest Games</h2>
                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <Th label="Winner" sortKey="winner"     currentKey={closestSort.sortKey} currentDir={closestSort.sortDir} onSort={closestSort.handleSort} />
                                        <Th label="Score"  sortKey="home_score" currentKey={closestSort.sortKey} currentDir={closestSort.sortDir} onSort={closestSort.handleSort} />
                                        <Th label="Loser"  sortKey="away_owner" currentKey={closestSort.sortKey} currentDir={closestSort.sortDir} onSort={closestSort.handleSort} />
                                        <Th label="Score"  sortKey="away_score" currentKey={closestSort.sortKey} currentDir={closestSort.sortDir} onSort={closestSort.handleSort} />
                                        <Th label="Margin" sortKey="margin"     currentKey={closestSort.sortKey} currentDir={closestSort.sortDir} onSort={closestSort.handleSort} />
                                        <Th label="Season" sortKey="season"     currentKey={closestSort.sortKey} currentDir={closestSort.sortDir} onSort={closestSort.handleSort} />
                                        <Th label="Week"   sortKey="week"       currentKey={closestSort.sortKey} currentDir={closestSort.sortDir} onSort={closestSort.handleSort} />
                                    </tr>
                                </thead>
                                <tbody>
                                    {closestSort.sorted.map((row, i) => {
                                        const winnerScore = row.winner === row.home_owner ? row.home_score : row.away_score
                                        const loserScore  = row.winner === row.home_owner ? row.away_score : row.home_score
                                        const loser       = row.winner === row.home_owner ? row.away_owner : row.home_owner
                                        return (
                                            <tr key={i}>
                                                <td style={{ fontWeight: 600, color: 'var(--color-win)' }}>{row.winner}</td>
                                                <td>{fmt(winnerScore)}</td>
                                                <td style={{ color: 'var(--color-text-muted)' }}>{loser}</td>
                                                <td style={{ color: 'var(--color-loss)' }}>{fmt(loserScore)}</td>
                                                <td style={{ color: 'var(--color-accent)', fontWeight: 700 }}>{fmt(row.margin)}</td>
                                                <td>{row.season}</td>
                                                <td>W{row.week}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Highest Losing Scores */}
                    <div className="card">
                        <h2 className="card-title">Highest Losing Scores</h2>
                        <p style={{
                            fontFamily: 'var(--font-condensed)',
                            color: 'var(--color-text-muted)',
                            fontSize: '0.85rem',
                            marginBottom: '1rem',
                        }}>
                            Best scores that still resulted in a loss — the unluckiest weeks ever.
                        </p>
                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <Th label="Owner"   sortKey="owner"     currentKey={highestLossSort.sortKey} currentDir={highestLossSort.sortDir} onSort={highestLossSort.handleSort} />
                                        <Th label="Score"   sortKey="score"     currentKey={highestLossSort.sortKey} currentDir={highestLossSort.sortDir} onSort={highestLossSort.handleSort} />
                                        <Th label="Opp"     sortKey="opp_score" currentKey={highestLossSort.sortKey} currentDir={highestLossSort.sortDir} onSort={highestLossSort.handleSort} />
                                        <Th label="Against" sortKey="opponent"  currentKey={highestLossSort.sortKey} currentDir={highestLossSort.sortDir} onSort={highestLossSort.handleSort} />
                                        <Th label="Season"  sortKey="season"    currentKey={highestLossSort.sortKey} currentDir={highestLossSort.sortDir} onSort={highestLossSort.handleSort} />
                                        <Th label="Week"    sortKey="week"      currentKey={highestLossSort.sortKey} currentDir={highestLossSort.sortDir} onSort={highestLossSort.handleSort} />
                                        <th>Type</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {highestLossSort.sorted.map((row, i) => (
                                        <tr key={i}>
                                            <td style={{ fontWeight: 600 }}>{row.owner}</td>
                                            <td style={{ color: 'var(--color-loss)', fontWeight: 700 }}>
                                                {fmt(row.score)}
                                            </td>
                                            <td style={{ color: 'var(--color-win)', fontWeight: 700 }}>
                                                {fmt(row.opp_score)}
                                            </td>
                                            <td style={{ color: 'var(--color-text-muted)' }}>{row.opponent}</td>
                                            <td>{row.season}</td>
                                            <td style={{ color: 'var(--color-text-muted)' }}>W{row.week}</td>
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

                    {/* Lowest Winning Scores */}
                    <div className="card">
                        <h2 className="card-title">Lowest Winning Scores</h2>
                        <p style={{
                            fontFamily: 'var(--font-condensed)',
                            color: 'var(--color-text-muted)',
                            fontSize: '0.85rem',
                            marginBottom: '1rem',
                        }}>
                            Worst scores that still got the W — the luckiest weeks ever.
                            {lowestWinSort.sorted[0]?.score < 20 && (
                                <span style={{ color: 'var(--color-text-muted)' }}> · Very low scores may indicate bye weeks.</span>
                            )}
                        </p>
                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <Th label="Owner"   sortKey="owner"     currentKey={lowestWinSort.sortKey} currentDir={lowestWinSort.sortDir} onSort={lowestWinSort.handleSort} />
                                        <Th label="Score"   sortKey="score"     currentKey={lowestWinSort.sortKey} currentDir={lowestWinSort.sortDir} onSort={lowestWinSort.handleSort} />
                                        <Th label="Opp"     sortKey="opp_score" currentKey={lowestWinSort.sortKey} currentDir={lowestWinSort.sortDir} onSort={lowestWinSort.handleSort} />
                                        <Th label="Against" sortKey="opponent"  currentKey={lowestWinSort.sortKey} currentDir={lowestWinSort.sortDir} onSort={lowestWinSort.handleSort} />
                                        <Th label="Season"  sortKey="season"    currentKey={lowestWinSort.sortKey} currentDir={lowestWinSort.sortDir} onSort={lowestWinSort.handleSort} />
                                        <Th label="Week"    sortKey="week"      currentKey={lowestWinSort.sortKey} currentDir={lowestWinSort.sortDir} onSort={lowestWinSort.handleSort} />
                                        <th>Type</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lowestWinSort.sorted.map((row, i) => (
                                        <tr key={i}>
                                            <td style={{ fontWeight: 600 }}>{row.owner}</td>
                                            <td style={{ color: 'var(--color-win)', fontWeight: 700 }}>
                                                {fmt(row.score)}
                                            </td>
                                            <td style={{ color: 'var(--color-loss)', fontWeight: 700 }}>
                                                {fmt(row.opp_score)}
                                            </td>
                                            <td style={{ color: 'var(--color-text-muted)' }}>{row.opponent}</td>
                                            <td>{row.season}</td>
                                            <td style={{ color: 'var(--color-text-muted)' }}>W{row.week}</td>
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
                </div>
            )}

            {/* Draft Tendencies */}
            {tab === 'draft' && (
                <div className="card">
                    <h2 className="card-title">Draft Tendencies by Owner</h2>
                    <p style={{
                        fontFamily: 'var(--font-condensed)',
                        color: 'var(--color-text-muted)',
                        fontSize: '0.85rem',
                        marginBottom: '1.5rem',
                        letterSpacing: '0.03em',
                    }}>
                        Total draft picks by position across all seasons. Hover segments for counts.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {draftOwners.map(owner => {
                            const total = Object.values(owner.positions).reduce((a, b) => a + b, 0)
                            return (
                                <div key={owner.owner} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{
                                        width: '80px',
                                        fontWeight: 600,
                                        fontSize: '0.85rem',
                                        flexShrink: 0,
                                        color: 'var(--color-text)',
                                    }}>
                                        {owner.owner}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <PositionBar positions={owner.positions} total={total} />
                                    </div>
                                    <div style={{
                                        width: '40px',
                                        textAlign: 'right',
                                        fontSize: '0.8rem',
                                        color: 'var(--color-text-muted)',
                                        flexShrink: 0,
                                    }}>
                                        {total}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Legend */}
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                        {Object.entries({ QB: '#e07c4a', RB: '#4a9b6f', WR: '#4a7bc9', TE: '#9b6f4a', K: '#7b7b9b', 'D/ST': '#6f9b9b' }).map(([pos, color]) => (
                            <div key={pos} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: color }} />
                                <span style={{ color: 'var(--color-text-muted)' }}>{pos}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </main>
    )
}
