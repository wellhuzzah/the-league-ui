import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getDraftSeasons, getDraft, draftByTeam, getDraftValueHistory } from '../api/draft'
import { searchPlayers, getPlayer } from '../api/players'
import PlayerChooser from '../components/PlayerChooser'
import Scene from '../components/Scene'
import DataBackdrop from '../components/DataBackdrop'
import TopNav from '../components/TopNav'
import Placard from '../components/Placard'
import StatStamp from '../components/StatStamp'
import SortTh from '../components/SortTh'
import PosChip, { KeeperTag } from '../components/PosChip'
import { posClass } from '../utils/position'
import { useTieFold } from '../utils/tieFold'
import TieFoldLine from '../components/TieFoldLine'

const cx = (...names) => names.filter(Boolean).join(' ')

// Board names fit their square whole: the widest word, measured in the board's font, sets the
// name's size (--fit, down to 75%). A word too long even then (Houshmandzadeh) gets a soft hyphen at
// the consonant pair nearest its middle. D/ST names drop the suffix: the position line says it.
const FIT_PX  = 66     // widest word at 12.5px that fits every square, narrow desktops included
const MIN_FIT = 0.75
const fitCache = new Map()
let measureCtx = null

const VOWEL = /[aeiouy]/i
function softHyphen(word) {
    let best = -1
    for (let i = 4; i <= word.length - 4; i++) {
        const pair = !VOWEL.test(word[i - 1]) && !VOWEL.test(word[i]) && /[a-z]/i.test(word[i - 1] + word[i])
        if (pair && (best < 0 || Math.abs(i - word.length / 2) < Math.abs(best - word.length / 2))) best = i
    }
    const at = best > 0 ? best : Math.ceil(word.length / 2)
    return word.slice(0, at) + '­' + word.slice(at)
}

function boardName(name) {
    if (!name) return { text: '—', fit: 1 }
    const fontReady = document.fonts?.check('700 12.5px Inter') ?? true
    if (fontReady && fitCache.has(name)) return fitCache.get(name)
    measureCtx ??= document.createElement('canvas').getContext('2d')
    measureCtx.font = '700 12.5px Inter'
    const text  = name.replace(/ D\/ST$/, '')
    const width = w => measureCtx.measureText(w).width
    // Each part with its trailing hyphen, so Westbrook- fits whole and breaks after the hyphen
    const widest = Math.max(...text.split(/\s+|(?<=-)/).map(width))
    const fit = Math.max(MIN_FIT, Math.min(1, FIT_PX / widest))
    const out = {
        // Split on spaces and hyphens (kept), so Smith-Schuster is measured part by part
        text: text.split(/([\s-])/).map(w => width(w) * fit > FIT_PX ? softHyphen(w) : w).join(''),
        fit: Math.round(fit * 100) / 100,
    }
    if (fontReady) fitCache.set(name, out)
    return out
}
const pickLabel = p => `R${p.round_num}.${String(p.pick_in_round).padStart(2, '0')}`

// Below 720px the 14-column board can't fit: the page opens on By Team
const narrow = () => window.innerWidth <= 720

// ── Round-by-round board ──────────────────────────────────────────────────────

function DraftBoard({ data }) {
    // Names are measured in Inter: re-render once the web font has loaded
    const [, setFontsLoaded] = useState(false)
    useEffect(() => { document.fonts?.ready.then(() => setFontsLoaded(true)) }, [])
    const rounds   = data.rounds
    const numTeams = rounds[0]?.picks.length || 0

    const pickMap = {}
    rounds.forEach(r => {
        pickMap[r.round] = {}
        r.picks.forEach(p => { pickMap[r.round][p.pick_in_round] = p })
    })

    return (
        <div className="table-wrap">
            <table className="rw-table rw-board rw-draft" style={{ width: '100%' }}>
                <thead>
                    <tr>
                        <th className="rd">Rd</th>
                        {Array.from({ length: numTeams }, (_, i) => (
                            <th key={i}>Pick {i + 1}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rounds.map(r => (
                        <tr key={r.round}>
                            <td className="rd">{r.round}</td>
                            {Array.from({ length: numTeams }, (_, i) => {
                                const pick = pickMap[r.round]?.[i + 1]
                                if (!pick) return <td key={i} className="pk dash">—</td>
                                const nm = boardName(pick.player_name)
                                return (
                                    <td key={i} className={`pk st-${posClass(pick.position)}`}>
                                        <div className="rw-pick">
                                            <span className="nm" style={nm.fit < 1 ? { '--fit': nm.fit } : undefined} title={pick.player_name || undefined}>{nm.text}</span>
                                            <span className="ps">{pick.position || '?'}</span>
                                            {/* Owner line sits at the square's bottom; a keeper's KPR at its right end */}
                                            <span className="ow">
                                                <span className="who">{pick.owner}</span>
                                                {pick.is_keeper && <KeeperTag short />}
                                            </span>
                                        </div>
                                    </td>
                                )
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

// ── By-team view ──────────────────────────────────────────────────────────────

function DraftByTeam({ data }) {
    return (
        <div className="rw-cards">
            {data.teams.map(team => (
                <div key={team.owner} className="rw-card">
                    <div className="rw-card-head">{team.owner}</div>
                    {team.picks.map(pick => (
                        <div key={pick.overall_pick} className="rw-card-row">
                            <span className="pk">{pickLabel(pick)}</span>
                            <PosChip position={pick.position} />
                            <span className="nm">{pick.player_name || '—'}</span>
                            {pick.is_keeper && <KeeperTag />}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    )
}

// ── Player search ─────────────────────────────────────────────────────────────

// By ESPN player id, never by name: the name search lists the drafted players it matched ("Which
// one?" when several do, e.g. the three Mike Williamses), and the picks come from the player's card.
function PlayerSearch() {
    const [query,     setQuery]     = useState('')
    const [choices,   setChoices]   = useState(null)
    const [results,   setResults]   = useState(null)    // { query, times_drafted, results }
    const [searching, setSearching] = useState(false)
    const [error,     setError]     = useState(null)

    const showPlayer = async (espnPlayerId) => {
        const { draft } = await getPlayer(espnPlayerId)    // draft.query is the player's latest name
        setResults(draft)
        setChoices(null)
    }

    const handleSearch = async (e) => {
        e.preventDefault()
        const q = query.trim()
        if (q.length < 2) return
        setSearching(true)
        setError(null)
        setChoices(null)
        setResults(null)
        try {
            const drafted = (await searchPlayers(q)).players.filter(p => p.drafted > 0)
            if (drafted.length === 1) await showPlayer(drafted[0].espn_player_id)
            else if (drafted.length > 1) setChoices(drafted)
            else setResults({ query: q, times_drafted: 0, results: [] })
        } catch {
            setError('Search failed — try again')
        } finally {
            setSearching(false)
        }
    }

    const handleChoose = (p) => showPlayer(p.espn_player_id).catch(() => setError('Search failed — try again'))

    return (
        <div className="rw-block" style={{ minWidth: 'min(760px, 100%)' }}>
            <h2 className="rw-label">Player Draft History</h2>
            <form onSubmit={handleSearch} className="rw-search">
                <input
                    type="text"
                    className="rw-input"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search player name..."
                    aria-label="Player name"
                />
                <button type="submit" className="rw-btn" disabled={searching}>
                    {searching ? '...' : 'Search'}
                </button>
            </form>

            {error && <p className="rw-note" style={{ color: 'var(--loss)' }}>{error}</p>}

            {choices && <PlayerChooser players={choices} onSelect={handleChoose} />}

            {results && (
                results.times_drafted === 0 ? (
                    <p className="rw-note">No results for "{results.query}"</p>
                ) : (
                    <>
                        <p className="rw-note">
                            "{results.query}" — drafted {results.times_drafted} time{results.times_drafted !== 1 ? 's' : ''}
                        </p>
                        <div className="table-wrap">
                            <table className="rw-table rw-ranked rw-2line rw-norank" style={{ width: '100%' }}>
                                <thead>
                                    <tr>
                                        <th className="num">Season</th>
                                        <th>Player</th>
                                        <th>Pos</th>
                                        <th className="num">Pick</th>
                                        <th className="num">Round</th>
                                        <th>Owner</th>
                                        <th className="num">Keeper</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {results.results.map((r, i) => (
                                        <tr key={i}>
                                            <td className="num meta m2 m2s">{r.season}</td>
                                            <td className="name m1">{r.player_name}</td>
                                            <td className="m1 p-sp"><PosChip position={r.position} /></td>
                                            <td className="num key mk">#{r.overall_pick}</td>
                                            <td className="num meta m2 p-dot">{pickLabel(r)}</td>
                                            <td className="name m2 p-dot">{r.owner}</td>
                                            <td className="num m2 m-opt p-sp">{r.is_keeper ? <KeeperTag /> : <span className="dash">—</span>}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )
            )}
        </div>
    )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ordinal = n => {
    const v = n % 100
    const s = ['th', 'st', 'nd', 'rd']
    return n + (s[(v - 20) % 10] || s[v] || s[0])
}

const signed = (n, digits) => (n > 0 ? `+${n.toFixed(digits)}` : n.toFixed(digits))
const signCls = n => (n > 0 ? 'rw-plus' : n < 0 ? 'rw-minus' : undefined)

// ── Sort hook ─────────────────────────────────────────────────────────────────

function useSortable(defaultKey, defaultDir = 'desc') {
    const [sortKey, setSortKey] = useState(defaultKey)
    const [sortDir, setSortDir] = useState(defaultDir)
    const handleSort = useCallback((key) => {
        setSortDir(prev => key === sortKey ? (prev === 'desc' ? 'asc' : 'desc') : defaultDir)
        setSortKey(key)
    }, [sortKey, defaultDir])
    return { sortKey, sortDir, handleSort }
}

// ── Value table ───────────────────────────────────────────────────────────────

function ValueTable({ picks, showSeason = false, showPosRank = false, posAvgPpg = null, defaultSortKey = 'value_gap', defaultSortDir = 'desc', limit, cutoff, cutoffFormat }) {
    const sort = useSortable(defaultSortKey, defaultSortDir)
    const { sortKey, sortDir } = sort
    const showPpgDelta = posAvgPpg != null

    const posRankArr = useMemo(() => {
        if (!showPosRank) return null
        const byPos = {}
        picks.forEach((p, i) => {
            if (!byPos[p.position]) byPos[p.position] = []
            byPos[p.position].push({ i, pts: p.season_points })
        })
        const ranks = new Array(picks.length).fill(null)
        for (const group of Object.values(byPos)) {
            const sorted = [...group].sort((a, b) => b.pts - a.pts)
            sorted.forEach(({ i }, rank) => { ranks[i] = rank + 1 })
        }
        return ranks
    }, [picks, showPosRank])

    const enriched = useMemo(() => picks.map((p, i) => {
        const ppg = p.weeks_active > 0 ? p.season_points / p.weeks_active : null
        const avgPpg = posAvgPpg?.[p.position] ?? null
        const ppg_delta = ppg != null && avgPpg != null ? ppg - avgPpg : null
        return { ...p, pos_rank: posRankArr ? posRankArr[i] : null, ppg_delta }
    }), [picks, posRankArr, posAvgPpg])

    const sorted = useMemo(() => [...enriched].sort((a, b) => {
        const av = a[sortKey], bv = b[sortKey]
        if (av == null) return 1
        if (bv == null) return -1
        const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv
        return sortDir === 'asc' ? cmp : -cmp
    }), [enriched, sortKey, sortDir])

    // ALL lists stop at `cutoff` (25); 3+ rows tied there fold into one line once the list is opened
    const fold = useTieFold(enriched, cutoff ?? Infinity)
    const unfolded = fold.shown(sorted)
    const visible = limit != null ? unfolded.slice(0, limit) : unfolded
    const columns = 6 + showSeason + showPosRank + showPpgDelta
    const th = (label, k, cls) => (
        <SortTh label={label} sortKey={k} sort={sort} text={['player_name', 'owner', 'position'].includes(k)} className={cls} />
    )

    return (
        <div className="table-wrap">
            <table className="rw-table rw-standings rw-2line rw-norank">
                <thead>
                    <tr>
                        {showSeason && th('Year', 'season')}
                        {th('Player', 'player_name', 'owner')}
                        {th('Pos', 'position')}
                        {th('Draft', 'overall_pick')}
                        {th('Owner', 'owner')}
                        {th('Pts', 'season_points')}
                        {showPosRank && th('Pos Rank', 'pos_rank')}
                        {th('Value', 'value_gap')}
                        {showPpgDelta && th('vs Pos', 'ppg_delta')}
                    </tr>
                </thead>
                <tbody>
                    {visible.map((p, i) => (
                        <tr key={i}>
                            {showSeason && <td className="num meta m2 m2s">{p.season}</td>}
                            <td className="owner m1 m-flow">
                                {p.player_name}
                                {p.is_keeper && <KeeperTag />}
                            </td>
                            <td className={cx('m2 p-sp', !showSeason && 'm2s')}><PosChip position={p.position} /></td>
                            <td className="num meta m2 p-sp">{pickLabel(p)}</td>
                            <td className="name m1 p-dot">{p.owner}</td>
                            <td className="num m2 p-lbl" data-ml="Pts">{p.season_points.toFixed(1)}</td>
                            {showPosRank && (
                                <td className="num soft m2 p-lbl" data-ml="Rank">{p.pos_rank ? ordinal(p.pos_rank) : '—'}</td>
                            )}
                            <td className={cx('num key mk', signCls(p.value_gap))}>
                                {p.value_gap > 0 ? `+${p.value_gap}` : p.value_gap}
                            </td>
                            {showPpgDelta && (
                                <td className={cx('num m2 p-lbl', signCls(p.ppg_delta))} data-ml="vs Pos" style={{ fontWeight: 700 }}>
                                    {p.ppg_delta != null ? signed(p.ppg_delta, 1) : '—'}
                                </td>
                            )}
                        </tr>
                    ))}
                    {limit == null && <TieFoldLine data fold={fold} format={cutoffFormat} colSpan={columns} />}
                </tbody>
            </table>
        </div>
    )
}

// ── Expandable section wrapper ────────────────────────────────────────────────

function ValueSection({ label, picks, showSeason = false, showPosRank = false, posAvgPpg = null, defaultSortKey, defaultSortDir, cutoff, cutoffFormat }) {
    const [expanded, setExpanded] = useState(false)
    return (
        <div className="rw-block">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <h2 className="rw-label" style={{ flex: 1, margin: 0 }}>{label}</h2>
                {picks.length > 10 && (
                    <div className="rw-seg">
                        <button type="button" onClick={() => setExpanded(v => !v)} aria-expanded={expanded}>
                            {expanded ? 'Show less' : `Show all ${picks.length}`}
                        </button>
                    </div>
                )}
            </div>
            <ValueTable
                picks={picks}
                showSeason={showSeason}
                showPosRank={showPosRank}
                posAvgPpg={posAvgPpg}
                defaultSortKey={defaultSortKey}
                defaultSortDir={defaultSortDir}
                limit={expanded ? undefined : 10}
                cutoff={cutoff}
                cutoffFormat={cutoffFormat}
            />
        </div>
    )
}

// ── Steals & Busts tab ───────────────────────────────────────────────────────

function ValueTab({ data, viewingAll, historyData, historyLoading, scoringYears, onPickYear }) {
    const steals = useMemo(() => (data?.picks || []).filter(p => p.value_gap > 0), [data])
    const busts  = useMemo(() => (data?.picks || []).filter(p => p.value_gap < 0), [data])

    const posAvgPpg = useMemo(() => {
        const allPicks = data?.picks || []
        const byPos = {}
        for (const p of allPicks) {
            if (p.weeks_active > 0) {
                if (!byPos[p.position]) byPos[p.position] = []
                byPos[p.position].push(p.season_points / p.weeks_active)
            }
        }
        const result = {}
        for (const [pos, ppgs] of Object.entries(byPos)) {
            result[pos] = ppgs.reduce((a, b) => a + b, 0) / ppgs.length
        }
        return Object.keys(result).length > 0 ? result : null
    }, [data])

    if (viewingAll) {
        if (historyLoading || !historyData) {
            return <div className="rw-loading">Loading...</div>
        }
        return (
            <div className="rw-stack">
                <p className="rw-note">
                    Value is pick number minus actual finish rank among all drafted players that season. Higher value, the more they outperformed their draft slot. Aggregated across all seasons.
                </p>
                {/* top 25 each: steals ranked by value, busts by season points */}
                <ValueSection label="All-Time Steals" picks={historyData.steals} showSeason defaultSortKey="value_gap"    defaultSortDir="desc"
                              cutoff={25} cutoffFormat={p => `+${p.value_gap}`} />
                <ValueSection label="All-Time Busts"  picks={historyData.busts}  showSeason defaultSortKey="value_gap" defaultSortDir="asc"
                              cutoff={25} cutoffFormat={p => `${p.season_points.toFixed(1)} pts`} />
            </div>
        )
    }

    if (!data) return null
    if (data.scoring === false) {
        // No box scores before 2018: a calm empty state, not a table of dashes
        return (
            <div className="rw-empty">
                <h3>No scoring data before 2018</h3>
                <p>
                    ESPN box scores start in 2018, so there's no season value to rank the {data.season} picks by.
                    The {data.season} draft board is still complete.
                </p>
                <div className="chips">
                    {scoringYears.map(y => (
                        <button key={y} type="button" className="rw-chip" onClick={() => onPickYear(y)}>{y}</button>
                    ))}
                </div>
            </div>
        )
    }
    return (
        <div className="rw-stack">
            <p className="rw-note">
                Value is pick number minus actual finish rank among all drafted players that season. Higher value, the more they outperformed their draft slot.
                <br />
                vs Pos is ppg compared to the average for that position, measuring true value against alternatives.
            </p>
            <ValueSection label="Steals" picks={steals} showPosRank posAvgPpg={posAvgPpg} defaultSortKey="ppg_delta" defaultSortDir="desc" />
            <ValueSection label="Busts"  picks={busts}  showPosRank posAvgPpg={posAvgPpg} defaultSortKey="value_gap" defaultSortDir="asc"  />
        </div>
    )
}

// ── Main export ───────────────────────────────────────────────────────────────

const TABS      = ['board', 'byteam', 'value', 'search']
const TAB_LBLS  = ['Draft Board', 'By Team', 'Steals & Busts', 'Player Search']

export default function Draft() {
    const { year } = useParams()
    const navigate  = useNavigate()

    const [seasons,        setSeasons]        = useState([])
    const [selectedYear,   setSelectedYear]   = useState(year || null)
    const [tab,            setTab]            = useState(() => narrow() ? 'byteam' : 'board')
    const [viewingAll,     setViewingAll]     = useState(false)
    const [boardData,      setBoardData]      = useState(null)
    const [teamData,       setTeamData]       = useState(null)
    const [valueData,      setValueData]      = useState(null)
    const [historyData,    setHistoryData]    = useState(null)
    const [historyLoaded,  setHistoryLoaded]  = useState(false)
    const [historyLoading, setHistoryLoading] = useState(false)
    const [loading,        setLoading]        = useState(true)
    const [isMobile,       setIsMobile]       = useState(() => window.innerWidth <= 600)
    const [mobileOwner,    setMobileOwner]    = useState('')

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth <= 600)
        window.addEventListener('resize', check)
        return () => window.removeEventListener('resize', check)
    }, [])

    useEffect(() => {
        getDraftSeasons().then(data => {
            const sorted = [...data].sort((a, b) => b.season - a.season)
            setSeasons(sorted)
            // Only while still on bare /draft: if the user has clicked elsewhere meanwhile (this page
            // stays mounted while the next page's chunk loads), don't pull them back
            if (!selectedYear && sorted.length > 0 && window.location.pathname === '/draft') {
                const latest = String(sorted[0].season)
                setSelectedYear(latest)
                navigate(`/draft/${latest}`, { replace: true })
            }
        })
    }, [])

    useEffect(() => {
        if (!selectedYear) return
        setLoading(true)
        // One call per season serves all three tabs: the board, its value table, and the By Team
        // grouping (done here from the board)
        if (tab === 'board') {
            getDraft(selectedYear)
                .then(d => { setBoardData(d); setValueData(d.value) })
                .finally(() => setLoading(false))
        } else if (tab === 'byteam') {
            getDraft(selectedYear)
                .then(d => setTeamData(draftByTeam(d)))
                .finally(() => setLoading(false))
        } else if (tab === 'value') {
            if (viewingAll) {
                setLoading(false)
            } else if (valueData?.season === Number(selectedYear)) {
                setLoading(false)
            } else {
                getDraft(selectedYear)
                    .then(d => setValueData(d.value))
                    .finally(() => setLoading(false))
            }
        } else {
            setLoading(false)
        }
    }, [selectedYear, tab, viewingAll])

    const handleTabChange = (i) => {
        setTab(TABS[i])
        setViewingAll(false)
    }

    const resetYear = (y) => {
        setSelectedYear(y); setBoardData(null); setTeamData(null); setValueData(null)
        setViewingAll(false); setTab(narrow() ? 'byteam' : 'board')
        navigate(`/draft/${y}`)
    }

    const handleSeasonAll = () => {
        if (viewingAll) {
            setViewingAll(false)
        } else {
            setViewingAll(true)
            setTab('value')
            if (!historyLoaded && !historyLoading) {
                setHistoryLoading(true)
                getDraftValueHistory()
                    .then(data => { setHistoryData(data); setHistoryLoaded(true) })
                    .finally(() => setHistoryLoading(false))
            }
        }
    }

    // Placard season prev/next — derived from seasons array (desc order: seasons[0] = latest)
    const seasonIdx    = seasons.findIndex(s => String(s.season) === String(selectedYear))
    const onSeasonPrev = seasonIdx < seasons.length - 1 ? () => resetYear(String(seasons[seasonIdx + 1].season)) : undefined
    const onSeasonNext = seasonIdx > 0                  ? () => resetYear(String(seasons[seasonIdx - 1].season)) : undefined

    // Stat stamps — derived from boardData when available
    // round_num lives on the round wrapper, not on picks, so inject it during flatMap
    const allPicks = boardData
        ? boardData.rounds.flatMap(r => r.picks.map(p => ({ ...p, round_num: r.round })))
              .sort((a, b) => a.overall_pick - b.overall_pick)
        : []
    const firstK       = allPicks.find(p => p.position === 'K') ?? null
    const totalKeepers = allPicks.filter(p => p.is_keeper).length

    // Position average PPG — shared across all stamp vs-pos deltas
    const allValuePicks = valueData?.picks || []
    const posAvgPpg = (() => {
        const byPos = {}
        for (const p of allValuePicks) {
            if (p.weeks_active > 0) {
                if (!byPos[p.position]) byPos[p.position] = []
                byPos[p.position].push(p.season_points / p.weeks_active)
            }
        }
        const result = {}
        for (const [pos, ppgs] of Object.entries(byPos))
            result[pos] = ppgs.reduce((a, b) => a + b, 0) / ppgs.length
        return result
    })()
    const pickPpgDelta = (pick) => {
        if (!pick || pick.weeks_active <= 0 || posAvgPpg[pick.position] == null) return null
        return (pick.season_points / pick.weeks_active) - posAvgPpg[pick.position]
    }

    // Steal / bust vs-pos deltas
    const stealDelta = pickPpgDelta(valueData?.steal ?? null)
    const bustDelta  = pickPpgDelta(valueData?.bust  ?? null)

    // Best keeper by vs-pos delta
    const keeperValuePicks = allValuePicks.filter(p => p.is_keeper && p.weeks_active > 0)
    const bestKeeper = keeperValuePicks.reduce((best, p) => {
        const d = pickPpgDelta(p), bd = pickPpgDelta(best)
        return d != null && (bd == null || d > bd) ? p : best
    }, null)
    const bestKeeperDelta = pickPpgDelta(bestKeeper)

    // First kicker vs position average
    const kickerPicks = allValuePicks.filter(p => p.position === 'K' && p.weeks_active > 0)
    const firstKValue = kickerPicks.find(p => p.player_name === firstK?.player_name)
    const ppgVsAvg    = firstKValue ? pickPpgDelta(firstKValue) : null

    // Steals & Busts before 2018: chips to the seasons that have scoring data
    const scoringYears = seasons.map(s => Number(s.season)).filter(y => y >= 2018).sort((a, b) => a - b)
    const openValueYear = (y) => { resetYear(String(y)); setTab('value') }

    return (
        <Scene>
            <DataBackdrop />

            <TopNav />

            <Placard
                variant="detached"
                data
                tabs={TAB_LBLS}
                activeTab={TABS.indexOf(tab)}
                onTabChange={handleTabChange}
                title="DRAFT HISTORY"
                season={selectedYear}
                onSeasonPrev={onSeasonPrev}
                onSeasonNext={onSeasonNext}
                onSeasonAll={handleSeasonAll}
                seasonAllActive={viewingAll}
                style={tab === 'board' ? { width: 'min(1440px, calc(100vw - 48px))' } : undefined}
            >
                {/* Stat stamps — shown on board tab when data is loaded */}
                {tab === 'board' && boardData && (
                    <div className="rw-stamps">
                        <StatStamp
                            label="Keepers"
                            value={totalKeepers}
                            caption={bestKeeper && bestKeeperDelta != null
                                ? `Best: ${bestKeeper.player_name} · ${bestKeeper.owner} · ${bestKeeperDelta > 0 ? '+' : ''}${bestKeeperDelta.toFixed(1)} vs pos`
                                : ''
                            }
                        />
                        {valueData?.steal && (
                            <StatStamp
                                label="STEAL"
                                value={`R${valueData.steal.round_num}`}
                                caption={`${valueData.steal.player_name}${valueData.steal.is_keeper ? ' ★' : ''} · ${valueData.steal.season_points} pts${stealDelta != null ? ` · ${stealDelta > 0 ? '+' : ''}${stealDelta.toFixed(1)} vs pos` : ''}`}
                            />
                        )}
                        {valueData?.bust && (
                            <StatStamp
                                label="BUST"
                                value={`#${valueData.bust.overall_pick}`}
                                caption={`${valueData.bust.player_name}${valueData.bust.is_keeper ? ' ★' : ''} · ${valueData.bust.season_points} pts${bustDelta != null ? ` · ${bustDelta > 0 ? '+' : ''}${bustDelta.toFixed(1)} vs pos` : ''}`}
                            />
                        )}
                        {firstK && (
                            <StatStamp
                                label="1ST KICKER"
                                value={`R${firstK.round_num}`}
                                caption={
                                    ppgVsAvg != null
                                        ? `${firstK.player_name} · ${firstK.owner} · ${ppgVsAvg > 0 ? '+' : ''}${ppgVsAvg.toFixed(1)} ppg vs K avg${firstK.round_num < 13 ? ' 😂' : ''}`
                                        : `${firstK.player_name} · ${firstK.owner}${firstK.round_num < 13 ? ' 😂' : ''}`
                                }
                            />
                        )}
                    </div>
                )}

                {tab === 'search' ? (
                    <PlayerSearch />
                ) : loading ? (
                    <div className="rw-loading">Loading...</div>
                ) : (
                    <>
                        {tab === 'board' && boardData && <DraftBoard data={boardData} />}
                        {tab === 'value' && (
                            <ValueTab
                                data={valueData} viewingAll={viewingAll} historyData={historyData} historyLoading={historyLoading}
                                scoringYears={scoringYears} onPickYear={openValueYear}
                            />
                        )}
                        {tab === 'byteam' && teamData  && (
                            isMobile ? (
                                <>
                                    <select
                                        className="rw-select"
                                        value={mobileOwner}
                                        onChange={e => setMobileOwner(e.target.value)}
                                        aria-label="Owner"
                                        style={{ width: '100%', marginBottom: 12 }}
                                    >
                                        <option value="">— All owners —</option>
                                        {teamData.teams.map(t => (
                                            <option key={t.owner} value={t.owner}>{t.owner}</option>
                                        ))}
                                    </select>
                                    <DraftByTeam data={mobileOwner
                                        ? { teams: teamData.teams.filter(t => t.owner === mobileOwner) }
                                        : teamData
                                    } />
                                </>
                            ) : (
                                <DraftByTeam data={teamData} />
                            )
                        )}
                    </>
                )}
            </Placard>
        </Scene>
    )
}
