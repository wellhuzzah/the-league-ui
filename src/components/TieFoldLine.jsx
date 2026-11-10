const lineStyle = {
    background: 'transparent',
    border: '1px solid var(--steel-3)',
    color: 'var(--steel-hi)',
    fontFamily: 'Inter, sans-serif',
    fontSize: 11,
    letterSpacing: 1,
    padding: '2px 8px',
    cursor: 'pointer',
}

// The line a tie at a list's cutoff folds into (utils/tieFold.js): "+89 more tied at 0.0", and
// "Hide the 89 tied" once open. A table row spanning `colSpan` columns, or a plain block when there
// is no colSpan. `format` turns the cutoff row into the tied value as the list shows it.
export default function TieFoldLine({ fold, format, colSpan, style }) {
    if (!fold.count) return null
    const button = (
        <button type="button" onClick={fold.toggle} aria-expanded={fold.open} style={lineStyle}>
            {fold.open ? `Hide the ${fold.count} tied` : `+${fold.count} more tied at ${format(fold.cutoff)}`}
        </button>
    )
    return colSpan
        ? <tr style={{ cursor: 'default' }}><td colSpan={colSpan} style={style}>{button}</td></tr>
        : <div style={style}>{button}</div>
}
