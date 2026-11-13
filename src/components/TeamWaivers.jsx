import { useEffect, useState, Fragment } from 'react'
import { getTeamTransactions, getTeamSeasonTransactions } from '../api/transactions'
import {
    FIRST_OUTBID_SEASON, OUTBID,
    money, weekLabel, moveLabel, claimResult,
} from './waiverFormat'
import PlayerName from './PlayerName'

// Teams › Waivers: per-season waiver activity for one team, in the table system (tables.css).

const Note = ({ children, style }) => <p className="rw-note" style={{ margin: 0, ...style }}>{children}</p>

const Player = ({ item }) => (
    <>
        <PlayerName id={item.espn_player_id} name={item.player_name} />
        {item.position && <span className="pos">{item.position}</span>}
    </>
)

// ── One move, two lines: "W3 · Waiver claim · $6 · Outbid by joey j, $25 vs $6" / "+ Player  − Player"

function MoveEntry({ txn }) {
    const result = claimResult(txn)
    const won    = txn.status === 'EXECUTED'
    const adds   = txn.items.filter(i => i.item_type === 'ADD')
    const drops  = txn.items.filter(i => i.item_type === 'DROP')
    return (
        <div className="rw-move">
            <div className="meta">
                <span className="name">{weekLabel(txn.week)}</span>
                {' · '}{moveLabel(txn)}
                {txn.type === 'WAIVER' && <>{' · '}<span className={won ? 'key' : undefined}>{money(txn.bid_amount)}</span></>}
                {result && <>{' · '}<span className={won ? 'res-won' : 'soft'}>{result}</span></>}
            </div>
            <div className="players">
                {adds.map(i => (
                    <span key={`a${i.espn_player_id}`} className="add"><span className="sign">+</span><Player item={i} /></span>
                ))}
                {drops.map(i => (
                    <span key={`d${i.espn_player_id}`} className="drop"><span className="sign">−</span><Player item={i} /></span>
                ))}
            </div>
        </div>
    )
}

// ── Expanded season: waiver claims first, then adds and drops behind a button

function SeasonMoves({ entry }) {
    const [showFailed,   setShowFailed]   = useState(false)
    const [showAddsDrop, setShowAddsDrop] = useState(false)

    if (!entry) {
        return <div className="rw-loading" style={{ padding: 12 }}>Loading...</div>
    }
    if (entry.error) {
        return <Note>{entry.error}</Note>
    }

    // 2018 cancel twins duplicate a failed claim, so they never show
    const txns    = entry.data.transactions.filter(t => !t.cancel_twin_of)
    const claims  = txns.filter(t => t.type === 'WAIVER')
    const isShown = (t) => t.status === 'EXECUTED' || t.status === OUTBID
    const hidden  = claims.filter(t => !isShown(t)).length
    const visible = claims.filter(t => showFailed || isShown(t))
    const others  = txns.filter(t => t.type !== 'WAIVER')

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '6px 0 10px' }}>
            <div>
                <div className="rw-ctls" style={{ marginBottom: 6 }}>
                    <span className="rw-ctl-lbl">Waiver claims · {visible.length}</span>
                    <div className="rw-seg">
                        <button type="button" onClick={() => setShowFailed(v => !v)} className={showFailed ? 'on' : undefined} aria-pressed={showFailed}>
                            Show failed and cancelled claims{hidden > 0 ? ` (${hidden})` : ''}
                        </button>
                    </div>
                </div>
                {visible.length === 0 ? (
                    <Note>No waiver claims{hidden > 0 && !showFailed ? ' won or lost this season' : ' this season'}.</Note>
                ) : (
                    visible.map(t => <MoveEntry key={t.espn_txn_id} txn={t} />)
                )}
            </div>

            {others.length > 0 && (
                <div>
                    <div className="rw-seg">
                        <button type="button" onClick={() => setShowAddsDrop(v => !v)} className={showAddsDrop ? 'on' : undefined} aria-expanded={showAddsDrop}>
                            {showAddsDrop ? 'Hide adds and drops' : `Show ${others.length} adds and drops`}
                        </button>
                    </div>
                    {showAddsDrop && (
                        <div style={{ marginTop: 6 }}>
                            {others.map(t => <MoveEntry key={t.espn_txn_id} txn={t} />)}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

// ── Main: per-season waiver activity for one team, with career totals ───────
// lastFinishedSeason: the team's last completed season; any later row is still in progress.

export default function TeamWaivers({ teamId, lastFinishedSeason }) {
    const [result,   setResult]   = useState({ teamId: null, data: null, error: null })
    const [open,     setOpen]     = useState(null)   // one expanded season at a time
    const [moves,    setMoves]    = useState({})     // season -> { data, error }, kept for the visit
    const loading = result.teamId !== teamId

    useEffect(() => {
        let cancelled = false
        getTeamTransactions(teamId)
            .then(data => { if (!cancelled) setResult({ teamId, data, error: null }) })
            .catch(() => { if (!cancelled) setResult({ teamId, data: null, error: 'Could not load waiver activity — try again' }) })
        return () => { cancelled = true }
    }, [teamId])

    const toggle = (season) => {
        if (open === season) { setOpen(null); return }
        setOpen(season)
        if (moves[season] && !moves[season].error) return
        setMoves(m => ({ ...m, [season]: undefined }))
        getTeamSeasonTransactions(teamId, season)
            .then(data => setMoves(m => ({ ...m, [season]: { data, error: null } })))
            .catch(() => setMoves(m => ({ ...m, [season]: { data: null, error: 'Could not load this season — try again' } })))
    }

    if (loading) {
        return <div className="rw-loading">Loading...</div>
    }

    const seasons = result.data?.seasons ?? []
    const sum = (key) => seasons.reduce((a, s) => a + (s[key] ?? 0), 0)
    const career = {
        faab_spent:      sum('faab_spent'),
        claims_won:      sum('claims_won'),
        // claims_lost is null for 2018 (no outbid data), so this totals 2019 onward
        claims_lost:     sum('claims_lost'),
        free_agent_adds: sum('free_agent_adds'),
        drops:           sum('drops'),
    }
    const hasLost = seasons.some(s => s.season >= FIRST_OUTBID_SEASON)

    return (
        <div className="rw-block">
            <h2 className="rw-label">Waiver Activity</h2>
            <p className="rw-note">
                2018 onward. Claims lost are outbid claims, tracked from 2019. Select a season to see its moves.
            </p>

            {result.error ? (
                <Note>{result.error}</Note>
            ) : seasons.length === 0 ? (
                <Note>No transaction data — waiver history starts in 2018.</Note>
            ) : (
                <div className="table-wrap">
                    <table className="rw-table rw-standings rw-board">
                        <thead>
                            <tr>
                                <th>Season</th>
                                <th className="num">FAAB</th>
                                <th className="num">Won</th>
                                <th className="num">Lost</th>
                                <th className="num">FA Adds</th>
                                <th className="num">Drops</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {seasons.map(s => {
                                const inProgress = lastFinishedSeason != null && s.season > lastFinishedSeason
                                const isOpen = open === s.season
                                return (
                                    <Fragment key={s.season}>
                                        <tr
                                            className="link"
                                            tabIndex={0}
                                            aria-expanded={isOpen}
                                            onClick={() => toggle(s.season)}
                                            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(s.season) } }}
                                        >
                                            <td className="name">
                                                {s.season}
                                                {inProgress && <span className="meta" style={{ fontWeight: 400, fontSize: 11 }}> · in progress</span>}
                                            </td>
                                            <td className="num">{money(s.faab_spent)}</td>
                                            <td className="num win">{s.claims_won}</td>
                                            <td className="num soft">{s.claims_lost ?? '—'}</td>
                                            <td className="num">{s.free_agent_adds}</td>
                                            <td className="num">{s.drops}</td>
                                            <td className="num meta" style={{ fontSize: 11 }}>{isOpen ? '▲' : '▼'}</td>
                                        </tr>
                                        {isOpen && (
                                            <tr className="detail">
                                                <td colSpan={7} style={{ whiteSpace: 'normal', lineHeight: 1.5, height: 'auto' }}>
                                                    <div style={{ position: 'sticky', left: 8, maxWidth: 'calc(100vw - 66px)' }}>
                                                        <SeasonMoves key={s.season} entry={moves[s.season]} />
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                )
                            })}
                            <tr className="total">
                                <td className="key" style={{ color: 'var(--amber)' }}>Career</td>
                                <td className="num key">{money(career.faab_spent)}</td>
                                <td className="num key win">{career.claims_won}</td>
                                <td className="num key soft" style={{ lineHeight: 1.3 }}>
                                    {hasLost ? career.claims_lost : '—'}
                                    {hasLost && <div className="meta" style={{ fontSize: 10, fontWeight: 400 }}>2019 onward</div>}
                                </td>
                                <td className="num key">{career.free_agent_adds}</td>
                                <td className="num key">{career.drops}</td>
                                <td></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
