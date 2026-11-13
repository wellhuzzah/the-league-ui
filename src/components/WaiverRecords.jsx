import { useEffect, useState, Fragment } from 'react'
import {
    getTransactionSeasons,
    getBiggestBids, getBiggestOverpays, getBiggestLosingBids,
    getMostContested, getBargains,
} from '../api/transactions'
import { FIRST_OUTBID_SEASON, weekLabel, money, isTie } from './waiverFormat'
import { competitionRanks } from '../utils/ranks'
import { useTieFold } from '../utils/tieFold'
import TieFoldLine from './TieFoldLine'
import PlayerName from './PlayerName'

// Records › Waivers. Styled by the table system (tables.css): ranked lists with two-line rows on mobile.

// ── Lists ─────────────────────────────────────────────────────────────────────

const LISTS = [
    { key: 'bids',      label: 'Top Bids',       outbidOnly: false },
    { key: 'overpays',  label: 'Overpays',       outbidOnly: true  },
    { key: 'losing',    label: 'Losing Bids',    outbidOnly: true  },
    { key: 'contested', label: 'Most Contested', outbidOnly: true  },
    { key: 'bargains',  label: 'Bargains',       outbidOnly: false },
]

const BARGAIN_SORTS = [
    { key: 'ppg',        label: 'PPG' },
    { key: 'points',     label: 'Points' },
    { key: 'per_dollar', label: 'Pts per $', paidOnly: true },
]

const MIN_GAMES_OPTIONS = [1, 2, 3, 4, 5, 6, 8, 10]

const cx = (...names) => names.filter(Boolean).join(' ')

// ── Small pieces ──────────────────────────────────────────────────────────────

const Note = ({ children }) => <p className="rw-note" style={{ margin: 0 }}>{children}</p>

const H = ({ children, num }) => <th className={num ? 'num' : undefined}>{children}</th>

// Rank: the first of a tied run in full colour, repeats muted; `tie` rows get the amber margin line
const rankInfo = (ranks, i) => {
    const rep = i > 0 && ranks[i - 1] === ranks[i]
    return { rep, tie: rep || ranks[i + 1] === ranks[i] }
}
const Rank = ({ ranks, i }) => (
    <td className={cx('rank', rankInfo(ranks, i).rep && 'rep')}>{ranks[i]}</td>
)
const rowCls = (ranks, i) => (rankInfo(ranks, i).tie ? 'tie' : undefined)

// "Darren Waller TE"
const Player = ({ id, name, position, className }) => (
    <td className={className}>
        <PlayerName id={id} name={name} />
        {position && <span className="pos">{position}</span>}
    </td>
)

// Season and week: line 2 on mobile
const When = ({ season, week, first }) => (
    <>
        <td className={cx('num meta gap-r m2', first ? 'm2s' : 'p-dot')}>{season}</td>
        <td className="num meta m2 p-sp">{weekLabel(week)}</td>
    </>
)

const keyCls = (rank) => cx('num key mk', rank === 1 && 'top')

// Ranks: competitionRanks (utils/ranks) on the value each list is ranked by. Rows stay in endpoint
// order, which already puts equal values next to each other.

const BARGAIN_RANK_VALUE = {
    ppg:        r => r.ppg,
    points:     r => r.points,
    per_dollar: r => r.points_per_dollar,
}
const BARGAIN_FORMAT = {
    ppg:        r => r.ppg.toFixed(2),
    points:     r => r.points.toFixed(1),
    per_dollar: r => r.points_per_dollar.toFixed(2),
}

// Each list asks for the top 25 (src/api/transactions.js); 3+ rows tied at the cutoff fold into one
// line. Returns the fold, the rows shown, and their ranks.
const LIST_LIMIT = 25
function useFolded(rows, value) {
    const fold = useTieFold(rows, LIST_LIMIT)
    const shown = fold.shown(rows)
    return [fold, shown, competitionRanks(shown, value)]
}

const TABLE = 'rw-table rw-ranked rw-2line'

// ── Tables ────────────────────────────────────────────────────────────────────

function BidsTable({ rows }) {
    const [fold, shown, ranks] = useFolded(rows, r => r.bid_amount)
    return (
        <table className={TABLE}>
            <thead><tr>
                <H num>#</H><H>Owner</H><H>Player</H><H num>Bid</H><H num>Season</H><H num>Week</H>
            </tr></thead>
            <tbody>
                {shown.map((r, i) => (
                    <tr key={i} className={rowCls(ranks, i)}>
                        <Rank ranks={ranks} i={i} />
                        <td className="name m1">{r.owner}</td>
                        <Player id={r.espn_player_id} name={r.player_name} position={r.position} className="m1 p-dot" />
                        <td className={keyCls(ranks[i])}>{money(r.bid_amount)}</td>
                        <When season={r.season} week={r.week} first />
                    </tr>
                ))}
                <TieFoldLine data fold={fold} format={r => money(r.bid_amount)} colSpan={6} />
            </tbody>
        </table>
    )
}

function OverpaysTable({ rows }) {
    const [fold, shown, ranks] = useFolded(rows, r => r.overpay)
    return (
        <table className={TABLE}>
            <thead><tr>
                <H num>#</H><H>Owner</H><H>Player</H><H num>Bid</H><H>Runner-up</H><H num>Next Bid</H><H num>Overpay</H><H num>Season</H><H num>Week</H>
            </tr></thead>
            <tbody>
                {shown.map((r, i) => (
                    <tr key={i} className={rowCls(ranks, i)}>
                        <Rank ranks={ranks} i={i} />
                        <td className="name m1">{r.owner}</td>
                        <Player id={r.espn_player_id} name={r.player_name} position={r.position} className="m1 p-dot" />
                        <td className="num m2 m2s p-lbl" data-ml="Bid">{money(r.bid_amount)}</td>
                        <td className="soft gap-r m2 p-dot">{r.runner_up_owner ?? 'Uncontested'}</td>
                        <td className="num soft m2 p-sp">{r.runner_up_owner ? money(r.runner_up_bid) : '—'}</td>
                        <td className={keyCls(ranks[i])}>{money(r.overpay)}</td>
                        <When season={r.season} week={r.week} />
                    </tr>
                ))}
                <TieFoldLine data fold={fold} format={r => money(r.overpay)} colSpan={9} />
            </tbody>
        </table>
    )
}

function LosingBidsTable({ rows }) {
    const [fold, shown, ranks] = useFolded(rows, r => r.bid_amount)
    return (
        <table className={TABLE}>
            <thead><tr>
                <H num>#</H><H>Owner</H><H>Player</H><H num>Bid</H><H>Won by</H><H num>Winning Bid</H><H num>Season</H><H num>Week</H>
            </tr></thead>
            <tbody>
                {shown.map((r, i) => {
                    const tie = isTie(r.bid_amount, r.winning_bid)
                    return (
                        <tr key={i} className={rowCls(ranks, i)}>
                            <Rank ranks={ranks} i={i} />
                            <td className="name m1">{r.owner}</td>
                            <Player id={r.espn_player_id} name={r.player_name} position={r.position} className="m1 p-dot" />
                            <td className={keyCls(ranks[i])}>{money(r.bid_amount)}</td>
                            <td className="soft gap-r m2 m2s">
                                {tie && 'lost tie to '}
                                <span className="name">{r.winner_owner}</span>
                            </td>
                            <td className="num m2 p-sp">{money(r.winning_bid)}</td>
                            <When season={r.season} week={r.week} />
                        </tr>
                    )
                })}
                <TieFoldLine data fold={fold} format={r => money(r.bid_amount)} colSpan={8} />
            </tbody>
        </table>
    )
}

function ContestedTable({ rows }) {
    // Remounts (closing any open row) whenever a new list loads
    const [open, setOpen] = useState(null)
    const [fold, shown, ranks] = useFolded(rows, r => r.teams)

    return (
        <table className={TABLE}>
            <thead><tr>
                <H num>#</H><H>Player</H><H num>Teams</H><H>Winner</H><H num>Winning Bid</H><H num>Season</H><H num>Week</H><th></th>
            </tr></thead>
            <tbody>
                {shown.map((r, i) => {
                    const isOpen = open === i
                    const toggle = () => setOpen(isOpen ? null : i)
                    return (
                        <Fragment key={i}>
                            <tr
                                className={cx('link', rowCls(ranks, i))}
                                tabIndex={0}
                                aria-expanded={isOpen}
                                onClick={toggle}
                                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle() } }}
                            >
                                <Rank ranks={ranks} i={i} />
                                <Player id={r.espn_player_id} name={r.player_name} position={r.position} className="name m1" />
                                <td className={keyCls(ranks[i])}>{r.teams}</td>
                                <td className="name gap-r m2 m2s">{r.winner_owner}</td>
                                <td className="num m2 p-sp">{money(r.winning_bid)}</td>
                                <When season={r.season} week={r.week} />
                                <td className="num meta m2 p-dot" style={{ fontSize: 11 }}>{isOpen ? '▲' : '▼'}</td>
                            </tr>
                            {isOpen && (
                                <tr className="detail">
                                    <td></td>
                                    <td colSpan={7} style={{ whiteSpace: 'normal', lineHeight: 1.8, paddingTop: 4, paddingBottom: 10 }}>
                                        {r.bids.map((b, j) => {
                                            const won = b.status === 'EXECUTED'
                                            const tie = !won && isTie(b.bid_amount, r.winning_bid)
                                            return (
                                                <span key={j} className={won ? 'name' : 'soft'} style={{ whiteSpace: 'nowrap', marginRight: 14 }}>
                                                    {b.owner} {money(b.bid_amount)}{tie && ' · lost tie'}
                                                </span>
                                            )
                                        })}
                                    </td>
                                </tr>
                            )}
                        </Fragment>
                    )
                })}
                <TieFoldLine data fold={fold} format={r => `${r.teams} teams`} colSpan={8} />
            </tbody>
        </table>
    )
}

function BargainsTable({ rows, paid, sort }) {
    const [fold, shown, ranks] = useFolded(rows, BARGAIN_RANK_VALUE[sort])
    // The column the list is ranked by is the key value; the others go to line 2 on mobile
    const col = (key, rank) => key === sort ? keyCls(rank) : 'num m2 p-lbl'
    return (
        <table className={TABLE}>
            <thead><tr>
                <H num>#</H><H>Owner</H><H>Player</H>
                {paid && <H num>Bid</H>}
                <H num>G</H><H num>Pts</H><H num>PPG</H>
                {paid && <H num>Pts per $</H>}
                <H num>Season</H><H num>Week</H>
            </tr></thead>
            <tbody>
                {shown.map((r, i) => (
                    <tr key={i} className={rowCls(ranks, i)}>
                        <Rank ranks={ranks} i={i} />
                        <td className="name m1">{r.owner}</td>
                        <Player id={r.espn_player_id} name={r.player_name} position={r.position} className="m1 p-dot" />
                        {paid && <td className="num m2 m2s p-lbl" data-ml="Bid">{money(r.bid_amount)}</td>}
                        <td className={cx('num meta m2 p-lbl', !paid && 'm2s')} data-ml="G">{r.games}</td>
                        <td className={col('points', ranks[i])} data-ml="Pts">{r.points.toFixed(1)}</td>
                        <td className={col('ppg', ranks[i])} data-ml="PPG">{r.ppg.toFixed(2)}</td>
                        {paid && <td className={col('per_dollar', ranks[i])} data-ml="Pts/$">{r.points_per_dollar?.toFixed(2) ?? '—'}</td>}
                        <When season={r.season} week={r.week} />
                    </tr>
                ))}
                <TieFoldLine data fold={fold} format={BARGAIN_FORMAT[sort]} colSpan={paid ? 10 : 8} />
            </tbody>
        </table>
    )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function WaiverRecords() {
    const [list,     setList]     = useState('bids')
    const [season,   setSeason]   = useState('')        // '' = all seasons
    const [seasons,  setSeasons]  = useState([])
    const [paid,     setPaid]     = useState(true)
    const [sort,     setSort]     = useState('ppg')
    const [minGames, setMinGames] = useState(3)
    // Result of the last finished request, tagged with the selection it was for
    const [result,   setResult]   = useState({ key: null, rows: [], error: null })

    const outbidOnly = LISTS.find(l => l.key === list).outbidOnly

    useEffect(() => {
        getTransactionSeasons().then(data =>
            setSeasons(data.map(s => Number(s.season)).sort((a, b) => b - a))
        )
    }, [])

    const requestKey = JSON.stringify([list, season, paid, sort, minGames])
    const loading = result.key !== requestKey
    const { rows, error } = result

    useEffect(() => {
        let cancelled = false
        const s = season ? Number(season) : null
        const req = {
            bids:      () => getBiggestBids(s),
            overpays:  () => getBiggestOverpays(s),
            losing:    () => getBiggestLosingBids(s),
            contested: () => getMostContested(s),
            bargains:  () => getBargains({ paid, sort, minGames, season: s }),
        }[list]
        req()
            .then(data => { if (!cancelled) setResult({ key: requestKey, rows: data, error: null }) })
            .catch(() => { if (!cancelled) setResult({ key: requestKey, rows: [], error: 'Could not load this list — try again' }) })
        return () => { cancelled = true }
    }, [requestKey]) // eslint-disable-line react-hooks/exhaustive-deps

    const changeList = (key) => {
        const next = LISTS.find(l => l.key === key)
        // 2018 has no outbid data: an outbid list showing 2018 moves to 2019 rather than to all seasons
        if (next.outbidOnly && season && Number(season) < FIRST_OUTBID_SEASON) setSeason(String(FIRST_OUTBID_SEASON))
        setList(key)
    }

    const changePaid = (value) => {
        setPaid(value)
        if (!value) setSort('ppg')
    }

    const seasonOptions = outbidOnly ? seasons.filter(s => s >= FIRST_OUTBID_SEASON) : seasons

    return (
        <div className="rw-block" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h2 className="rw-label" style={{ margin: 0 }}>Waiver Records</h2>
            <Note>Waiver history covers 2018 onward; outbid data 2019 onward.</Note>

            <div className="rw-seg">
                {LISTS.map(l => (
                    <button key={l.key} type="button" onClick={() => changeList(l.key)} className={list === l.key ? 'on' : undefined} aria-pressed={list === l.key}>
                        {l.label}
                    </button>
                ))}
            </div>

            <div className="rw-ctls">
                <label>
                    <span className="rw-ctl-lbl">Season</span>
                    <select className="rw-select" value={season} onChange={e => setSeason(e.target.value)}>
                        <option value="">All seasons</option>
                        {seasonOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </label>

                {list === 'bargains' && (
                    <>
                        <div className="rw-seg">
                            <button type="button" onClick={() => changePaid(true)}  className={paid ? 'on' : undefined} aria-pressed={paid}>Paid</button>
                            <button type="button" onClick={() => changePaid(false)} className={!paid ? 'on' : undefined} aria-pressed={!paid}>Free</button>
                        </div>
                        <label>
                            <span className="rw-ctl-lbl">Sort</span>
                            <select className="rw-select" value={sort} onChange={e => setSort(e.target.value)}>
                                {BARGAIN_SORTS.filter(o => paid || !o.paidOnly).map(o => (
                                    <option key={o.key} value={o.key}>{o.label}</option>
                                ))}
                            </select>
                        </label>
                        <label>
                            <span className="rw-ctl-lbl">Min games</span>
                            <select className="rw-select" value={minGames} onChange={e => setMinGames(Number(e.target.value))}>
                                {MIN_GAMES_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </label>
                    </>
                )}
            </div>

            {outbidOnly && <Note>2018 isn't offered here: outbid data starts in 2019.</Note>}
            {list === 'contested' && <Note>Counts the winning claim and outbid claims. Tap a row to see every bid.</Note>}
            {list === 'bargains' && (
                <Note>
                    Points from that team's box scores while the player was on the roster, from pickup to season end
                    or the team's next pickup of him. Bye weeks don't count as games.
                </Note>
            )}

            {loading ? (
                <div className="rw-loading">Loading...</div>
            ) : error ? (
                <Note>{error}</Note>
            ) : rows.length === 0 ? (
                <Note>Nothing on record for this selection.</Note>
            ) : (
                <div className="table-wrap">
                    {list === 'bids'      && <BidsTable rows={rows} />}
                    {list === 'overpays'  && <OverpaysTable rows={rows} />}
                    {list === 'losing'    && <LosingBidsTable rows={rows} />}
                    {list === 'contested' && <ContestedTable rows={rows} />}
                    {list === 'bargains'  && <BargainsTable rows={rows} paid={paid} sort={sort} />}
                </div>
            )}
        </div>
    )
}
