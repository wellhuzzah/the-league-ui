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
// `data`: the table-system look (tables.css .rw-fold): a full-width row with a dashed top border,
// "+89 more tied at 0.0 ▾" / "Show fewer ▴".
export default function TieFoldLine({ fold, format, colSpan, style, data = false }) {
    if (!fold.count) return null
    if (data) {
        return (
            <tr className="fold-row">
                <td className="fold" colSpan={colSpan}>
                    <button type="button" className="rw-fold" onClick={fold.toggle} aria-expanded={fold.open}>
                        {fold.open
                            ? <>Show fewer <span aria-hidden="true">▴</span></>
                            : <>+{fold.count} more tied at <span className="tie-val">{format(fold.cutoff)}</span> <span aria-hidden="true">▾</span></>}
                    </button>
                </td>
            </tr>
        )
    }
    const button = (
        <button type="button" onClick={fold.toggle} aria-expanded={fold.open} style={lineStyle}>
            {fold.open ? `Hide the ${fold.count} tied` : `+${fold.count} more tied at ${format(fold.cutoff)}`}
        </button>
    )
    return colSpan
        ? <tr style={{ cursor: 'default' }}><td colSpan={colSpan} style={style}>{button}</td></tr>
        : <div style={style}>{button}</div>
}
