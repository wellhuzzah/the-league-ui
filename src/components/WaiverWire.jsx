import { useEffect, useState, Fragment } from 'react'
import { getTransactionSeasons, getWeekTransactions } from '../api/transactions'
import { DataWell } from './Badge'
import {
    LOST_COLOR, TEXT_COLOR, FIRST_OUTBID_SEASON, OUTBID,
    weekName, money, moveLabel, claimResult, pixelTabBtn, selectStyle,
} from './waiverFormat'
import { Note, H, PlayerName } from './waiverUi'

// ── Small pieces ──────────────────────────────────────────────────────────────

// One player per line: "Darren Waller TE"
const Players = ({ items, type }) => (
    <td style={{ color: TEXT_COLOR }}>
        {items.filter(i => i.item_type === type).map(i => (
            <div key={i.espn_player_id} style={{ lineHeight: 1.5 }}>
                <PlayerName name={i.player_name} position={i.position} />
            </div>
        ))}
    </td>
)

function MoveRow({ txn, nested }) {
    const won    = txn.status === 'EXECUTED'
    const result = claimResult(txn, { short: true })
    return (
        <tr style={{ cursor: 'default' }}>
            <td className="col-owner" style={{ color: won || !result ? TEXT_COLOR : LOST_COLOR, fontWeight: 600 }}>
                {nested && <span style={{ color: LOST_COLOR, marginRight: 6, marginLeft: 8 }}>↳</span>}
                {txn.owner}
            </td>
            <td style={{ color: LOST_COLOR }}>{nested ? '' : moveLabel(txn)}</td>
            <Players items={txn.items} type="ADD" />
            <Players items={txn.items} type="DROP" />
            <td className="num" style={{ color: won ? 'var(--win)' : LOST_COLOR }}>
                {txn.type === 'WAIVER' ? money(txn.bid_amount) : ''}
            </td>
            <td style={{ color: won ? 'var(--win)' : LOST_COLOR, fontWeight: won ? 600 : 400 }}>
                {result ?? ''}
            </td>
        </tr>
    )
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
        return <div className="loading" style={{ color: LOST_COLOR, fontFamily: 'Inter, sans-serif', fontSize: 12 }}>Loading...</div>
    }
    if (!seasonInfo) {
        return (
            <Note style={{ fontSize: 13, color: 'var(--steel-hi)' }}>
                {Number(season) < 2018 ? 'No transaction data before 2018.' : 'No transaction data for this season.'}
            </Note>
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

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Number(season) < FIRST_OUTBID_SEASON && (
                <Note style={{ fontSize: 13, color: 'var(--steel-hi)' }}>
                    2018 doesn't record outbid claims. Failed claims appear under the toggle with their reason.
                </Note>
            )}

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <button
                        onClick={() => weekIdx > 0 && pickWeek(weeks[weekIdx - 1])}
                        style={pixelTabBtn(false, weekIdx <= 0)}
                        aria-label="Previous week"
                    >◀</button>
                    <select value={week} onChange={e => pickWeek(e.target.value)} style={selectStyle}>
                        {weeks.map(w => <option key={w} value={w}>{weekName(w)}</option>)}
                    </select>
                    <button
                        onClick={() => weekIdx < weeks.length - 1 && pickWeek(weeks[weekIdx + 1])}
                        style={pixelTabBtn(false, weekIdx >= weeks.length - 1)}
                        aria-label="Next week"
                    >▶</button>
                </div>
                <button onClick={() => setShowFailed(v => !v)} style={pixelTabBtn(showFailed)}>
                    Show failed and cancelled claims{!loading && hiddenCount > 0 ? ` (${hiddenCount})` : ''}
                </button>
            </div>

            {loading ? (
                <div className="loading" style={{ color: LOST_COLOR, fontFamily: 'Inter, sans-serif', fontSize: 12 }}>
                    Loading...
                </div>
            ) : result.error ? (
                <Note>{result.error}</Note>
            ) : shown.length === 0 ? (
                <Note>
                    No completed moves in {weekName(week).toLowerCase()}.
                    {hiddenCount > 0 && ' Turn on "Show failed and cancelled claims" to see the rest.'}
                </Note>
            ) : (
                <DataWell>
                    <div className="table-wrap">
                        <table className="standings">
                            <thead><tr>
                                <H>Owner</H><H>Move</H><H>Added</H><H>Dropped</H><H align="right">Bid</H><H>Result</H>
                            </tr></thead>
                            <tbody>
                                {shown.map(t => (
                                    <Fragment key={t.espn_txn_id}>
                                        <MoveRow txn={t} />
                                        {(losersByWinner[t.espn_txn_id] || []).map(l => (
                                            <MoveRow key={l.espn_txn_id} txn={l} nested />
                                        ))}
                                    </Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </DataWell>
            )}
        </div>
    )
}
