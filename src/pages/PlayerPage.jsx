import { useState, useCallback, useEffect } from 'react'
import { getPositionSummary, getRandomPlayer } from '../api/boxscores'
import { searchPlayers, getPlayer } from '../api/players'
import Scene from '../components/Scene'
import DataBackdrop from '../components/DataBackdrop'
import TopNav from '../components/TopNav'
import Placard from '../components/Placard'
import PlayerTransactions from '../components/PlayerTransactions'
import SortTh from '../components/SortTh'
import PosChip, { KeeperTag } from '../components/PosChip'
import { competitionRanks } from '../utils/ranks'
import { useTieFold } from '../utils/tieFold'
import GameTag from '../components/GameTag'
import TieFoldLine from '../components/TieFoldLine'

const fmt = (n) => Number(n).toFixed(1)

const cx = (...names) => names.filter(Boolean).join(' ')

const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'D/ST']

// The seasons a player appears in Rockwood data, as "2010–2014" (or "2018" for one season): tells
// same-name players apart in the "Which one?" list
const yearSpan = (seasons) =>
    seasons.length > 1 ? `${seasons[0]}–${seasons[seasons.length - 1]}` : String(seasons[0])

// A stat tile in the graphics' "Worst claim" recipe: the value big, its label in caps beneath
function MiniStat({ label, value }) {
    return (
        <div className="rw-tile">
            <div className="v">{value}</div>
            <div className="l">{label}</div>
        </div>
    )
}

// Rank cell for a list ranked on its sorted column: repeats muted, tie runs get the amber line
const tieInfo = (ranks, i) => {
    const rep = i > 0 && ranks[i - 1] === ranks[i]
    return { rep, tie: rep || ranks[i + 1] === ranks[i] }
}
const RankCell = ({ ranks, i }) => <td className={cx('rank', tieInfo(ranks, i).rep && 'rep')}>{ranks[i]}</td>

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

const TEXT_KEYS = new Set(['player_name', 'owner'])
const Th = ({ label, sortKey, sort, className }) => (
    <SortTh label={label} sortKey={sortKey} sort={sort} text={TEXT_KEYS.has(sortKey)} className={className} />
)

// ── Position Explorer ─────────────────────────────────────────────────────────

function PositionExplorer() {
    const [selectedPos, setSelectedPos] = useState(null)
    const [data,        setData]        = useState(null)
    const [loading,     setLoading]     = useState(false)
    const [posTab,      setPosTab]      = useState('scoring')

    const topGamesSort    = useSortable(data?.top_games       || [], 'points_scored', 'desc')
    const mostRosteredSort= useSortable(data?.most_rostered   || [], 'appearances',   'desc')
    const mostDraftedSort = useSortable(data?.most_drafted    || [], 'times_drafted', 'desc')
    // 3+ rows tied at a list's cutoff fold into one line
    const topGamesFold     = useTieFold(data?.top_games, 10)
    const bottomGamesFold  = useTieFold(data?.bottom_games, 5)
    const mostRosteredFold = useTieFold(data?.most_rostered, 10)
    const mostDraftedFold  = useTieFold(data?.most_drafted, 10)
    // Rows shown, and their # column: equal values of the sorted column share a rank
    const shownRanked = (s, fold) => {
        const rows = fold.shown(s.sorted)
        return [rows, competitionRanks(rows, r => r[s.sortKey])]
    }
    const [topGamesRows,     topGamesRanks]     = shownRanked(topGamesSort, topGamesFold)
    const [mostRosteredRows, mostRosteredRanks] = shownRanked(mostRosteredSort, mostRosteredFold)
    const [mostDraftedRows,  mostDraftedRanks]  = shownRanked(mostDraftedSort, mostDraftedFold)
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

    const keyCls = (sort, key, rank) => cx('num', sort.sortKey === key && 'key mk', sort.sortKey === key && rank === 1 && 'top')

    return (
        <div className="rw-stack" style={{ width: 'min(900px, 100%)', display: 'flex', flexDirection: 'column', gap: 16 }}>

            <div className="rw-seg" role="group" aria-label="Position">
                {POSITIONS.map(pos => (
                    <button key={pos} type="button" onClick={() => handleSelectPos(pos)} className={selectedPos === pos ? 'on' : undefined} aria-pressed={selectedPos === pos} style={{ minWidth: 60 }}>
                        {pos}
                    </button>
                ))}
            </div>

            {loading && <div className="rw-loading">Loading...</div>}

            {data && !loading && (
                <>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                        <span className="rw-title" style={{ fontSize: 30 }}>{selectedPos}</span>
                        <span className="rw-sub">{data.scoring.total_appearances.toLocaleString()} APPEARANCES · 2018–2025</span>
                    </div>

                    <div className="rw-tiles" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
                        <MiniStat label="Avg Points"    value={fmt(data.scoring.avg_points)} />
                        <MiniStat label="Best Game"     value={fmt(data.scoring.max_points)} />
                        <MiniStat label="Worst Game"    value={fmt(data.scoring.min_points)} />
                        <MiniStat label="Std Dev"       value={fmt(data.scoring.stddev_points)} />
                        <MiniStat label="Times Drafted" value={data.draft.times_drafted.toLocaleString()} />
                        <MiniStat label="Avg Pick"      value={`#${fmt(data.draft.avg_pick)}`} />
                        <MiniStat label="Earliest Pick" value={`#${data.draft.earliest_pick}`} />
                        <MiniStat label="Keeper Picks"  value={data.draft.keeper_count} />
                    </div>

                    <div className="rw-seg">
                        {[
                            { key: 'scoring',  label: 'Top Performances' },
                            { key: 'rostered', label: 'Most Rostered' },
                            { key: 'draft',    label: 'Draft History' },
                            { key: 'trends',   label: 'Season Trends' },
                        ].map(t => (
                            <button key={t.key} type="button" onClick={() => setPosTab(t.key)} className={posTab === t.key ? 'on' : undefined} aria-pressed={posTab === t.key}>
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {posTab === 'scoring' && (
                        <>
                            <div className="rw-block">
                                <h2 className="rw-label">Top 10 Single-Game Scores</h2>
                                <div className="table-wrap">
                                    <table className="rw-table rw-ranked rw-2line" style={{ width: '100%' }}>
                                        <thead>
                                            <tr>
                                                <th className="num">#</th>
                                                <Th label="Player"  sortKey="player_name"   sort={topGamesSort} />
                                                <Th label="Pts"     sortKey="points_scored" sort={topGamesSort} />
                                                <Th label="Owner"   sortKey="owner"         sort={topGamesSort} />
                                                <Th label="Season"  sortKey="season"        sort={topGamesSort} />
                                                <Th label="Week"    sortKey="week"          sort={topGamesSort} />
                                                <th>Opp</th>
                                                <th>Type</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {topGamesRows.map((r, i) => (
                                                <tr key={i} className={tieInfo(topGamesRanks, i).tie ? 'tie' : undefined}>
                                                    <RankCell ranks={topGamesRanks} i={i} />
                                                    <td className="name m1">{r.player_name}</td>
                                                    <td className={cx('num key mk', i === 0 && topGamesSort.sortKey === 'points_scored' && topGamesSort.sortDir === 'desc' && 'top')}>{fmt(r.points_scored)}</td>
                                                    <td className="name m2 m2s">{r.owner}</td>
                                                    <td className="num meta m2 p-dot">{r.season}</td>
                                                    <td className="num meta m2 p-sp">W{r.week}</td>
                                                    <td className="soft m2 p-lbl" data-ml="vs">{r.opponent}</td>
                                                    <td className="m2 m-tag p-dot">
                                                        <GameTag game={r} regular={<span className="meta">Reg</span>} />
                                                    </td>
                                                </tr>
                                            ))}
                                            <TieFoldLine data fold={topGamesFold} format={r => fmt(r.points_scored)} colSpan={8} />
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="rw-block">
                                <h2 className="rw-label">Bottom 5 Single-Game Scores</h2>
                                <div className="table-wrap">
                                    <table className="rw-table rw-ranked rw-2line rw-norank" style={{ width: '100%' }}>
                                        <thead>
                                            <tr>
                                                <Th label="Player"  sortKey="player_name"   sort={topGamesSort} />
                                                <Th label="Pts"     sortKey="points_scored" sort={topGamesSort} />
                                                <Th label="Owner"   sortKey="owner"         sort={topGamesSort} />
                                                <Th label="Season"  sortKey="season"        sort={topGamesSort} />
                                                <th className="num">Week</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {bottomGamesFold.shown(data.bottom_games).map((r, i) => (
                                                <tr key={i}>
                                                    <td className="name m1">{r.player_name}</td>
                                                    <td className="num key mk">{fmt(r.points_scored)}</td>
                                                    <td className="name m2 m2s">{r.owner}</td>
                                                    <td className="num meta m2 p-dot">{r.season}</td>
                                                    <td className="num meta m2 p-sp">W{r.week}</td>
                                                </tr>
                                            ))}
                                            <TieFoldLine data fold={bottomGamesFold} format={r => fmt(r.points_scored)} colSpan={5} />
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}

                    {posTab === 'rostered' && (
                        <div className="rw-block">
                            <h2 className="rw-label">Most Rostered Players</h2>
                            <p className="rw-note">Players appearing most frequently on rosters · 2018–2025</p>
                            <div className="table-wrap">
                                <table className="rw-table rw-ranked rw-2line" style={{ width: '100%' }}>
                                    <thead>
                                        <tr>
                                            <th className="num">#</th>
                                            <Th label="Player"      sortKey="player_name"  sort={mostRosteredSort} />
                                            <Th label="Appearances" sortKey="appearances"  sort={mostRosteredSort} />
                                            <Th label="Total Pts"   sortKey="total_points" sort={mostRosteredSort} />
                                            <Th label="Avg Pts"     sortKey="avg_points"   sort={mostRosteredSort} />
                                            <Th label="Best Game"   sortKey="best_game"    sort={mostRosteredSort} />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {mostRosteredRows.map((r, i) => (
                                            <tr key={i} className={tieInfo(mostRosteredRanks, i).tie ? 'tie' : undefined}>
                                                <RankCell ranks={mostRosteredRanks} i={i} />
                                                <td className="name m1">{r.player_name}</td>
                                                <td className={cx(keyCls(mostRosteredSort, 'appearances', mostRosteredRanks[i]), 'm1 p-dot')}>{r.appearances}</td>
                                                <td className="num m2 m2s p-lbl" data-ml="Total">{fmt(r.total_points)}</td>
                                                <td className="num meta m2 p-lbl" data-ml="Avg">{fmt(r.avg_points)}</td>
                                                <td className="num m2 p-lbl" data-ml="Best">{fmt(r.best_game)}</td>
                                            </tr>
                                        ))}
                                        <TieFoldLine data fold={mostRosteredFold} format={r => r.appearances} colSpan={6} />
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {posTab === 'draft' && (
                        <div className="rw-block">
                            <h2 className="rw-label">Most Drafted Players</h2>
                            <p className="rw-note">All seasons · 2009–2025</p>
                            <div className="table-wrap">
                                <table className="rw-table rw-ranked rw-2line" style={{ width: '100%' }}>
                                    <thead>
                                        <tr>
                                            <th className="num">#</th>
                                            <Th label="Player"        sortKey="player_name"   sort={mostDraftedSort} />
                                            <Th label="Times Drafted" sortKey="times_drafted" sort={mostDraftedSort} />
                                            <Th label="Avg Pick"      sortKey="avg_pick"      sort={mostDraftedSort} />
                                            <Th label="Best Pick"     sortKey="earliest_pick" sort={mostDraftedSort} />
                                            <Th label="First Seen"    sortKey="first_season"  sort={mostDraftedSort} />
                                            <Th label="Last Seen"     sortKey="last_season"   sort={mostDraftedSort} />
                                            <Th label="Keepers"       sortKey="keeper_count"  sort={mostDraftedSort} />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {mostDraftedRows.map((r, i) => (
                                            <tr key={i} className={tieInfo(mostDraftedRanks, i).tie ? 'tie' : undefined}>
                                                <RankCell ranks={mostDraftedRanks} i={i} />
                                                <td className="name m1">{r.player_name}</td>
                                                <td className={cx(keyCls(mostDraftedSort, 'times_drafted', mostDraftedRanks[i]), 'm1 p-dot')}>{r.times_drafted}</td>
                                                <td className="num meta m2 m2s p-lbl" data-ml="Avg pick">#{fmt(r.avg_pick)}</td>
                                                <td className="num m2 p-lbl" data-ml="Best">#{r.earliest_pick}</td>
                                                <td className="num meta m2 p-dot">{r.first_season}</td>
                                                <td className="num meta m2 p-dash">{r.last_season}</td>
                                                <td className="num m2 m-opt p-lbl" data-ml="Keepers">
                                                    {r.keeper_count > 0
                                                        ? <span className="rw-tag-po">{r.keeper_count}</span>
                                                        : <span className="dash">—</span>}
                                                </td>
                                            </tr>
                                        ))}
                                        <TieFoldLine data fold={mostDraftedFold} format={r => r.times_drafted} colSpan={8} />
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {posTab === 'trends' && (
                        <>
                            <div className="rw-block">
                                <h2 className="rw-label">Scoring Trends by Season</h2>
                                <div className="table-wrap">
                                    <table className="rw-table rw-board" style={{ width: '100%' }}>
                                        <thead>
                                            <tr>
                                                <Th label="Season"         sortKey="season"         sort={bySeasonSort} />
                                                <Th label="Avg Pts"        sortKey="avg_points"     sort={bySeasonSort} />
                                                <Th label="Best Game"      sortKey="max_points"     sort={bySeasonSort} />
                                                <Th label="Unique Players" sortKey="unique_players" sort={bySeasonSort} />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {bySeasonSort.sorted.map((r, i) => (
                                                <tr key={i}>
                                                    <td className="num name">{r.season}</td>
                                                    <td className="num key">{fmt(r.avg_points)}</td>
                                                    <td className="num">{fmt(r.max_points)}</td>
                                                    <td className="num meta">{r.unique_players}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="rw-block">
                                <h2 className="rw-label">Draft ADP Trend by Season</h2>
                                <div className="table-wrap">
                                    <table className="rw-table rw-board" style={{ width: '100%' }}>
                                        <thead>
                                            <tr>
                                                <Th label="Season"        sortKey="season"        sort={draftSeasonSort} />
                                                <Th label="Avg Pick"      sortKey="avg_pick"      sort={draftSeasonSort} />
                                                <Th label="Earliest Pick" sortKey="earliest_pick" sort={draftSeasonSort} />
                                                <Th label="Times Drafted" sortKey="times_drafted" sort={draftSeasonSort} />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {draftSeasonSort.sorted.map((r, i) => (
                                                <tr key={i}>
                                                    <td className="num name">{r.season}</td>
                                                    <td className="num key">#{fmt(r.avg_pick)}</td>
                                                    <td className="num">#{r.earliest_pick}</td>
                                                    <td className="num meta">{r.times_drafted}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    )
}

// ── Player Search ─────────────────────────────────────────────────────────────

function PlayerSearch() {
    const [query,            setQuery]            = useState('')
    const [boxData,          setBoxData]          = useState(null)
    const [draftData,        setDraftData]        = useState(null)
    const [txnData,          setTxnData]          = useState(null)
    const [ambiguousPlayers, setAmbiguousPlayers] = useState(null)
    const [searching,        setSearching]        = useState(false)
    const [error,            setError]            = useState(null)
    const [tab,              setTab]              = useState('draft')

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
        if (query.trim().length < 2) return
        setSearching(true)
        setError(null)
        setTab('draft')
        setBoxData(null)
        setDraftData(null)
        setTxnData(null)
        setAmbiguousPlayers(null)
        try {
            // One row per ESPN player id whose name matches; several → the "which one?" list
            const { players } = await searchPlayers(query.trim())
            if (players.length > 1) {
                setAmbiguousPlayers(players.map(p => ({ ...p, name: p.player_name })))
            } else if (players.length === 1) {
                await showPlayer(players[0].espn_player_id)
            } else {
                setBoxData({ results: [], total_appearances: 0 })
                setDraftData({ results: [], times_drafted: 0 })
            }
        } catch (err) {
            setError('Search failed — try again')
        } finally {
            setSearching(false)
        }
    }

    // The player's card: starts, draft picks and adds/drops, in one call by ESPN player id
    const showPlayer = async (espnPlayerId) => {
        const p = await getPlayer(espnPlayerId)
        setBoxData(p.box)
        setDraftData(p.draft)
        setTxnData(p.transactions)
    }

    const handleSelectPlayer = async (player) => {
        try {
            await showPlayer(player.espn_player_id)
            setAmbiguousPlayers(null)
        } catch {
            setError('Search failed — try again')
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

    const hasTxns = txnData?.results?.length > 0

    const availableTabs = [
        hasDraft && { key: 'draft',   label: 'Draft History' },
        hasBox   && { key: 'scoring', label: 'Scoring' },
        hasBox   && { key: 'gamelog', label: 'Game Log' },
        hasTxns  && { key: 'moves',   label: 'Transactions' },
    ].filter(Boolean)

    return (
        <div className="rw-stack" style={{ width: 'min(900px, 100%)', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <form onSubmit={handleSearch} className="rw-search" style={{ margin: 0 }}>
                <input
                    type="text"
                    className="rw-input"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search player name..."
                    aria-label="Player name"
                />
                <button type="submit" className="rw-btn" disabled={searching || query.trim().length < 2}>
                    {searching ? '...' : 'Search'}
                </button>
            </form>

            {error && <p className="rw-note" style={{ color: 'var(--loss)', margin: 0 }}>{error}</p>}

            {ambiguousPlayers && (
                <div>
                    <h2 className="rw-label">Which one?</h2>
                    <div className="rw-choose">
                        {ambiguousPlayers.map(p => (
                            <button key={p.espn_player_id} type="button" onClick={() => handleSelectPlayer(p)}>
                                <PosChip position={p.position} />
                                <span className="who">
                                    {p.name}
                                    {p.seasons?.length > 0 && (
                                        <>
                                            <span className="dot" aria-hidden="true">·</span>
                                            <span className="yrs">{yearSpan(p.seasons)}</span>
                                        </>
                                    )}
                                </span>
                                <span className="stats">
                                    {p.appearances > 0 && `${p.appearances} games`}
                                    {p.appearances > 0 && p.drafted > 0 && ' · '}
                                    {p.drafted > 0 && `drafted ${p.drafted}×`}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {!hasAny && !ambiguousPlayers && (
                <div className="rw-card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
                        <h2 className="rw-label" style={{ flex: 1, margin: 0 }}>Rando Player</h2>
                        <div className="rw-seg">
                            <button type="button" onClick={handleRefreshRandom} disabled={randomRefreshing || randomLoading}>
                                {randomRefreshing ? '...' : '↻ NEW'}
                            </button>
                        </div>
                    </div>

                    {randomLoading ? (
                        <div className="rw-loading">Loading...</div>
                    ) : randomPlayer ? (
                        <>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--cream)' }}>{randomPlayer.player_name}</span>
                                <PosChip position={randomPlayer.position} />
                                <span className="rw-sub" style={{ letterSpacing: '0.1em' }}>
                                    {randomPlayer.seasons?.[0]}
                                    {randomPlayer.seasons?.length > 1 && `–${randomPlayer.seasons[randomPlayer.seasons.length - 1]}`}
                                </span>
                            </div>

                            <div className="rw-tiles rw-tiles-3" style={{ marginBottom: 14 }}>
                                <MiniStat label="Avg Pts"       value={fmt(randomPlayer.avg_points)} />
                                <MiniStat label="Best Game"     value={fmt(randomPlayer.best_game)} />
                                <MiniStat label="Total Pts"     value={fmt(randomPlayer.total_points)} />
                                <MiniStat label="Appearances"   value={randomPlayer.appearances} />
                                <MiniStat label="Times Drafted" value={randomPlayer.draft?.times_drafted ?? '—'} />
                                <MiniStat label="Avg Pick"      value={randomPlayer.draft?.avg_pick ? `#${fmt(randomPlayer.draft.avg_pick)}` : '—'} />
                            </div>

                            {randomPlayer.best_game_detail && (
                                <p className="rw-note" style={{ margin: '0 0 6px', color: 'var(--steel-hi)' }}>
                                    <span className="meta">Best: </span>
                                    <b style={{ color: 'var(--cream)' }}>{fmt(randomPlayer.best_game_detail.points_scored)} pts</b>
                                    {' '}— {randomPlayer.best_game_detail.season} W{randomPlayer.best_game_detail.week}
                                    {' '}for <b style={{ color: 'var(--cream)' }}>{randomPlayer.best_game_detail.owner}</b>
                                    {' '}vs {randomPlayer.best_game_detail.opponent}
                                    <GameTag game={randomPlayer.best_game_detail} style={{ marginLeft: 6 }} />
                                </p>
                            )}

                            {randomPlayer.top_owner && (
                                <p className="rw-note" style={{ margin: 0, color: 'var(--steel-hi)' }}>
                                    Most rostered by{' '}
                                    <b style={{ color: 'var(--amber)' }}>{randomPlayer.top_owner.owner}</b>
                                    {' '}({randomPlayer.top_owner.appearances} appearances)
                                </p>
                            )}
                        </>
                    ) : null}
                </div>
            )}

            {boxData && draftData && !hasAny && (
                <p className="rw-note" style={{ margin: 0 }}>No results for "{query}"</p>
            )}

            {hasAny && (
                <>
                    {/* Player header: the name is this view's title */}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                        <span className="rw-title" style={{ fontSize: 30 }}>{playerName}</span>
                        {position && <PosChip position={position} />}
                        <span className="rw-sub" style={{ letterSpacing: '0.1em' }}>
                            {hasDraft && <>Drafted {draftCount} time{draftCount !== 1 ? 's' : ''}</>}
                            {hasBox && <> · {boxData.total_appearances} wks scoring data</>}
                        </span>
                    </div>

                    <div className="rw-seg">
                        {availableTabs.map(t => (
                            <button key={t.key} type="button" onClick={() => setTab(t.key)} className={tab === t.key ? 'on' : undefined} aria-pressed={tab === t.key}>
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {tab === 'draft' && hasDraft && (
                        <>
                            <div className="rw-tiles" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
                                <MiniStat label="Times Drafted" value={draftCount} />
                                <MiniStat label="Avg Pick"      value={adp ? fmt(adp) : '—'} />
                                <MiniStat label="Earliest Pick" value={earliestPick ? `#${earliestPick}` : '—'} />
                                <MiniStat label="Latest Pick"   value={latestPick   ? `#${latestPick}`   : '—'} />
                                <MiniStat label="Keeper Picks"  value={keeperCount} />
                            </div>
                            <div className="rw-block">
                                <h2 className="rw-label">Draft History</h2>
                                <div className="table-wrap">
                                    <table className="rw-table rw-ledger rw-2line rw-norank" style={{ width: '100%' }}>
                                        <thead>
                                            <tr>
                                                <Th label="Season"  sortKey="season"       sort={draftSort} />
                                                <Th label="Owner"   sortKey="owner"        sort={draftSort} />
                                                <Th label="Overall" sortKey="overall_pick" sort={draftSort} />
                                                <Th label="Round"   sortKey="round_num"    sort={draftSort} />
                                                <th className="num">Pick</th>
                                                <th className="num">Keeper</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {draftSort.sorted.map((r, i) => (
                                                <tr key={i}>
                                                    <td className="num name m1">{r.season}</td>
                                                    <td className="name m1 p-dot">{r.owner}</td>
                                                    <td className={cx('num key mk', r.overall_pick === earliestPick && 'top')}>#{r.overall_pick}</td>
                                                    <td className="num meta m2 m2s">R{r.round_num}</td>
                                                    <td className="num meta m2 p-lbl" data-ml="Pick">{r.pick_in_round}</td>
                                                    <td className="num m2 m-opt p-sp">
                                                        {r.is_keeper ? <KeeperTag /> : <span className="dash">—</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}

                    {tab === 'scoring' && hasBox && (
                        <div className="rw-block">
                            <h2 className="rw-label">By Owner</h2>
                            <div className="table-wrap">
                                <table className="rw-table rw-standings rw-2line rw-norank" style={{ width: '100%' }}>
                                    <thead>
                                        <tr>
                                            <Th label="Owner"     sortKey="owner"        sort={ownerSort} className="owner" />
                                            <Th label="App"       sortKey="appearances"  sort={ownerSort} />
                                            <Th label="Total Pts" sortKey="total_points" sort={ownerSort} />
                                            <Th label="Avg Pts"   sortKey="avg_points"   sort={ownerSort} />
                                            <th className="num">Seasons</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ownerSort.sorted.map(o => (
                                            <tr key={o.owner}>
                                                <td className="owner m1">{o.owner}</td>
                                                <td className="num m2 m2s s-after" data-ma="apps">{o.appearances}</td>
                                                <td className="num key mk">{fmt(o.total_points)}</td>
                                                <td className="num meta m2 p-lbl" data-ml="Avg">{fmt(o.avg_points)}</td>
                                                <td className="num meta m2 p-dot" style={{ fontSize: 12 }}>{o.seasons_str}</td>
                                            </tr>
                                        ))}
                                        <tr className="total">
                                            <td className="rw-ctl-lbl m1">TOTAL</td>
                                            <td className="num key m2 m2s s-after" data-ma="apps">{totalAppearances}</td>
                                            <td className="num key mk">{fmt(totalPoints)}</td>
                                            <td className="num meta m2 p-lbl" data-ml="Avg">{fmt(totalPoints / totalAppearances)}</td>
                                            <td />
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {tab === 'gamelog' && hasBox && (
                        <div className="rw-block">
                            <h2 className="rw-label">Full Game Log</h2>
                            <div className="table-wrap">
                                <table className="rw-table rw-board rw-ledger rw-2line rw-norank" style={{ width: '100%' }}>
                                    <thead>
                                        <tr>
                                            <Th label="Season" sortKey="season"        sort={gameLogSort} />
                                            <Th label="Week"   sortKey="week"          sort={gameLogSort} />
                                            <Th label="Pts"    sortKey="points_scored" sort={gameLogSort} />
                                            <Th label="Owner"  sortKey="owner"         sort={gameLogSort} />
                                            <th>Type</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {gameLogSort.sorted.map((r, i) => (
                                            <tr key={i}>
                                                <td className="num name m1">{r.season}</td>
                                                <td className="num meta m1 p-sp">W{r.week}</td>
                                                <td className="num key mk">{fmt(r.points_scored)}</td>
                                                <td className="name m2 m2s">{r.owner}</td>
                                                <td className="m2 m-tag p-dot">
                                                    <GameTag game={r} regular={<span className="meta">Reg</span>} />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {tab === 'moves' && hasTxns && <PlayerTransactions data={txnData} cardName={playerName} />}
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
            <DataBackdrop />

            <TopNav />

            <Placard
                variant="detached"
                data
                tabs={MODE_LBLS}
                activeTab={MODES.indexOf(mode)}
                onTabChange={i => setMode(MODES[i])}
                title="PLAYERS"
            >
                {mode === 'search'  && <PlayerSearch />}
                {mode === 'explore' && <PositionExplorer />}
            </Placard>
        </Scene>
    )
}
