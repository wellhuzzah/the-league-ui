// ESPN player ids are integers, and D/ST ids are negative (Ravens D/ST is -16033). Players are always
// linked and looked up by id, never by name: same-name players are different people. The range
// check keeps a pasted run of digits from reaching the API as an out-of-range integer.
export const isPlayerId = (id) =>
    /^-?\d+$/.test(String(id ?? '')) && Math.abs(Number(id)) <= 2147483647

export const playerPath = (id) => `/players/${id}`
