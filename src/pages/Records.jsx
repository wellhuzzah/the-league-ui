import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getRecordsSummary, getCareerLuck } from '../api/records'
import { getSeasons } from '../api/seasons'
import { competitionRanks } from '../utils/ranks'
import { useTieFold } from '../utils/tieFold'
import TieFoldLine from '../components/TieFoldLine'
import SortTh from '../components/SortTh'
import GameTag from '../components/GameTag'
import AdjMark from '../components/AdjMark'
import Scene from '../components/Scene'
import DataBackdrop from '../components/DataBackdrop'
import TopNav from '../components/TopNav'
import Placard from '../components/Placard'
import StatStamp from '../components/StatStamp'
import Badge from '../components/Badge'
import WaiverRecords from '../components/WaiverRecords'

const fmt = (n) =>
    Number(n).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

const cx = (...names) => names.filter(Boolean).join(' ')

// ── Sort hook ─────────────────────────────────────────────────────────────────

function useSortable(data, defaultKey, defaultDir = 'desc') {
    const [sortKey, setSortKey] = useState(defaultKey)
    const [sortDir, setSortDir] = useState(defaultDir)

    const handleSort = useCallback((key) => {
        setSortDir(prev => key === sortKey ? (prev === 'desc' ? 'asc' : 'desc') : defaultDir)
        setSortKey(key)
    }, [sortKey, defaultDir])

    const sorted = [...(data || [])].sort((a, b) => {
        const av = a[sortKey], bv = b[sortKey]
        if (av === null || av === undefined) return 1
        if (bv === null || bv === undefined) return -1
        const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv
        return sortDir === 'asc' ? cmp : -cmp
    })

    return { sorted, sortKey, sortDir, handleSort }
}

const TEXT_SORT_KEYS = new Set(['owner', 'winner', 'away_owner', 'opponent'])

const Th = (props) => <SortTh {...props} text={TEXT_SORT_KEYS.has(props.sortKey)} />

// ── Ranked lists ──────────────────────────────────────────────────────────────

// Each top-10 list's rank: competitionRanks (utils/ranks) on the value it is ranked by, in the API's
// order. A row keeps its rank whichever column the table is sorted by.
const rankMap = (rows, value) => {
    const ranks = competitionRanks(rows, value)
    return new Map(rows.map((row, i) => [row, ranks[i]]))
}

// The rows as shown, each with its rank; `rep` when the row above shares it (shown muted), `tie`
// for every row of a run that shares one (the amber line in the margin)
const ranked = (list, ranks) => list.map((row, i) => {
    const rank = ranks.get(row)
    const rep  = i > 0 && ranks.get(list[i - 1]) === rank
    const next = i < list.length - 1 && ranks.get(list[i + 1]) === rank
    return { row, rank, rep, tie: rep || next }
})

const RankCell = ({ r }) => <td className={cx('rank', r.rep && 'rep')}>{r.rank}</td>

// The key value of a "biggest" list with a bar for size (hidden on mobile); the #1 value is gold
const BarValue = ({ value, max, top, children }) => (
    <div className="rw-bar-cell">
        <span className="rw-bar" aria-hidden="true">
            <i className={top ? 'lead' : undefined} style={{ width: `${max ? Math.round(value / max * 100) : 0}%` }} />
        </span>
        <span>{children}</span>
    </div>
)

const keyCls = (r) => cx('num key mk', r.rank === 1 && 'top')

// ── Draft heatmap helpers ─────────────────────────────────────────────────────

const HEATMAP_COLORS = {
    QB:  '#e07c4a',
    RB:  '#4a9b6f',
    WR:  '#7ab0f0',
    TE:  '#c4956a',
    K:   '#7b7b9b',
    DST: '#6f9b9b',
}

function hexRgba(hex, a) {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r},${g},${b},${a.toFixed(2)})`
}

function roundDominant(owner, round) {
    const rd = owner.rounds.find(r => r.round === round)
    if (!rd) return null
    const entries = Object.entries(rd.counts).filter(([, v]) => v > 0)
    if (!entries.length) return null
    return entries.reduce((a, b) => b[1] > a[1] ? b : a)
}

function roundConfidence(owner, round) {
    const dom = roundDominant(owner, round)
    if (!dom || !owner.seasons_played) return 0
    return dom[1] / owner.seasons_played
}

// ── Main component ────────────────────────────────────────────────────────────

// 'trades' / 'Trades' are left out until trade data is imported; the trades tab body below is kept
// so adding them back here is all that's needed.
const TABS = ['standings', 'scoring', 'streaks', 'matchups', 'draft', 'bullshit', 'waivers']
const TAB_LABELS = ['All-Time Standings', 'Scoring Records', 'Streaks', 'Game Records', 'Draft Tendencies', 'Bullshit Index', 'Waivers']

// All-Time Standings on mobile: the headers are hidden, so a menu picks the sort
const STANDINGS_SORTS = [
    ['win_pct', 'Win%'], ['total_wins', 'Wins'], ['total_losses', 'Losses'], ['ppg', 'PPG'],
    ['total_points_for', 'PF'], ['total_points_against', 'PA'], ['championships', 'Titles'],
    ['most_points_seasons', 'Top scores'], ['sackos', 'Sackos'], ['seasons_played', 'Seasons'], ['owner', 'Owner'],
]

const SecHead = ({ children }) => <h2 className="rw-label">{children}</h2>
const Note = ({ children }) => <p className="rw-note">{children}</p>
const Dash = () => <span className="dash">—</span>

export default function Records() {
    const navigate = useNavigate()
    const [tab, setTab] = useState('standings')
    const [loading, setLoading] = useState(true)

    const [standings,     setStandings]     = useState([])
    const [highSeason,    setHighSeason]    = useState([])
    const [lowSeason,     setLowSeason]     = useState([])
    const [bestWeek,      setBestWeek]      = useState([])
    const [worstWeek,     setWorstWeek]     = useState([])
    const [winStreaks,    setWinStreaks]     = useState([])
    const [lossStreaks,   setLossStreaks]    = useState([])
    const [blowouts,      setBlowouts]      = useState([])
    const [closest,       setClosest]       = useState([])
    const [draftTendencies, setDraftTendencies] = useState([])
    const [heatmapSortRound, setHeatmapSortRound] = useState(null)
    const [highestLosses, setHighestLosses] = useState([])
    const [lowestWins,    setLowestWins]    = useState([])
    const [careerLuck,    setCareerLuck]    = useState([])
    const [luckLoaded,    setLuckLoaded]    = useState(false)
    const [luckLoading,   setLuckLoading]   = useState(false)

    const standingsSort   = useSortable(standings,      'win_pct',         'desc')
    // # column: equal values of the sorted column share a rank
    const standingsRanks  = competitionRanks(standingsSort.sorted, r => r[standingsSort.sortKey])
    const highSeasonSort  = useSortable(highSeason,     'points_for',      'desc')
    const lowSeasonSort   = useSortable(lowSeason,      'points_for',      'asc')
    const bestWeekSort    = useSortable(bestWeek,       'score',           'desc')
    const worstWeekSort   = useSortable(worstWeek,      'score',           'asc')
    const winStreakSort   = useSortable(winStreaks,      'streak_length',   'desc')
    const lossStreakSort  = useSortable(lossStreaks,     'streak_length',   'desc')
    const blowoutSort     = useSortable(blowouts,       'margin',          'desc')
    const closestSort     = useSortable(closest,        'margin',          'asc')
    const highestLossSort = useSortable(highestLosses,  'score',           'desc')
    const lowestWinSort   = useSortable(lowestWins,     'score',           'asc')
    const careerLuckSort  = useSortable(careerLuck,     'luck',            'asc')
    // Top-10 lists: 3+ rows tied at the cutoff fold into one line
    const highSeasonFold  = useTieFold(highSeason, 10)
    const lowSeasonFold   = useTieFold(lowSeason, 10)
    const bestWeekFold    = useTieFold(bestWeek, 10)
    const worstWeekFold   = useTieFold(worstWeek, 10)
    const winStreakFold   = useTieFold(winStreaks, 10)
    const lossStreakFold  = useTieFold(lossStreaks, 10)
    const blowoutFold     = useTieFold(blowouts, 10)
    const closestFold     = useTieFold(closest, 10)
    const highestLossFold = useTieFold(highestLosses, 10)
    const lowestWinFold   = useTieFold(lowestWins, 10)
    // Top-10 lists: each row's rank on the list's own value
    const highSeasonRanks  = useMemo(() => rankMap(highSeason,    r => r.points_for),    [highSeason])
    const lowSeasonRanks   = useMemo(() => rankMap(lowSeason,     r => r.points_for),    [lowSeason])
    const bestWeekRanks    = useMemo(() => rankMap(bestWeek,      r => r.score),         [bestWeek])
    const worstWeekRanks   = useMemo(() => rankMap(worstWeek,     r => r.score),         [worstWeek])
    const winStreakRanks   = useMemo(() => rankMap(winStreaks,    r => r.streak_length), [winStreaks])
    const lossStreakRanks  = useMemo(() => rankMap(lossStreaks,   r => r.streak_length), [lossStreaks])
    const blowoutRanks     = useMemo(() => rankMap(blowouts,      r => r.margin),        [blowouts])
    const closestRanks     = useMemo(() => rankMap(closest,       r => r.margin),        [closest])
    const highestLossRanks = useMemo(() => rankMap(highestLosses, r => r.score),         [highestLosses])
    const lowestWinRanks   = useMemo(() => rankMap(lowestWins,    r => r.score),         [lowestWins])

    // Header subtitle: every season in the season list, an in-progress one included
    const [seasonList, setSeasonList] = useState([])
    useEffect(() => {
        getSeasons().then(setSeasonList).catch(() => setSeasonList([]))
    }, [])
    const seasonYears = seasonList.map(s => Number(s.season))
    const subtitle = seasonYears.length
        ? `${seasonYears.length} SEASONS · ${Math.min(...seasonYears)}–${Math.max(...seasonYears)}`
        : ''

    useEffect(() => {
        getRecordsSummary().then(s => {
            setStandings(s.standings)
            setHighSeason(s.highest_season)
            setLowSeason(s.lowest_season)
            setBestWeek(s.best_week)
            setWorstWeek(s.worst_week)
            setWinStreaks(s.win_streaks)
            setLossStreaks(s.loss_streaks)
            setBlowouts(s.blowouts)
            setClosest(s.closest)
            setDraftTendencies(s.draft_tendencies)
            setHighestLosses(s.highest_losing)
            setLowestWins(s.lowest_winning)
            setLoading(false)
        })
    }, [])

    useEffect(() => {
        if (tab !== 'bullshit' || luckLoaded || luckLoading) return
        setLuckLoading(true)
        // Career totals over finished seasons, summed by the API
        getCareerLuck().then(rows => {
            setCareerLuck(rows)
            setLuckLoaded(true)
            setLuckLoading(false)
        })
    }, [tab, luckLoaded, luckLoading])

    const heatmapPlurality = useMemo(() => {
        const result = {}
        for (let r = 1; r <= 16; r++) {
            const totals = {}
            draftTendencies.filter(o => o.seasons_played >= 3).forEach(owner => {
                const rd = owner.rounds.find(o => o.round === r)
                if (!rd) return
                Object.entries(rd.counts).forEach(([pos, count]) => {
                    if (count > 0) totals[pos] = (totals[pos] || 0) + count
                })
            })
            const entries = Object.entries(totals)
            if (entries.length) result[r] = entries.reduce((a, b) => b[1] > a[1] ? b : a)[0]
        }
        return result
    }, [draftTendencies])

    const sortedTendencies = useMemo(() => {
        const data = draftTendencies.filter(o => o.seasons_played >= 3)
        if (!heatmapSortRound) return data.sort((a, b) => a.owner.localeCompare(b.owner))
        return data.sort((a, b) => roundConfidence(b, heatmapSortRound) - roundConfidence(a, heatmapSortRound))
    }, [draftTendencies, heatmapSortRound])

    const mostWins    = standings.length ? standings.reduce((a, b) => b.total_wins    > a.total_wins    ? b : a) : null
    const bestPct     = standings.length ? standings.reduce((a, b) => b.win_pct       > a.win_pct       ? b : a) : null
    const mostTitles  = standings.length ? standings.reduce((a, b) => b.championships > a.championships ? b : a) : null
    const bestPpg     = standings.length ? standings.reduce((a, b) => (b.ppg ?? 0)    > (a.ppg ?? 0)    ? b : a) : null

    // All-Time Standings: the sorted column's cells carry the weight
    const sortedCol = key => key === standingsSort.sortKey ? 'sorted' : undefined
    const openTeam  = row => navigate(`/teams/${row.team_id}`)

    // Scoring Records: one ranked list of weekly scores (best and worst week)
    const weekTable = (sort, fold, ranks, bars) => {
        const max = Math.max(...(sort.sorted.map(r => r.score)), 0)
        return (
            <div className="table-wrap">
                <table className="rw-table rw-ranked rw-2line">
                    <thead>
                        <tr>
                            <th className="num">#</th>
                            <Th label="Owner"  sortKey="owner"     sort={sort} />
                            <Th label="Score"  sortKey="score"     sort={sort} />
                            <Th label="Opp"    sortKey="opp_score" sort={sort} />
                            <Th label="Season" sortKey="season"    sort={sort} />
                            <Th label="Week"   sortKey="week"      sort={sort} />
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {ranked(fold.shown(sort.sorted), ranks).map(({ row, ...r }, i) => (
                            <tr key={i} className={r.tie ? 'tie' : undefined}>
                                <RankCell r={r} />
                                <td className="name m1">{row.owner}</td>
                                <td className={keyCls(r)}>
                                    {bars
                                        ? <BarValue value={row.score} max={max} top={r.rank === 1}>{fmt(row.score)}<AdjMark adj={row.adjustment} /></BarValue>
                                        : <>{fmt(row.score)}<AdjMark adj={row.adjustment} /></>}
                                </td>
                                <td className="num soft m2 m2s p-lbl" data-ml="Opp">{fmt(row.opp_score)}<AdjMark adj={row.opp_adjustment} /></td>
                                <td className="num meta gap-r m2 p-dot">{row.season}</td>
                                <td className="num meta m2 p-sp">W{row.week}</td>
                                <td className="m2 m-tag p-dot"><GameTag game={row} playoffLabel="Playoffs" regular={<Dash />} /></td>
                            </tr>
                        ))}
                        <TieFoldLine data fold={fold} format={r => fmt(r.score)} colSpan={7} />
                    </tbody>
                </table>
            </div>
        )
    }

    // Scoring Records: one ranked list of season totals (highest and lowest)
    const seasonTable = (sort, fold, ranks, bars) => {
        const max = Math.max(...(sort.sorted.map(r => r.points_for)), 0)
        return (
            <div className="table-wrap">
                <table className="rw-table rw-ranked rw-2line">
                    <thead>
                        <tr>
                            <th className="num">#</th>
                            <Th label="Owner"  sortKey="owner"          sort={sort} />
                            <Th label="PF"     sortKey="points_for"     sort={sort} />
                            <Th label="Season" sortKey="season"         sort={sort} />
                            <Th label="W"      sortKey="wins"           sort={sort} />
                            <Th label="L"      sortKey="losses"         sort={sort} />
                            <Th label="Finish" sortKey="final_standing" sort={sort} />
                        </tr>
                    </thead>
                    <tbody>
                        {ranked(fold.shown(sort.sorted), ranks).map(({ row, ...r }, i) => (
                            <tr key={i} className={r.tie ? 'tie' : undefined}>
                                <RankCell r={r} />
                                <td className="name m1">{row.owner}</td>
                                <td className={keyCls(r)}>
                                    {bars
                                        ? <BarValue value={row.points_for} max={max} top={r.rank === 1}>{fmt(row.points_for)}</BarValue>
                                        : fmt(row.points_for)}
                                </td>
                                <td className="num meta gap-r m2 m2s">{row.season}</td>
                                <td className="num win m2 p-dot">{row.wins}</td>
                                <td className="num meta m2 p-tight">{row.losses}</td>
                                <td className="num m2 p-lbl" data-ml="Finish">#{row.final_standing}</td>
                            </tr>
                        ))}
                        <TieFoldLine data fold={fold} format={r => fmt(r.points_for)} colSpan={7} />
                    </tbody>
                </table>
            </div>
        )
    }

    // Streaks: one ranked list of streaks (wins and losses)
    const streakTable = (sort, fold, ranks) => {
        const max = Math.max(...(sort.sorted.map(r => r.streak_length)), 0)
        return (
            <div className="table-wrap">
                <table className="rw-table rw-ranked rw-2line">
                    <thead>
                        <tr>
                            <th className="num">#</th>
                            <Th label="Owner"  sortKey="owner"         sort={sort} />
                            <Th label="Streak" sortKey="streak_length" sort={sort} />
                            <Th label="From"   sortKey="start_season"  sort={sort} />
                            <th className="num">Start</th>
                            <th className="num">End</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ranked(fold.shown(sort.sorted), ranks).map(({ row, ...r }, i) => (
                            <tr key={i} className={r.tie ? 'tie' : undefined}>
                                <RankCell r={r} />
                                <td className="name m1">{row.owner}</td>
                                <td className={keyCls(r)}>
                                    <BarValue value={row.streak_length} max={max} top={r.rank === 1}>{row.streak_length}</BarValue>
                                </td>
                                <td className="num gap-r m2 m2s">{row.start_season}</td>
                                <td className="num meta m2 p-sp">W{row.start_week}</td>
                                <td className="num meta m2 p-dash">{row.end_season} W{row.end_week}</td>
                            </tr>
                        ))}
                        <TieFoldLine data fold={fold} format={r => r.streak_length} colSpan={6} />
                    </tbody>
                </table>
            </div>
        )
    }

    // Game Records: one ranked list of games (blowouts and closest)
    const gameTable = (sort, fold, ranks, bars) => {
        const max = Math.max(...(sort.sorted.map(r => r.margin)), 0)
        return (
            <div className="table-wrap">
                <table className="rw-table rw-ranked rw-2line">
                    <thead>
                        <tr>
                            <th className="num">#</th>
                            <Th label="Winner" sortKey="winner"     sort={sort} />
                            <Th label="Score"  sortKey="home_score" sort={sort} />
                            <Th label="Loser"  sortKey="away_owner" sort={sort} />
                            <Th label="Score"  sortKey="away_score" sort={sort} />
                            <Th label="Margin" sortKey="margin"     sort={sort} />
                            <Th label="Season" sortKey="season"     sort={sort} />
                            <Th label="Week"   sortKey="week"       sort={sort} />
                        </tr>
                    </thead>
                    <tbody>
                        {ranked(fold.shown(sort.sorted), ranks).map(({ row, ...r }, i) => {
                            const home        = row.winner === row.home_owner
                            const winnerScore = home ? row.home_score : row.away_score
                            const loserScore  = home ? row.away_score : row.home_score
                            const winnerAdj   = home ? row.home_adjustment : row.away_adjustment
                            const loserAdj    = home ? row.away_adjustment : row.home_adjustment
                            const loser       = home ? row.away_owner : row.home_owner
                            return (
                                <tr key={i} className={r.tie ? 'tie' : undefined}>
                                    <RankCell r={r} />
                                    <td className="name m1">{row.winner}</td>
                                    <td className="num gap-l m2 m2s">{fmt(winnerScore)}<AdjMark adj={winnerAdj} /></td>
                                    <td className="soft m1 p-over">{loser}</td>
                                    <td className="num soft gap-l m2 p-dash">{fmt(loserScore)}<AdjMark adj={loserAdj} /></td>
                                    <td className={cx(keyCls(r), 'gap-r')}>
                                        {bars
                                            ? <BarValue value={row.margin} max={max} top={r.rank === 1}>{fmt(row.margin)}</BarValue>
                                            : fmt(row.margin)}
                                    </td>
                                    <td className="num meta gap-r m2 p-dot">{row.season}</td>
                                    <td className="num meta m2 p-sp">W{row.week}</td>
                                </tr>
                            )
                        })}
                        <TieFoldLine data fold={fold} format={r => fmt(r.margin)} colSpan={8} />
                    </tbody>
                </table>
            </div>
        )
    }

    // Game Records: one ranked list of a score with its result (highest losing, lowest winning)
    const resultTable = (sort, fold, ranks) => (
        <div className="table-wrap">
            <table className="rw-table rw-ranked rw-2line">
                <thead>
                    <tr>
                        <th className="num">#</th>
                        <Th label="Owner"   sortKey="owner"     sort={sort} />
                        <Th label="Score"   sortKey="score"     sort={sort} />
                        <Th label="Opp"     sortKey="opp_score" sort={sort} />
                        <Th label="Against" sortKey="opponent"  sort={sort} />
                        <Th label="Season"  sortKey="season"    sort={sort} />
                        <Th label="Week"    sortKey="week"      sort={sort} />
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {ranked(fold.shown(sort.sorted), ranks).map(({ row, ...r }, i) => (
                        <tr key={i} className={r.tie ? 'tie' : undefined}>
                            <RankCell r={r} />
                            <td className="name m1">{row.owner}</td>
                            <td className={keyCls(r)}>{fmt(row.score)}<AdjMark adj={row.adjustment} /></td>
                            <td className="num soft m2 o4 p-sp">{fmt(row.opp_score)}<AdjMark adj={row.opp_adjustment} /></td>
                            <td className="soft m2 m2s p-lbl" data-ml="vs">{row.opponent}</td>
                            <td className="num meta gap-r m2 o4 p-dot">{row.season}</td>
                            <td className="num meta m2 o4 p-sp">W{row.week}</td>
                            <td className="m2 o4 m-tag p-dot">
                                <GameTag game={row} playoffLabel="Playoffs" regular={<span className="meta" style={{ fontSize: 12 }}>Reg</span>} />
                            </td>
                        </tr>
                    ))}
                    <TieFoldLine data fold={fold} format={r => fmt(r.score)} colSpan={8} />
                </tbody>
            </table>
        </div>
    )

    return (
        <Scene>
            <DataBackdrop />

            <TopNav />

            <Placard
                variant="detached"
                data
                tabs={TAB_LABELS}
                activeTab={TABS.indexOf(tab)}
                onTabChange={i => setTab(TABS[i])}
                title="ALL-TIME RECORDS"
                subtitle={subtitle}
            >
                {/* Stat stamps */}
                {!loading && standings.length > 0 && (
                    <div className="rw-stamps">
                        <StatStamp label="Wins"       value={mostWins.total_wins}                           caption={mostWins.owner} />
                        <StatStamp label="Win%"       value={(bestPct.win_pct * 100).toFixed(1) + '%'}      caption={bestPct.owner} />
                        <StatStamp label="Titles"     value={mostTitles.championships}                      caption={mostTitles.owner} />
                        <StatStamp label="PPG"        value={bestPpg?.ppg?.toFixed(1) ?? '—'}               caption={bestPpg?.owner} />
                    </div>
                )}

                {loading ? (
                    <div className="rw-loading">Loading...</div>
                ) : (
                    <>
                        {/* All-Time Standings */}
                        {tab === 'standings' && (
                            <div className="rw-block">
                                <SecHead>All-Time Standings</SecHead>
                                <label className="rw-msort">
                                    <span className="rw-ctl-lbl">Sort</span>
                                    <select className="rw-select" value={standingsSort.sortKey} onChange={e => standingsSort.handleSort(e.target.value)}>
                                        {STANDINGS_SORTS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                                    </select>
                                </label>
                                <div className="table-wrap">
                                    <table className="rw-table rw-standings rw-2line">
                                        <thead>
                                            <tr>
                                                <th className="num">#</th>
                                                <Th label="Owner"     sortKey="owner"                className="owner" sort={standingsSort} />
                                                <Th label="Seasons"   sortKey="seasons_played"       sort={standingsSort} />
                                                <Th label="W"         sortKey="total_wins"           sort={standingsSort} />
                                                <Th label="L"         sortKey="total_losses"         sort={standingsSort} />
                                                <Th label="T"         sortKey="total_draws"          sort={standingsSort} />
                                                <Th label="Win%"      sortKey="win_pct"              sort={standingsSort} />
                                                <Th label="PPG"       sortKey="ppg"                  sort={standingsSort} />
                                                <Th label="PF"        sortKey="total_points_for"     sort={standingsSort} />
                                                <Th label="PA"        sortKey="total_points_against" sort={standingsSort} />
                                                <Th label="Titles"    sortKey="championships"        sort={standingsSort} />
                                                <Th label="Top Score" sortKey="most_points_seasons"  sort={standingsSort} />
                                                <Th label="Sackos"    sortKey="sackos"               sort={standingsSort} />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {standingsSort.sorted.map((row, i) => {
                                                const rank = standingsRanks[i]
                                                const rep  = i > 0 && standingsRanks[i - 1] === rank
                                                const tie  = rep || standingsRanks[i + 1] === rank
                                                return (
                                                    <tr
                                                        key={row.owner}
                                                        className={cx('link', tie && 'tie')}
                                                        tabIndex={0}
                                                        onClick={() => openTeam(row)}
                                                        onKeyDown={e => { if (e.key === 'Enter') openTeam(row) }}
                                                    >
                                                        <td className={cx('rank', rep && 'rep')}>{rank}</td>
                                                        <td className={cx('owner m1', sortedCol('owner'))}>{row.owner}</td>
                                                        <td className={cx('num meta m2 m2s s-after', sortedCol('seasons_played'))} data-ma="seasons">{row.seasons_played}</td>
                                                        <td className={cx('num win m1 rec', sortedCol('total_wins'))}>{row.total_wins}</td>
                                                        <td className={cx('num l m1 rec p-tight', sortedCol('total_losses'))}>{row.total_losses}</td>
                                                        <td className={cx('num t m1 rec p-tight', sortedCol('total_draws'))}>{row.total_draws}</td>
                                                        <td className={cx('num mk', sortedCol('win_pct'))}>{(row.win_pct * 100).toFixed(1)}%</td>
                                                        <td className={cx('num m2 p-lbl', sortedCol('ppg'))} data-ml="PPG">{row.ppg?.toFixed(1) ?? '—'}</td>
                                                        <td className={cx('num m2 p-lbl', sortedCol('total_points_for'))} data-ml="PF">{fmt(row.total_points_for)}</td>
                                                        <td className={cx('num meta m2 p-lbl', sortedCol('total_points_against'))} data-ml="PA">{fmt(row.total_points_against)}</td>
                                                        <td className={cx('num badges m2 m-opt p-sp', sortedCol('championships'))}>
                                                            {row.championships > 0 ? <Badge type="championship" count={row.championships} /> : <Dash />}
                                                        </td>
                                                        <td className={cx('num badges m2 m-opt p-sp', sortedCol('most_points_seasons'))}>
                                                            {row.most_points_seasons > 0 ? <Badge type="topscore" count={row.most_points_seasons} /> : <Dash />}
                                                        </td>
                                                        <td className={cx('num badges m2 m-opt p-sp', sortedCol('sackos'))}>
                                                            {row.sackos > 0 ? <Badge type="sacko" count={row.sackos} /> : <Dash />}
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Scoring Records */}
                        {tab === 'scoring' && (
                            <div className="rw-stack">
                                <div className="rw-block">
                                    <SecHead>Highest Single-Week Scores</SecHead>
                                    {weekTable(bestWeekSort, bestWeekFold, bestWeekRanks, true)}
                                </div>
                                <div className="rw-block">
                                    <SecHead>Lowest Single-Week Scores</SecHead>
                                    {weekTable(worstWeekSort, worstWeekFold, worstWeekRanks, false)}
                                </div>
                                <div className="rw-block">
                                    <SecHead>Highest Season Point Totals</SecHead>
                                    {seasonTable(highSeasonSort, highSeasonFold, highSeasonRanks, true)}
                                </div>
                                <div className="rw-block">
                                    <SecHead>Lowest Season Point Totals</SecHead>
                                    {seasonTable(lowSeasonSort, lowSeasonFold, lowSeasonRanks, false)}
                                </div>
                            </div>
                        )}

                        {/* Streaks */}
                        {tab === 'streaks' && (
                            <div className="rw-stack">
                                <div className="rw-block">
                                    <SecHead>Longest Win Streaks</SecHead>
                                    {streakTable(winStreakSort, winStreakFold, winStreakRanks)}
                                </div>
                                <div className="rw-block">
                                    <SecHead>Longest Losing Streaks</SecHead>
                                    {streakTable(lossStreakSort, lossStreakFold, lossStreakRanks)}
                                </div>
                            </div>
                        )}

                        {/* Game Records */}
                        {tab === 'matchups' && (
                            <div className="rw-stack">
                                <div className="rw-block">
                                    <SecHead>Biggest Blowouts</SecHead>
                                    {gameTable(blowoutSort, blowoutFold, blowoutRanks, true)}
                                </div>
                                <div className="rw-block">
                                    <SecHead>Closest Games</SecHead>
                                    <Note>Ties not included. This isn't soccer.</Note>
                                    {gameTable(closestSort, closestFold, closestRanks, false)}
                                </div>
                                <div className="rw-block">
                                    <SecHead>Highest Losing Scores</SecHead>
                                    <Note>Best scores that still resulted in a loss. That bullshit.</Note>
                                    {resultTable(highestLossSort, highestLossFold, highestLossRanks)}
                                </div>
                                <div className="rw-block">
                                    <SecHead>Lowest Winning Scores</SecHead>
                                    <Note>
                                        Scores so trash that you should feel ashamed for winning.
                                        {lowestWinSort.sorted[0]?.score < 20 && (
                                            <span> · Very low scores may indicate toliet bowl pouting</span>
                                        )}
                                    </Note>
                                    {resultTable(lowestWinSort, lowestWinFold, lowestWinRanks)}
                                </div>
                            </div>
                        )}

                        {/* Draft Tendencies — heatmap */}
                        {tab === 'draft' && (
                            <div className="rw-block">
                                <SecHead>Draft Tendencies by Round</SecHead>
                                <Note>
                                    Dominant position per round for each owner across all seasons. Brighter color means more consistently picked. Highlighted are outlier positions vs the league norm (≥60% confidence).
                                </Note>

                                <div className="rw-legend">
                                    {Object.entries(HEATMAP_COLORS).map(([pos, color]) => (
                                        <span key={pos}><i style={{ background: color }} />{pos}</span>
                                    ))}
                                </div>

                                <div className="table-wrap">
                                    <table className="rw-table rw-board rw-heat">
                                        <thead>
                                            <tr>
                                                <th className={cx('owner', !heatmapSortRound && 'on')}>
                                                    <button type="button" onClick={() => setHeatmapSortRound(null)}>
                                                        OWNER {!heatmapSortRound && <span style={{ fontSize: '0.7em' }}>▲</span>}
                                                    </button>
                                                </th>
                                                {Array.from({ length: 16 }, (_, i) => i + 1).map(r => (
                                                    <th key={r} className={heatmapSortRound === r ? 'on' : undefined}>
                                                        <button type="button" onClick={() => setHeatmapSortRound(prev => prev === r ? null : r)}>
                                                            {r}{heatmapSortRound === r && <span style={{ marginLeft: 1, fontSize: '0.7em' }}>▼</span>}
                                                        </button>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sortedTendencies.map(owner => (
                                                <tr key={owner.owner}>
                                                    <td className="owner">
                                                        {owner.owner}
                                                        <span className="yrs">{owner.seasons_played}s</span>
                                                    </td>
                                                    {owner.rounds.map(({ round, counts }) => {
                                                        const entries = Object.entries(counts).filter(([, v]) => v > 0)
                                                        if (!entries.length) {
                                                            return <td key={round} className="cell empty" />
                                                        }
                                                        const [dominantPos, dominantCount] = entries.reduce((a, b) => b[1] > a[1] ? b : a)
                                                        const conf     = dominantCount / owner.seasons_played
                                                        const opacity  = 0.2 + conf * 0.8
                                                        const color    = HEATMAP_COLORS[dominantPos] || '#555'
                                                        const isOutlier = heatmapPlurality[round]
                                                            && heatmapPlurality[round] !== dominantPos
                                                            && conf >= 0.60

                                                        const total       = entries.reduce((s, [, v]) => s + v, 0)
                                                        const tooltipBody = entries
                                                            .sort((a, b) => b[1] - a[1])
                                                            .map(([p, c]) => `${p}: ${c} (${Math.round(c / total * 100)}%)`)
                                                            .join('\n')

                                                        return (
                                                            <td
                                                                key={round}
                                                                className={cx('cell', isOutlier && 'outlier')}
                                                                title={`R${round} — ${owner.owner}\n${tooltipBody}`}
                                                                style={{ background: hexRgba(color, opacity) }}
                                                            >
                                                                {dominantPos}
                                                            </td>
                                                        )
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {tab === 'bullshit' && (
                            <div className="rw-block">
                                <SecHead>Bullshit Index</SecHead>
                                <Note>
                                    Bullshit formula: actual wins minus expected wins based on weekly score vs rest of field.
                                    More negative = more bullshit. Aggregated across all seasons, including the current season in progress.
                                </Note>
                                {luckLoading ? (
                                    <div className="rw-loading">Loading...</div>
                                ) : (
                                    <div className="table-wrap">
                                        <table className="rw-table rw-standings rw-2line rw-norank">
                                            <thead>
                                                <tr>
                                                    <Th label="Owner"      sortKey="owner"         className="owner" sort={careerLuckSort} />
                                                    <Th label="Seasons"    sortKey="seasons"       sort={careerLuckSort} />
                                                    <Th label="Actual W"   sortKey="actual_wins"   sort={careerLuckSort} />
                                                    <Th label="Expected W" sortKey="expected_wins" sort={careerLuckSort} />
                                                    <Th label="BPS"        sortKey="bps"           sort={careerLuckSort} />
                                                    <Th label="Bullshit"   sortKey="luck"          sort={careerLuckSort} />
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {careerLuckSort.sorted.map(row => {
                                                    const l = Number(row.luck)
                                                    return (
                                                        <tr key={row.owner}>
                                                            <td className="owner m1">{row.owner}</td>
                                                            <td className="num meta m2 m2s s-after" data-ma="seasons">{row.seasons}</td>
                                                            <td className="num m2 p-lbl" data-ml="Actual W">{row.actual_wins}</td>
                                                            <td className="num meta m2 p-lbl" data-ml="Expected">{row.expected_wins.toFixed(2)}</td>
                                                            <td className="num soft m2 p-lbl" data-ml="BPS">
                                                                {row.bps > 0 ? '+' : ''}{row.bps.toFixed(2)}
                                                            </td>
                                                            <td className="num key mk" style={{
                                                                color: l > 0 ? 'var(--win)' : l < 0 ? 'var(--loss)' : undefined,
                                                            }}>
                                                                {l > 0 ? '+' : ''}{l.toFixed(2)}
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}

                        {tab === 'waivers' && <WaiverRecords />}

                        {tab === 'trades' && (
                            <div className="rw-block">
                                <SecHead>Trades</SecHead>
                                <Note>Coming soon: trade history isn't imported yet.</Note>
                            </div>
                        )}
                    </>
                )}
            </Placard>
        </Scene>
    )
}
