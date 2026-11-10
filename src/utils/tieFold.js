import { useState } from 'react'

// Ranked lists keep every row tied at the cutoff (league rule), so a list can run past its limit.
// When 3 or more rows past the limit tie with the last row inside it, they fold into one line
// (components/TieFoldLine.jsx: "+89 more tied at 0.0") that opens on click; 1 or 2 extra rows just
// show. `rows` must be in the API's rank order: the rows past `limit` are the tie, whichever column
// the table is sorted by.
const MIN_FOLD = 3

export function useTieFold(rows, limit) {
    const [openFor, setOpenFor] = useState(null)    // the rows it was opened for: new data starts folded
    const extra = rows && rows.length - limit >= MIN_FOLD ? rows.slice(limit) : []
    const open = extra.length > 0 && openFor === rows
    const folded = extra.length && !open ? new Set(extra) : null
    return {
        count: extra.length,
        open,
        cutoff: extra.length ? rows[limit - 1] : null,                 // the last row inside the limit
        shown: list => folded ? list.filter(r => !folded.has(r)) : list,
        toggle: () => setOpenFor(open ? null : rows),
    }
}
