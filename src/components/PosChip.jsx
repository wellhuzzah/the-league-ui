// A position as a readable chip (tables.css .rw-pos): the hue's light tint on a 16% wash of it.
const KNOWN = new Set(['QB', 'RB', 'WR', 'TE', 'K', 'D/ST'])

export default function PosChip({ position }) {
    const cls = position === 'D/ST' ? 'DST' : KNOWN.has(position) ? position : 'UNK'
    return <span className={`rw-pos ${cls}`}>{position || '?'}</span>
}

// The keeper mark: a word, so it can't be read as K for kicker
export const KeeperTag = () => <span className="rw-keep">Keeper</span>
