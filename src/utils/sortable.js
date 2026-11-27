import { useCallback, useState } from 'react'

// Client-side sort for a table: the rows sorted on sortKey (nulls last), and a handler for SortTh.
// Clicking the sorted column flips the direction; another column starts at defaultDir.
// thenBy: optional { key: tiebreakKey } — rows equal on that key are ordered by the tiebreak, in the
// same direction (e.g. { season: 'week' } keeps a season's games in week order).
export function useSortable(data, defaultKey, defaultDir = 'desc', thenBy = {}) {
    const [sortKey, setSortKey] = useState(defaultKey)
    const [sortDir, setSortDir] = useState(defaultDir)

    const handleSort = useCallback((key) => {
        setSortDir(prev => key === sortKey ? (prev === 'desc' ? 'asc' : 'desc') : defaultDir)
        setSortKey(key)
    }, [sortKey, defaultDir])

    const compareOn = (key, a, b) => {
        const av = a[key], bv = b[key]
        if (av === null || av === undefined) return bv === null || bv === undefined ? 0 : 1
        if (bv === null || bv === undefined) return -1
        const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv
        return sortDir === 'asc' ? cmp : -cmp
    }
    const tiebreak = thenBy[sortKey]
    const sorted = [...(data || [])].sort((a, b) =>
        compareOn(sortKey, a, b) || (tiebreak ? compareOn(tiebreak, a, b) : 0))

    return { sorted, sortKey, sortDir, handleSort }
}
