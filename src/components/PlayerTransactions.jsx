import { weekLabel, money } from './waiverFormat'

// Players › Transactions: a ledger in the table system (tables.css)

// One row per player moved: a waiver claim's add, a free agent add, or any drop
const moveName = (r) => {
    if (r.item_type === 'DROP') return 'Drop'
    return r.type === 'WAIVER' ? 'Waiver claim' : 'Free agent add'
}

function MovesTable({ rows, cardName }) {
    return (
        <div className="table-wrap">
            <table className="rw-table rw-ledger rw-2line rw-norank" style={{ width: '100%' }}>
                <thead>
                    <tr>
                        <th className="num">Season</th>
                        <th className="num">Week</th>
                        <th>Owner</th>
                        <th>Move</th>
                        <th className="num">Bid</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r, i) => {
                        const isClaim = r.type === 'WAIVER' && r.item_type === 'ADD'
                        // Rows keep the name ESPN recorded at the time; flag it when it differs from the card's
                        const otherName = r.player_name && r.player_name.toLowerCase() !== cardName.toLowerCase()
                        return (
                            <tr key={i}>
                                <td className="num meta m2 m2s">{r.season}</td>
                                <td className="num meta m2 p-sp">{weekLabel(r.week)}</td>
                                <td className="name m1">{r.owner}</td>
                                <td className={r.item_type === 'DROP' ? 'soft m1 p-dot' : 'm1 p-dot'} style={{ whiteSpace: 'normal', lineHeight: 1.3 }}>
                                    {moveName(r)}
                                    {otherName && <span className="meta" style={{ fontSize: 11, marginLeft: 8 }}>as {r.player_name}</span>}
                                </td>
                                <td className="num key mk">{isClaim ? money(r.bid_amount) : null}</td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}

// Adds and drops for the player card. data: /transactions/player/{name} response.
export default function PlayerTransactions({ data, cardName }) {
    const players = data.players ?? []
    const times = (n) => `${n} time${n === 1 ? '' : 's'}`

    return (
        <div className="rw-block" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h2 className="rw-label" style={{ margin: 0 }}>Adds and Drops</h2>
            <p className="rw-note" style={{ margin: 0, color: 'var(--steel-hi)' }}>
                Added {times(data.times_added)} · dropped {times(data.times_dropped)}
            </p>
            {players.length > 1 ? (
                // The name matched more than one ESPN player: keep them apart
                players.map(p => (
                    <div key={p.espn_player_id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <p className="rw-note" style={{ margin: 0, color: 'var(--steel-hi)' }}>{p.names.join(' / ')}</p>
                        <MovesTable rows={data.results.filter(r => r.espn_player_id === p.espn_player_id)} cardName={cardName} />
                    </div>
                ))
            ) : (
                <MovesTable rows={data.results} cardName={cardName} />
            )}
        </div>
    )
}
