import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getDraftSeasons, getDraft, getDraftByTeam, getKeepers, searchPlayer, getDraftValue, getDraftValueHistory } from '../api/draft'
import Scene from '../components/Scene'
import PixelPhoto from '../components/PixelPhoto'
import TopNav from '../components/TopNav'
import Placard from '../components/Placard'
import StatStamp from '../components/StatStamp'

const POS_COLORS = {
    QB:    '#e07c4a',
    RB:    '#4a9b6f',
    WR:    '#7ab0f0',
    TE:    '#c4956a',
    K:     '#7b7b9b',
    'D/ST':'#6f9b9b',
    UNK:   '#8a8c98',
}

function PosBadge({ position }) {
    const color = POS_COLORS[position] || POS_COLORS.UNK
    return (
        <span style={{
            display: 'inline-block',
            fontFamily: 'Inter, sans-serif',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 0,
            padding: '2px 5px',
            background: `${color}44`,
            color,
            border: `1px solid ${color}aa`,
            marginRight: 4,
            verticalAlign: 'middle',
            textShadow: '1px 0 0 rgba(0,0,0,0.7), -1px 0 0 rgba(0,0,0,0.7), 0 1px 0 rgba(0,0,0,0.7), 0 -1px 0 rgba(0,0,0,0.7)',
        }}>
            {position || '?'}
        </span>
    )
}

// ── Round-by-round board ──────────────────────────────────────────────────────

function DraftBoard({ data }) {
    const rounds   = data.rounds
    const numTeams = rounds[0]?.picks.length || 0

    const pickMap = {}
    rounds.forEach(r => {
        pickMap[r.round] = {}
        r.picks.forEach(p => { pickMap[r.round][p.pick_in_round] = p })
    })

    return (
        <div className="table-wrap">
            <table className="standings">
                <thead>
                    <tr>
                        <th style={{ width: 40 }}>Rd</th>
                        {Array.from({ length: numTeams }, (_, i) => (
                            <th key={i} style={{ minWidth: 120, textAlign: 'left' }}>Pick {i + 1}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rounds.map(r => (
                        <tr key={r.round}>
                            <td style={{
                                fontFamily: 'var(--f-display)', fontSize: '1.1rem',
                                color: 'var(--amber)', textAlign: 'center',
                            }}>
                                {r.round}
                            </td>
                            {Array.from({ length: numTeams }, (_, i) => {
                                const pick = pickMap[r.round]?.[i + 1]
                                if (!pick) return <td key={i} style={{ color: '#8a8c98' }}>—</td>
                                return (
                                    <td key={i} style={{ verticalAlign: 'top', padding: '6px 10px', background: 'rgba(255,255,255,0.04)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 2 }}>
                                            <PosBadge position={pick.position} />
                                            {pick.is_keeper && (
                                                <span className="badge-tag gold" style={{ fontSize: 12 }}>K</span>
                                            )}
                                        </div>
                                        <div style={{
                                            fontFamily: 'Inter, sans-serif', fontSize: 13,
                                            color: '#f4eedd', lineHeight: 1.3,
                                        }}>
                                            {pick.player_name || '—'}
                                        </div>
                                        <div style={{
                                            fontFamily: 'Inter, sans-serif', fontSize: 12,
                                            color: 'var(--steel-hi)', marginTop: 2,
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
    )
}

// ── By-team view ──────────────────────────────────────────────────────────────

function DraftByTeam({ data }) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
            {data.teams.map(team => (
                <div key={team.owner} style={{
                    background: '#0e0d1a', border: '2px solid #252840', padding: '10px 12px',
                }}>
                    <div style={{
                        fontFamily: 'var(--f-display)', fontSize: '1.05rem',
                        letterSpacing: '0.04em', color: 'var(--amber)',
                        marginBottom: 8,
                    }}>
                        {team.owner.toUpperCase()}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {team.picks.map(pick => (
                            <div key={pick.overall_pick} style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '3px 0', borderBottom: '1px solid #1a1c26',
                            }}>
                                <span style={{
                                    fontFamily: 'Inter, sans-serif', fontSize: 12,
                                    color: '#8a8c98', width: 52, flexShrink: 0, letterSpacing: 0,
                                }}>
                                    R{pick.round_num}.{String(pick.pick_in_round).padStart(2, '0')}
                                </span>
                                <PosBadge position={pick.position} />
                                <span style={{
                                    fontFamily: 'Inter, sans-serif', fontSize: 13,
                                    color: '#f4eedd', flex: 1,
                                }}>
                                    {pick.player_name || '—'}
                                </span>
                                {pick.is_keeper && (
                                    <span className="badge-tag gold" style={{ marginLeft: 'auto' }}>K</span>
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
        <div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, letterSpacing: 3, color: 'var(--amber)', marginBottom: 10 }}>
                PLAYER DRAFT HISTORY
            </div>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search player name..."
                    style={{
                        flex: 1,
                        background: '#1a1c26',
                        border: '2px solid #3a3d4a',
                        color: '#f4eedd',
                        fontFamily: 'Inter, sans-serif',
                        fontSize: 13,
                        letterSpacing: 0,
                        padding: '6px 10px',
                        outline: 'none',
                    }}
                />
                <button
                    type="submit"
                    disabled={searching}
                    style={{
                        background: searching ? '#1a1c26' : 'var(--amber)',
                        border: '2px solid var(--amber)',
                        color: searching ? '#8a8c98' : '#1a1c26',
                        fontFamily: 'Inter, sans-serif',
                        fontSize: 13,
                        letterSpacing: 0,
                        padding: '6px 14px',
                        cursor: searching ? 'wait' : 'pointer',
                    }}
                >
                    {searching ? '...' : 'SEARCH'}
                </button>
            </form>

            {results && (
                results.times_drafted === 0 ? (
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#8a8c98', letterSpacing: 0 }}>
                        No results for "{results.query}"
                    </div>
                ) : (
                    <>
                        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#8a8c98', letterSpacing: 0, marginBottom: 10 }}>
                            "{results.query}" — drafted {results.times_drafted} time{results.times_drafted !== 1 ? 's' : ''}
                        </div>
                        <div className="table-wrap">
                            <table className="standings">
                                <thead>
                                    <tr>
                                        <th>Season</th>
                                        <th style={{ textAlign: 'left' }}>Player</th>
                                        <th style={{ textAlign: 'left' }}>Pos</th>
                                        <th>Pick</th>
                                        <th>Round</th>
                                        <th style={{ textAlign: 'left' }}>Owner</th>
                                        <th>Keeper</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {results.results.map((r, i) => (
                                        <tr key={i}>
                                            <td className="num">{r.season}</td>
                                            <td className="team">{r.player_name}</td>
                                            <td className="num"><PosBadge position={r.position} /></td>
                                            <td className="num" style={{ color: '#8a8c98' }}>#{r.overall_pick}</td>
                                            <td className="num" style={{ color: '#8a8c98' }}>R{r.round_num}.{String(r.pick_in_round).padStart(2, '0')}</td>
                                            <td className="team col-owner">{r.owner}</td>
                                            <td className="num">
                                                {r.is_keeper ? <span className="badge-tag gold">K</span> : '—'}
                                            </td>
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

// ── Helpers ───────────────────────────────────────────────────────────────────

const ordinal = n => {
    const v = n % 100
    const s = ['th', 'st', 'nd', 'rd']
    return n + (s[(v - 20) % 10] || s[v] || s[0])
}

// ── Sort hook + sortable header ───────────────────────────────────────────────

function useSortable(defaultKey, defaultDir = 'desc') {
    const [sortKey, setSortKey] = useState(defaultKey)
    const [sortDir, setSortDir] = useState(defaultDir)
    const handleSort = useCallback((key) => {
        setSortDir(prev => key === sortKey ? (prev === 'desc' ? 'asc' : 'desc') : defaultDir)
        setSortKey(key)
    }, [sortKey, defaultDir])
    return { sortKey, sortDir, handleSort }
}

const VALUE_TEXT_KEYS = new Set(['player_name', 'owner', 'position'])

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
                textAlign: VALUE_TEXT_KEYS.has(sortKey) ? 'left' : 'right',
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

// ── Value table ───────────────────────────────────────────────────────────────

function ppgDeltaColor(delta) {
    if (delta == null) return '#8a8c98'
    const abs = Math.abs(delta)
    if (delta > 0) return abs > 6 ? '#99f0a8' : abs > 3 ? '#5dcc6f' : '#3a9e4d'
    return abs > 6 ? '#ff8080' : abs > 3 ? '#e05252' : '#b84040'
}

function ValueTable({ picks, showSeason = false, showPosRank = false, posAvgPpg = null, defaultSortKey = 'value_gap', defaultSortDir = 'desc', limit }) {
    const { sortKey, sortDir, handleSort } = useSortable(defaultSortKey, defaultSortDir)
    const showPpgDelta = posAvgPpg != null

    const posRankArr = useMemo(() => {
        if (!showPosRank) return null
        const byPos = {}
        picks.forEach((p, i) => {
            if (!byPos[p.position]) byPos[p.position] = []
            byPos[p.position].push({ i, pts: p.season_points })
        })
        const ranks = new Array(picks.length).fill(null)
        for (const group of Object.values(byPos)) {
            const sorted = [...group].sort((a, b) => b.pts - a.pts)
            sorted.forEach(({ i }, rank) => { ranks[i] = rank + 1 })
        }
        return ranks
    }, [picks, showPosRank])

    const enriched = useMemo(() => picks.map((p, i) => {
        const ppg = p.weeks_active > 0 ? p.season_points / p.weeks_active : null
        const avgPpg = posAvgPpg?.[p.position] ?? null
        const ppg_delta = ppg != null && avgPpg != null ? ppg - avgPpg : null
        return { ...p, pos_rank: posRankArr ? posRankArr[i] : null, ppg_delta }
    }), [picks, posRankArr, posAvgPpg])

    const sorted = useMemo(() => [...enriched].sort((a, b) => {
        const av = a[sortKey], bv = b[sortKey]
        if (av == null) return 1
        if (bv == null) return -1
        const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv
        return sortDir === 'asc' ? cmp : -cmp
    }), [enriched, sortKey, sortDir])

    const visible = limit != null ? sorted.slice(0, limit) : sorted

    return (
        <div className="table-wrap">
            <table className="standings">
                <thead>
                    <tr>
                        {showSeason && <Th label="Year"     sortKey="season"       currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />}
                        <Th label="Player"   sortKey="player_name"  currentKey={sortKey} currentDir={sortDir} onSort={handleSort} style={{ position: 'sticky', left: 0, background: '#424555', zIndex: 2 }} />
                        <Th label="Pos"      sortKey="position"     currentKey={sortKey} currentDir={sortDir} onSort={handleSort} style={{ textAlign: 'center' }} />
                        <Th label="Draft"    sortKey="overall_pick" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
                        <Th label="Owner"    sortKey="owner"        currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
                        <Th label="Pts"      sortKey="season_points" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
                        {showPosRank && <Th label="Pos Rank" sortKey="pos_rank"   currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />}
                        <Th label="Value"    sortKey="value_gap"    currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
                        {showPpgDelta && <Th label="vs Pos"   sortKey="ppg_delta" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />}
                    </tr>
                </thead>
                <tbody>
                    {visible.map((p, i) => (
                        <tr key={i}>
                            {showSeason && <td className="num">{p.season}</td>}
                            <td className="team" style={{ whiteSpace: 'nowrap', position: 'sticky', left: 0, zIndex: 1 }}>
                                {p.player_name}
                                {p.is_keeper && (
                                    <span className="badge-tag gold" style={{ marginLeft: 6, fontSize: 11 }}>K</span>
                                )}
                            </td>
                            <td className="num"><PosBadge position={p.position} /></td>
                            <td className="num" style={{ color: '#8a8c98' }}>
                                R{p.round_num}.{String(p.pick_in_round).padStart(2, '0')}
                            </td>
                            <td className="team">{p.owner}</td>
                            <td className="num" style={{ color: 'var(--amber)' }}>
                                {p.season_points.toFixed(1)}
                            </td>
                            {showPosRank && (
                                <td className="num" style={{ fontFamily: 'Inter, sans-serif', color: 'var(--steel-hi)', fontSize: 13 }}>
                                    {p.pos_rank ? ordinal(p.pos_rank) : '—'}
                                </td>
                            )}
                            <td className="num" style={{
                                fontWeight: 700,
                                color: p.value_gap > 0 ? '#5dcc6f'
                                     : p.value_gap < 0 ? '#e05252'
                                     : '#c8c4b4',
                            }}>
                                {p.value_gap > 0 ? `+${p.value_gap}` : p.value_gap}
                            </td>
                            {showPpgDelta && (
                                <td className="num" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 13, color: ppgDeltaColor(p.ppg_delta) }}>
                                    {p.ppg_delta != null ? (p.ppg_delta > 0 ? `+${p.ppg_delta.toFixed(1)}` : p.ppg_delta.toFixed(1)) : '—'}
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

// ── Expandable section wrapper ────────────────────────────────────────────────

function ValueSection({ label, labelColor, picks, showSeason = false, showPosRank = false, posAvgPpg = null, defaultSortKey, defaultSortDir }) {
    const [expanded, setExpanded] = useState(false)
    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <span style={{ fontFamily: 'var(--f-display)', fontSize: '1.6rem', letterSpacing: '0.05em', color: labelColor, textShadow: '0 0 6px rgba(0,0,0,0.8)' }}>
                    {label}
                </span>
                {picks.length > 10 && (
                    <button
                        onClick={() => setExpanded(v => !v)}
                        style={{
                            background: 'transparent',
                            border: '1px solid var(--steel-3)',
                            color: 'var(--steel-hi)',
                            fontFamily: 'Inter, sans-serif',
                            fontSize: 11,
                            letterSpacing: 1,
                            padding: '2px 8px',
                            cursor: 'pointer',
                        }}
                    >
                        {expanded ? 'SHOW LESS' : `SHOW ALL ${picks.length}`}
                    </button>
                )}
            </div>
            <ValueTable
                picks={picks}
                showSeason={showSeason}
                showPosRank={showPosRank}
                posAvgPpg={posAvgPpg}
                defaultSortKey={defaultSortKey}
                defaultSortDir={defaultSortDir}
                limit={expanded ? undefined : 10}
            />
        </div>
    )
}

// ── Steals & Busts tab ───────────────────────────────────────────────────────

function ValueTab({ data, viewingAll, historyData, historyLoading }) {
    const steals = useMemo(() => (data?.picks || []).filter(p => p.value_gap > 0), [data])
    const busts  = useMemo(() => (data?.picks || []).filter(p => p.value_gap < 0), [data])

    const posAvgPpg = useMemo(() => {
        const allPicks = data?.picks || []
        const byPos = {}
        for (const p of allPicks) {
            if (p.weeks_active > 0) {
                if (!byPos[p.position]) byPos[p.position] = []
                byPos[p.position].push(p.season_points / p.weeks_active)
            }
        }
        const result = {}
        for (const [pos, ppgs] of Object.entries(byPos)) {
            result[pos] = ppgs.reduce((a, b) => a + b, 0) / ppgs.length
        }
        return Object.keys(result).length > 0 ? result : null
    }, [data])

    const descStyle = {
        fontFamily: 'Inter, sans-serif',
        color: 'var(--steel-hi)',
        fontSize: '14px',
        letterSpacing: '0.02em',
        marginBottom: '1rem',
        lineHeight: 1.6,
    }

    if (viewingAll) {
        if (historyLoading || !historyData) {
            return <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#8a8c98' }}>Loading...</div>
        }
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <p style={descStyle}>
                    Value is pick number minus actual finish rank among all drafted players that season. Higher value, the more they outperformed their draft slot. Aggregated across all seasons.
                </p>
                <ValueSection label="ALL-TIME STEALS" labelColor="var(--color-win)"  picks={historyData.steals} showSeason defaultSortKey="value_gap"    defaultSortDir="desc" />
                <ValueSection label="ALL-TIME BUSTS"  labelColor="var(--color-loss)" picks={historyData.busts}  showSeason defaultSortKey="value_gap" defaultSortDir="asc"  />
            </div>
        )
    }

    if (!data) return null
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <p style={descStyle}>
                Value is pick number minus actual finish rank among all drafted players that season. Higher value, the more they outperformed their draft slot.
                <br />
                vs Pos is ppg compared to the average for that position, measuring true value against alternatives.
            </p>
            <ValueSection label="STEALS" labelColor="var(--color-win)"  picks={steals} showPosRank posAvgPpg={posAvgPpg} defaultSortKey="ppg_delta" defaultSortDir="desc" />
            <ValueSection label="BUSTS"  labelColor="var(--color-loss)" picks={busts}  showPosRank posAvgPpg={posAvgPpg} defaultSortKey="value_gap" defaultSortDir="asc"  />
        </div>
    )
}

// ── Main export ───────────────────────────────────────────────────────────────

const TABS      = ['board', 'byteam', 'value', 'search']
const TAB_LBLS  = ['Draft Board', 'By Team', 'Steals & Busts', 'Player Search']

export default function Draft() {
    const { year } = useParams()
    const navigate  = useNavigate()

    const [seasons,        setSeasons]        = useState([])
    const [selectedYear,   setSelectedYear]   = useState(year || null)
    const [tab,            setTab]            = useState('board')
    const [viewingAll,     setViewingAll]     = useState(false)
    const [boardData,      setBoardData]      = useState(null)
    const [teamData,       setTeamData]       = useState(null)
    const [valueData,      setValueData]      = useState(null)
    const [historyData,    setHistoryData]    = useState(null)
    const [historyLoaded,  setHistoryLoaded]  = useState(false)
    const [historyLoading, setHistoryLoading] = useState(false)
    const [loading,        setLoading]        = useState(true)
    const [isMobile,       setIsMobile]       = useState(() => window.innerWidth <= 600)
    const [mobileOwner,    setMobileOwner]    = useState('')

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth <= 600)
        window.addEventListener('resize', check)
        return () => window.removeEventListener('resize', check)
    }, [])

    useEffect(() => {
        getDraftSeasons().then(data => {
            const sorted = [...data].sort((a, b) => b.season - a.season)
            setSeasons(sorted)
            if (!selectedYear && sorted.length > 0) {
                const latest = String(sorted[0].season)
                setSelectedYear(latest)
                navigate(`/draft/${latest}`, { replace: true })
            }
        })
    }, [])

    useEffect(() => {
        if (!selectedYear) return
        setLoading(true)
        if (tab === 'board') {
            getDraft(selectedYear)
                .then(setBoardData)
                .finally(() => setLoading(false))
            getDraftValue(selectedYear)
                .then(setValueData)
                .catch(() => {})
        } else if (tab === 'byteam') {
            getDraftByTeam(selectedYear)
                .then(setTeamData)
                .finally(() => setLoading(false))
        } else if (tab === 'value') {
            if (viewingAll) {
                setLoading(false)
            } else if (valueData?.season === Number(selectedYear)) {
                setLoading(false)
            } else {
                getDraftValue(selectedYear)
                    .then(setValueData)
                    .finally(() => setLoading(false))
            }
        } else {
            setLoading(false)
        }
    }, [selectedYear, tab, viewingAll])

    const handleTabChange = (i) => {
        setTab(TABS[i])
        setViewingAll(false)
    }

    const resetYear = (y) => {
        setSelectedYear(y); setBoardData(null); setTeamData(null); setValueData(null)
        setViewingAll(false); setTab('board')
        navigate(`/draft/${y}`)
    }

    const handleSeasonAll = () => {
        if (viewingAll) {
            setViewingAll(false)
        } else {
            setViewingAll(true)
            setTab('value')
            if (!historyLoaded && !historyLoading) {
                setHistoryLoading(true)
                getDraftValueHistory()
                    .then(data => { setHistoryData(data); setHistoryLoaded(true) })
                    .finally(() => setHistoryLoading(false))
            }
        }
    }

    // Placard season prev/next — derived from seasons array (desc order: seasons[0] = latest)
    const seasonIdx    = seasons.findIndex(s => String(s.season) === String(selectedYear))
    const onSeasonPrev = seasonIdx < seasons.length - 1 ? () => resetYear(String(seasons[seasonIdx + 1].season)) : undefined
    const onSeasonNext = seasonIdx > 0                  ? () => resetYear(String(seasons[seasonIdx - 1].season)) : undefined

    // Stat stamps — derived from boardData when available
    // round_num lives on the round wrapper, not on picks, so inject it during flatMap
    const allPicks = boardData
        ? boardData.rounds.flatMap(r => r.picks.map(p => ({ ...p, round_num: r.round })))
              .sort((a, b) => a.overall_pick - b.overall_pick)
        : []
    const firstK       = allPicks.find(p => p.position === 'K') ?? null
    const totalKeepers = allPicks.filter(p => p.is_keeper).length

    // Position average PPG — shared across all stamp vs-pos deltas
    const allValuePicks = valueData?.picks || []
    const posAvgPpg = (() => {
        const byPos = {}
        for (const p of allValuePicks) {
            if (p.weeks_active > 0) {
                if (!byPos[p.position]) byPos[p.position] = []
                byPos[p.position].push(p.season_points / p.weeks_active)
            }
        }
        const result = {}
        for (const [pos, ppgs] of Object.entries(byPos))
            result[pos] = ppgs.reduce((a, b) => a + b, 0) / ppgs.length
        return result
    })()
    const pickPpgDelta = (pick) => {
        if (!pick || pick.weeks_active <= 0 || posAvgPpg[pick.position] == null) return null
        return (pick.season_points / pick.weeks_active) - posAvgPpg[pick.position]
    }

    // Steal / bust vs-pos deltas
    const stealDelta = pickPpgDelta(valueData?.steal ?? null)
    const bustDelta  = pickPpgDelta(valueData?.bust  ?? null)

    // Best keeper by vs-pos delta
    const keeperValuePicks = allValuePicks.filter(p => p.is_keeper && p.weeks_active > 0)
    const bestKeeper = keeperValuePicks.reduce((best, p) => {
        const d = pickPpgDelta(p), bd = pickPpgDelta(best)
        return d != null && (bd == null || d > bd) ? p : best
    }, null)
    const bestKeeperDelta = pickPpgDelta(bestKeeper)

    // First kicker vs position average
    const kickerPicks = allValuePicks.filter(p => p.position === 'K' && p.weeks_active > 0)
    const firstKValue = kickerPicks.find(p => p.player_name === firstK?.player_name)
    const ppgVsAvg    = firstKValue ? pickPpgDelta(firstKValue) : null

    return (
        <Scene>
            {/* Background layers */}
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
            <div className="stencil-paint" style={{
                position: 'absolute', top: 24, left: 32,
                fontSize: 96, opacity: 0.18, color: '#0a0820', zIndex: 23, letterSpacing: '12px'
            }}>
                ROCKWOOD
            </div>

            <TopNav />

            <Placard
                variant="detached"
                tabs={TAB_LBLS}
                activeTab={TABS.indexOf(tab)}
                onTabChange={handleTabChange}
                title="DRAFT HISTORY"
                season={selectedYear}
                onSeasonPrev={onSeasonPrev}
                onSeasonNext={onSeasonNext}
                onSeasonAll={handleSeasonAll}
                seasonAllActive={viewingAll}
            >
                {/* Stat stamps — shown on board tab when data is loaded */}
                {tab === 'board' && boardData && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10, marginBottom: 14 }}>
                        <StatStamp
                            label="Keepers"
                            value={totalKeepers}
                            caption={bestKeeper && bestKeeperDelta != null
                                ? `Best: ${bestKeeper.player_name} · ${bestKeeper.owner} · ${bestKeeperDelta > 0 ? '+' : ''}${bestKeeperDelta.toFixed(1)} vs pos`
                                : ''
                            }
                        />
                        {valueData?.steal && (
                            <StatStamp
                                label="STEAL"
                                value={`R${valueData.steal.round_num}`}
                                caption={`${valueData.steal.player_name}${valueData.steal.is_keeper ? ' ★' : ''} · ${valueData.steal.season_points} pts${stealDelta != null ? ` · ${stealDelta > 0 ? '+' : ''}${stealDelta.toFixed(1)} vs pos` : ''}`}
                            />
                        )}
                        {valueData?.bust && (
                            <StatStamp
                                label="BUST"
                                value={`#${valueData.bust.overall_pick}`}
                                caption={`${valueData.bust.player_name}${valueData.bust.is_keeper ? ' ★' : ''} · ${valueData.bust.season_points} pts${bustDelta != null ? ` · ${bustDelta > 0 ? '+' : ''}${bustDelta.toFixed(1)} vs pos` : ''}`}
                            />
                        )}
                        {firstK && (
                            <StatStamp
                                label="1ST KICKER"
                                value={`R${firstK.round_num}`}
                                caption={
                                    ppgVsAvg != null
                                        ? `${firstK.player_name} · ${firstK.owner} · ${ppgVsAvg > 0 ? '+' : ''}${ppgVsAvg.toFixed(1)} ppg vs K avg${firstK.round_num < 13 ? ' 😂' : ''}`
                                        : `${firstK.player_name} · ${firstK.owner}${firstK.round_num < 13 ? ' 😂' : ''}`
                                }
                            />
                        )}
                    </div>
                )}

                {tab === 'search' ? (
                    <PlayerSearch />
                ) : loading ? (
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#8a8c98', letterSpacing: 0 }}>
                        Loading...
                    </div>
                ) : (
                    <>
                        {tab === 'board' && boardData && <DraftBoard data={boardData} />}
                        {tab === 'value' && <ValueTab data={valueData} viewingAll={viewingAll} historyData={historyData} historyLoading={historyLoading} />}
                        {tab === 'byteam' && teamData  && (
                            isMobile ? (
                                <>
                                    <select
                                        value={mobileOwner}
                                        onChange={e => setMobileOwner(e.target.value)}
                                        style={{
                                            width: '100%',
                                            background: '#1a1c26',
                                            border: '2px solid var(--steel-3)',
                                            color: '#f4eedd',
                                            fontFamily: 'Inter, sans-serif',
                                            fontSize: 13,
                                            letterSpacing: 0,
                                            padding: '8px 10px',
                                            marginBottom: 12,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <option value="">— All owners —</option>
                                        {teamData.teams.map(t => (
                                            <option key={t.owner} value={t.owner}>{t.owner}</option>
                                        ))}
                                    </select>
                                    <DraftByTeam data={mobileOwner
                                        ? { teams: teamData.teams.filter(t => t.owner === mobileOwner) }
                                        : teamData
                                    } />
                                </>
                            ) : (
                                <DraftByTeam data={teamData} />
                            )
                        )}
                    </>
                )}
            </Placard>
        </Scene>
    )
}