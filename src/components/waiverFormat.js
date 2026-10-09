// Shared display rules for waiver / transaction data

// Lost and outbid values: muted steel, but no darker than the readability floor
export const LOST_COLOR = '#a8b4c4'
export const TEXT_COLOR = '#d4d8e8'

// Small button (list pickers, toggles) and dropdown styles shared by the waiver views
export const pixelTabBtn = (active, disabled = false) => ({
    background: active ? 'var(--amber)' : '#1a1c26',
    border: `2px solid ${active ? 'var(--amber)' : '#3a3d4a'}`,
    color: active ? '#1a1c26' : disabled ? 'var(--steel-2)' : '#c8cad4',
    fontFamily: 'Inter, sans-serif',
    fontSize: 12,
    fontWeight: active ? 600 : 400,
    letterSpacing: 0,
    padding: '4px 12px',
    cursor: disabled ? 'default' : 'pointer',
    touchAction: 'manipulation',
})

export const selectStyle = {
    background: '#1a1c26',
    border: '2px solid var(--steel-3)',
    color: '#f4eedd',
    fontFamily: 'Inter, sans-serif',
    fontSize: 13,
    letterSpacing: 0,
    padding: '5px 8px',
    cursor: 'pointer',
}

// Outbid data (FAILED_INVALIDPLAYERSOURCE) exists from 2019 onward
export const FIRST_OUTBID_SEASON = 2019

export const OUTBID = 'FAILED_INVALIDPLAYERSOURCE'

export const weekLabel = (week) => (Number(week) === 0 ? 'Preseason' : `W${week}`)
export const weekName  = (week) => (Number(week) === 0 ? 'Preseason' : `Week ${week}`)

export const money = (n) => `$${n}`

// Never show raw status strings
const STATUS_LABELS = {
    EXECUTED:                       'Won',
    FAILED_INVALIDPLAYERSOURCE:     'Outbid',
    FAILED_ROSTERLIMIT:             'Roster full',
    FAILED_MATCHUPACQUISITIONLIMIT: 'Weekly add limit',
    FAILED_PLAYERALREADYDROPPED:    'Drop player already gone',
    FAILED_ROSTERLOCK:              'Player locked',
    FAILED_NOTCLEAREDWAIVERS:       'Still on waivers',
    FAILED_IRSLOT:                  'IR slot issue',
    FAILED_AUCTIONBUDGETEXCEEDED:   'Over budget',
    CANCELED:                       'Cancelled',
}

export const statusLabel = (status) => STATUS_LABELS[status] ?? 'Failed'

// An outbid claim that matched the winning bid lost a tiebreak, not an outbid
export const isTie = (bid, winningBid) => bid === winningBid

// Result text for a waiver claim; free agent adds and drops have none.
// short: for rows shown under the winning claim, which already shows the winner and amounts.
// Otherwise the full sentence, for claims shown on their own.
export function claimResult(txn, { short = false } = {}) {
    if (txn.type !== 'WAIVER') return null
    if (txn.status === OUTBID && txn.outbid_by) {
        const o   = txn.outbid_by
        const tie = isTie(txn.bid_amount, o.bid_amount)
        if (short) return tie ? 'Lost tiebreak' : 'Outbid'
        const player = txn.items.find(i => i.item_type === 'ADD')?.player_name
        return tie
            ? `Tied at ${money(o.bid_amount)} · ${o.owner} got ${player}`
            : `Outbid by ${o.owner}, ${money(o.bid_amount)} vs ${money(txn.bid_amount)}`
    }
    return statusLabel(txn.status)
}

// WAIVER = waiver claim; FREEAGENT = free agent add, or a drop when it adds nobody; ROSTER = drop
export const moveLabel = (txn) => {
    if (txn.type === 'WAIVER') return 'Waiver claim'
    if (txn.type === 'FREEAGENT' && txn.items.some(i => i.item_type === 'ADD')) return 'Free agent add'
    return 'Drop'
}
