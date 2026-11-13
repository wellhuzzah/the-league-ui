// A position as a readable chip (tables.css .rw-pos): the hue's light tint on a 16% wash of it.
import { posClass } from '../utils/position'

export default function PosChip({ position }) {
    return <span className={`rw-pos ${posClass(position)}`}>{position || '?'}</span>
}

// The keeper mark: a word, so it can't be read as K for kicker. `short` (KPR) is for the draft
// board's small squares.
export const KeeperTag = ({ short = false }) => short
    ? <span className="rw-keep" title="Keeper" aria-label="Keeper">KPR</span>
    : <span className="rw-keep">Keeper</span>
