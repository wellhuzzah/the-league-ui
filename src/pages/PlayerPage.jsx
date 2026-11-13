import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPositionSummary, getRandomPlayer } from '../api/boxscores'
import { searchPlayers } from '../api/players'
import Scene from '../components/Scene'
import DataBackdrop from '../components/DataBackdrop'
import TopNav from '../components/TopNav'
import Placard from '../components/Placard'
import SortTh from '../components/SortTh'
import PosChip from '../components/PosChip'
import MiniStat from '../components/MiniStat'
import PlayerCard from '../components/PlayerCard'
import PlayerChooser from '../components/PlayerChooser'
import { competitionRanks } from '../utils/ranks'
import { useTieFold } from '../utils/tieFold'
import { useSortable } from '../utils/sortable'
import { playerPath } from '../utils/playerId'
import GameTag from '../components/GameTag'
import TieFoldLine from '../components/TieFoldLine'

const fmt = (n) => Number(n).toFixed(1)

const cx = (...names) => names.filter(Boolean).join(' ')

const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'D/ST']

// Rank cell for a list ranked on its sorted column: repeats muted, tie runs get the amber line
const tieInfo = (ranks, i) => {
    const rep = i > 0 && ranks[i - 1] === ranks[i]
    return { rep, tie: rep || ranks[i + 1] === ranks[i] }
}
const RankCell = ({ ranks, i }) => <td className={cx('rank', tieInfo(ranks, i).rep && 'rep')}>{ranks[i]}</td>

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

// The search box, then one of: the chosen player's card (/players/:id), the "Which one?" list, or
// Rando Player. Choosing a player navigates, so Back and deep links work; the list and the query
// stay in state, so Back from a card returns to the list it was picked from.
function PlayerSearch({ playerId }) {
    const navigate = useNavigate()
    const [query,            setQuery]            = useState('')
    const [ambiguousPlayers, setAmbiguousPlayers] = useState(null)
    const [noResults,        setNoResults]        = useState(null)    // the query that matched nobody
    const [searching,        setSearching]        = useState(false)
    const [error,            setError]            = useState(null)

    const [randomPlayer,     setRandomPlayer]     = useState(null)
    const [randomLoading,    setRandomLoading]    = useState(true)
    const [randomRefreshing, setRandomRefreshing] = useState(false)

    const showingCard = playerId !== undefined

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
        const q = query.trim()
        if (q.length < 2) return
        setSearching(true)
        setError(null)
        try {
            // One row per ESPN player id whose name matches; several → the "which one?" list
            const { players } = await searchPlayers(q)
            setAmbiguousPlayers(players.length > 1 ? players : null)
            setNoResults(players.length === 0 ? q : null)
            if (players.length === 1) {
                navigate(playerPath(players[0].espn_player_id))
            } else if (showingCard) {
                navigate('/players')
            }
        } catch {
            setError('Search failed — try again')
        } finally {
            setSearching(false)
        }
    }

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

            {showingCard && <PlayerCard key={playerId} id={playerId} />}

            {!showingCard && ambiguousPlayers && (
                <PlayerChooser players={ambiguousPlayers} onSelect={p => navigate(playerPath(p.espn_player_id))} />
            )}

            {!showingCard && !ambiguousPlayers && (
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

            {!showingCard && noResults !== null && (
                <p className="rw-note" style={{ margin: 0 }}>No results for "{noResults}"</p>
            )}
        </div>
    )
}

// ── Main export ───────────────────────────────────────────────────────────────

const MODES     = ['search', 'explore']
const MODE_LBLS = ['Player Search', 'Position Explorer']

// /players: search (with Rando Player) and Position Explorer. /players/:playerId: that player's card,
// always under Player Search; switching to Position Explorer leaves the card's URL.
export default function PlayerPage() {
    const { playerId } = useParams()
    const navigate = useNavigate()
    const [mode, setMode] = useState('search')
    const shownMode = playerId !== undefined ? 'search' : mode

    const handleTab = (i) => {
        setMode(MODES[i])
        if (playerId !== undefined && MODES[i] !== 'search') navigate('/players')
    }

    return (
        <Scene>
            <DataBackdrop />

            <TopNav />

            <Placard
                variant="detached"
                data
                tabs={MODE_LBLS}
                activeTab={MODES.indexOf(shownMode)}
                onTabChange={handleTab}
                title="PLAYERS"
            >
                {shownMode === 'search'  && <PlayerSearch playerId={playerId} />}
                {shownMode === 'explore' && <PositionExplorer />}
            </Placard>
        </Scene>
    )
}
