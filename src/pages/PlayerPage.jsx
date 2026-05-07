import { useState, useCallback } from 'react'
import { getPlayerHistory } from '../api/boxscores'
import { searchPlayer as searchDraftHistory } from '../api/draft'

const fmt = (n) => Number(n).toFixed(1)

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

export default function PlayerPage() {
    const [query,     setQuery]     = useState('')
    const [boxData,   setBoxData]   = useState(null)
    const [draftData, setDraftData] = useState(null)
    const [searching, setSearching] = useState(false)
    const [error,     setError]     = useState(null)
    const [tab,       setTab]       = useState('draft')

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

    // ── Draft stats ───────────────────────────────────────────────────────────
    const draftResults = draftData?.results || []
    const draftCount   = draftResults.length
    const adp          = draftCount > 0
        ? draftResults.reduce((a, r) => a + r.overall_pick, 0) / draftCount
        : null
    const earliestPick = draftCount > 0 ? Math.min(...draftResults.map(r => r.overall_pick)) : null
    const latestPick   = draftCount > 0 ? Math.max(...draftResults.map(r => r.overall_pick)) : null
    const keeperCount  = draftResults.filter(r => r.is_keeper).length

    // ── Box stats ─────────────────────────────────────────────────────────────
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

    // Build available tabs based on what data exists
    const availableTabs = [
        hasDraft && { key: 'draft',   label: 'Draft History' },
        hasBox   && { key: 'scoring', label: 'Scoring' },
        hasBox   && { key: 'gamelog', label: 'Game Log' },
    ].filter(Boolean)

    return (
        <main className="page">
            <div className="page-header">
                <h1 className="page-title">Player Lookup</h1>
                <p className="page-subtitle">
                    Draft history (all seasons) · Box score data (2018–2025)
                </p>
            </div>

            {/* Search */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
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

            {/* No results */}
            {boxData && draftData && !hasAny && (
                <div className="card">
                    <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-condensed)' }}>
                        No results for "{query}" in draft or box score data.
                    </p>
                </div>
            )}

            {hasAny && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

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

                    {/* Tab nav */}
                    <div className="tab-nav" style={{ marginBottom: '0' }}>
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

                    {/* ── Draft History tab ─────────────────────────────────── */}
                    {tab === 'draft' && hasDraft && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {/* Stat boxes */}
                            <div className="stat-boxes">
                                <div className="stat-box">
                                    <div className="stat-box-value" style={{ color: 'var(--color-accent)' }}>
                                        {draftCount}
                                    </div>
                                    <div className="stat-box-label">Times Drafted</div>
                                </div>
                                <div className="stat-box">
                                    <div className="stat-box-value">{adp ? fmt(adp) : '—'}</div>
                                    <div className="stat-box-label">Avg Pick</div>
                                </div>
                                <div className="stat-box">
                                    <div className="stat-box-value" style={{ color: 'var(--color-win)' }}>
                                        #{earliestPick}
                                    </div>
                                    <div className="stat-box-label">Earliest Pick</div>
                                </div>
                                <div className="stat-box">
                                    <div className="stat-box-value" style={{ color: 'var(--color-loss)' }}>
                                        #{latestPick}
                                    </div>
                                    <div className="stat-box-label">Latest Pick</div>
                                </div>
                                <div className="stat-box">
                                    <div className="stat-box-value">{keeperCount}</div>
                                    <div className="stat-box-label">Keeper Picks</div>
                                </div>
                            </div>

                            {/* Draft log */}
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
                                                    <td style={{ color: 'var(--color-accent)', fontWeight: 700 }}>
                                                        #{r.overall_pick}
                                                    </td>
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

                    {/* ── Scoring tab ───────────────────────────────────────── */}
                    {tab === 'scoring' && hasBox && (
                        <div className="card">
                            <h2 className="card-title">By Owner</h2>
                            <p style={{
                                fontFamily: 'var(--font-condensed)',
                                color: 'var(--color-text-muted)',
                                fontSize: '0.85rem',
                                marginBottom: '1rem',
                            }}>
                                {boxData.total_appearances} weeks of scoring data · 2018–2025
                            </p>
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
                                                <td style={{ color: 'var(--color-accent)', fontWeight: 700 }}>
                                                    {fmt(o.total_points)}
                                                </td>
                                                <td style={{ color: 'var(--color-text-muted)' }}>
                                                    {fmt(o.avg_points)}
                                                </td>
                                                <td style={{
                                                    color: 'var(--color-text-muted)',
                                                    fontSize: '0.8rem',
                                                    fontFamily: 'var(--font-condensed)',
                                                }}>
                                                    {o.seasons_str}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr style={{ borderTop: '2px solid var(--color-border)', background: 'var(--color-surface-2)' }}>
                                            <td style={{
                                                fontFamily: 'var(--font-condensed)',
                                                fontWeight: 700,
                                                letterSpacing: '0.08em',
                                                textTransform: 'uppercase',
                                                fontSize: '0.75rem',
                                                color: 'var(--color-text-muted)',
                                            }}>Total</td>
                                            <td style={{ fontWeight: 700 }}>{totalAppearances}</td>
                                            <td style={{ color: 'var(--color-accent)', fontWeight: 700 }}>
                                                {fmt(totalPoints)}
                                            </td>
                                            <td style={{ color: 'var(--color-text-muted)' }}>
                                                {fmt(totalPoints / totalAppearances)}
                                            </td>
                                            <td />
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ── Game Log tab ──────────────────────────────────────── */}
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
                                                <td style={{ color: 'var(--color-accent)', fontWeight: 700 }}>
                                                    {fmt(r.points_scored)}
                                                </td>
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

                </div>
            )}
        </main>
    )
}
