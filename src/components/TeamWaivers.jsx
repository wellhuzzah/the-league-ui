import { useEffect, useState, Fragment } from 'react'
import { getTeamTransactions, getTeamSeasonTransactions } from '../api/transactions'
import { DataWell } from './Badge'
import {
    LOST_COLOR, TEXT_COLOR, FIRST_OUTBID_SEASON, OUTBID,
    money, weekLabel, moveLabel, claimResult, pixelTabBtn,
} from './waiverFormat'
import { ControlLabel, Note, H, PlayerName } from './waiverUi'

const Heading = ({ children }) => (
    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, letterSpacing: 3, color: 'var(--amber)', marginBottom: 6 }}>
        {children}
    </div>
)

// ── One move, two lines: "W3 · Waiver claim · $6 · Outbid by joey j, $25 vs $6" / "+ Player  − Player"

function MoveEntry({ txn }) {
    const result = claimResult(txn)
    const won    = txn.status === 'EXECUTED'
    const adds   = txn.items.filter(i => i.item_type === 'ADD')
    const drops  = txn.items.filter(i => i.item_type === 'DROP')
    return (
        <div style={{ padding: '6px 0', borderBottom: '1px dashed rgba(100,104,130,0.18)' }}>
            <div style={{ color: LOST_COLOR }}>
                <span style={{ color: TEXT_COLOR, fontWeight: 600 }}>{weekLabel(txn.week)}</span>
                {' · '}{moveLabel(txn)}
                {txn.type === 'WAIVER' && <>{' · '}<span style={{ color: won ? 'var(--win)' : LOST_COLOR }}>{money(txn.bid_amount)}</span></>}
                {result && <>{' · '}<span style={{ color: won ? 'var(--win)' : LOST_COLOR, fontWeight: won ? 600 : 400 }}>{result}</span></>}
            </div>
            <div style={{ color: TEXT_COLOR, display: 'flex', flexWrap: 'wrap', columnGap: 16 }}>
                {adds.map(i => (
                    <span key={`a${i.espn_player_id}`}>
                        <span style={{ color: 'var(--win)', marginRight: 4 }}>+</span>
                        <PlayerName name={i.player_name} position={i.position} />
                    </span>
                ))}
                {drops.map(i => (
                    <span key={`d${i.espn_player_id}`}>
                        <span style={{ color: LOST_COLOR, marginRight: 4 }}>−</span>
                        <PlayerName name={i.player_name} position={i.position} />
                    </span>
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
        return <div style={{ color: LOST_COLOR }}>Loading...</div>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '4px 0 8px' }}>
            <div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 4 }}>
                    <ControlLabel>Waiver claims · {visible.length}</ControlLabel>
                    <button onClick={() => setShowFailed(v => !v)} style={pixelTabBtn(showFailed)}>
                        Show failed and cancelled claims{hidden > 0 ? ` (${hidden})` : ''}
                    </button>
                </div>
                {visible.length === 0 ? (
                    <Note>No waiver claims{hidden > 0 && !showFailed ? ' won or lost this season' : ' this season'}.</Note>
                ) : (
                    visible.map(t => <MoveEntry key={t.espn_txn_id} txn={t} />)
                )}
            </div>

            {others.length > 0 && (
                <div>
                    <button onClick={() => setShowAddsDrop(v => !v)} style={pixelTabBtn(showAddsDrop)}>
                        {showAddsDrop ? 'Hide adds and drops' : `Show ${others.length} adds and drops`}
                    </button>
                    {showAddsDrop && (
                        <div style={{ marginTop: 4 }}>
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
        return <div className="loading" style={{ color: LOST_COLOR, fontFamily: 'Inter, sans-serif', fontSize: 12 }}>Loading...</div>
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
    const careerCell = { fontWeight: 700, borderTop: '2px solid #3a3d4a' }

    return (
        <div>
            <Heading>WAIVER ACTIVITY</Heading>
            <Note style={{ letterSpacing: 0, marginBottom: 10 }}>
                2018 onward. Claims lost are outbid claims, tracked from 2019. Select a season to see its moves.
            </Note>

            {result.error ? (
                <Note>{result.error}</Note>
            ) : seasons.length === 0 ? (
                <Note style={{ fontSize: 13, color: 'var(--steel-hi)' }}>
                    No transaction data — waiver history starts in 2018.
                </Note>
            ) : (
                <DataWell>
                    <div className="table-wrap">
                        <table className="standings">
                            <thead>
                                <tr>
                                    <H>Season</H>
                                    <H align="right">FAAB</H>
                                    <H align="right">Won</H>
                                    <H align="right">Lost</H>
                                    <H align="right" style={{ whiteSpace: 'normal' }}>FA Adds</H>
                                    <H align="right">Drops</H>
                                    <H style={{ paddingLeft: 2, paddingRight: 6 }}></H>
                                </tr>
                            </thead>
                            <tbody>
                                {seasons.map(s => {
                                    const inProgress = lastFinishedSeason != null && s.season > lastFinishedSeason
                                    const isOpen = open === s.season
                                    return (
                                        <Fragment key={s.season}>
                                            <tr onClick={() => toggle(s.season)}>
                                                <td style={{ fontWeight: 600, color: TEXT_COLOR, whiteSpace: 'normal', lineHeight: 1.3 }}>
                                                    {s.season}
                                                    {inProgress && <span style={{ color: LOST_COLOR, fontWeight: 400, fontSize: 11 }}> · in progress</span>}
                                                </td>
                                                <td className="num" style={{ color: TEXT_COLOR }}>{money(s.faab_spent)}</td>
                                                <td className="num" style={{ color: 'var(--win)' }}>{s.claims_won}</td>
                                                <td className="num" style={{ color: LOST_COLOR }}>{s.claims_lost ?? '—'}</td>
                                                <td className="num" style={{ color: TEXT_COLOR }}>{s.free_agent_adds}</td>
                                                <td className="num" style={{ color: TEXT_COLOR }}>{s.drops}</td>
                                                <td className="num" style={{ color: LOST_COLOR, fontSize: 11, paddingLeft: 2, paddingRight: 6 }}>{isOpen ? '▲' : '▼'}</td>
                                            </tr>
                                            {isOpen && (
                                                <tr style={{ cursor: 'default' }}>
                                                    <td colSpan={7} style={{ whiteSpace: 'normal', lineHeight: 1.5, background: 'rgba(255,255,255,0.03)' }}>
                                                        <div style={{ position: 'sticky', left: 8, maxWidth: 'calc(100vw - 66px)' }}>
                                                            <SeasonMoves key={s.season} entry={moves[s.season]} />
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    )
                                })}
                                <tr style={{ cursor: 'default' }}>
                                    <td style={{ ...careerCell, color: 'var(--amber)' }}>Career</td>
                                    <td className="num" style={{ ...careerCell, color: TEXT_COLOR }}>{money(career.faab_spent)}</td>
                                    <td className="num" style={{ ...careerCell, color: 'var(--win)' }}>{career.claims_won}</td>
                                    <td className="num" style={{ ...careerCell, color: LOST_COLOR, lineHeight: 1.3 }}>
                                        {hasLost ? career.claims_lost : '—'}
                                        {hasLost && (
                                            <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: 0.5, marginTop: 2, whiteSpace: 'normal' }}>2019 onward</div>
                                        )}
                                    </td>
                                    <td className="num" style={{ ...careerCell, color: TEXT_COLOR }}>{career.free_agent_adds}</td>
                                    <td className="num" style={{ ...careerCell, color: TEXT_COLOR }}>{career.drops}</td>
                                    <td style={careerCell}></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </DataWell>
            )}
        </div>
    )
}
