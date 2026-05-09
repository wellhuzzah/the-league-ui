import { useState, useCallback, useEffect } from 'react'
import { getPlayerHistory, getPositionSummary, getRandomPlayer } from '../api/boxscores'
import { searchPlayer as searchDraftHistory } from '../api/draft'
import Scene from '../components/Scene'
import PixelPhoto from '../components/PixelPhoto'
import TopNav from '../components/TopNav'
import Placard from '../components/Placard'

const fmt = (n) => Number(n).toFixed(1)

const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'D/ST']

const POS_COLORS = {
    QB:    '#e07c4a',
    RB:    '#4a9b6f',
    WR:    '#4a7bc9',
    TE:    '#9b6f4a',
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
            letterSpacing: 0,
            padding: '2px 5px',
            background: `${color}22`,
            color,
            border: `1px solid ${color}66`,
            marginRight: 4,
            verticalAlign: 'middle',
        }}>
            {position || '?'}
        </span>
    )
}

function MiniStat({ label, value, color }) {
    return (
        <div style={{ background: '#0e0d1a', border: '2px solid #252840', padding: '8px 12px' }}>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, letterSpacing: 0, color: '#8a8c98', marginBottom: 4 }}>
                {label.toUpperCase()}
            </div>
            <div style={{ fontFamily: 'var(--f-display)', fontSize: '1.5rem', color: color || '#f4eedd', letterSpacing: '0.04em' }}>
                {value}
            </div>
        </div>
    )
}

const pixelTabBtn = (active) => ({
    background: active ? 'var(--amber)' : '#1a1c26',
    border: `2px solid ${active ? 'var(--amber)' : '#3a3d4a'}`,
    color: active ? '#1a1c26' : '#8a8c98',
    fontFamily: 'Inter, sans-serif',
    fontSize: 12,
    letterSpacing: 0,
    padding: '4px 12px',
    cursor: 'pointer',
})

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
                color: active ? 'var(--amber)' : undefined,
                whiteSpace: 'nowrap',
                ...style,
            }}
        >
            {label}
            <span style={{ marginLeft: 4, opacity: active ? 1 : 0.3, fontSize: '0.75em' }}>
                {active ? (currentDir === 'asc' ? '▲' : '▼') : '▼'}
            </span>
        </th>
    )
}

// ── Position Explorer ─────────────────────────────────────────────────────────

function PositionExplorer() {
    const [selectedPos, setSelectedPos] = useState(null)
    const [data,        setData]        = useState(null)
    const [loading,     setLoading]     = useState(false)
    const [posTab,      setPosTab]      = useState('scoring')

    const topGamesSort    = useSortable(data?.top_games       || [], 'points_scored', 'desc')
    const mostRosteredSort= useSortable(data?.most_rostered   || [], 'appearances',   'desc')
    const mostDraftedSort = useSortable(data?.most_drafted    || [], 'times_drafted', 'desc')
    const bySeasonSort    = useSortable(data?.by_season       || [], 'season',        'asc')
    const draftSeasonSort = useSortable(data?.draft_by_season || [], 'season',        'asc')

    const handleSelectPos = async (pos) => {
        setSelectedPos(pos)
        setPosTab('scoring')
        setLoading(true)
        try {
            const result = await getPositionSummary(pos)
            setData(result)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {POSITIONS.map(pos => (
                    <button
                        key={pos}
                        onClick={() => handleSelectPos(pos)}
                        style={{
                            background: selectedPos === pos
                                ? POS_COLORS[pos]
                                : `${POS_COLORS[pos]}22`,
                            border: `2px solid ${POS_COLORS[pos]}66`,
                            color: selectedPos === pos ? '#1a1c26' : POS_COLORS[pos],
                            fontFamily: 'Inter, sans-serif',
                            fontSize: 13,
                            letterSpacing: 0,
                            padding: '4px 14px',
                            cursor: 'pointer',
                            minWidth: 60,
                            textAlign: 'center',
                        }}
                    >
                        {pos}
                    </button>
                ))}
            </div>

            {loading && (
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#8a8c98', letterSpacing: 0 }}>
                    Loading...
                </div>
            )}

            {data && !loading && (
                <>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, borderBottom: '2px solid #252840', paddingBottom: 8 }}>
                        <span style={{
                            fontFamily: 'var(--f-display)',
                            fontSize: '1.8rem',
                            letterSpacing: '0.05em',
                            color: POS_COLORS[selectedPos] || '#f4eedd',
                        }}>
                            {selectedPos}
                        </span>
                        <span style={{ fontFamily: 'Inter, sans-serif', color: '#8a8c98', fontSize: 12, letterSpacing: 0 }}>
                            {data.scoring.total_appearances.toLocaleString()} APPEARANCES · 2018–2025
                        </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                        <MiniStat label="Avg Points"    value={fmt(data.scoring.avg_points)}             color={POS_COLORS[selectedPos]} />
                        <MiniStat label="Best Game"     value={fmt(data.scoring.max_points)}             color="#4a9b6f" />
                        <MiniStat label="Worst Game"    value={fmt(data.scoring.min_points)}             color="#c05a5a" />
                        <MiniStat label="Std Dev"       value={fmt(data.scoring.stddev_points)} />
                        <MiniStat label="Times Drafted" value={data.draft.times_drafted.toLocaleString()} />
                        <MiniStat label="Avg Pick"      value={`#${fmt(data.draft.avg_pick)}`}           color={POS_COLORS[selectedPos]} />
                        <MiniStat label="Earliest Pick" value={`#${data.draft.earliest_pick}`}           color="#4a9b6f" />
                        <MiniStat label="Keeper Picks"  value={data.draft.keeper_count} />
                    </div>

                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {[
                            { key: 'scoring',  label: 'Top Performances' },
                            { key: 'rostered', label: 'Most Rostered' },
                            { key: 'draft',    label: 'Draft History' },
                            { key: 'trends',   label: 'Season Trends' },
                        ].map(t => (
                            <button key={t.key} onClick={() => setPosTab(t.key)} style={pixelTabBtn(posTab === t.key)}>
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {posTab === 'scoring' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, letterSpacing: 3, color: 'var(--amber)' }}>
                                TOP 10 SINGLE-GAME SCORES
                            </div>
                            <div className="table-wrap">
                                <table className="standings">
                                    <thead>
                                        <tr>
                                            <th style={{ width: 32 }}>#</th>
                                            <Th label="Player"  sortKey="player_name"   currentKey={topGamesSort.sortKey} currentDir={topGamesSort.sortDir} onSort={topGamesSort.handleSort} />
                                            <Th label="Pts"     sortKey="points_scored" currentKey={topGamesSort.sortKey} currentDir={topGamesSort.sortDir} onSort={topGamesSort.handleSort} />
                                            <Th label="Owner"   sortKey="owner"         currentKey={topGamesSort.sortKey} currentDir={topGamesSort.sortDir} onSort={topGamesSort.handleSort} />
                                            <Th label="Season"  sortKey="season"        currentKey={topGamesSort.sortKey} currentDir={topGamesSort.sortDir} onSort={topGamesSort.handleSort} />
                                            <Th label="Week"    sortKey="week"          currentKey={topGamesSort.sortKey} currentDir={topGamesSort.sortDir} onSort={topGamesSort.handleSort} />
                                            <th>Opp</th>
                                            <th>Type</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {topGamesSort.sorted.map((r, i) => (
                                            <tr key={i}>
                                                <td className="rank">{i + 1}</td>
                                                <td className="team">{r.player_name}</td>
                                                <td className="num" style={{ color: POS_COLORS[selectedPos] }}>{fmt(r.points_scored)}</td>
                                                <td className="team">{r.owner}</td>
                                                <td className="num">{r.season}</td>
                                                <td className="num" style={{ color: '#8a8c98' }}>W{r.week}</td>
                                                <td className="num" style={{ color: '#8a8c98' }}>{r.opponent}</td>
                                                <td className="num">
                                                    {r.is_playoffs
                                                        ? <span className="badge-tag gold">PO</span>
                                                        : <span style={{ color: '#8a8c98' }}>Reg</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, letterSpacing: 3, color: 'var(--amber)', marginTop: 8 }}>
                                BOTTOM 5 SINGLE-GAME SCORES
                            </div>
                            <div className="table-wrap">
                                <table className="standings">
                                    <thead>
                                        <tr>
                                            <Th label="Player"  sortKey="player_name"   currentKey={topGamesSort.sortKey} currentDir={topGamesSort.sortDir} onSort={topGamesSort.handleSort} />
                                            <Th label="Pts"     sortKey="points_scored" currentKey={topGamesSort.sortKey} currentDir={topGamesSort.sortDir} onSort={topGamesSort.handleSort} />
                                            <Th label="Owner"   sortKey="owner"         currentKey={topGamesSort.sortKey} currentDir={topGamesSort.sortDir} onSort={topGamesSort.handleSort} />
                                            <Th label="Season"  sortKey="season"        currentKey={topGamesSort.sortKey} currentDir={topGamesSort.sortDir} onSort={topGamesSort.handleSort} />
                                            <th>Week</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.bottom_games.map((r, i) => (
                                            <tr key={i}>
                                                <td className="team">{r.player_name}</td>
                                                <td className="num" style={{ color: '#c05a5a' }}>{fmt(r.points_scored)}</td>
                                                <td className="team">{r.owner}</td>
                                                <td className="num">{r.season}</td>
                                                <td className="num" style={{ color: '#8a8c98' }}>W{r.week}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {posTab === 'rostered' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, letterSpacing: 3, color: 'var(--amber)' }}>
                                MOST ROSTERED PLAYERS
                            </div>
                            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#8a8c98', letterSpacing: 0 }}>
                                Players appearing most frequently on rosters · 2018–2025
                            </div>
                            <div className="table-wrap">
                                <table className="standings">
                                    <thead>
                                        <tr>
                                            <th style={{ width: 32 }}>#</th>
                                            <Th label="Player"      sortKey="player_name"  currentKey={mostRosteredSort.sortKey} currentDir={mostRosteredSort.sortDir} onSort={mostRosteredSort.handleSort} />
                                            <Th label="Appearances" sortKey="appearances"  currentKey={mostRosteredSort.sortKey} currentDir={mostRosteredSort.sortDir} onSort={mostRosteredSort.handleSort} />
                                            <Th label="Total Pts"   sortKey="total_points" currentKey={mostRosteredSort.sortKey} currentDir={mostRosteredSort.sortDir} onSort={mostRosteredSort.handleSort} />
                                            <Th label="Avg Pts"     sortKey="avg_points"   currentKey={mostRosteredSort.sortKey} currentDir={mostRosteredSort.sortDir} onSort={mostRosteredSort.handleSort} />
                                            <Th label="Best Game"   sortKey="best_game"    currentKey={mostRosteredSort.sortKey} currentDir={mostRosteredSort.sortDir} onSort={mostRosteredSort.handleSort} />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {mostRosteredSort.sorted.map((r, i) => (
                                            <tr key={i}>
                                                <td className="rank">{i + 1}</td>
                                                <td className="team">{r.player_name}</td>
                                                <td className="num">{r.appearances}</td>
                                                <td className="num" style={{ color: POS_COLORS[selectedPos] }}>{fmt(r.total_points)}</td>
                                                <td className="num" style={{ color: '#8a8c98' }}>{fmt(r.avg_points)}</td>
                                                <td className="num" style={{ color: '#4a9b6f' }}>{fmt(r.best_game)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {posTab === 'draft' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, letterSpacing: 3, color: 'var(--amber)' }}>
                                MOST DRAFTED PLAYERS
                            </div>
                            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#8a8c98', letterSpacing: 0 }}>
                                All seasons · 2009–2025
                            </div>
                            <div className="table-wrap">
                                <table className="standings">
                                    <thead>
                                        <tr>
                                            <th style={{ width: 32 }}>#</th>
                                            <Th label="Player"        sortKey="player_name"   currentKey={mostDraftedSort.sortKey} currentDir={mostDraftedSort.sortDir} onSort={mostDraftedSort.handleSort} />
                                            <Th label="Times Drafted" sortKey="times_drafted" currentKey={mostDraftedSort.sortKey} currentDir={mostDraftedSort.sortDir} onSort={mostDraftedSort.handleSort} />
                                            <Th label="Avg Pick"      sortKey="avg_pick"      currentKey={mostDraftedSort.sortKey} currentDir={mostDraftedSort.sortDir} onSort={mostDraftedSort.handleSort} />
                                            <Th label="Best Pick"     sortKey="earliest_pick" currentKey={mostDraftedSort.sortKey} currentDir={mostDraftedSort.sortDir} onSort={mostDraftedSort.handleSort} />
                                            <Th label="First Seen"    sortKey="first_season"  currentKey={mostDraftedSort.sortKey} currentDir={mostDraftedSort.sortDir} onSort={mostDraftedSort.handleSort} />
                                            <Th label="Last Seen"     sortKey="last_season"   currentKey={mostDraftedSort.sortKey} currentDir={mostDraftedSort.sortDir} onSort={mostDraftedSort.handleSort} />
                                            <Th label="Keepers"       sortKey="keeper_count"  currentKey={mostDraftedSort.sortKey} currentDir={mostDraftedSort.sortDir} onSort={mostDraftedSort.handleSort} />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {mostDraftedSort.sorted.map((r, i) => (
                                            <tr key={i}>
                                                <td className="rank">{i + 1}</td>
                                                <td className="team">{r.player_name}</td>
                                                <td className="num" style={{ color: POS_COLORS[selectedPos] }}>{r.times_drafted}</td>
                                                <td className="num" style={{ color: '#8a8c98' }}>#{fmt(r.avg_pick)}</td>
                                                <td className="num" style={{ color: '#4a9b6f' }}>#{r.earliest_pick}</td>
                                                <td className="num">{r.first_season}</td>
                                                <td className="num">{r.last_season}</td>
                                                <td className="num">
                                                    {r.keeper_count > 0
                                                        ? <span className="badge-tag gold">{r.keeper_count}</span>
                                                        : <span style={{ color: '#8a8c98' }}>—</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {posTab === 'trends' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, letterSpacing: 3, color: 'var(--amber)' }}>
                                SCORING TRENDS BY SEASON
                            </div>
                            <div className="table-wrap">
                                <table className="standings">
                                    <thead>
                                        <tr>
                                            <Th label="Season"         sortKey="season"         currentKey={bySeasonSort.sortKey} currentDir={bySeasonSort.sortDir} onSort={bySeasonSort.handleSort} />
                                            <Th label="Avg Pts"        sortKey="avg_points"     currentKey={bySeasonSort.sortKey} currentDir={bySeasonSort.sortDir} onSort={bySeasonSort.handleSort} />
                                            <Th label="Best Game"      sortKey="max_points"     currentKey={bySeasonSort.sortKey} currentDir={bySeasonSort.sortDir} onSort={bySeasonSort.handleSort} />
                                            <Th label="Unique Players" sortKey="unique_players" currentKey={bySeasonSort.sortKey} currentDir={bySeasonSort.sortDir} onSort={bySeasonSort.handleSort} />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {bySeasonSort.sorted.map((r, i) => (
                                            <tr key={i}>
                                                <td className="num">{r.season}</td>
                                                <td className="num" style={{ color: POS_COLORS[selectedPos] }}>{fmt(r.avg_points)}</td>
                                                <td className="num" style={{ color: '#4a9b6f' }}>{fmt(r.max_points)}</td>
                                                <td className="num" style={{ color: '#8a8c98' }}>{r.unique_players}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, letterSpacing: 3, color: 'var(--amber)', marginTop: 4 }}>
                                DRAFT ADP TREND BY SEASON
                            </div>
                            <div className="table-wrap">
                                <table className="standings">
                                    <thead>
                                        <tr>
                                            <Th label="Season"        sortKey="season"        currentKey={draftSeasonSort.sortKey} currentDir={draftSeasonSort.sortDir} onSort={draftSeasonSort.handleSort} />
                                            <Th label="Avg Pick"      sortKey="avg_pick"      currentKey={draftSeasonSort.sortKey} currentDir={draftSeasonSort.sortDir} onSort={draftSeasonSort.handleSort} />
                                            <Th label="Earliest Pick" sortKey="earliest_pick" currentKey={draftSeasonSort.sortKey} currentDir={draftSeasonSort.sortDir} onSort={draftSeasonSort.handleSort} />
                                            <Th label="Times Drafted" sortKey="times_drafted" currentKey={draftSeasonSort.sortKey} currentDir={draftSeasonSort.sortDir} onSort={draftSeasonSort.handleSort} />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {draftSeasonSort.sorted.map((r, i) => (
                                            <tr key={i}>
                                                <td className="num">{r.season}</td>
                                                <td className="num" style={{ color: POS_COLORS[selectedPos] }}>#{fmt(r.avg_pick)}</td>
                                                <td className="num" style={{ color: '#4a9b6f' }}>#{r.earliest_pick}</td>
                                                <td className="num" style={{ color: '#8a8c98' }}>{r.times_drafted}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

// ── Player Search ─────────────────────────────────────────────────────────────

function PlayerSearch() {
    const [query,     setQuery]     = useState('')
    const [boxData,   setBoxData]   = useState(null)
    const [draftData, setDraftData] = useState(null)
    const [searching, setSearching] = useState(false)
    const [error,     setError]     = useState(null)
    const [tab,       setTab]       = useState('draft')

    const [randomPlayer,     setRandomPlayer]     = useState(null)
    const [randomLoading,    setRandomLoading]    = useState(true)
    const [randomRefreshing, setRandomRefreshing] = useState(false)

    useEffect(() => {
        getRandomPlayer()
            .then(setRandomPlayer)
            .finally(() => setRandomLoading(false))
    }, [])

    const handleRefreshRandom = async () => {
        setRandomRefreshing(true)
        try {
            const p = await getRandomPlayer()
            setRandomPlayer(p)
        } finally {
            setRandomRefreshing(false)
        }
    }

    const handleSearch = async (e) => {
        e.preventDefault()
        if (!query.trim()) return
        setSearching(true)
        setError(null)
        setTab('draft')
        try {
            const [box, draft] = await Promise.all([
                getPlayerHistory(query.trim()),
                searchDraftHistory(query.trim()),
            ])
            setBoxData(box)
            setDraftData(draft)
        } catch (err) {
            setError('Search failed — try again')
        } finally {
            setSearching(false)
        }
    }

    const draftResults = draftData?.results || []
    const draftCount   = draftResults.length
    const adp          = draftCount > 0
        ? draftResults.reduce((a, r) => a + r.overall_pick, 0) / draftCount
        : null
    const earliestPick = draftCount > 0 ? Math.min(...draftResults.map(r => r.overall_pick)) : null
    const latestPick   = draftCount > 0 ? Math.max(...draftResults.map(r => r.overall_pick)) : null
    const keeperCount  = draftResults.filter(r => r.is_keeper).length

    const enrichedOwners = (boxData?.by_owner || []).map(o => {
        const ownerGames = (boxData?.results || []).filter(r => r.owner === o.owner)
        const seasons    = [...new Set(ownerGames.map(r => r.season))].sort()
        return {
            ...o,
            avg_points:  o.appearances > 0 ? o.total_points / o.appearances : 0,
            seasons,
            seasons_str: seasons.join(', '),
        }
    })

    const totalAppearances = enrichedOwners.reduce((a, o) => a + o.appearances, 0)
    const totalPoints      = enrichedOwners.reduce((a, o) => a + o.total_points, 0)

    const ownerSort   = useSortable(enrichedOwners,        'total_points',  'desc')
    const gameLogSort = useSortable(boxData?.results || [], 'points_scored', 'desc')
    const draftSort   = useSortable(draftResults,           'season',        'asc')

    const hasBox   = boxData   && boxData.total_appearances > 0
    const hasDraft = draftData && draftData.times_drafted   > 0
    const hasAny   = hasBox || hasDraft

    const playerName = boxData?.results?.[0]?.player_name
        || draftData?.results?.[0]?.player_name
        || query
    const position = boxData?.results?.[0]?.position
        || draftData?.results?.[0]?.position

    const availableTabs = [
        hasDraft && { key: 'draft',   label: 'Draft History' },
        hasBox   && { key: 'scoring', label: 'Scoring' },
        hasBox   && { key: 'gamelog', label: 'Game Log' },
    ].filter(Boolean)

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
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
                    disabled={searching || !query.trim()}
                    style={{
                        background: (searching || !query.trim()) ? '#1a1c26' : 'var(--amber)',
                        border: '2px solid var(--amber)',
                        color: (searching || !query.trim()) ? '#8a8c98' : '#1a1c26',
                        fontFamily: 'Inter, sans-serif',
                        fontSize: 13,
                        letterSpacing: 0,
                        padding: '6px 14px',
                        cursor: (searching || !query.trim()) ? 'not-allowed' : 'pointer',
                        opacity: !query.trim() ? 0.5 : 1,
                    }}
                >
                    {searching ? '...' : 'SEARCH'}
                </button>
            </form>

            {error && (
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#c05a5a', letterSpacing: 0 }}>
                    {error}
                </div>
            )}

            {!hasAny && (
                <div style={{ background: '#0e0d1a', border: '2px solid #252840', padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, letterSpacing: 3, color: 'var(--amber)' }}>
                            FEATURED PLAYER
                        </div>
                        <button
                            onClick={handleRefreshRandom}
                            disabled={randomRefreshing || randomLoading}
                            style={{
                                background: '#1a1c26',
                                border: '2px solid #3a3d4a',
                                color: randomRefreshing ? '#8a8c98' : 'var(--amber)',
                                fontFamily: 'Inter, sans-serif',
                                fontSize: 12,
                                letterSpacing: 0,
                                padding: '3px 10px',
                                cursor: randomRefreshing ? 'wait' : 'pointer',
                            }}
                        >
                            {randomRefreshing ? '...' : '↻ NEW'}
                        </button>
                    </div>

                    {randomLoading ? (
                        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#8a8c98', letterSpacing: 0 }}>
                            Loading...
                        </div>
                    ) : randomPlayer ? (
                        <>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
                                <span style={{ fontFamily: 'var(--f-display)', fontSize: '1.6rem', letterSpacing: '0.05em', color: '#f4eedd' }}>
                                    {randomPlayer.player_name}
                                </span>
                                <PosBadge position={randomPlayer.position} />
                                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#8a8c98', letterSpacing: 0 }}>
                                    {randomPlayer.seasons?.[0]}
                                    {randomPlayer.seasons?.length > 1 && `–${randomPlayer.seasons[randomPlayer.seasons.length - 1]}`}
                                </span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                                <MiniStat label="Avg Pts"       value={fmt(randomPlayer.avg_points)}   color="var(--amber)" />
                                <MiniStat label="Best Game"     value={fmt(randomPlayer.best_game)}    color="#4a9b6f" />
                                <MiniStat label="Total Pts"     value={fmt(randomPlayer.total_points)} />
                                <MiniStat label="Appearances"   value={randomPlayer.appearances} />
                                <MiniStat label="Times Drafted" value={randomPlayer.draft?.times_drafted ?? '—'} />
                                <MiniStat label="Avg Pick"      value={randomPlayer.draft?.avg_pick ? `#${fmt(randomPlayer.draft.avg_pick)}` : '—'} color="var(--amber)" />
                            </div>

                            {randomPlayer.best_game_detail && (
                                <div style={{
                                    background: '#14162a',
                                    border: '1px solid #2a2c40',
                                    padding: '6px 10px',
                                    marginBottom: 8,
                                    fontFamily: 'Inter, sans-serif',
                                    fontSize: 12,
                                    color: '#8a8c98',
                                    letterSpacing: 0,
                                }}>
                                    <span style={{ color: '#c8c4b4' }}>Best: </span>
                                    <span style={{ color: '#4a9b6f' }}>{fmt(randomPlayer.best_game_detail.points_scored)} pts</span>
                                    {' '}— {randomPlayer.best_game_detail.season} W{randomPlayer.best_game_detail.week}
                                    {' '}for <span style={{ color: '#f4eedd' }}>{randomPlayer.best_game_detail.owner}</span>
                                    {' '}vs {randomPlayer.best_game_detail.opponent}
                                    {randomPlayer.best_game_detail.is_playoffs && (
                                        <span className="badge-tag gold" style={{ marginLeft: 6 }}>PO</span>
                                    )}
                                </div>
                            )}

                            {randomPlayer.top_owner && (
                                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#8a8c98', letterSpacing: 0 }}>
                                    Most rostered by{' '}
                                    <span style={{ color: 'var(--amber)' }}>{randomPlayer.top_owner.owner}</span>
                                    {' '}({randomPlayer.top_owner.appearances} appearances)
                                </div>
                            )}
                        </>
                    ) : null}
                </div>
            )}

            {boxData && draftData && !hasAny && (
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#8a8c98', letterSpacing: 0 }}>
                    No results for "{query}"
                </div>
            )}

            {hasAny && (
                <>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', borderBottom: '2px solid #252840', paddingBottom: 8 }}>
                        <span style={{ fontFamily: 'var(--f-display)', fontSize: '1.6rem', letterSpacing: '0.05em', color: '#f4eedd' }}>
                            {playerName}
                        </span>
                        {position && <PosBadge position={position} />}
                        {hasDraft && (
                            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#8a8c98', letterSpacing: 0 }}>
                                Drafted {draftCount} time{draftCount !== 1 ? 's' : ''}
                            </span>
                        )}
                        {hasBox && (
                            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#8a8c98', letterSpacing: 0 }}>
                                · {boxData.total_appearances} wks scoring data
                            </span>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: 4 }}>
                        {availableTabs.map(t => (
                            <button key={t.key} onClick={() => setTab(t.key)} style={pixelTabBtn(tab === t.key)}>
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {tab === 'draft' && hasDraft && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                                <MiniStat label="Times Drafted" value={draftCount}                                        color="var(--amber)" />
                                <MiniStat label="Avg Pick"      value={adp ? fmt(adp) : '—'} />
                                <MiniStat label="Earliest Pick" value={earliestPick ? `#${earliestPick}` : '—'}          color="#4a9b6f" />
                                <MiniStat label="Latest Pick"   value={latestPick   ? `#${latestPick}`   : '—'}          color="#c05a5a" />
                                <MiniStat label="Keeper Picks"  value={keeperCount} />
                            </div>
                            <div className="table-wrap">
                                <table className="standings">
                                    <thead>
                                        <tr>
                                            <Th label="Season"  sortKey="season"       currentKey={draftSort.sortKey} currentDir={draftSort.sortDir} onSort={draftSort.handleSort} />
                                            <Th label="Owner"   sortKey="owner"        currentKey={draftSort.sortKey} currentDir={draftSort.sortDir} onSort={draftSort.handleSort} />
                                            <Th label="Overall" sortKey="overall_pick" currentKey={draftSort.sortKey} currentDir={draftSort.sortDir} onSort={draftSort.handleSort} />
                                            <Th label="Round"   sortKey="round_num"    currentKey={draftSort.sortKey} currentDir={draftSort.sortDir} onSort={draftSort.handleSort} />
                                            <th>Pick</th>
                                            <th>Keeper</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {draftSort.sorted.map((r, i) => (
                                            <tr key={i}>
                                                <td className="num">{r.season}</td>
                                                <td className="team">{r.owner}</td>
                                                <td className="num" style={{ color: 'var(--amber)' }}>#{r.overall_pick}</td>
                                                <td className="num" style={{ color: '#8a8c98' }}>R{r.round_num}</td>
                                                <td className="num" style={{ color: '#8a8c98' }}>{r.pick_in_round}</td>
                                                <td className="num">
                                                    {r.is_keeper
                                                        ? <span className="badge-tag gold">K</span>
                                                        : <span style={{ color: '#8a8c98' }}>—</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {tab === 'scoring' && hasBox && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, letterSpacing: 3, color: 'var(--amber)' }}>
                                BY OWNER
                            </div>
                            <div className="table-wrap">
                                <table className="standings">
                                    <thead>
                                        <tr>
                                            <Th label="Owner"     sortKey="owner"        currentKey={ownerSort.sortKey} currentDir={ownerSort.sortDir} onSort={ownerSort.handleSort} />
                                            <Th label="App"       sortKey="appearances"  currentKey={ownerSort.sortKey} currentDir={ownerSort.sortDir} onSort={ownerSort.handleSort} />
                                            <Th label="Total Pts" sortKey="total_points" currentKey={ownerSort.sortKey} currentDir={ownerSort.sortDir} onSort={ownerSort.handleSort} />
                                            <Th label="Avg Pts"   sortKey="avg_points"   currentKey={ownerSort.sortKey} currentDir={ownerSort.sortDir} onSort={ownerSort.handleSort} />
                                            <th>Seasons</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ownerSort.sorted.map(o => (
                                            <tr key={o.owner}>
                                                <td className="team">{o.owner}</td>
                                                <td className="num">{o.appearances}</td>
                                                <td className="num" style={{ color: 'var(--amber)' }}>{fmt(o.total_points)}</td>
                                                <td className="num" style={{ color: '#8a8c98' }}>{fmt(o.avg_points)}</td>
                                                <td className="num" style={{ color: '#8a8c98', fontSize: 11 }}>{o.seasons_str}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr style={{ borderTop: '2px solid #3a3d4a', background: '#0e0d1a' }}>
                                            <td style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, letterSpacing: 0, color: '#8a8c98' }}>TOTAL</td>
                                            <td className="num">{totalAppearances}</td>
                                            <td className="num" style={{ color: 'var(--amber)' }}>{fmt(totalPoints)}</td>
                                            <td className="num" style={{ color: '#8a8c98' }}>{fmt(totalPoints / totalAppearances)}</td>
                                            <td />
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    )}

                    {tab === 'gamelog' && hasBox && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, letterSpacing: 3, color: 'var(--amber)' }}>
                                FULL GAME LOG
                            </div>
                            <div className="table-wrap">
                                <table className="standings">
                                    <thead>
                                        <tr>
                                            <Th label="Season" sortKey="season"        currentKey={gameLogSort.sortKey} currentDir={gameLogSort.sortDir} onSort={gameLogSort.handleSort} />
                                            <Th label="Week"   sortKey="week"          currentKey={gameLogSort.sortKey} currentDir={gameLogSort.sortDir} onSort={gameLogSort.handleSort} />
                                            <Th label="Pts"    sortKey="points_scored" currentKey={gameLogSort.sortKey} currentDir={gameLogSort.sortDir} onSort={gameLogSort.handleSort} />
                                            <Th label="Owner"  sortKey="owner"         currentKey={gameLogSort.sortKey} currentDir={gameLogSort.sortDir} onSort={gameLogSort.handleSort} />
                                            <th>Type</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {gameLogSort.sorted.map((r, i) => (
                                            <tr key={i}>
                                                <td className="num">{r.season}</td>
                                                <td className="num" style={{ color: '#8a8c98' }}>W{r.week}</td>
                                                <td className="num" style={{ color: 'var(--amber)' }}>{fmt(r.points_scored)}</td>
                                                <td className="team">{r.owner}</td>
                                                <td className="num">
                                                    {r.is_playoffs
                                                        ? <span className="badge-tag gold">PO</span>
                                                        : <span style={{ color: '#8a8c98' }}>Reg</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

// ── Main export ───────────────────────────────────────────────────────────────

const MODES     = ['search', 'explore']
const MODE_LBLS = ['Player Search', 'Position Explorer']

export default function PlayerPage() {
    const [mode, setMode] = useState('search')

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
                background: 'linear-gradient(90deg, rgba(0,0,0,0.55), transparent 18%, transparent 82%, rgba(0,0,0,0.55))',
                zIndex: 20
            }} />
            <div style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(ellipse at 50% 38%, rgba(255,200,140,0.08), transparent 50%)',
                zIndex: 21
            }} />
            <div style={{
                position: 'absolute', top: 0, bottom: 0, left: '72%', width: 2,
                background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.4) 20%, rgba(0,0,0,0.4) 80%, transparent)',
                zIndex: 22
            }} />
            {Array.from({ length: 12 }, (_, i) => (
                <div key={i} className="placard-rivet"
                    style={{ left: 'calc(72% - 5px)', top: 40 + i * 56, width: 10, height: 10, zIndex: 22, opacity: 0.6 }} />
            ))}
            <div className="stencil-paint" style={{
                position: 'absolute', top: 24, left: 32,
                fontSize: 96, opacity: 0.18, color: '#0a0820', zIndex: 23, letterSpacing: '12px'
            }}>
                ROCKWOOD
            </div>

            <TopNav />

            <Placard
                variant="detached"
                tabs={MODE_LBLS}
                activeTab={MODES.indexOf(mode)}
                onTabChange={i => setMode(MODES[i])}
                title="PLAYERS"
                subtitle="SEARCH · POSITION EXPLORER"
            >
                {mode === 'search'  && <PlayerSearch />}
                {mode === 'explore' && <PositionExplorer />}
            </Placard>
        </Scene>
    )
}
