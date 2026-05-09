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
import Scene from '../components/Scene'
import PixelPhoto from '../components/PixelPhoto'
import TopNav from '../components/TopNav'
import Placard from '../components/Placard'
import StatStamp from '../components/StatStamp'

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
                            fontSize: 12,
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
const TAB_LABELS = ['All-Time Standings', 'Scoring Records', 'Streaks', 'Game Records', 'Draft Tendencies']

const SecHead = ({ children }) => (
    <div style={{
        fontFamily: 'Inter, sans-serif', fontSize: 12, letterSpacing: 3,
        color: 'var(--amber)', textTransform: 'uppercase', marginBottom: 10,
    }}>
        {children}
    </div>
)

export default function Records() {
    const navigate = useNavigate()
    const [tab, setTab] = useState('standings')
    const [loading, setLoading] = useState(true)

    const [standings,     setStandings]     = useState([])
    const [highSeason,    setHighSeason]    = useState([])
    const [lowSeason,     setLowSeason]     = useState([])
    const [bestWeek,      setBestWeek]      = useState([])
    const [worstWeek,     setWorstWeek]     = useState([])
    const [winStreaks,    setWinStreaks]     = useState([])
    const [lossStreaks,   setLossStreaks]    = useState([])
    const [blowouts,      setBlowouts]      = useState([])
    const [closest,       setClosest]       = useState([])
    const [draftOwners,   setDraftOwners]   = useState([])
    const [highestLosses, setHighestLosses] = useState([])
    const [lowestWins,    setLowestWins]    = useState([])

    const standingsSort   = useSortable(standings,      'win_pct',         'desc')
    const highSeasonSort  = useSortable(highSeason,     'points_for',      'desc')
    const lowSeasonSort   = useSortable(lowSeason,      'points_for',      'asc')
    const bestWeekSort    = useSortable(bestWeek,       'score',           'desc')
    const worstWeekSort   = useSortable(worstWeek,      'score',           'asc')
    const winStreakSort   = useSortable(winStreaks,      'streak_length',   'desc')
    const lossStreakSort  = useSortable(lossStreaks,     'streak_length',   'desc')
    const blowoutSort     = useSortable(blowouts,       'margin',          'desc')
    const closestSort     = useSortable(closest,        'margin',          'asc')
    const highestLossSort = useSortable(highestLosses,  'score',           'desc')
    const lowestWinSort   = useSortable(lowestWins,     'score',           'asc')

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

    // Stat stamps — computed from standings once loaded
    const mostWins    = standings.length ? standings.reduce((a, b) => b.total_wins    > a.total_wins    ? b : a) : null
    const bestPct     = standings.length ? standings.reduce((a, b) => b.win_pct       > a.win_pct       ? b : a) : null
    const mostTitles  = standings.length ? standings.reduce((a, b) => b.championships > a.championships ? b : a) : null
    const mostSeasons = standings.length ? standings.reduce((a, b) => b.seasons_played > a.seasons_played ? b : a) : null

    return (
        <Scene>
            <PixelPhoto
                src="/tower.jpg"
                lowW={320}
                lowH={180}
                dither={true}
                tint={0.5}
                style={{ opacity: 0.9 }}
            />

            {/* Curvature shading */}
            <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(90deg, rgba(0,0,0,0.55), transparent 18%, transparent 82%, rgba(0,0,0,0.55))',
                zIndex: 20
            }} />
            <div style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(ellipse at 50% 38%, rgba(255,200,140,0.08), transparent 50%)',
                zIndex: 21
            }} />

            {/* Vertical rivet seam */}
            <div style={{
                position: 'absolute', top: 0, bottom: 0, left: '72%', width: 2,
                background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.4) 20%, rgba(0,0,0,0.4) 80%, transparent)',
                zIndex: 22
            }} />
            {Array.from({ length: 12 }, (_, i) => (
                <div
                    key={i}
                    className="placard-rivet"
                    style={{ left: 'calc(72% - 5px)', top: 40 + i * 56, width: 10, height: 10, zIndex: 22, opacity: 0.6 }}
                />
            ))}

            {/* Faint background stencil */}
            <div className="stencil-paint" style={{
                position: 'absolute', top: 24, left: 32,
                fontSize: 96, opacity: 0.18, color: '#0a0820', zIndex: 23, letterSpacing: '12px'
            }}>
                ROCKWOOD
            </div>

            <TopNav />

            <Placard
                variant="detached"
                tabs={TAB_LABELS}
                activeTab={TABS.indexOf(tab)}
                onTabChange={i => setTab(TABS[i])}
                title="ALL-TIME RECORDS"
                subtitle="17 SEASONS · 2009–2025"
            >
                {/* Stat stamps */}
                {!loading && standings.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
                        <StatStamp
                            label="Most Wins"
                            value={mostWins.total_wins}
                            caption={mostWins.owner}
                        />
                        <StatStamp
                            label="Best Win%"
                            value={(bestPct.win_pct * 100).toFixed(1) + '%'}
                            caption={bestPct.owner}
                        />
                        <StatStamp
                            label="Titles"
                            value={mostTitles.championships}
                            caption={mostTitles.owner}
                        />
                        <StatStamp
                            label="Seasons"
                            value={mostSeasons.seasons_played}
                            caption={mostSeasons.owner}
                        />
                    </div>
                )}

                {loading ? (
                    <div className="loading" style={{ color: '#8a8c98', fontFamily: 'Inter, sans-serif', fontSize: 12 }}>
                        Loading...
                    </div>
                ) : (
                    <>
                        {/* All-Time Standings */}
                        {tab === 'standings' && (
                            <div className="table-wrap">
                                <table className="standings">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <Th label="Owner"     sortKey="owner"               currentKey={standingsSort.sortKey} currentDir={standingsSort.sortDir} onSort={standingsSort.handleSort} />
                                            <Th label="Seasons"   sortKey="seasons_played"       currentKey={standingsSort.sortKey} currentDir={standingsSort.sortDir} onSort={standingsSort.handleSort} />
                                            <Th label="W"         sortKey="total_wins"           currentKey={standingsSort.sortKey} currentDir={standingsSort.sortDir} onSort={standingsSort.handleSort} />
                                            <Th label="L"         sortKey="total_losses"         currentKey={standingsSort.sortKey} currentDir={standingsSort.sortDir} onSort={standingsSort.handleSort} />
                                            <Th label="Win%"      sortKey="win_pct"              currentKey={standingsSort.sortKey} currentDir={standingsSort.sortDir} onSort={standingsSort.handleSort} />
                                            <Th label="PPG"       sortKey="ppg"                  currentKey={standingsSort.sortKey} currentDir={standingsSort.sortDir} onSort={standingsSort.handleSort} />
                                            <Th label="PF"        sortKey="total_points_for"     currentKey={standingsSort.sortKey} currentDir={standingsSort.sortDir} onSort={standingsSort.handleSort} />
                                            <Th label="PA"        sortKey="total_points_against" currentKey={standingsSort.sortKey} currentDir={standingsSort.sortDir} onSort={standingsSort.handleSort} />
                                            <Th label="Titles"    sortKey="championships"        currentKey={standingsSort.sortKey} currentDir={standingsSort.sortDir} onSort={standingsSort.handleSort} />
                                            <Th label="Top Score" sortKey="most_points_seasons"  currentKey={standingsSort.sortKey} currentDir={standingsSort.sortDir} onSort={standingsSort.handleSort} />
                                            <Th label="Sackos"    sortKey="sackos"               currentKey={standingsSort.sortKey} currentDir={standingsSort.sortDir} onSort={standingsSort.handleSort} />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {standingsSort.sorted.map((row, i) => (
                                            <tr
                                                key={row.owner}
                                                onClick={() => navigate(`/teams/${row.team_id}`)}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <td className="rank">{i + 1}</td>
                                                <td className="team">{row.owner}</td>
                                                <td className="num">{row.seasons_played}</td>
                                                <td className="num" style={{ color: 'var(--color-win)' }}>{row.total_wins}</td>
                                                <td className="num" style={{ color: 'var(--color-loss)' }}>{row.total_losses}</td>
                                                <td className="num">{(row.win_pct * 100).toFixed(1)}%</td>
                                                <td className="num" style={{ color: 'var(--color-text-muted)' }}>{row.ppg?.toFixed(1) ?? '—'}</td>
                                                <td className="num">{fmt(row.total_points_for)}</td>
                                                <td className="num" style={{ color: 'var(--color-text-muted)' }}>{fmt(row.total_points_against)}</td>
                                                <td className="num">
                                                    {row.championships > 0
                                                        ? <span className="badge-tag gold">{row.championships}</span>
                                                        : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                                                </td>
                                                <td className="num">
                                                    {row.most_points_seasons > 0
                                                        ? <span className="badge-tag gold">{row.most_points_seasons}</span>
                                                        : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                                                </td>
                                                <td className="num">
                                                    {row.sackos > 0
                                                        ? <span className="badge-tag bad">{row.sackos}</span>
                                                        : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Scoring Records */}
                        {tab === 'scoring' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div>
                                    <SecHead>Highest Single-Week Scores</SecHead>
                                    <div className="table-wrap">
                                        <table className="standings">
                                            <thead>
                                                <tr>
                                                    <Th label="Owner"  sortKey="owner"     currentKey={bestWeekSort.sortKey} currentDir={bestWeekSort.sortDir} onSort={bestWeekSort.handleSort} />
                                                    <Th label="Score"  sortKey="score"     currentKey={bestWeekSort.sortKey} currentDir={bestWeekSort.sortDir} onSort={bestWeekSort.handleSort} />
                                                    <Th label="Opp"    sortKey="opp_score" currentKey={bestWeekSort.sortKey} currentDir={bestWeekSort.sortDir} onSort={bestWeekSort.handleSort} />
                                                    <Th label="Season" sortKey="season"    currentKey={bestWeekSort.sortKey} currentDir={bestWeekSort.sortDir} onSort={bestWeekSort.handleSort} />
                                                    <Th label="Week"   sortKey="week"      currentKey={bestWeekSort.sortKey} currentDir={bestWeekSort.sortDir} onSort={bestWeekSort.handleSort} />
                                                    <th>Type</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {bestWeekSort.sorted.map((row, i) => (
                                                    <tr key={i}>
                                                        <td className="team">{row.owner}</td>
                                                        <td className="num" style={{ color: 'var(--color-accent)', fontWeight: 700 }}>{fmt(row.score)}</td>
                                                        <td className="num" style={{ color: 'var(--color-text-muted)' }}>{fmt(row.opp_score)}</td>
                                                        <td className="num">{row.season}</td>
                                                        <td className="num">W{row.week}</td>
                                                        <td className="num">{row.is_playoffs ? <span className="badge-tag gold">PO</span> : '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div>
                                    <SecHead>Lowest Single-Week Scores</SecHead>
                                    <div className="table-wrap">
                                        <table className="standings">
                                            <thead>
                                                <tr>
                                                    <Th label="Owner"  sortKey="owner"     currentKey={worstWeekSort.sortKey} currentDir={worstWeekSort.sortDir} onSort={worstWeekSort.handleSort} />
                                                    <Th label="Score"  sortKey="score"     currentKey={worstWeekSort.sortKey} currentDir={worstWeekSort.sortDir} onSort={worstWeekSort.handleSort} />
                                                    <Th label="Opp"    sortKey="opp_score" currentKey={worstWeekSort.sortKey} currentDir={worstWeekSort.sortDir} onSort={worstWeekSort.handleSort} />
                                                    <Th label="Season" sortKey="season"    currentKey={worstWeekSort.sortKey} currentDir={worstWeekSort.sortDir} onSort={worstWeekSort.handleSort} />
                                                    <Th label="Week"   sortKey="week"      currentKey={worstWeekSort.sortKey} currentDir={worstWeekSort.sortDir} onSort={worstWeekSort.handleSort} />
                                                    <th>Type</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {worstWeekSort.sorted.map((row, i) => (
                                                    <tr key={i}>
                                                        <td className="team">{row.owner}</td>
                                                        <td className="num" style={{ color: 'var(--color-loss)', fontWeight: 700 }}>{fmt(row.score)}</td>
                                                        <td className="num" style={{ color: 'var(--color-text-muted)' }}>{fmt(row.opp_score)}</td>
                                                        <td className="num">{row.season}</td>
                                                        <td className="num">W{row.week}</td>
                                                        <td className="num">{row.is_playoffs ? <span className="badge-tag gold">PO</span> : '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div>
                                    <SecHead>Highest Season Point Totals</SecHead>
                                    <div className="table-wrap">
                                        <table className="standings">
                                            <thead>
                                                <tr>
                                                    <Th label="Owner"  sortKey="owner"          currentKey={highSeasonSort.sortKey} currentDir={highSeasonSort.sortDir} onSort={highSeasonSort.handleSort} />
                                                    <Th label="PF"     sortKey="points_for"      currentKey={highSeasonSort.sortKey} currentDir={highSeasonSort.sortDir} onSort={highSeasonSort.handleSort} />
                                                    <Th label="Season" sortKey="season"          currentKey={highSeasonSort.sortKey} currentDir={highSeasonSort.sortDir} onSort={highSeasonSort.handleSort} />
                                                    <Th label="W"      sortKey="wins"            currentKey={highSeasonSort.sortKey} currentDir={highSeasonSort.sortDir} onSort={highSeasonSort.handleSort} />
                                                    <Th label="L"      sortKey="losses"          currentKey={highSeasonSort.sortKey} currentDir={highSeasonSort.sortDir} onSort={highSeasonSort.handleSort} />
                                                    <Th label="Finish" sortKey="final_standing"  currentKey={highSeasonSort.sortKey} currentDir={highSeasonSort.sortDir} onSort={highSeasonSort.handleSort} />
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {highSeasonSort.sorted.map((row, i) => (
                                                    <tr key={i}>
                                                        <td className="team">{row.owner}</td>
                                                        <td className="num" style={{ color: 'var(--color-accent)', fontWeight: 700 }}>{fmt(row.points_for)}</td>
                                                        <td className="num">{row.season}</td>
                                                        <td className="num" style={{ color: 'var(--color-win)' }}>{row.wins}</td>
                                                        <td className="num" style={{ color: 'var(--color-loss)' }}>{row.losses}</td>
                                                        <td className="num">#{row.final_standing}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div>
                                    <SecHead>Lowest Season Point Totals</SecHead>
                                    <div className="table-wrap">
                                        <table className="standings">
                                            <thead>
                                                <tr>
                                                    <Th label="Owner"  sortKey="owner"          currentKey={lowSeasonSort.sortKey} currentDir={lowSeasonSort.sortDir} onSort={lowSeasonSort.handleSort} />
                                                    <Th label="PF"     sortKey="points_for"      currentKey={lowSeasonSort.sortKey} currentDir={lowSeasonSort.sortDir} onSort={lowSeasonSort.handleSort} />
                                                    <Th label="Season" sortKey="season"          currentKey={lowSeasonSort.sortKey} currentDir={lowSeasonSort.sortDir} onSort={lowSeasonSort.handleSort} />
                                                    <Th label="W"      sortKey="wins"            currentKey={lowSeasonSort.sortKey} currentDir={lowSeasonSort.sortDir} onSort={lowSeasonSort.handleSort} />
                                                    <Th label="L"      sortKey="losses"          currentKey={lowSeasonSort.sortKey} currentDir={lowSeasonSort.sortDir} onSort={lowSeasonSort.handleSort} />
                                                    <Th label="Finish" sortKey="final_standing"  currentKey={lowSeasonSort.sortKey} currentDir={lowSeasonSort.sortDir} onSort={lowSeasonSort.handleSort} />
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {lowSeasonSort.sorted.map((row, i) => (
                                                    <tr key={i}>
                                                        <td className="team">{row.owner}</td>
                                                        <td className="num" style={{ color: 'var(--color-loss)', fontWeight: 700 }}>{fmt(row.points_for)}</td>
                                                        <td className="num">{row.season}</td>
                                                        <td className="num" style={{ color: 'var(--color-win)' }}>{row.wins}</td>
                                                        <td className="num" style={{ color: 'var(--color-loss)' }}>{row.losses}</td>
                                                        <td className="num">#{row.final_standing}</td>
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
                                <div>
                                    <SecHead>Longest Win Streaks</SecHead>
                                    <div className="table-wrap">
                                        <table className="standings">
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
                                                        <td className="team">{row.owner}</td>
                                                        <td className="num" style={{ color: 'var(--color-win)', fontWeight: 700, fontSize: '1.1em' }}>
                                                            {row.streak_length}
                                                        </td>
                                                        <td className="num">{row.start_season}</td>
                                                        <td className="num" style={{ color: 'var(--color-text-muted)' }}>W{row.start_week}</td>
                                                        <td className="num" style={{ color: 'var(--color-text-muted)' }}>{row.end_season} W{row.end_week}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div>
                                    <SecHead>Longest Losing Streaks</SecHead>
                                    <div className="table-wrap">
                                        <table className="standings">
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
                                                        <td className="team">{row.owner}</td>
                                                        <td className="num" style={{ color: 'var(--color-loss)', fontWeight: 700, fontSize: '1.1em' }}>
                                                            {row.streak_length}
                                                        </td>
                                                        <td className="num">{row.start_season}</td>
                                                        <td className="num" style={{ color: 'var(--color-text-muted)' }}>W{row.start_week}</td>
                                                        <td className="num" style={{ color: 'var(--color-text-muted)' }}>{row.end_season} W{row.end_week}</td>
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
                                <div>
                                    <SecHead>Biggest Blowouts</SecHead>
                                    <div className="table-wrap">
                                        <table className="standings">
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
                                                            <td className="team" style={{ color: 'var(--color-win)' }}>{row.winner}</td>
                                                            <td className="num">{fmt(winnerScore)}</td>
                                                            <td className="team" style={{ color: 'var(--color-text-muted)' }}>{loser}</td>
                                                            <td className="num" style={{ color: 'var(--color-loss)' }}>{fmt(loserScore)}</td>
                                                            <td className="num" style={{ color: 'var(--color-accent)', fontWeight: 700 }}>{fmt(row.margin)}</td>
                                                            <td className="num">{row.season}</td>
                                                            <td className="num">W{row.week}</td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div>
                                    <SecHead>Closest Games</SecHead>
                                    <div className="table-wrap">
                                        <table className="standings">
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
                                                            <td className="team" style={{ color: 'var(--color-win)' }}>{row.winner}</td>
                                                            <td className="num">{fmt(winnerScore)}</td>
                                                            <td className="team" style={{ color: 'var(--color-text-muted)' }}>{loser}</td>
                                                            <td className="num" style={{ color: 'var(--color-loss)' }}>{fmt(loserScore)}</td>
                                                            <td className="num" style={{ color: 'var(--color-accent)', fontWeight: 700 }}>{fmt(row.margin)}</td>
                                                            <td className="num">{row.season}</td>
                                                            <td className="num">W{row.week}</td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div>
                                    <SecHead>Highest Losing Scores</SecHead>
                                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, letterSpacing: 0, color: '#8a8c98', marginBottom: 10, lineHeight: 1.6 }}>
                                        Best scores that still resulted in a loss. That bullshit.
                                    </p>
                                    <div className="table-wrap">
                                        <table className="standings">
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
                                                        <td className="team">{row.owner}</td>
                                                        <td className="num" style={{ color: 'var(--color-loss)', fontWeight: 700 }}>{fmt(row.score)}</td>
                                                        <td className="num" style={{ color: 'var(--color-win)', fontWeight: 700 }}>{fmt(row.opp_score)}</td>
                                                        <td className="team" style={{ color: 'var(--color-text-muted)' }}>{row.opponent}</td>
                                                        <td className="num">{row.season}</td>
                                                        <td className="num" style={{ color: 'var(--color-text-muted)' }}>W{row.week}</td>
                                                        <td className="num">
                                                            {row.is_playoffs
                                                                ? <span className="badge-tag gold">PO</span>
                                                                : <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8em' }}>Reg</span>}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div>
                                    <SecHead>Lowest Winning Scores</SecHead>
                                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, letterSpacing: 0, color: '#8a8c98', marginBottom: 10, lineHeight: 1.6 }}>
                                        Scores so trash that you should feel ashamed for winning.
                                        {lowestWinSort.sorted[0]?.score < 20 && (
                                            <span> · Very low scores may indicate toliet bowl pouting</span>
                                        )}
                                    </p>
                                    <div className="table-wrap">
                                        <table className="standings">
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
                                                        <td className="team">{row.owner}</td>
                                                        <td className="num" style={{ color: 'var(--color-win)', fontWeight: 700 }}>{fmt(row.score)}</td>
                                                        <td className="num" style={{ color: 'var(--color-loss)', fontWeight: 700 }}>{fmt(row.opp_score)}</td>
                                                        <td className="team" style={{ color: 'var(--color-text-muted)' }}>{row.opponent}</td>
                                                        <td className="num">{row.season}</td>
                                                        <td className="num" style={{ color: 'var(--color-text-muted)' }}>W{row.week}</td>
                                                        <td className="num">
                                                            {row.is_playoffs
                                                                ? <span className="badge-tag gold">PO</span>
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
                            <div>
                                <SecHead>Draft Tendencies by Owner</SecHead>
                                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, letterSpacing: 0, color: '#8a8c98', marginBottom: 16, lineHeight: 1.6 }}>
                                    Total draft picks by position across all seasons. Hover segments for counts.
                                </p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {draftOwners.map(owner => {
                                        const total = Object.values(owner.positions).reduce((a, b) => a + b, 0)
                                        return (
                                            <div key={owner.owner} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{
                                                    width: '80px',
                                                    fontFamily: 'var(--f-pixel)',
                                                    fontSize: '0.75rem',
                                                    letterSpacing: 1,
                                                    flexShrink: 0,
                                                    color: '#f4eedd',
                                                }}>
                                                    {owner.owner}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <PositionBar positions={owner.positions} total={total} />
                                                </div>
                                                <div style={{
                                                    width: '40px',
                                                    textAlign: 'right',
                                                    fontFamily: 'var(--f-pixel)',
                                                    fontSize: '0.75rem',
                                                    color: '#8a8c98',
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
                                        <div key={pos} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <div style={{ width: '10px', height: '10px', background: color }} />
                                            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, letterSpacing: 0, color: '#8a8c98' }}>{pos}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </Placard>
        </Scene>
    )
}
