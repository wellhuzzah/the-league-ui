import { DataWell } from './Badge'
import { LOST_COLOR, TEXT_COLOR, weekLabel, money } from './waiverFormat'
import { Note, H } from './waiverUi'

const Heading = ({ children }) => (
    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, letterSpacing: 3, color: 'var(--amber)' }}>
        {children}
    </div>
)

// One row per player moved: a waiver claim's add, a free agent add, or any drop
const moveName = (r) => {
    if (r.item_type === 'DROP') return 'Drop'
    return r.type === 'WAIVER' ? 'Waiver claim' : 'Free agent add'
}

function MovesTable({ rows, cardName }) {
    return (
        <DataWell>
            <div className="table-wrap">
                <table className="standings">
                    <thead>
                        <tr>
                            <H align="right">Season</H>
                            <H align="right">Week</H>
                            <H>Owner</H>
                            <H>Move</H>
                            <H align="right">Bid</H>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r, i) => {
                            const isClaim = r.type === 'WAIVER' && r.item_type === 'ADD'
                            // Rows keep the name ESPN recorded at the time; flag it when it differs from the card's
                            const otherName = r.player_name && r.player_name.toLowerCase() !== cardName.toLowerCase()
                            return (
                                <tr key={i} style={{ cursor: 'default' }}>
                                    <td className="num">{r.season}</td>
                                    <td className="num" style={{ color: LOST_COLOR }}>{weekLabel(r.week)}</td>
                                    <td className="col-owner" style={{ color: TEXT_COLOR, fontWeight: 600 }}>{r.owner}</td>
                                    <td style={{ color: r.item_type === 'DROP' ? LOST_COLOR : TEXT_COLOR, whiteSpace: 'normal', lineHeight: 1.3 }}>
                                        {moveName(r)}
                                        {otherName && <span style={{ color: LOST_COLOR, fontSize: 11, marginLeft: 8 }}>as {r.player_name}</span>}
                                    </td>
                                    <td className="num" style={{ color: 'var(--win)' }}>{isClaim ? money(r.bid_amount) : ''}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </DataWell>
    )
}

// Adds and drops for the player card. data: /transactions/player/{name} response.
export default function PlayerTransactions({ data, cardName }) {
    const players = data.players ?? []
    const times = (n) => `${n} time${n === 1 ? '' : 's'}`

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Heading>ADDS AND DROPS</Heading>
            <Note style={{ color: TEXT_COLOR }}>
                Added {times(data.times_added)} · dropped {times(data.times_dropped)}
            </Note>
            {players.length > 1 ? (
                // The name matched more than one ESPN player: keep them apart
                players.map(p => (
                    <div key={p.espn_player_id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <Note style={{ color: 'var(--steel-hi)' }}>{p.names.join(' / ')}</Note>
                        <MovesTable rows={data.results.filter(r => r.espn_player_id === p.espn_player_id)} cardName={cardName} />
                    </div>
                ))
            ) : (
                <MovesTable rows={data.results} cardName={cardName} />
            )}
        </div>
    )
}
