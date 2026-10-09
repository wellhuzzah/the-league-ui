import { useEffect, useState } from 'react'
import { getTeamTransactions } from '../api/transactions'
import { DataWell } from './Badge'
import { LOST_COLOR, TEXT_COLOR, FIRST_OUTBID_SEASON, money } from './waiverFormat'

const Heading = ({ children }) => (
    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, letterSpacing: 3, color: 'var(--amber)', marginBottom: 6 }}>
        {children}
    </div>
)

const Note = ({ children, style }) => (
    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, letterSpacing: 0, color: LOST_COLOR, marginBottom: 10, lineHeight: 1.6, ...style }}>
        {children}
    </p>
)

// Per-season waiver activity for one team, with career totals.
// lastFinishedSeason: the team's last completed season; any later row is still in progress.
export default function TeamWaivers({ teamId, lastFinishedSeason }) {
    const [result, setResult] = useState({ teamId: null, data: null, error: null })
    const loading = result.teamId !== teamId

    useEffect(() => {
        let cancelled = false
        getTeamTransactions(teamId)
            .then(data => { if (!cancelled) setResult({ teamId, data, error: null }) })
            .catch(() => { if (!cancelled) setResult({ teamId, data: null, error: 'Could not load waiver activity — try again' }) })
        return () => { cancelled = true }
    }, [teamId])

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

    return (
        <div>
            <Heading>WAIVER ACTIVITY</Heading>
            <Note>2018 onward. Claims lost are outbid claims, tracked from 2019.</Note>

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
                                    <th style={{ textAlign: 'left', cursor: 'default' }}>Season</th>
                                    <th style={{ cursor: 'default' }}>FAAB</th>
                                    <th style={{ cursor: 'default' }}>Won</th>
                                    <th style={{ cursor: 'default' }}>Lost</th>
                                    <th style={{ cursor: 'default' }}>FA Adds</th>
                                    <th style={{ cursor: 'default' }}>Drops</th>
                                </tr>
                            </thead>
                            <tbody>
                                {seasons.map(s => {
                                    const inProgress = lastFinishedSeason != null && s.season > lastFinishedSeason
                                    return (
                                        <tr key={s.season} style={{ cursor: 'default' }}>
                                            <td style={{ fontWeight: 600, color: TEXT_COLOR }}>
                                                {s.season}
                                                {inProgress && <span style={{ color: LOST_COLOR, fontWeight: 400 }}> · in progress</span>}
                                            </td>
                                            <td className="num" style={{ color: TEXT_COLOR }}>{money(s.faab_spent)}</td>
                                            <td className="num" style={{ color: 'var(--win)' }}>{s.claims_won}</td>
                                            <td className="num" style={{ color: LOST_COLOR }}>{s.claims_lost ?? '—'}</td>
                                            <td className="num" style={{ color: TEXT_COLOR }}>{s.free_agent_adds}</td>
                                            <td className="num" style={{ color: TEXT_COLOR }}>{s.drops}</td>
                                        </tr>
                                    )
                                })}
                                <tr style={{ cursor: 'default' }}>
                                    <td style={{ fontWeight: 700, color: 'var(--amber)', borderTop: '2px solid #3a3d4a' }}>Career</td>
                                    <td className="num" style={{ fontWeight: 700, color: TEXT_COLOR, borderTop: '2px solid #3a3d4a' }}>{money(career.faab_spent)}</td>
                                    <td className="num" style={{ fontWeight: 700, color: 'var(--win)', borderTop: '2px solid #3a3d4a' }}>{career.claims_won}</td>
                                    <td className="num" style={{ fontWeight: 700, color: LOST_COLOR, borderTop: '2px solid #3a3d4a', lineHeight: 1.3 }}>
                                        {hasLost ? career.claims_lost : '—'}
                                        {hasLost && (
                                            <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: 0.5, marginTop: 2 }}>2019 onward</div>
                                        )}
                                    </td>
                                    <td className="num" style={{ fontWeight: 700, color: TEXT_COLOR, borderTop: '2px solid #3a3d4a' }}>{career.free_agent_adds}</td>
                                    <td className="num" style={{ fontWeight: 700, color: TEXT_COLOR, borderTop: '2px solid #3a3d4a' }}>{career.drops}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </DataWell>
            )}
        </div>
    )
}
