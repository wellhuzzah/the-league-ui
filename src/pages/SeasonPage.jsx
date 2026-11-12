import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getSeasons, getSeason } from '../api/seasons'
import Scene from '../components/Scene'
import DataBackdrop from '../components/DataBackdrop'
import TopNav from '../components/TopNav'
import Placard from '../components/Placard'
import StatStamp from '../components/StatStamp'
import SortTh from '../components/SortTh'
import Badge from '../components/Badge'
import WaiverWire from '../components/WaiverWire'
import AdjMark from '../components/AdjMark'
import { pct3 } from '../utils/winPct'

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

// ── Main component ────────────────────────────────────────────────────────────

const TABS       = ['standings', 'weekly', 'luck', 'wire']
const TAB_LABELS = ['Standings', 'Weekly Scores', 'Bullshit Index', 'Waiver Wire']

function SeasonPage() {
    const { year } = useParams()
    const navigate = useNavigate()

    const [seasons, setSeasons]           = useState([])
    const [standings, setStandings]       = useState([])
    const [weekly, setWeekly]             = useState([])
    const [luck, setLuck]                 = useState([])
    const [mvp,  setMvp]                  = useState(null)
    const [selectedYear, setSelectedYear] = useState(year || null)
    const [tab, setTab]                   = useState('standings')
    const [loading, setLoading]           = useState(true)

    const standingsSort = useSortable(standings, 'final_standing', 'asc')
    const luckSort      = useSortable(luck, 'luck', 'asc')

    const [weeklySortKey, setWeeklySortKey] = useState('owner')
    const [weeklySortDir, setWeeklySortDir] = useState('asc')

    // Load season list once
    useEffect(() => {
        getSeasons().then(data => {
            const sorted = [...data].sort((a, b) => b.season - a.season)
            setSeasons(sorted)
            // Only while still on bare /seasons: if the user has clicked elsewhere meanwhile (this
            // page stays mounted while the next page's chunk loads), don't pull them back
            if (!selectedYear && sorted.length > 0 && window.location.pathname === '/seasons') {
                const latest = String(sorted[0].season)
                setSelectedYear(latest)
                navigate(`/seasons/${latest}`, { replace: true })
            }
        })
    }, [])

    // Load all data for selected year
    useEffect(() => {
        if (!selectedYear) return
        setLoading(true)
        // One call; a missing part comes back empty (e.g. no top scorer before 2018, when box
        // scores start), and an unknown season leaves the whole page empty.
        getSeason(selectedYear)
            .catch(() => ({ standings: [], weekly_scores: [], luck: [], top_scorer: null }))
            .then(d => {
                setStandings(d.standings)
                setWeekly(d.weekly_scores)
                setLuck(d.luck)
                setMvp(d.top_scorer)
                setLoading(false)
            })
    }, [selectedYear])

    const handleYearChange = (e) => {
        const y = e.target.value
        setSelectedYear(y)
        navigate(`/seasons/${y}`)
    }

    // A T column only for a season with a tie
    const hasDraws = standings.some(r => r.draws > 0)

    // Build week-by-week structure
    const weeks  =[...new Set(weekly.map(r => r.week))].sort((a, b) => a - b)
    const owners = [...new Set(weekly.map(r => r.owner))].sort()

    const weeklyMap = {}
    weekly.forEach(r => {
        if (!weeklyMap[r.owner]) weeklyMap[r.owner] = {}
        weeklyMap[r.owner][r.week] = r
    })

    const sortedOwners = [...owners].sort((a, b) => {
        if (weeklySortKey === 'owner') {
            const cmp = a.localeCompare(b)
            return weeklySortDir === 'asc' ? cmp : -cmp
        }
        const week = Number(weeklySortKey.replace('w', ''))
        const av = weeklyMap[a]?.[week]?.score ?? -Infinity
        const bv = weeklyMap[b]?.[week]?.score ?? -Infinity
        return weeklySortDir === 'asc' ? av - bv : bv - av
    })

    const handleWeeklySort = (key) => {
        setWeeklySortDir(prev => key === weeklySortKey ? (prev === 'desc' ? 'asc' : 'desc') : 'desc')
        setWeeklySortKey(key)
    }

    const currentIdx = seasons.findIndex(s => String(s.season) === selectedYear)

    const onSeasonPrev = () => {
        if (currentIdx < seasons.length - 1) {
            const y = String(seasons[currentIdx + 1].season)
            setSelectedYear(y)
            navigate(`/seasons/${y}`)
        }
    }

    const onSeasonNext = () => {
        if (currentIdx > 0) {
            const y = String(seasons[currentIdx - 1].season)
            setSelectedYear(y)
            navigate(`/seasons/${y}`)
        }
    }

    const highScore      = weekly.length ? Math.max(...weekly.map(r => r.score)) : null
    const highScoreEntry = highScore !== null ? weekly.find(r => r.score === highScore) : null
    const lowScore       = weekly.length ? Math.min(...weekly.map(r => r.score)) : null
    const lowScoreEntry  = lowScore !== null ? weekly.find(r => r.score === lowScore) : null


    // An in-progress season's standings are computed from its matchups so far (API flag)
    const inProgress  = standings.length > 0 && standings[0].in_progress === true
    const throughWeek = inProgress ? standings[0].through_week : null

    const mostBullshit = luck.length
        ? luck.reduce((worst, r) => r.luck < worst.luck ? r : worst)
        : null

    // Weekly Scores: each week's high score is gold
    const weekHigh = {}
    weekly.forEach(r => { if (weekHigh[r.week] === undefined || r.score > weekHigh[r.week]) weekHigh[r.week] = r.score })
    const weeklySort = { sortKey: weeklySortKey, sortDir: weeklySortDir, handleSort: handleWeeklySort }
    const sortedCol  = key => key === standingsSort.sortKey ? 'sorted' : undefined
    const openTeam   = row => navigate(`/teams/${row.team_id}`)

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
                title="SEASON STANDINGS"
                subtitle={selectedYear ? `CAMPAIGN ${selectedYear} · ${standings.length} TEAMS` : ''}
                season={selectedYear}
                onSeasonPrev={onSeasonPrev}
                onSeasonNext={onSeasonNext}
            >
                {/* Stat stamps */}
                {!loading && (
                    <div className="rw-stamps">
                        <StatStamp
                            label="High Score"
                            value={highScore !== null ? fmt(highScore) : '—'}
                            caption={highScoreEntry ? `${highScoreEntry.owner} · WK ${highScoreEntry.week}` : ''}
                        />
                        <StatStamp
                            label="Low Score"
                            value={lowScore !== null ? fmt(lowScore) : '—'}
                            caption={lowScoreEntry ? `${lowScoreEntry.owner} · WK ${lowScoreEntry.week}` : ''}
                        />
                        <StatStamp
                            label="MVP"
                            value={mvp ? fmt(mvp.total_points) : '—'}
                            caption={mvp?.player_name ?? ''}
                        />
                        <StatStamp
                            label="Bullshit"
                            value={mostBullshit ? fmt(mostBullshit.luck) : '—'}
                            caption={mostBullshit?.owner ?? ''}
                        />
                    </div>
                )}

                {loading ? (
                    <div className="rw-loading">Loading...</div>
                ) : (
                    <>
                        {/* Standings tab */}
                        {tab === 'standings' && (
                            <div className="rw-block">
                                <h2 className="rw-label">Standings</h2>
                                {inProgress && <p className="rw-note">In progress · through week {throughWeek}</p>}
                                <div className="table-wrap">
                                    <table className="rw-table rw-standings rw-2line">
                                        <thead>
                                            <tr>
                                                <SortTh label={inProgress ? 'Current place' : 'Place'} sortKey="final_standing" sort={standingsSort} />
                                                <SortTh label="Owner"  sortKey="owner"          sort={standingsSort} text className="owner" />
                                                <SortTh label="W"      sortKey="wins"           sort={standingsSort} />
                                                <SortTh label="L"      sortKey="losses"         sort={standingsSort} />
                                                {hasDraws && <SortTh label="T" sortKey="draws" sort={standingsSort} />}
                                                <SortTh label="Win%"   sortKey="win_pct"        sort={standingsSort} />
                                                <SortTh label="PF"     sortKey="points_for"     sort={standingsSort} />
                                                <SortTh label="PA"     sortKey="points_against" sort={standingsSort} />
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {standingsSort.sorted.map(row => (
                                                <tr
                                                    key={row.owner}
                                                    className="link"
                                                    tabIndex={0}
                                                    onClick={() => openTeam(row)}
                                                    onKeyDown={e => { if (e.key === 'Enter') openTeam(row) }}
                                                >
                                                    <td className={cx('rank', sortedCol('final_standing'))}>#{row.final_standing}</td>
                                                    <td className={cx('owner m1', sortedCol('owner'))}>{row.owner}</td>
                                                    <td className={cx('num win m1 rec', sortedCol('wins'))}>{row.wins}</td>
                                                    <td className={cx('num l m1 rec p-tight', sortedCol('losses'))}>{row.losses}</td>
                                                    {hasDraws && <td className={cx('num t m1 rec p-tight', sortedCol('draws'))}>{row.draws}</td>}
                                                    <td className={cx('num mk', sortedCol('win_pct'))}>{pct3(row.win_pct)}</td>
                                                    <td className={cx('num m2 m2s p-lbl', sortedCol('points_for'))} data-ml="PF">{fmt(row.points_for)}</td>
                                                    <td className={cx('num meta m2 p-lbl', sortedCol('points_against'))} data-ml="PA">{fmt(row.points_against)}</td>
                                                    <td className="badges m2 p-sp">
                                                        {row.championship && <Badge type="championship" count={1} />}
                                                        {row.sacko && <Badge type="sacko" count={1} />}
                                                        {row.most_points && <Badge type="topscore" count={1} />}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Weekly scores tab: a compact board */}
                        {tab === 'weekly' && (
                            <div className="rw-block">
                                <h2 className="rw-label">Weekly Scores</h2>
                                <p className="rw-note">Wins in full weight, losses muted; each week's high score in gold.</p>
                                <div className="table-wrap">
                                    <table className="rw-table rw-board">
                                        <thead>
                                            <tr>
                                                <SortTh label="Owner" sortKey="owner" sort={weeklySort} text className="stick" />
                                                {weeks.map(w => <SortTh key={w} label={`W${w}`} sortKey={`w${w}`} sort={weeklySort} />)}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sortedOwners.map(owner => (
                                                <tr key={owner}>
                                                    <td className="name stick">{owner}</td>
                                                    {weeks.map(w => {
                                                        const entry = weeklyMap[owner]?.[w]
                                                        if (!entry) return <td key={w} className="num dash">—</td>
                                                        const cls = entry.score === weekHigh[w] ? 'cell-top'
                                                            : entry.won === true ? 'cell-win'
                                                            : entry.won === false ? 'cell-loss' : 'meta'
                                                        return (
                                                            <td key={w} className={cx('num', cls)}>
                                                                {fmt(entry.score)}<AdjMark adj={entry.adjustment} />
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

                        {/* Bullshit index tab */}
                        {tab === 'luck' && (
                            <div className="rw-block">
                                <h2 className="rw-label">Bullshit Index</h2>
                                <p className="rw-note">
                                    Bullshit formula: actual wins minus expected wins based on weekly score vs rest of field.
                                    More negative = more bullshit.
                                </p>
                                <div className="table-wrap">
                                    <table className="rw-table rw-standings rw-2line rw-norank">
                                        <thead>
                                            <tr>
                                                <SortTh label="Owner"      sortKey="owner"         sort={luckSort} text className="owner" />
                                                <SortTh label="Actual W"   sortKey="actual_wins"   sort={luckSort} />
                                                <SortTh label="Expected W" sortKey="expected_wins" sort={luckSort} />
                                                <SortTh label="Bullshit"   sortKey="luck"          sort={luckSort} />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {luckSort.sorted.map(row => {
                                                const l = Number(row.luck)
                                                return (
                                                    <tr key={row.owner}>
                                                        <td className="owner m1">{row.owner}</td>
                                                        <td className="num m2 m2s p-lbl" data-ml="Actual W">{row.actual_wins}</td>
                                                        <td className="num meta m2 p-lbl" data-ml="Expected">{row.expected_wins}</td>
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
                            </div>
                        )}

                        {/* Waiver wire tab */}
                        {tab === 'wire' && <WaiverWire season={selectedYear} />}
                    </>
                )}
            </Placard>

        </Scene>
    )
}

export default SeasonPage
