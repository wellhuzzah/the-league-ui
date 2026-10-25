// League rule: equal values share a rank. Standard competition ranking (1, 2, 2, 4) on the value a
// list is ranked or sorted by; rows must already be in that order, so equal values sit together.
export const competitionRanks = (rows, value) =>
    rows.reduce((ranks, r, i) => {
        ranks.push(i > 0 && value(r) === value(rows[i - 1]) ? ranks[i - 1] : i + 1)
        return ranks
    }, [])
