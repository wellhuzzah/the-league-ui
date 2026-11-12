// Sortable header cell for the table system (tables.css): the label is a button, the sorted column's
// header carries aria-sort. `sort` is a page's { sortKey, sortDir, handleSort }. Number columns align
// right; pass `text` for a text column (owner, player).
export default function SortTh({ label, sortKey, sort, text = false, className }) {
    const active = sortKey === sort.sortKey
    const cls = [className, !text && 'num'].filter(Boolean).join(' ')
    return (
        <th
            className={cls || undefined}
            aria-sort={active ? (sort.sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
        >
            <button type="button" className="rw-sort" onClick={() => sort.handleSort(sortKey)}>
                {label}
                <span className="arr" aria-hidden="true">{active && sort.sortDir === 'asc' ? '▲' : '▼'}</span>
            </button>
        </th>
    )
}
