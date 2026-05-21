import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    getAlltimeStandings,
    getHighestSeasonScores, getLowestSeasonScores,
    getBestSingleWeek, getWorstSingleWeek,
    getWinStreaks, getLossStreaks,
    getBiggestBlowouts, getClosestGames,
    getHighestLosingScores, getLowestWinningScores,
} from '../api/records'
import { getDraftTendencies } from '../api/draft'
import { getSeasons, getLuck } from '../api/seasons'
import Scene from '../components/Scene'
import PixelPhoto from '../components/PixelPhoto'
import TopNav from '../components/TopNav'
import Placard from '../components/Placard'
import StatStamp from '../components/StatStamp'
import Badge, { DataWell } from '../components/Badge'

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

const TEXT_SORT_KEYS = new Set(['owner', 'winner', 'away_owner', 'opponent'])

function Th({ label, sortKey, currentKey, currentDir, onSort, style, className }) {
    const active = sortKey === currentKey
    return (
        <th
            className={className}
            onClick={() => onSort(sortKey)}
            style={{
                cursor: 'pointer',
                userSelect: 'none',
                color: active ? 'var(--color-accent)' : undefined,
                whiteSpace: 'nowrap',
                textAlign: TEXT_SORT_KEYS.has(sortKey) ? 'left' : 'right',
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

// ── Draft heatmap helpers ─────────────────────────────────────────────────────

const HEATMAP_COLORS = {
    QB:  '#e07c4a',
    RB:  '#4a9b6f',
    WR:  '#7ab0f0',
    TE:  '#c4956a',
    K:   '#7b7b9b',
    DST: '#6f9b9b',
}

function hexRgba(hex, a) {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r},${g},${b},${a.toFixed(2)})`
}

function roundDominant(owner, round) {
    const rd = owner.rounds.find(r => r.round === round)
    if (!rd) return null
    const entries = Object.entries(rd.counts).filter(([, v]) => v > 0)
    if (!entries.length) return null
    return entries.reduce((a, b) => b[1] > a[1] ? b : a)
}

function roundConfidence(owner, round) {
    const dom = roundDominant(owner, round)
    if (!dom || !owner.seasons_played) return 0
    return dom[1] / owner.seasons_played
}

// ── Main component ────────────────────────────────────────────────────────────

const TABS = ['standings', 'scoring', 'streaks', 'matchups', 'draft', 'bullshit']
const TAB_LABELS = ['All-Time Standings', 'Scoring Records', 'Streaks', 'Game Records', 'Draft Tendencies', 'Bullshit Index']

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
    const [draftTendencies, setDraftTendencies] = useState([])
    const [heatmapSortRound, setHeatmapSortRound] = useState(null)
    const [highestLosses, setHighestLosses] = useState([])
    const [lowestWins,    setLowestWins]    = useState([])
    const [careerLuck,    setCareerLuck]    = useState([])
    const [luckLoaded,    setLuckLoaded]    = useState(false)
    const [luckLoading,   setLuckLoading]   = useState(false)

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
    const careerLuckSort  = useSortable(careerLuck,     'luck',            'asc')

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
            getDraftTendencies(),
            getHighestLosingScores(),
            getLowestWinningScores(),
        ]).then(([st, hs, ls, bw, ww, ws, lss, bl, cl, dt, hl, lw]) => {
            setStandings(st)
            setHighSeason(hs)
            setLowSeason(ls)
            setBestWeek(bw)
            setWorstWeek(ww)
            setWinStreaks(ws)
            setLossStreaks(lss)
            setBlowouts(bl)
            setClosest(cl)
            setDraftTendencies(dt)
            setHighestLosses(hl)
            setLowestWins(lw)
            setLoading(false)
        })
    }, [])

    useEffect(() => {
        if (tab !== 'bullshit' || luckLoaded || luckLoading) return
        setLuckLoading(true)
        getSeasons()
            .then(seasons => Promise.all(seasons.map(s => getLuck(s.season))))
            .then(allResults => {
                const byOwner = {}
                allResults.forEach(seasonLuck => {
                    seasonLuck.forEach(entry => {
                        if (!byOwner[entry.owner]) {
                            byOwner[entry.owner] = { owner: entry.owner, seasons: 0, actual_wins: 0, expected_wins: 0, luck: 0 }
                        }
                        byOwner[entry.owner].seasons      += 1
                        byOwner[entry.owner].actual_wins  += entry.actual_wins
                        byOwner[entry.owner].expected_wins += Number(entry.expected_wins)
                        byOwner[entry.owner].luck          += Number(entry.luck)
                    })
                })
                setCareerLuck(Object.values(byOwner).map(r => ({
                    ...r,
                    expected_wins: Math.round(r.expected_wins * 100) / 100,
                    luck:          Math.round(r.luck          * 100) / 100,
                    bps:           Math.round((r.luck / r.seasons) * 100) / 100,
                })))
                setLuckLoaded(true)
                setLuckLoading(false)
            })
    }, [tab, luckLoaded, luckLoading])

    const heatmapPlurality = useMemo(() => {
        const result = {}
        for (let r = 1; r <= 16; r++) {
            const totals = {}
            draftTendencies.filter(o => o.seasons_played >= 3).forEach(owner => {
                const rd = owner.rounds.find(o => o.round === r)
                if (!rd) return
                Object.entries(rd.counts).forEach(([pos, count]) => {
                    if (count > 0) totals[pos] = (totals[pos] || 0) + count
                })
            })
            const entries = Object.entries(totals)
            if (entries.length) result[r] = entries.reduce((a, b) => b[1] > a[1] ? b : a)[0]
        }
        return result
    }, [draftTendencies])

    const sortedTendencies = useMemo(() => {
        const data = draftTendencies.filter(o => o.seasons_played >= 3)
        if (!heatmapSortRound) return data.sort((a, b) => a.owner.localeCompare(b.owner))
        return data.sort((a, b) => roundConfidence(b, heatmapSortRound) - roundConfidence(a, heatmapSortRound))
    }, [draftTendencies, heatmapSortRound])

    const mostWins    = standings.length ? standings.reduce((a, b) => b.total_wins    > a.total_wins    ? b : a) : null
    const bestPct     = standings.length ? standings.reduce((a, b) => b.win_pct       > a.win_pct       ? b : a) : null
    const mostTitles  = standings.length ? standings.reduce((a, b) => b.championships > a.championships ? b : a) : null
    const bestPpg     = standings.length ? standings.reduce((a, b) => (b.ppg ?? 0)    > (a.ppg ?? 0)    ? b : a) : null
    const maxTitles   = mostTitles?.championships ?? 0

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

            <div style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(ellipse at 50% 38%, rgba(255,200,140,0.08), transparent 50%)',
                zIndex: 21
            }} />


            {/* Faint background stencil */}
            <div className="stencil-paint" style={{
                position: 'absolute', top: 24, left: 32,
                fontSize: 96, opacity: 0.06, color: '#0a0820', zIndex: 23, letterSpacing: '12px'
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
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10, marginBottom: 14 }}>
                        <StatStamp label="Wins"       value={mostWins.total_wins}                           caption={mostWins.owner} />
                        <StatStamp label="Win%"       value={(bestPct.win_pct * 100).toFixed(1) + '%'}      caption={bestPct.owner} />
                        <StatStamp label="Titles"     value={mostTitles.championships}                      caption={mostTitles.owner} />
                        <StatStamp label="PPG"        value={bestPpg?.ppg?.toFixed(1) ?? '—'}               caption={bestPpg?.owner} />
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
                            <DataWell>
                                <div className="table-wrap">
                                    <table className="standings">
                                        <thead>
                                            <tr>
                                                <th style={{ textAlign: 'left' }}>#</th>
                                                <Th label="Owner"     sortKey="owner"               className="col-sticky" style={{ whiteSpace: 'nowrap' }} currentKey={standingsSort.sortKey} currentDir={standingsSort.sortDir} onSort={standingsSort.handleSort} />
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
                                                    <td className="team col-owner col-sticky">{row.owner}</td>
                                                    <td className="num">{row.seasons_played}</td>
                                                    <td className="num" style={{ color: 'var(--win)' }}>{row.total_wins}</td>
                                                    <td className="num" style={{ color: 'var(--steel-1)' }}>{row.total_losses}</td>
                                                    <td className="num">{(row.win_pct * 100).toFixed(1)}%</td>
                                                    <td className="num" style={{ color: 'var(--color-text-muted)' }}>{row.ppg?.toFixed(1) ?? '—'}</td>
                                                    <td className="num">{fmt(row.total_points_for)}</td>
                                                    <td className="num" style={{ color: 'var(--color-text-muted)' }}>{fmt(row.total_points_against)}</td>
                                                    <td className="num">
                                                        {row.championships > 0 ? (
                                                            <Badge type="championship" count={row.championships} />
                                                        ) : (
                                                            <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                                                        )}
                                                    </td>
                                                    <td className="num">
                                                        {row.most_points_seasons > 0
                                                            ? <Badge type="topscore" count={row.most_points_seasons} />
                                                            : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                                                    </td>
                                                    <td className="num">
                                                        {row.sackos > 0
                                                            ? <Badge type="sacko" count={row.sackos} />
                                                            : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </DataWell>
                        )}

                        {/* Scoring Records */}
                        {tab === 'scoring' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div>
                                    <SecHead>Highest Single-Week Scores</SecHead>
                                    <DataWell>
                                        <div className="table-wrap">
                                            <table className="standings">
                                                <thead>
                                                    <tr>
                                                        <Th label="Owner"  sortKey="owner"     currentKey={bestWeekSort.sortKey} currentDir={bestWeekSort.sortDir} onSort={bestWeekSort.handleSort} />
                                                        <Th label="Score"  sortKey="score"     currentKey={bestWeekSort.sortKey} currentDir={bestWeekSort.sortDir} onSort={bestWeekSort.handleSort} />
                                                        <Th label="Opp"    sortKey="opp_score" currentKey={bestWeekSort.sortKey} currentDir={bestWeekSort.sortDir} onSort={bestWeekSort.handleSort} />
                                                        <Th label="Season" sortKey="season"    currentKey={bestWeekSort.sortKey} currentDir={bestWeekSort.sortDir} onSort={bestWeekSort.handleSort} />
                                                        <Th label="Week"   sortKey="week"      currentKey={bestWeekSort.sortKey} currentDir={bestWeekSort.sortDir} onSort={bestWeekSort.handleSort} />
                                                        <th></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {bestWeekSort.sorted.map((row, i) => (
                                                        <tr key={i}>
                                                            <td className="team col-owner">{row.owner}</td>
                                                            <td className="num" style={{ color: 'var(--color-accent)', fontWeight: 700 }}>{fmt(row.score)}</td>
                                                            <td className="num" style={{ color: 'var(--color-text-muted)' }}>{fmt(row.opp_score)}</td>
                                                            <td className="num">{row.season}</td>
                                                            <td className="num">W{row.week}</td>
                                                            <td className="num">{row.is_playoffs ? <span className="badge-tag gold">Playoffs</span> : '—'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </DataWell>
                                </div>

                                <div>
                                    <SecHead>Lowest Single-Week Scores</SecHead>
                                    <DataWell>
                                        <div className="table-wrap">
                                            <table className="standings">
                                                <thead>
                                                    <tr>
                                                        <Th label="Owner"  sortKey="owner"     currentKey={worstWeekSort.sortKey} currentDir={worstWeekSort.sortDir} onSort={worstWeekSort.handleSort} />
                                                        <Th label="Score"  sortKey="score"     currentKey={worstWeekSort.sortKey} currentDir={worstWeekSort.sortDir} onSort={worstWeekSort.handleSort} />
                                                        <Th label="Opp"    sortKey="opp_score" currentKey={worstWeekSort.sortKey} currentDir={worstWeekSort.sortDir} onSort={worstWeekSort.handleSort} />
                                                        <Th label="Season" sortKey="season"    currentKey={worstWeekSort.sortKey} currentDir={worstWeekSort.sortDir} onSort={worstWeekSort.handleSort} />
                                                        <Th label="Week"   sortKey="week"      currentKey={worstWeekSort.sortKey} currentDir={worstWeekSort.sortDir} onSort={worstWeekSort.handleSort} />
                                                        <th></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {worstWeekSort.sorted.map((row, i) => (
                                                        <tr key={i}>
                                                            <td className="team col-owner">{row.owner}</td>
                                                            <td className="num" style={{ color: 'var(--color-loss)', fontWeight: 700 }}>{fmt(row.score)}</td>
                                                            <td className="num" style={{ color: 'var(--color-text-muted)' }}>{fmt(row.opp_score)}</td>
                                                            <td className="num">{row.season}</td>
                                                            <td className="num">W{row.week}</td>
                                                            <td className="num">{row.is_playoffs ? <span className="badge-tag gold">Playoffs</span> : '—'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </DataWell>
                                </div>

                                <div>
                                    <SecHead>Highest Season Point Totals</SecHead>
                                    <DataWell>
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
                                                            <td className="team col-owner">{row.owner}</td>
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
                                    </DataWell>
                                </div>

                                <div>
                                    <SecHead>Lowest Season Point Totals</SecHead>
                                    <DataWell>
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
                                                            <td className="team col-owner">{row.owner}</td>
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
                                    </DataWell>
                                </div>
                            </div>
                        )}

                        {/* Streaks */}
                        {tab === 'streaks' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div>
                                    <SecHead>Longest Win Streaks</SecHead>
                                    <DataWell>
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
                                                            <td className="team col-owner">{row.owner}</td>
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
                                    </DataWell>
                                </div>

                                <div>
                                    <SecHead>Longest Losing Streaks</SecHead>
                                    <DataWell>
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
                                                            <td className="team col-owner">{row.owner}</td>
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
                                    </DataWell>
                                </div>
                            </div>
                        )}

                        {/* Game Records */}
                        {tab === 'matchups' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div>
                                    <SecHead>Biggest Blowouts</SecHead>
                                    <DataWell>
                                        <div className="table-wrap">
                                            <table className="standings">
                                                <thead>
                                                    <tr>
                                                        <Th label="Winner" sortKey="winner"     className="col-sticky" currentKey={blowoutSort.sortKey} currentDir={blowoutSort.sortDir} onSort={blowoutSort.handleSort} />
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
                                                                <td className="team col-owner col-sticky" style={{ color: 'var(--color-win)' }}>{row.winner}</td>
                                                                <td className="num">{fmt(winnerScore)}</td>
                                                                <td className="team col-owner" style={{ color: 'var(--color-text-muted)' }}>{loser}</td>
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
                                    </DataWell>
                                </div>

                                <div>
                                    <SecHead>Closest Games</SecHead>
                                    <DataWell>
                                        <div className="table-wrap">
                                            <table className="standings">
                                                <thead>
                                                    <tr>
                                                        <Th label="Winner" sortKey="winner"     className="col-sticky" currentKey={closestSort.sortKey} currentDir={closestSort.sortDir} onSort={closestSort.handleSort} />
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
                                                                <td className="team col-owner col-sticky" style={{ color: 'var(--color-win)' }}>{row.winner}</td>
                                                                <td className="num">{fmt(winnerScore)}</td>
                                                                <td className="team col-owner" style={{ color: 'var(--color-text-muted)' }}>{loser}</td>
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
                                    </DataWell>
                                </div>

                                <div>
                                    <SecHead>Highest Losing Scores</SecHead>
                                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, letterSpacing: 0, color: '#8a8c98', marginBottom: 10, lineHeight: 1.6 }}>
                                        Best scores that still resulted in a loss. That bullshit.
                                    </p>
                                    <DataWell>
                                        <div className="table-wrap">
                                            <table className="standings">
                                                <thead>
                                                    <tr>
                                                        <Th label="Owner"   sortKey="owner"     className="col-sticky" currentKey={highestLossSort.sortKey} currentDir={highestLossSort.sortDir} onSort={highestLossSort.handleSort} />
                                                        <Th label="Score"   sortKey="score"     currentKey={highestLossSort.sortKey} currentDir={highestLossSort.sortDir} onSort={highestLossSort.handleSort} />
                                                        <Th label="Opp"     sortKey="opp_score" currentKey={highestLossSort.sortKey} currentDir={highestLossSort.sortDir} onSort={highestLossSort.handleSort} />
                                                        <Th label="Against" sortKey="opponent"  currentKey={highestLossSort.sortKey} currentDir={highestLossSort.sortDir} onSort={highestLossSort.handleSort} />
                                                        <Th label="Season"  sortKey="season"    currentKey={highestLossSort.sortKey} currentDir={highestLossSort.sortDir} onSort={highestLossSort.handleSort} />
                                                        <Th label="Week"    sortKey="week"      currentKey={highestLossSort.sortKey} currentDir={highestLossSort.sortDir} onSort={highestLossSort.handleSort} />
                                                        <th></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {highestLossSort.sorted.map((row, i) => (
                                                        <tr key={i}>
                                                            <td className="team col-owner col-sticky">{row.owner}</td>
                                                            <td className="num" style={{ color: 'var(--color-loss)', fontWeight: 700 }}>{fmt(row.score)}</td>
                                                            <td className="num" style={{ color: 'var(--color-win)', fontWeight: 700 }}>{fmt(row.opp_score)}</td>
                                                            <td className="team col-owner" style={{ color: 'var(--color-text-muted)' }}>{row.opponent}</td>
                                                            <td className="num">{row.season}</td>
                                                            <td className="num" style={{ color: 'var(--color-text-muted)' }}>W{row.week}</td>
                                                            <td className="num">
                                                                {row.is_playoffs
                                                                    ? <span className="badge-tag gold">Playoffs</span>
                                                                    : <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8em' }}>Reg</span>}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </DataWell>
                                </div>

                                <div>
                                    <SecHead>Lowest Winning Scores</SecHead>
                                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, letterSpacing: 0, color: '#8a8c98', marginBottom: 10, lineHeight: 1.6 }}>
                                        Scores so trash that you should feel ashamed for winning.
                                        {lowestWinSort.sorted[0]?.score < 20 && (
                                            <span> · Very low scores may indicate toliet bowl pouting</span>
                                        )}
                                    </p>
                                    <DataWell>
                                        <div className="table-wrap">
                                            <table className="standings">
                                                <thead>
                                                    <tr>
                                                        <Th label="Owner"   sortKey="owner"     className="col-sticky" currentKey={lowestWinSort.sortKey} currentDir={lowestWinSort.sortDir} onSort={lowestWinSort.handleSort} />
                                                        <Th label="Score"   sortKey="score"     currentKey={lowestWinSort.sortKey} currentDir={lowestWinSort.sortDir} onSort={lowestWinSort.handleSort} />
                                                        <Th label="Opp"     sortKey="opp_score" currentKey={lowestWinSort.sortKey} currentDir={lowestWinSort.sortDir} onSort={lowestWinSort.handleSort} />
                                                        <Th label="Against" sortKey="opponent"  currentKey={lowestWinSort.sortKey} currentDir={lowestWinSort.sortDir} onSort={lowestWinSort.handleSort} />
                                                        <Th label="Season"  sortKey="season"    currentKey={lowestWinSort.sortKey} currentDir={lowestWinSort.sortDir} onSort={lowestWinSort.handleSort} />
                                                        <Th label="Week"    sortKey="week"      currentKey={lowestWinSort.sortKey} currentDir={lowestWinSort.sortDir} onSort={lowestWinSort.handleSort} />
                                                        <th></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {lowestWinSort.sorted.map((row, i) => (
                                                        <tr key={i}>
                                                            <td className="team col-owner col-sticky">{row.owner}</td>
                                                            <td className="num" style={{ color: 'var(--color-win)', fontWeight: 700 }}>{fmt(row.score)}</td>
                                                            <td className="num" style={{ color: 'var(--color-loss)', fontWeight: 700 }}>{fmt(row.opp_score)}</td>
                                                            <td className="team col-owner" style={{ color: 'var(--color-text-muted)' }}>{row.opponent}</td>
                                                            <td className="num">{row.season}</td>
                                                            <td className="num" style={{ color: 'var(--color-text-muted)' }}>W{row.week}</td>
                                                            <td className="num">
                                                                {row.is_playoffs
                                                                    ? <span className="badge-tag gold">Playoffs</span>
                                                                    : <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8em' }}>Reg</span>}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </DataWell>
                                </div>
                            </div>
                        )}

                        {/* Draft Tendencies — heatmap */}
                        {tab === 'draft' && (
                            <div>
                                <SecHead>Draft Tendencies by Round</SecHead>
                                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'var(--steel-hi)', marginBottom: 12, lineHeight: 1.6 }}>
                                    Dominant position per round for each owner across all seasons. Brighter color means more consistently picked. Highlighted are outlier positions vs the league norm (≥60% confidence).
                                </p>

                                {/* Legend */}
                                <div style={{ display: 'flex', gap: '1rem', marginBottom: 14, flexWrap: 'wrap' }}>
                                    {Object.entries(HEATMAP_COLORS).map(([pos, color]) => (
                                        <div key={pos} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <div style={{ width: 10, height: 10, background: color, flexShrink: 0 }} />
                                            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#8a8c98' }}>{pos}</span>
                                        </div>
                                    ))}
                                </div>

                                <DataWell>
                                    <div className="table-wrap">
                                        <table style={{ borderCollapse: 'separate', borderSpacing: 2 }}>
                                            <thead>
                                                <tr>
                                                    <th
                                                        onClick={() => setHeatmapSortRound(null)}
                                                        style={{
                                                            cursor: heatmapSortRound ? 'pointer' : 'default',
                                                            textAlign: 'left',
                                                            paddingRight: 14,
                                                            whiteSpace: 'nowrap',
                                                            fontFamily: 'Inter, sans-serif',
                                                            fontSize: 11,
                                                            letterSpacing: 1,
                                                            color: !heatmapSortRound ? 'var(--color-accent)' : '#8a8c98',
                                                            paddingBottom: 8,
                                                            userSelect: 'none',
                                                        }}
                                                    >
                                                        OWNER {!heatmapSortRound && <span style={{ fontSize: '0.7em' }}>▲</span>}
                                                    </th>
                                                    {Array.from({ length: 16 }, (_, i) => i + 1).map(r => (
                                                        <th
                                                            key={r}
                                                            onClick={() => setHeatmapSortRound(prev => prev === r ? null : r)}
                                                            style={{
                                                                cursor: 'pointer',
                                                                textAlign: 'center',
                                                                width: 38,
                                                                fontFamily: 'Inter, sans-serif',
                                                                fontSize: 11,
                                                                color: heatmapSortRound === r ? 'var(--color-accent)' : '#8a8c98',
                                                                paddingBottom: 8,
                                                                userSelect: 'none',
                                                            }}
                                                        >
                                                            {r}{heatmapSortRound === r && <span style={{ marginLeft: 1, fontSize: '0.7em' }}>▼</span>}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sortedTendencies.map(owner => (
                                                    <tr key={owner.owner}>
                                                        <td
                                                            onClick={() => setHeatmapSortRound(null)}
                                                            style={{
                                                                paddingRight: 14,
                                                                cursor: heatmapSortRound ? 'pointer' : 'default',
                                                                whiteSpace: 'nowrap',
                                                                verticalAlign: 'middle',
                                                            }}
                                                        >
                                                            <span style={{
                                                                fontFamily: 'var(--f-pixel)',
                                                                fontSize: '0.75rem',
                                                                letterSpacing: 1,
                                                                color: '#f4eedd',
                                                            }}>
                                                                {owner.owner}
                                                            </span>
                                                            <span style={{
                                                                fontFamily: 'Inter, sans-serif',
                                                                fontSize: 10,
                                                                color: '#8a8c98',
                                                                marginLeft: 5,
                                                            }}>
                                                                {owner.seasons_played}s
                                                            </span>
                                                        </td>
                                                        {owner.rounds.map(({ round, counts }) => {
                                                            const entries = Object.entries(counts).filter(([, v]) => v > 0)
                                                            if (!entries.length) {
                                                                return (
                                                                    <td key={round} style={{
                                                                        width: 38,
                                                                        height: 30,
                                                                        background: 'rgba(255,255,255,0.03)',
                                                                        border: '2px solid transparent',
                                                                    }} />
                                                                )
                                                            }
                                                            const [dominantPos, dominantCount] = entries.reduce((a, b) => b[1] > a[1] ? b : a)
                                                            const conf     = dominantCount / owner.seasons_played
                                                            const opacity  = 0.2 + conf * 0.8
                                                            const color    = HEATMAP_COLORS[dominantPos] || '#555'
                                                            const isOutlier = heatmapPlurality[round]
                                                                && heatmapPlurality[round] !== dominantPos
                                                                && conf >= 0.60

                                                            const total       = entries.reduce((s, [, v]) => s + v, 0)
                                                            const tooltipBody = entries
                                                                .sort((a, b) => b[1] - a[1])
                                                                .map(([p, c]) => `${p}: ${c} (${Math.round(c / total * 100)}%)`)
                                                                .join('\n')

                                                            return (
                                                                <td
                                                                    key={round}
                                                                    title={`R${round} — ${owner.owner}\n${tooltipBody}`}
                                                                    style={{
                                                                        width: 38,
                                                                        height: 30,
                                                                        background: hexRgba(color, opacity),
                                                                        border: isOutlier ? '2px solid var(--amber)' : '2px solid transparent',
                                                                        textAlign: 'center',
                                                                        verticalAlign: 'middle',
                                                                        cursor: 'default',
                                                                    }}
                                                                >
                                                                    <span style={{
                                                                        fontFamily: 'Inter, sans-serif',
                                                                        fontSize: 10,
                                                                        color: 'rgba(255,255,255,0.9)',
                                                                        fontWeight: 600,
                                                                    }}>
                                                                        {dominantPos}
                                                                    </span>
                                                                </td>
                                                            )
                                                        })}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </DataWell>
                            </div>
                        )}

                        {tab === 'bullshit' && (
                            <>
                                <p style={{
                                    fontFamily: 'Inter, sans-serif',
                                    color: 'var(--steel-hi)',
                                    fontSize: '14px',
                                    letterSpacing: '0.02em',
                                    marginBottom: '1rem',
                                }}>
                                    Bullshit formula: actual wins minus expected wins based on weekly score vs rest of field.
                                    More negative = more bullshit. Aggregated across all seasons.
                                </p>
                                {luckLoading ? (
                                    <div className="loading" style={{ color: '#8a8c98', fontFamily: 'Inter, sans-serif', fontSize: 12 }}>
                                        Loading...
                                    </div>
                                ) : (
                                    <DataWell>
                                        <div className="table-wrap">
                                            <table className="standings">
                                                <thead>
                                                    <tr>
                                                        <Th label="Owner"      sortKey="owner"         currentKey={careerLuckSort.sortKey} currentDir={careerLuckSort.sortDir} onSort={careerLuckSort.handleSort} style={{ textAlign: 'left' }} />
                                                        <Th label="Seasons"    sortKey="seasons"       currentKey={careerLuckSort.sortKey} currentDir={careerLuckSort.sortDir} onSort={careerLuckSort.handleSort} />
                                                        <Th label="Actual W"   sortKey="actual_wins"   currentKey={careerLuckSort.sortKey} currentDir={careerLuckSort.sortDir} onSort={careerLuckSort.handleSort} />
                                                        <Th label="Expected W" sortKey="expected_wins" currentKey={careerLuckSort.sortKey} currentDir={careerLuckSort.sortDir} onSort={careerLuckSort.handleSort} />
                                                        <Th label="BPS"        sortKey="bps"           currentKey={careerLuckSort.sortKey} currentDir={careerLuckSort.sortDir} onSort={careerLuckSort.handleSort} />
                                                        <Th label="Bullshit"   sortKey="luck"          currentKey={careerLuckSort.sortKey} currentDir={careerLuckSort.sortDir} onSort={careerLuckSort.handleSort} />
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {careerLuckSort.sorted.map(row => {
                                                        const l = Number(row.luck)
                                                        return (
                                                            <tr key={row.owner}>
                                                                <td className="team col-owner">{row.owner}</td>
                                                                <td className="num" style={{ color: 'var(--steel-1)' }}>{row.seasons}</td>
                                                                <td className="num">{row.actual_wins}</td>
                                                                <td className="num" style={{ color: 'var(--steel-1)' }}>{row.expected_wins.toFixed(2)}</td>
                                                                <td className="num" style={{
                                                                    color: row.bps > 0 ? 'var(--color-win)' : row.bps < 0 ? 'var(--color-loss)' : undefined,
                                                                }}>
                                                                    {row.bps > 0 ? '+' : ''}{row.bps.toFixed(2)}
                                                                </td>
                                                                <td className="num" style={{
                                                                    color: l > 0 ? 'var(--color-win)' : l < 0 ? 'var(--color-loss)' : undefined,
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
                                    </DataWell>
                                )}
                            </>
                        )}
                    </>
                )}
            </Placard>
        </Scene>
    )
}
