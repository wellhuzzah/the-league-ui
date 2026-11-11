// An asterisk after a score that includes a league score adjustment (ESPN's adjustment, e.g. a stat
// correction); the hover text gives the amount. Renders nothing for an unadjusted score.
export default function AdjMark({ adj }) {
    if (!adj) return null
    const amount = `${adj > 0 ? '+' : ''}${Number(adj).toFixed(1)}`
    return (
        <span
            title={`Includes a ${amount} league score adjustment`}
            aria-label={`includes a ${amount} league score adjustment`}
            style={{ color: 'var(--amber)', marginLeft: 1, cursor: 'help' }}
        >*</span>
    )
}
