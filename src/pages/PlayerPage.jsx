import { useState, useCallback, useEffect } from 'react'
import { getPlayerHistory, getPositionSummary, getRandomPlayer } from '../api/boxscores'
import { searchPlayer as searchDraftHistory } from '../api/draft'

const fmt = (n) => Number(n).toFixed(1)

const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'D/ST']

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
            verticalAlign: 'middle',
        }}>
            {position || '?'}
        </span>
    )
}

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

// ── Position Explorer ─────────────────────────────────────────────────────────

function PositionExplorer() {
    const [selectedPos, setSelectedPos] = useState(null)
    const [data,        setData]        = useState(null)
    const [loading,     setLoading]     = useState(false)
    const [posTab,      setPosTab]      = useState('scoring')

    const topGamesSort    = useSortable(data?.top_games    || [], 'points_scored', 'desc')
    const mostRosteredSort= useSortable(data?.most_rostered|| [], 'appearances',   'desc')
    const mostDraftedSort = useSortable(data?.most_drafted || [], 'times_drafted', 'desc')
    const bySeasonSort    = useSortable(data?.by_season    || [], 'season',        'asc')
    const draftSeasonSort = useSortable(data?.draft_by_season || [], 'season',     'asc')

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Position selector */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {POSITIONS.map(pos => (
                    <button
                        key={pos}
                        onClick={() => handleSelectPos(pos)}
                        style={{
                            background: selectedPos === pos
                                ? POS_COLORS[pos]
                                : `${POS_COLORS[pos]}22`,
                            border: `1px solid ${POS_COLORS[pos]}66`,
                            borderRadius: 'var(--radius)',
                            color: selectedPos === pos ? '#fff' : POS_COLORS[pos],
                            fontFamily: 'var(--font-display)',
                            fontSize: '1.1rem',
                            letterSpacing: '0.08em',
                            padding: '0.5rem 1.25rem',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            minWidth: '70px',
                            textAlign: 'center',
                        }}
                    >
                        {pos}
                    </button>
                ))}
            </div>

            {loading && <div className="loading">Loading...</div>}

            {data && !loading && (
                <>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem' }}>
                        <h2 style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: '2rem',
                            letterSpacing: '0.05em',
                            color: POS_COLORS[selectedPos] || 'var(--color-text)',
                        }}>
                            {selectedPos}
                        </h2>
                        <span style={{
                            fontFamily: 'var(--font-condensed)',
                            color: 'var(--color-text-muted)',
                            fontSize: '0.85rem',
                        }}>
                            {data.scoring.total_appearances.toLocaleString()} appearances · 2018–2025
                        </span>
                    </div>

                    {/* Summary stat boxes */}
                    <div className="stat-boxes">
                        <div className="stat-box">
                            <div className="stat-box-value" style={{ color: POS_COLORS[selectedPos] }}>
                                {fmt(data.scoring.avg_points)}
                            </div>
                            <div className="stat-box-label">Avg Points</div>
                        </div>
                        <div className="stat-box">
                            <div className="stat-box-value" style={{ color: 'var(--color-win)' }}>
                                {fmt(data.scoring.max_points)}
                            </div>
                            <div className="stat-box-label">Best Game</div>
                        </div>
                        <div className="stat-box">
                            <div className="stat-box-value" style={{ color: 'var(--color-loss)' }}>
                                {fmt(data.scoring.min_points)}
                            </div>
                            <div className="stat-box-label">Worst Game</div>
                        </div>
                        <div className="stat-box">
                            <div className="stat-box-value">{fmt(data.scoring.stddev_points)}</div>
                            <div className="stat-box-label">Std Dev</div>
                        </div>
                        <div className="stat-box">
                            <div className="stat-box-value">{data.draft.times_drafted.toLocaleString()}</div>
                            <div className="stat-box-label">Times Drafted</div>
                        </div>
                        <div className="stat-box">
                            <div className="stat-box-value">{fmt(data.draft.avg_pick)}</div>
                            <div className="stat-box-label">Avg Draft Pick</div>
                        </div>
                        <div className="stat-box">
                            <div className="stat-box-value" style={{ color: 'var(--color-win)' }}>
                                #{data.draft.earliest_pick}
                            </div>
                            <div className="stat-box-label">Earliest Ever Drafted</div>
                        </div>
                        <div className="stat-box">
                            <div className="stat-box-value">{data.draft.keeper_count}</div>
                            <div className="stat-box-label">Keeper Picks</div>
                        </div>
                    </div>

                    {/* Sub-tabs */}
                    <div className="tab-nav">
                        {[
                            { key: 'scoring',  label: 'Top Performances' },
                            { key: 'rostered', label: 'Most Rostered' },
                            { key: 'draft',    label: 'Draft History' },
                            { key: 'trends',   label: 'Season Trends' },
                        ].map(t => (
                            <button
                                key={t.key}
                                onClick={() => setPosTab(t.key)}
                                className={`tab-btn${posTab === t.key ? ' active' : ''}`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Top Performances */}
                    {posTab === 'scoring' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div className="card">
                                <h2 className="card-title">Top 10 Single-Game Scores</h2>
                                <div className="table-wrap">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <Th label="Player"  sortKey="player_name"   currentKey={topGamesSort.sortKey} currentDir={topGamesSort.sortDir} onSort={topGamesSort.handleSort} />
                                                <Th label="Pts"     sortKey="points_scored" currentKey={topGamesSort.sortKey} currentDir={topGamesSort.sortDir} onSort={topGamesSort.handleSort} />
                                                <Th label="Owner"   sortKey="owner"         currentKey={topGamesSort.sortKey} currentDir={topGamesSort.sortDir} onSort={topGamesSort.handleSort} />
                                                <Th label="Season"  sortKey="season"        currentKey={topGamesSort.sortKey} currentDir={topGamesSort.sortDir} onSort={topGamesSort.handleSort} />
                                                <Th label="Week"    sortKey="week"          currentKey={topGamesSort.sortKey} currentDir={topGamesSort.sortDir} onSort={topGamesSort.handleSort} />
                                                <th>vs</th>
                                                <th>Type</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {topGamesSort.sorted.map((r, i) => (
                                                <tr key={i}>
                                                    <td style={{ color: 'var(--color-text-muted)' }}>{i + 1}</td>
                                                    <td style={{ fontWeight: 600 }}>{r.player_name}</td>
                                                    <td style={{ color: POS_COLORS[selectedPos], fontWeight: 700, fontSize: '1.05em' }}>
                                                        {fmt(r.points_scored)}
                                                    </td>
                                                    <td>{r.owner}</td>
                                                    <td>{r.season}</td>
                                                    <td style={{ color: 'var(--color-text-muted)' }}>W{r.week}</td>
                                                    <td style={{ color: 'var(--color-text-muted)' }}>{r.opponent}</td>
                                                    <td>
                                                        {r.is_playoffs
                                                            ? <span className="badge badge-champion">Playoffs</span>
                                                            : <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8em' }}>Reg</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="card">
                                <h2 className="card-title">Bottom 5 Single-Game Scores</h2>
                                <div className="table-wrap">
                                    <table>
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
                                                    <td style={{ fontWeight: 600 }}>{r.player_name}</td>
                                                    <td style={{ color: 'var(--color-loss)', fontWeight: 700 }}>
                                                        {fmt(r.points_scored)}
                                                    </td>
                                                    <td>{r.owner}</td>
                                                    <td>{r.season}</td>
                                                    <td style={{ color: 'var(--color-text-muted)' }}>W{r.week}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Most Rostered */}
                    {posTab === 'rostered' && (
                        <div className="card">
                            <h2 className="card-title">Most Rostered Players</h2>
                            <p style={{
                                fontFamily: 'var(--font-condensed)',
                                color: 'var(--color-text-muted)',
                                fontSize: '0.85rem',
                                marginBottom: '1rem',
                            }}>
                                Players who appeared most frequently on rosters · 2018–2025
                            </p>
                            <div className="table-wrap">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>#</th>
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
                                                <td style={{ color: 'var(--color-text-muted)' }}>{i + 1}</td>
                                                <td style={{ fontWeight: 600 }}>{r.player_name}</td>
                                                <td>{r.appearances}</td>
                                                <td style={{ color: POS_COLORS[selectedPos], fontWeight: 700 }}>
                                                    {fmt(r.total_points)}
                                                </td>
                                                <td style={{ color: 'var(--color-text-muted)' }}>{fmt(r.avg_points)}</td>
                                                <td style={{ color: 'var(--color-win)' }}>{fmt(r.best_game)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Draft History */}
                    {posTab === 'draft' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div className="card">
                                <h2 className="card-title">Most Drafted Players</h2>
                                <p style={{
                                    fontFamily: 'var(--font-condensed)',
                                    color: 'var(--color-text-muted)',
                                    fontSize: '0.85rem',
                                    marginBottom: '1rem',
                                }}>
                                    All seasons · 2009–2025
                                </p>
                                <div className="table-wrap">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <Th label="Player"       sortKey="player_name"   currentKey={mostDraftedSort.sortKey} currentDir={mostDraftedSort.sortDir} onSort={mostDraftedSort.handleSort} />
                                                <Th label="Times Drafted" sortKey="times_drafted" currentKey={mostDraftedSort.sortKey} currentDir={mostDraftedSort.sortDir} onSort={mostDraftedSort.handleSort} />
                                                <Th label="Avg Pick"     sortKey="avg_pick"      currentKey={mostDraftedSort.sortKey} currentDir={mostDraftedSort.sortDir} onSort={mostDraftedSort.handleSort} />
                                                <Th label="Best Pick"    sortKey="earliest_pick" currentKey={mostDraftedSort.sortKey} currentDir={mostDraftedSort.sortDir} onSort={mostDraftedSort.handleSort} />
                                                <Th label="First Seen"   sortKey="first_season"  currentKey={mostDraftedSort.sortKey} currentDir={mostDraftedSort.sortDir} onSort={mostDraftedSort.handleSort} />
                                                <Th label="Last Seen"    sortKey="last_season"   currentKey={mostDraftedSort.sortKey} currentDir={mostDraftedSort.sortDir} onSort={mostDraftedSort.handleSort} />
                                                <Th label="Keepers"      sortKey="keeper_count"  currentKey={mostDraftedSort.sortKey} currentDir={mostDraftedSort.sortDir} onSort={mostDraftedSort.handleSort} />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {mostDraftedSort.sorted.map((r, i) => (
                                                <tr key={i}>
                                                    <td style={{ color: 'var(--color-text-muted)' }}>{i + 1}</td>
                                                    <td style={{ fontWeight: 600 }}>{r.player_name}</td>
                                                    <td style={{ color: POS_COLORS[selectedPos], fontWeight: 700 }}>
                                                        {r.times_drafted}
                                                    </td>
                                                    <td style={{ color: 'var(--color-text-muted)' }}>#{fmt(r.avg_pick)}</td>
                                                    <td style={{ color: 'var(--color-win)' }}>#{r.earliest_pick}</td>
                                                    <td>{r.first_season}</td>
                                                    <td>{r.last_season}</td>
                                                    <td>
                                                        {r.keeper_count > 0
                                                            ? <span className="badge badge-champion">{r.keeper_count}</span>
                                                            : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Season Trends */}
                    {posTab === 'trends' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div className="card">
                                <h2 className="card-title">Scoring Trends by Season</h2>
                                <div className="table-wrap">
                                    <table>
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
                                                    <td style={{ fontWeight: 600 }}>{r.season}</td>
                                                    <td style={{ color: POS_COLORS[selectedPos], fontWeight: 700 }}>
                                                        {fmt(r.avg_points)}
                                                    </td>
                                                    <td style={{ color: 'var(--color-win)' }}>{fmt(r.max_points)}</td>
                                                    <td style={{ color: 'var(--color-text-muted)' }}>{r.unique_players}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="card">
                                <h2 className="card-title">Draft ADP Trend by Season</h2>
                                <div className="table-wrap">
                                    <table>
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
                                                    <td style={{ fontWeight: 600 }}>{r.season}</td>
                                                    <td style={{ color: POS_COLORS[selectedPos] }}>#{fmt(r.avg_pick)}</td>
                                                    <td style={{ color: 'var(--color-win)' }}>#{r.earliest_pick}</td>
                                                    <td style={{ color: 'var(--color-text-muted)' }}>{r.times_drafted}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
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

    const [randomPlayer,      setRandomPlayer]      = useState(null)
    const [randomLoading,     setRandomLoading]     = useState(true)
    const [randomRefreshing,  setRandomRefreshing]  = useState(false)

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Search form */}
            <div className="card">
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem' }}>
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
                            padding: '0.6rem 0.75rem',
                            outline: 'none',
                        }}
                    />
                    <button
                        type="submit"
                        disabled={searching || !query.trim()}
                        style={{
                            background: 'var(--color-accent)',
                            border: 'none',
                            borderRadius: 'var(--radius)',
                            color: '#fff',
                            fontFamily: 'var(--font-condensed)',
                            fontSize: '0.9rem',
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                            padding: '0.6rem 1.5rem',
                            cursor: (searching || !query.trim()) ? 'not-allowed' : 'pointer',
                            opacity: (searching || !query.trim()) ? 0.5 : 1,
                            textTransform: 'uppercase',
                            flexShrink: 0,
                        }}
                    >
                        {searching ? 'Searching...' : 'Search'}
                    </button>
                </form>
                {error && (
                    <p style={{ color: 'var(--color-loss)', marginTop: '0.75rem', fontSize: '0.85rem' }}>
                        {error}
                    </p>
                )}
            </div>

            {/* Random player card */}
            {!hasAny && (
                <div className="card" style={{ marginTop: '0.5rem' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '1.25rem',
                    }}>
                        <h2 className="card-title" style={{ margin: 0 }}>
                            ✦ Featured Player
                        </h2>
                        <button
                            onClick={handleRefreshRandom}
                            disabled={randomRefreshing || randomLoading}
                            style={{
                                background: 'var(--color-surface-2)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius)',
                                color: randomRefreshing ? 'var(--color-text-muted)' : 'var(--color-accent)',
                                fontFamily: 'var(--font-condensed)',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                letterSpacing: '0.08em',
                                padding: '0.35rem 0.85rem',
                                cursor: randomRefreshing ? 'wait' : 'pointer',
                                textTransform: 'uppercase',
                                transition: 'all 0.15s',
                            }}
                        >
                            {randomRefreshing ? 'Loading...' : '↻ New Player'}
                        </button>
                    </div>

                    {randomLoading ? (
                        <div style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-condensed)', padding: '1rem 0' }}>
                            Loading...
                        </div>
                    ) : randomPlayer ? (
                        <>
                            {/* Player name + position */}
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '1.25rem' }}>
                                <span style={{
                                    fontFamily: 'var(--font-display)',
                                    fontSize: '1.75rem',
                                    letterSpacing: '0.05em',
                                    color: 'var(--color-text)',
                                }}>
                                    {randomPlayer.player_name}
                                </span>
                                <PosBadge position={randomPlayer.position} />
                                <span style={{
                                    fontFamily: 'var(--font-condensed)',
                                    fontSize: '0.8rem',
                                    color: 'var(--color-text-muted)',
                                }}>
                                    {randomPlayer.seasons?.[0]}
                                    {randomPlayer.seasons?.length > 1 && `–${randomPlayer.seasons[randomPlayer.seasons.length - 1]}`}
                                </span>
                            </div>

                            {/* Stat grid */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                                gap: '0.75rem',
                                marginBottom: '1.25rem',
                            }}>
                                {[
                                    { label: 'Avg Pts',     value: fmt(randomPlayer.avg_points),   accent: true },
                                    { label: 'Best Game',   value: fmt(randomPlayer.best_game),    color: 'var(--color-win)' },
                                    { label: 'Total Pts',   value: fmt(randomPlayer.total_points), accent: false },
                                    { label: 'Appearances', value: randomPlayer.appearances,        accent: false },
                                    { label: 'Times Drafted', value: randomPlayer.draft?.times_drafted ?? '—', accent: false },
                                    { label: 'Avg Pick',    value: randomPlayer.draft?.avg_pick ? `#${fmt(randomPlayer.draft.avg_pick)}` : '—', accent: false },
                                ].map(({ label, value, accent, color }) => (
                                    <div key={label} className="stat-box">
                                        <div className="stat-box-value" style={{
                                            fontSize: '1.3rem',
                                            color: color || (accent ? 'var(--color-accent)' : 'var(--color-text)'),
                                        }}>
                                            {value}
                                        </div>
                                        <div className="stat-box-label">{label}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Best game detail */}
                            {randomPlayer.best_game_detail && (
                                <div style={{
                                    background: 'var(--color-surface-2)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: 'var(--radius)',
                                    padding: '0.75rem 1rem',
                                    marginBottom: '0.75rem',
                                    fontFamily: 'var(--font-condensed)',
                                    fontSize: '0.85rem',
                                    color: 'var(--color-text-muted)',
                                }}>
                                    <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>Best game: </span>
                                    <span style={{ color: 'var(--color-win)', fontWeight: 700 }}>
                                        {fmt(randomPlayer.best_game_detail.points_scored)} pts
                                    </span>
                                    {' '}— {randomPlayer.best_game_detail.season} W{randomPlayer.best_game_detail.week}
                                    {' '}for <span style={{ color: 'var(--color-text)' }}>{randomPlayer.best_game_detail.owner}</span>
                                    {' '}vs {randomPlayer.best_game_detail.opponent}
                                    {randomPlayer.best_game_detail.is_playoffs && (
                                        <span className="badge badge-champion" style={{ marginLeft: '0.5rem' }}>Playoffs</span>
                                    )}
                                </div>
                            )}

                            {/* Top owner */}
                            {randomPlayer.top_owner && (
                                <div style={{
                                    fontFamily: 'var(--font-condensed)',
                                    fontSize: '0.85rem',
                                    color: 'var(--color-text-muted)',
                                }}>
                                    Most rostered by{' '}
                                    <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>
                                        {randomPlayer.top_owner.owner}
                                    </span>
                                    {' '}({randomPlayer.top_owner.appearances} appearances)
                                </div>
                            )}
                        </>
                    ) : null}
                </div>
            )}

            {/* No results */}
            {boxData && draftData && !hasAny && (
                <div className="card">
                    <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-condensed)' }}>
                        No results for "{query}"
                    </p>
                </div>
            )}

            {hasAny && (
                <>
                    {/* Player header */}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap' }}>
                        <h2 style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: '2rem',
                            letterSpacing: '0.05em',
                            color: 'var(--color-text)',
                        }}>
                            {playerName}
                        </h2>
                        {position && <PosBadge position={position} />}
                        {hasDraft && (
                            <span style={{ fontFamily: 'var(--font-condensed)', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                                Drafted {draftCount} time{draftCount !== 1 ? 's' : ''}
                            </span>
                        )}
                        {hasBox && (
                            <span style={{ fontFamily: 'var(--font-condensed)', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                                · {boxData.total_appearances} weeks of scoring data
                            </span>
                        )}
                    </div>

                    {/* Tabs */}
                    <div className="tab-nav">
                        {availableTabs.map(t => (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                className={`tab-btn${tab === t.key ? ' active' : ''}`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Draft History */}
                    {tab === 'draft' && hasDraft && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div className="stat-boxes">
                                <div className="stat-box">
                                    <div className="stat-box-value" style={{ color: 'var(--color-accent)' }}>{draftCount}</div>
                                    <div className="stat-box-label">Times Drafted</div>
                                </div>
                                <div className="stat-box">
                                    <div className="stat-box-value">{adp ? fmt(adp) : '—'}</div>
                                    <div className="stat-box-label">Avg Pick</div>
                                </div>
                                <div className="stat-box">
                                    <div className="stat-box-value" style={{ color: 'var(--color-win)' }}>#{earliestPick}</div>
                                    <div className="stat-box-label">Earliest Pick</div>
                                </div>
                                <div className="stat-box">
                                    <div className="stat-box-value" style={{ color: 'var(--color-loss)' }}>#{latestPick}</div>
                                    <div className="stat-box-label">Latest Pick</div>
                                </div>
                                <div className="stat-box">
                                    <div className="stat-box-value">{keeperCount}</div>
                                    <div className="stat-box-label">Keeper Picks</div>
                                </div>
                            </div>
                            <div className="card">
                                <div className="table-wrap">
                                    <table>
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
                                                    <td>{r.season}</td>
                                                    <td style={{ fontWeight: 600 }}>{r.owner}</td>
                                                    <td style={{ color: 'var(--color-accent)', fontWeight: 700 }}>#{r.overall_pick}</td>
                                                    <td style={{ color: 'var(--color-text-muted)' }}>R{r.round_num}</td>
                                                    <td style={{ color: 'var(--color-text-muted)' }}>{r.pick_in_round}</td>
                                                    <td>
                                                        {r.is_keeper
                                                            ? <span className="badge badge-champion">Keeper</span>
                                                            : <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8em' }}>—</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Scoring */}
                    {tab === 'scoring' && hasBox && (
                        <div className="card">
                            <h2 className="card-title">By Owner</h2>
                            <div className="table-wrap">
                                <table>
                                    <thead>
                                        <tr>
                                            <Th label="Owner"       sortKey="owner"        currentKey={ownerSort.sortKey} currentDir={ownerSort.sortDir} onSort={ownerSort.handleSort} />
                                            <Th label="Appearances" sortKey="appearances"  currentKey={ownerSort.sortKey} currentDir={ownerSort.sortDir} onSort={ownerSort.handleSort} />
                                            <Th label="Total Pts"   sortKey="total_points" currentKey={ownerSort.sortKey} currentDir={ownerSort.sortDir} onSort={ownerSort.handleSort} />
                                            <Th label="Avg Pts"     sortKey="avg_points"   currentKey={ownerSort.sortKey} currentDir={ownerSort.sortDir} onSort={ownerSort.handleSort} />
                                            <th>Seasons</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ownerSort.sorted.map(o => (
                                            <tr key={o.owner}>
                                                <td style={{ fontWeight: 600 }}>{o.owner}</td>
                                                <td>{o.appearances}</td>
                                                <td style={{ color: 'var(--color-accent)', fontWeight: 700 }}>{fmt(o.total_points)}</td>
                                                <td style={{ color: 'var(--color-text-muted)' }}>{fmt(o.avg_points)}</td>
                                                <td style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', fontFamily: 'var(--font-condensed)' }}>
                                                    {o.seasons_str}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr style={{ borderTop: '2px solid var(--color-border)', background: 'var(--color-surface-2)' }}>
                                            <td style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Total</td>
                                            <td style={{ fontWeight: 700 }}>{totalAppearances}</td>
                                            <td style={{ color: 'var(--color-accent)', fontWeight: 700 }}>{fmt(totalPoints)}</td>
                                            <td style={{ color: 'var(--color-text-muted)' }}>{fmt(totalPoints / totalAppearances)}</td>
                                            <td />
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Game Log */}
                    {tab === 'gamelog' && hasBox && (
                        <div className="card">
                            <h2 className="card-title">Full Game Log</h2>
                            <div className="table-wrap">
                                <table>
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
                                                <td>{r.season}</td>
                                                <td style={{ color: 'var(--color-text-muted)' }}>W{r.week}</td>
                                                <td style={{ color: 'var(--color-accent)', fontWeight: 700 }}>{fmt(r.points_scored)}</td>
                                                <td style={{ fontWeight: 600 }}>{r.owner}</td>
                                                <td>
                                                    {r.is_playoffs
                                                        ? <span className="badge badge-champion">Playoffs</span>
                                                        : <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8em' }}>Reg</span>}
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

export default function PlayerPage() {
    const [mode, setMode] = useState('search')

    return (
        <main className="page">
            <div className="page-header">
                <h1 className="page-title">Players</h1>
                <p className="page-subtitle">
                    Search individual players · Explore by position
                </p>
            </div>

            {/* Mode toggle */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {[
                    { key: 'search',  label: 'Player Search' },
                    { key: 'explore', label: 'Position Explorer' },
                ].map(m => (
                    <button
                        key={m.key}
                        onClick={() => setMode(m.key)}
                        style={{
                            background: mode === m.key ? 'var(--color-accent)' : 'var(--color-surface-2)',
                            border: `1px solid ${mode === m.key ? 'var(--color-accent)' : 'var(--color-border)'}`,
                            borderRadius: 'var(--radius)',
                            color: mode === m.key ? '#fff' : 'var(--color-text-muted)',
                            fontFamily: 'var(--font-condensed)',
                            fontSize: '0.9rem',
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                            padding: '0.5rem 1.25rem',
                            cursor: 'pointer',
                            textTransform: 'uppercase',
                            transition: 'all 0.15s ease',
                        }}
                    >
                        {m.label}
                    </button>
                ))}
            </div>

            {mode === 'search'  && <PlayerSearch />}
            {mode === 'explore' && <PositionExplorer />}
        </main>
    )
}
