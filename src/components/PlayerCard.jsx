import { useEffect, useState } from 'react'
import { getPlayer } from '../api/players'
import { isPlayerId } from '../utils/playerId'
import { useSortable } from '../utils/sortable'
import MiniStat from './MiniStat'
import PlayerTransactions from './PlayerTransactions'
import SortTh from './SortTh'
import PosChip, { KeeperTag } from './PosChip'
import GameTag from './GameTag'
import CardSkeleton from './CardSkeleton'
import TeamChip, { NflTeamCredit } from './TeamChip'

// One player's card, by ESPN player id: header, then Draft History / Scoring / Game Log / Transactions.
// Everything comes from one call, GET /players/{id}. Used by the player page (/players/:id) and the
// player overlay (layout="overlay": the header and tabs stay put while the tab body scrolls).

const fmt = (n) => Number(n).toFixed(1)
const cx = (...names) => names.filter(Boolean).join(' ')

const TEXT_KEYS = new Set(['player_name', 'owner', 'nfl_team'])
const Th = ({ label, sortKey, sort, className }) => (
    <SortTh label={label} sortKey={sortKey} sort={sort} text={TEXT_KEYS.has(sortKey)} className={className} />
)

const TABS = [
    { key: 'draft',   label: 'Draft History' },
    { key: 'scoring', label: 'Scoring' },
    { key: 'gamelog', label: 'Game Log' },
    { key: 'moves',   label: 'Transactions' },
]

// A tab with nothing to show gets one line instead of an empty table
const Empty = ({ children }) => <p className="rw-note" style={{ margin: 0 }}>{children}</p>

function NoSuchPlayer() {
    return (
        <div className="rw-empty">
            <h3>No such player</h3>
            <p style={{ marginBottom: 0 }}>Nobody in Rockwood&rsquo;s records has that player id. Search for the player by name instead.</p>
        </div>
    )
}

export default function PlayerCard({ id, layout = 'page' }) {
    const valid = isPlayerId(id)
    const [result, setResult] = useState(null)     // { id, data } | { id, missing: true } | { id, failed: true }

    useEffect(() => {
        if (!valid) return
        let live = true
        getPlayer(id).then(
            data => { if (live) setResult({ id, data }) },
            err  => { if (live) setResult(err.response?.status === 404 ? { id, missing: true } : { id, failed: true }) },
        )
        return () => { live = false }
    }, [id, valid])

    if (!valid) return <NoSuchPlayer />
    if (result?.id !== id) return <CardSkeleton />
    if (result.missing) return <NoSuchPlayer />
    if (result.failed) {
        return <p className="rw-note" style={{ color: 'var(--loss)', margin: 0 }}>Couldn&rsquo;t load this player. Try again.</p>
    }
    return <CardBody key={id} player={result.data} overlay={layout === 'overlay'} />
}

function CardBody({ player, overlay }) {
    const boxData   = player.box
    const draftData = player.draft
    const txnData   = player.transactions

    const hasBox   = boxData.total_appearances > 0
    const hasDraft = draftData.times_drafted   > 0
    const hasTxns  = txnData.results.length    > 0

    // Drafted players open on their draft history; everyone else on scoring
    const [tab, setTab] = useState(hasDraft ? 'draft' : 'scoring')

    const draftResults = draftData.results
    const draftCount   = draftResults.length
    const adp          = draftCount > 0
        ? draftResults.reduce((a, r) => a + r.overall_pick, 0) / draftCount
        : null
    const earliestPick = draftCount > 0 ? Math.min(...draftResults.map(r => r.overall_pick)) : null
    const latestPick   = draftCount > 0 ? Math.max(...draftResults.map(r => r.overall_pick)) : null
    const keeperCount  = draftResults.filter(r => r.is_keeper).length

    const enrichedOwners = (boxData.by_owner || []).map(o => {
        const ownerGames = boxData.results.filter(r => r.owner === o.owner)
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

    const ownerSort   = useSortable(enrichedOwners,   'total_points',  'desc')
    const gameLogSort = useSortable(boxData.results,  'points_scored', 'desc')
    const draftSort   = useSortable(draftResults,     'season',        'asc')

    // The card's name is the player's latest (ESPN renames: "Mark Ingram" -> "Mark Ingram II")
    const playerName = player.player_name
    const position   = boxData.results[0]?.position || draftResults[0]?.position

    const head = (
        <>
            {/* Player header: the name is this view's title (plain text: it's this card's own player),
                then position and NFL team now on their own line (no team: retired or unsigned) */}
            <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                    <span className="rw-title" style={{ fontSize: 30 }}>{playerName}</span>
                    <span className="rw-sub" style={{ letterSpacing: '0.1em' }}>
                        {hasDraft && <>Drafted {draftCount} time{draftCount !== 1 ? 's' : ''}</>}
                        {hasBox && <>{hasDraft && ' · '}{boxData.total_appearances} wks scoring data</>}
                    </span>
                </div>
                {(position || player.nfl_team) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, fontSize: 15 }}>
                        {position && <PosChip position={position} />}
                        <TeamChip abbrev={player.nfl_team} name={player.nfl_team_name} title="NFL team now" />
                    </div>
                )}
            </div>

            <div className="rw-seg">
                {TABS.map(t => (
                    <button key={t.key} type="button" onClick={() => setTab(t.key)} className={tab === t.key ? 'on' : undefined} aria-pressed={tab === t.key}>
                        {t.label}
                    </button>
                ))}
            </div>
        </>
    )

    const body = (
        <>
            {tab === 'draft' && !hasDraft && <Empty>Never drafted in Rockwood.</Empty>}
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
                                        <Th label="NFL Team" sortKey="nfl_team"    sort={draftSort} />
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
                                            <td className="m1 p-sp"><TeamChip abbrev={r.nfl_team} name={r.nfl_team_name} title="NFL team in Week 1" /></td>
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
                        <NflTeamCredit />
                    </div>
                </>
            )}

            {tab === 'scoring' && !hasBox && <Empty>No starts on record (box scores begin in 2018).</Empty>}
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

            {tab === 'gamelog' && !hasBox && <Empty>No games on record (box scores begin in 2018).</Empty>}
            {tab === 'gamelog' && hasBox && (
                <div className="rw-block">
                    <h2 className="rw-label">Full Game Log</h2>
                    <div className="table-wrap">
                        <table className="rw-table rw-board rw-ledger rw-2line rw-norank" style={{ width: '100%' }}>
                            <thead>
                                <tr>
                                    <Th label="Season" sortKey="season"        sort={gameLogSort} />
                                    <Th label="Week"   sortKey="week"          sort={gameLogSort} />
                                    <Th label="NFL Team" sortKey="nfl_team"    sort={gameLogSort} />
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
                                        <td className="m1 p-sp"><TeamChip abbrev={r.nfl_team} name={r.nfl_team_name} title={`NFL team in Week ${r.week}`} /></td>
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
                    <NflTeamCredit />
                </div>
            )}

            {tab === 'moves' && !hasTxns && <Empty>No adds or drops on record (transactions begin in 2018).</Empty>}
            {tab === 'moves' && hasTxns && <PlayerTransactions data={txnData} cardName={playerName} />}
        </>
    )

    return overlay
        ? <><div className="rw-ov-head">{head}</div><div className="rw-ov-body">{body}</div></>
        : <>{head}{body}</>
}
