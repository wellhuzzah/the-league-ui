const KNOWN = new Set(['QB', 'RB', 'WR', 'TE', 'K', 'D/ST'])

// The colour class for a position (PosChip .rw-pos, draft board .st-*): QB, RB, WR, TE, K, DST or UNK
export const posClass = (position) => position === 'D/ST' ? 'DST' : KNOWN.has(position) ? position : 'UNK'
