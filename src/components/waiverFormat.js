// Shared display rules for waiver / transaction data

// Lost and outbid values: muted steel, but no darker than the readability floor
export const LOST_COLOR = '#a8b4c4'
export const TEXT_COLOR = '#d4d8e8'

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

// WAIVER = waiver claim; FREEAGENT = free agent add, or a drop when it adds nobody; ROSTER = drop
export const moveLabel = (txn) => {
    if (txn.type === 'WAIVER') return 'Waiver claim'
    if (txn.type === 'FREEAGENT' && txn.items.some(i => i.item_type === 'ADD')) return 'Free agent add'
    return 'Drop'
}
