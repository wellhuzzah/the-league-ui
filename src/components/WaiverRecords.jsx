import { useEffect, useState, Fragment } from 'react'
import {
    getTransactionSeasons,
    getBiggestBids, getBiggestOverpays, getBiggestLosingBids,
    getMostContested, getBargains,
} from '../api/transactions'
import { DataWell } from './Badge'
import { LOST_COLOR, TEXT_COLOR, FIRST_OUTBID_SEASON, weekLabel, money } from './waiverFormat'

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

// ── Small pieces ──────────────────────────────────────────────────────────────

const pixelTabBtn = (active) => ({
    background: active ? 'var(--amber)' : '#1a1c26',
    border: `2px solid ${active ? 'var(--amber)' : '#3a3d4a'}`,
    color: active ? '#1a1c26' : '#c8cad4',
    fontFamily: 'Inter, sans-serif',
    fontSize: 12,
    fontWeight: active ? 600 : 400,
    letterSpacing: 0,
    padding: '4px 12px',
    cursor: 'pointer',
})

const selectStyle = {
    background: '#1a1c26',
    border: '2px solid var(--steel-3)',
    color: '#f4eedd',
    fontFamily: 'Inter, sans-serif',
    fontSize: 13,
    letterSpacing: 0,
    padding: '5px 8px',
    cursor: 'pointer',
}

const ControlLabel = ({ children }) => (
    <span style={{
        fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 600,
        letterSpacing: '0.1em', textTransform: 'uppercase', color: LOST_COLOR,
    }}>
        {children}
    </span>
)

const Note = ({ children, style }) => (
    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: LOST_COLOR, lineHeight: 1.6, ...style }}>
        {children}
    </p>
)

// Fixed ranking order: headers are labels only, not sort controls
const H = ({ children, left }) => (
    <th style={{ textAlign: left ? 'left' : 'right', cursor: 'default' }}>{children}</th>
)

const Rank = ({ n }) => (
    <td className="num" style={{ color: LOST_COLOR, width: 28 }}>{n}</td>
)

const Owner = ({ name, color = TEXT_COLOR }) => (
    <td className="col-owner" style={{ color, fontWeight: 600 }}>{name}</td>
)

const Player = ({ name, position }) => (
    <td style={{ color: TEXT_COLOR }}>
        {name}
        {position && <span style={{ color: LOST_COLOR, fontSize: 11, marginLeft: 6 }}>{position}</span>}
    </td>
)

const When = ({ season, week }) => (
    <>
        <td className="num">{season}</td>
        <td className="num" style={{ color: LOST_COLOR }}>{weekLabel(week)}</td>
    </>
)

const Num = ({ children, color, bold }) => (
    <td className="num" style={{ color, fontWeight: bold ? 700 : undefined }}>{children}</td>
)

// Standard competition ranking (1, 2, 2, 4) on the value each list is ranked by. Rows stay in
// endpoint order, which already puts equal values next to each other.
const competitionRanks = (rows, value) =>
    rows.reduce((ranks, r, i) => {
        ranks.push(i > 0 && value(r) === value(rows[i - 1]) ? ranks[i - 1] : i + 1)
        return ranks
    }, [])

const BARGAIN_RANK_VALUE = {
    ppg:        r => r.ppg,
    points:     r => r.points,
    per_dollar: r => r.points_per_dollar,
}

// ── Tables ────────────────────────────────────────────────────────────────────

function BidsTable({ rows }) {
    const ranks = competitionRanks(rows, r => r.bid_amount)
    return (
        <table className="standings">
            <thead><tr>
                <H left>#</H><H left>Owner</H><H left>Player</H><H>Bid</H><H>Season</H><H>Week</H>
            </tr></thead>
            <tbody>
                {rows.map((r, i) => (
                    <tr key={i} style={{ cursor: 'default' }}>
                        <Rank n={ranks[i]} />
                        <Owner name={r.owner} />
                        <Player name={r.player_name} position={r.position} />
                        <Num color="var(--win)" bold>{money(r.bid_amount)}</Num>
                        <When season={r.season} week={r.week} />
                    </tr>
                ))}
            </tbody>
        </table>
    )
}

function OverpaysTable({ rows }) {
    const ranks = competitionRanks(rows, r => r.overpay)
    return (
        <table className="standings">
            <thead><tr>
                <H left>#</H><H left>Owner</H><H left>Player</H><H>Bid</H><H left>Runner-up</H><H>Next Bid</H><H>Overpay</H><H>Season</H><H>Week</H>
            </tr></thead>
            <tbody>
                {rows.map((r, i) => (
                    <tr key={i} style={{ cursor: 'default' }}>
                        <Rank n={ranks[i]} />
                        <Owner name={r.owner} />
                        <Player name={r.player_name} position={r.position} />
                        <Num color="var(--win)">{money(r.bid_amount)}</Num>
                        <td className="col-owner" style={{ color: LOST_COLOR }}>{r.runner_up_owner ?? 'Uncontested'}</td>
                        <Num color={LOST_COLOR}>{r.runner_up_owner ? money(r.runner_up_bid) : '—'}</Num>
                        <Num color="var(--amber)" bold>{money(r.overpay)}</Num>
                        <When season={r.season} week={r.week} />
                    </tr>
                ))}
            </tbody>
        </table>
    )
}

function LosingBidsTable({ rows }) {
    const ranks = competitionRanks(rows, r => r.bid_amount)
    return (
        <table className="standings">
            <thead><tr>
                <H left>#</H><H left>Owner</H><H left>Player</H><H>Bid</H><H left>Won by</H><H>Winning Bid</H><H>Season</H><H>Week</H>
            </tr></thead>
            <tbody>
                {rows.map((r, i) => {
                    const tie = r.winning_bid === r.bid_amount
                    return (
                        <tr key={i} style={{ cursor: 'default' }}>
                            <Rank n={ranks[i]} />
                            <Owner name={r.owner} />
                            <Player name={r.player_name} position={r.position} />
                            <Num color={LOST_COLOR} bold>{money(r.bid_amount)}</Num>
                            <td className="col-owner" style={{ color: LOST_COLOR }}>
                                {tie && 'lost tie to '}
                                <span style={{ color: 'var(--win)' }}>{r.winner_owner}</span>
                            </td>
                            <Num color={TEXT_COLOR}>{money(r.winning_bid)}</Num>
                            <When season={r.season} week={r.week} />
                        </tr>
                    )
                })}
            </tbody>
        </table>
    )
}

function ContestedTable({ rows }) {
    // Remounts (closing any open row) whenever a new list loads
    const [open, setOpen] = useState(null)
    const ranks = competitionRanks(rows, r => r.teams)

    return (
        <table className="standings">
            <thead><tr>
                <H left>#</H><H left>Player</H><H>Teams</H><H left>Winner</H><H>Winning Bid</H><H>Season</H><H>Week</H><th style={{ cursor: 'default' }}></th>
            </tr></thead>
            <tbody>
                {rows.map((r, i) => {
                    const isOpen = open === i
                    return (
                        <Fragment key={i}>
                            <tr onClick={() => setOpen(isOpen ? null : i)}>
                                <Rank n={ranks[i]} />
                                <Player name={r.player_name} position={r.position} />
                                <Num color="var(--amber)" bold>{r.teams}</Num>
                                <Owner name={r.winner_owner} color="var(--win)" />
                                <Num color="var(--win)">{money(r.winning_bid)}</Num>
                                <When season={r.season} week={r.week} />
                                <td className="num" style={{ color: LOST_COLOR, fontSize: 11 }}>{isOpen ? '▲' : '▼'}</td>
                            </tr>
                            {isOpen && (
                                <tr style={{ cursor: 'default' }}>
                                    <td></td>
                                    <td colSpan={7} style={{ whiteSpace: 'normal', lineHeight: 1.8, paddingTop: 4, paddingBottom: 10 }}>
                                        {r.bids.map((b, j) => {
                                            const won = b.status === 'EXECUTED'
                                            const tie = !won && b.bid_amount === r.winning_bid
                                            return (
                                                <span key={j} style={{ whiteSpace: 'nowrap', marginRight: 14, color: won ? 'var(--win)' : LOST_COLOR }}>
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
            </tbody>
        </table>
    )
}

function BargainsTable({ rows, paid, sort }) {
    const ranks = competitionRanks(rows, BARGAIN_RANK_VALUE[sort])
    return (
        <table className="standings">
            <thead><tr>
                <H left>#</H><H left>Owner</H><H left>Player</H>
                {paid && <H>Bid</H>}
                <H>G</H><H>Pts</H><H>PPG</H>
                {paid && <H>Pts per $</H>}
                <H>Season</H><H>Week</H>
            </tr></thead>
            <tbody>
                {rows.map((r, i) => (
                    <tr key={i} style={{ cursor: 'default' }}>
                        <Rank n={ranks[i]} />
                        <Owner name={r.owner} />
                        <Player name={r.player_name} position={r.position} />
                        {paid && <Num color="var(--win)">{money(r.bid_amount)}</Num>}
                        <Num>{r.games}</Num>
                        <Num>{r.points.toFixed(1)}</Num>
                        <Num color="var(--amber)" bold>{r.ppg.toFixed(2)}</Num>
                        {paid && <Num>{r.points_per_dollar?.toFixed(2) ?? '—'}</Num>}
                        <When season={r.season} week={r.week} />
                    </tr>
                ))}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Note style={{ fontSize: 13, color: 'var(--steel-hi)' }}>
                Waiver history covers 2018 onward; outbid data 2019 onward.
            </Note>

            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {LISTS.map(l => (
                    <button key={l.key} onClick={() => changeList(l.key)} style={pixelTabBtn(list === l.key)}>
                        {l.label}
                    </button>
                ))}
            </div>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <ControlLabel>Season</ControlLabel>
                    <select value={season} onChange={e => setSeason(e.target.value)} style={selectStyle}>
                        <option value="">All seasons</option>
                        {seasonOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </label>

                {list === 'bargains' && (
                    <>
                        <div style={{ display: 'flex', gap: 4 }}>
                            <button onClick={() => changePaid(true)}  style={pixelTabBtn(paid)}>Paid</button>
                            <button onClick={() => changePaid(false)} style={pixelTabBtn(!paid)}>Free</button>
                        </div>
                        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <ControlLabel>Sort</ControlLabel>
                            <select value={sort} onChange={e => setSort(e.target.value)} style={selectStyle}>
                                {BARGAIN_SORTS.filter(o => paid || !o.paidOnly).map(o => (
                                    <option key={o.key} value={o.key}>{o.label}</option>
                                ))}
                            </select>
                        </label>
                        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <ControlLabel>Min games</ControlLabel>
                            <select value={minGames} onChange={e => setMinGames(Number(e.target.value))} style={selectStyle}>
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
                <div className="loading" style={{ color: LOST_COLOR, fontFamily: 'Inter, sans-serif', fontSize: 12 }}>
                    Loading...
                </div>
            ) : error ? (
                <Note>{error}</Note>
            ) : rows.length === 0 ? (
                <Note>Nothing on record for this selection.</Note>
            ) : (
                <DataWell>
                    <div className="table-wrap">
                        {list === 'bids'      && <BidsTable rows={rows} />}
                        {list === 'overpays'  && <OverpaysTable rows={rows} />}
                        {list === 'losing'    && <LosingBidsTable rows={rows} />}
                        {list === 'contested' && <ContestedTable rows={rows} />}
                        {list === 'bargains'  && <BargainsTable rows={rows} paid={paid} sort={sort} />}
                    </div>
                </DataWell>
            )}
        </div>
    )
}
