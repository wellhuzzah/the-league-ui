import { useEffect, useState, Fragment } from 'react'
import { getTransactionSeasons, getWeekTransactions } from '../api/transactions'
import {
    FIRST_OUTBID_SEASON, OUTBID,
    weekName, money, moveLabel, claimResult,
} from './waiverFormat'
import { leagueDayKey, leagueDayLabel, leagueTime, leagueMinute } from '../utils/leagueTime'
import PlayerName from './PlayerName'
import TeamChip from './TeamChip'

// Seasons › Waiver Wire: one week's moves, newest first, grouped under day headers by kind
// ("WED 10/29 · WAIVERS", "WED 10/29 · FREE AGENTS"). A ledger in the table system (tables.css).

const cx = (...names) => names.filter(Boolean).join(' ')

const Note = ({ children }) => <p className="rw-note" style={{ margin: 0 }}>{children}</p>

// One player per line: "Darren Waller TE"
const Players = ({ items, type, className }) => (
    <td className={className}>
        {items.filter(i => i.item_type === type).map(i => (
            <div key={i.espn_player_id}>
                <PlayerName id={i.espn_player_id} name={i.player_name} />
                {i.position && <span className="pos">{i.position}</span>}
                <TeamChip abbrev={i.nfl_team} name={i.nfl_team_name} variant="text" title="NFL team that week" />
            </div>
        ))}
    </td>
)

const when = (t) => t.event_at || t.proposed_at

function MoveRow({ txn, nested }) {
    const won    = txn.status === 'EXECUTED'
    const result = claimResult(txn, { short: true })
    const at     = when(txn)
    return (
        <tr className={nested ? 'nested' : undefined}>
            <td className="num time m2 m2s">{!nested && at ? leagueTime(at) : null}</td>
            <td className={cx('who m1', won || !result ? 'name' : 'soft')}>{txn.owner}</td>
            {/* On mobile the day header already says the kind: only a drop keeps its label */}
            <td className={cx('meta m2 p-dot', moveLabel(txn) !== 'Drop' && 'm-hide')}>{nested ? null : moveLabel(txn)}</td>
            <Players items={txn.items} type="ADD" className="add m1 p-dot" />
            <Players items={txn.items} type="DROP" className="drop m2 p-lbl" />
            <td className={cx('num mk', won ? 'key' : 'meta')}>
                {txn.type === 'WAIVER' ? money(txn.bid_amount) : null}
            </td>
            <td className={cx('m2 p-dot', won ? 'res-won' : 'soft')}>{result || null}</td>
        </tr>
    )
}

// Rows newest first; a waiver run (one minute) keeps its processing order. Then consecutive rows of
// the same Eastern day and kind form a group.
function dayGroups(rows) {
    const ordered = rows
        .map((t, i) => ({ t, i }))
        .sort((a, b) => {
            const am = when(a.t) ? leagueMinute(when(a.t)) : -Infinity
            const bm = when(b.t) ? leagueMinute(when(b.t)) : -Infinity
            return bm - am || a.i - b.i
        })
        .map(x => x.t)
    const groups = []
    for (const t of ordered) {
        const at   = when(t)
        const kind = t.type === 'WAIVER' ? 'WAIVERS' : 'FREE AGENTS'
        const key  = `${at ? leagueDayKey(at) : 'undated'}|${kind}`
        const last = groups[groups.length - 1]
        if (last && last.key === key) last.rows.push(t)
        else groups.push({ key, kind, day: at ? leagueDayLabel(at) : 'UNDATED', rows: [t] })
    }
    return groups
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function WaiverWire({ season }) {
    const [txnSeasons, setTxnSeasons] = useState(null)
    // Week picked by the user, remembered with the season it was picked for
    const [picked,     setPicked]     = useState({ season: null, week: null })
    const [showFailed, setShowFailed] = useState(false)
    const [result,     setResult]     = useState({ key: null, data: null, error: null })

    useEffect(() => {
        getTransactionSeasons()
            .then(setTxnSeasons)
            .catch(() => setTxnSeasons([]))
    }, [])

    const seasonInfo = txnSeasons?.find(s => String(s.season) === String(season))
    const weeks      = seasonInfo?.weeks ?? []
    // Default to the latest week whenever the season changes
    const week       = picked.season === season && weeks.includes(picked.week) ? picked.week : weeks[weeks.length - 1]
    const weekIdx    = weeks.indexOf(week)
    const pickWeek   = (w) => setPicked({ season, week: Number(w) })

    const requestKey = seasonInfo && week !== undefined ? `${season}-${week}` : null
    const loading    = requestKey !== null && result.key !== requestKey

    useEffect(() => {
        if (!requestKey) return
        let cancelled = false
        getWeekTransactions(season, week)
            .then(data => { if (!cancelled) setResult({ key: requestKey, data, error: null }) })
            .catch(() => { if (!cancelled) setResult({ key: requestKey, data: null, error: 'Could not load this week — try again' }) })
        return () => { cancelled = true }
    }, [requestKey]) // eslint-disable-line react-hooks/exhaustive-deps

    if (txnSeasons === null) {
        return <div className="rw-loading">Loading...</div>
    }
    if (!seasonInfo) {
        return (
            <div className="rw-block">
                <Note>{Number(season) < 2018 ? 'No transaction data before 2018.' : 'No transaction data for this season.'}</Note>
            </div>
        )
    }

    // 2018 cancel twins (cancel_twin_of set) duplicate a failed claim, so they never show.
    const txns = (result.key === requestKey && result.data?.transactions || []).filter(t => !t.cancel_twin_of)
    const ids  = new Set(txns.map(t => t.espn_txn_id))

    // Outbid claims are listed under the claim that beat them
    const losersByWinner = {}
    txns.forEach(t => {
        if (t.status === OUTBID && t.outbid_by && ids.has(t.outbid_by.espn_txn_id)) {
            (losersByWinner[t.outbid_by.espn_txn_id] ??= []).push(t)
        }
    })
    const nestedIds = new Set(Object.values(losersByWinner).flat().map(t => t.espn_txn_id))

    const isDefault = (t) => t.status === 'EXECUTED' || t.status === OUTBID
    const hiddenCount = txns.filter(t => !isDefault(t)).length
    const shown = txns.filter(t => !nestedIds.has(t.espn_txn_id) && (showFailed || isDefault(t)))
    const groups = dayGroups(shown)

    return (
        <div className="rw-block" style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 'min(900px, 100%)' }}>
            <h2 className="rw-label" style={{ margin: 0 }}>Waiver Wire</h2>
            {Number(season) < FIRST_OUTBID_SEASON && (
                <Note>2018 doesn't record outbid claims. Failed claims appear under the toggle with their reason.</Note>
            )}

            <div className="rw-ctls">
                <div className="rw-seg" style={{ alignItems: 'center' }}>
                    <button
                        type="button"
                        onClick={() => weekIdx > 0 && pickWeek(weeks[weekIdx - 1])}
                        disabled={weekIdx <= 0}
                        aria-label="Previous week"
                    >◀</button>
                    <select className="rw-select" value={week} onChange={e => pickWeek(e.target.value)} aria-label="Week">
                        {weeks.map(w => <option key={w} value={w}>{weekName(w)}</option>)}
                    </select>
                    <button
                        type="button"
                        onClick={() => weekIdx < weeks.length - 1 && pickWeek(weeks[weekIdx + 1])}
                        disabled={weekIdx >= weeks.length - 1}
                        aria-label="Next week"
                    >▶</button>
                </div>
                <div className="rw-seg">
                    <button type="button" onClick={() => setShowFailed(v => !v)} className={showFailed ? 'on' : undefined} aria-pressed={showFailed}>
                        Show failed and cancelled claims{!loading && hiddenCount > 0 ? ` (${hiddenCount})` : ''}
                    </button>
                </div>
                <span className="rw-ctl-lbl" style={{ marginLeft: 'auto' }}>Newest first · Eastern time</span>
            </div>

            {loading ? (
                <div className="rw-loading">Loading...</div>
            ) : result.error ? (
                <Note>{result.error}</Note>
            ) : shown.length === 0 ? (
                <Note>
                    No completed moves in {weekName(week).toLowerCase()}.
                    {hiddenCount > 0 && ' Turn on "Show failed and cancelled claims" to see the rest.'}
                </Note>
            ) : (
                <div className="table-wrap">
                    <table className="rw-table rw-ledger rw-2line rw-norank" style={{ width: '100%' }}>
                        <thead><tr>
                            <th className="num">Time</th><th>Owner</th><th>Move</th><th>Added</th><th>Dropped</th><th className="num">Bid</th><th>Result</th>
                        </tr></thead>
                        {groups.map(g => {
                            const claims = g.rows.length
                            const noun = g.kind === 'WAIVERS' ? (claims === 1 ? 'claim' : 'claims') : (claims === 1 ? 'move' : 'moves')
                            return (
                                <tbody key={g.key + g.rows[0].espn_txn_id}>
                                    <tr className="day-row">
                                        <th className="day" colSpan={7} scope="rowgroup">
                                            {g.day} · <span className={cx('kind', g.kind !== 'WAIVERS' && 'fa')}>{g.kind}</span>
                                            <span className="count">{claims} {noun}</span>
                                        </th>
                                    </tr>
                                    {g.rows.map(t => (
                                        <Fragment key={t.espn_txn_id}>
                                            <MoveRow txn={t} />
                                            {(losersByWinner[t.espn_txn_id] || []).map(l => (
                                                <MoveRow key={l.espn_txn_id} txn={l} nested />
                                            ))}
                                        </Fragment>
                                    ))}
                                </tbody>
                            )
                        })}
                    </table>
                </div>
            )}
        </div>
    )
}
