// Shared display rules for waiver / transaction data

// Lost and outbid values: muted steel, but no darker than the readability floor
export const LOST_COLOR = '#a8b4c4'
export const TEXT_COLOR = '#d4d8e8'

// Outbid data (FAILED_INVALIDPLAYERSOURCE) exists from 2019 onward
export const FIRST_OUTBID_SEASON = 2019

export const weekLabel = (week) => (Number(week) === 0 ? 'Preseason' : `W${week}`)

export const money = (n) => `$${n}`
