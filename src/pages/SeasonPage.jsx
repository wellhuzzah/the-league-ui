import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getSeasons, getStandings, getWeeklyScores, getLuck, getSeasonTopScorer } from '../api/seasons'
import Scene from '../components/Scene'
import PixelPhoto from '../components/PixelPhoto'
import TopNav from '../components/TopNav'
import Placard from '../components/Placard'
import StatStamp from '../components/StatStamp'
import Badge, { DataWell } from '../components/Badge'

const fmt = (n) =>
    Number(n).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

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

// ── Sort header cell ──────────────────────────────────────────────────────────

function Th({ label, sortKey, currentKey, currentDir, onSort, style }) {
    const active = sortKey === currentKey
    return (
        <th
            onClick={() => onSort(sortKey)}
            style={{
                cursor: 'pointer',
                userSelect: 'none',
                color: active ? 'var(--color-accent)' : undefined,
                whiteSpace: 'nowrap',
                ...style,
            }}
        >
            {label}
            <span style={{ marginLeft: '0.3rem', opacity: active ? 1 : 0.3, fontSize: '0.7em' }}>
                {active ? (currentDir === 'asc' ? '▲' : '▼') : '▼'}
            </span>
        </th>
    )
}

// ── Main component ────────────────────────────────────────────────────────────

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
            if (!selectedYear && sorted.length > 0) {
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
        Promise.all([
            getStandings(selectedYear),
            getWeeklyScores(selectedYear),
            getLuck(selectedYear),
            getSeasonTopScorer(selectedYear),
        ]).then(([s, w, l, m]) => {
            setStandings(s)
            setWeekly(w)
            setLuck(l)
            setMvp(m)
            setLoading(false)
        })
    }, [selectedYear])

    const handleYearChange = (e) => {
        const y = e.target.value
        setSelectedYear(y)
        navigate(`/seasons/${y}`)
    }

    // Build week-by-week structure
    const weeks  = [...new Set(weekly.map(r => r.week))].sort((a, b) => a - b)
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


    const mostBullshit = luck.length
        ? luck.reduce((worst, r) => r.luck < worst.luck ? r : worst)
        : null

    return (
        <Scene>
            <PixelPhoto
                src="/tower.jpg"
                lowW={320}
                lowH={180}
                dither={true}
                tint={0.5}
                style={{ opacity: 0.9 }}
            />

            <div style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(ellipse at 50% 38%, rgba(255,200,140,0.08), transparent 50%)',
                zIndex: 21
            }} />


            {/* Faint ROCKWOOD paint */}
            <div className="stencil-paint" style={{
                position: 'absolute', top: 24, left: 32,
                fontSize: 96, opacity: 0.06, color: '#0a0820', zIndex: 23, letterSpacing: '12px'
            }}>
                ROCKWOOD
            </div>

            <TopNav />

            <Placard
                variant="detached"
                tabs={['Standings', 'Weekly Scores', 'Bullshit Index']}
                activeTab={tab === 'standings' ? 0 : tab === 'weekly' ? 1 : 2}
                onTabChange={i => setTab(['standings', 'weekly', 'luck'][i])}
                title="SEASON STANDINGS"
                subtitle={selectedYear ? `CAMPAIGN ${selectedYear} · ${standings.length} TEAMS` : ''}
                season={selectedYear}
                onSeasonPrev={onSeasonPrev}
                onSeasonNext={onSeasonNext}
            >
                {/* Stat stamps */}
                {!loading && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10, marginBottom: 14 }}>
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
                    <div className="loading" style={{ color: '#8a8c98', fontFamily: 'Inter, sans-serif', fontSize: 12 }}>
                        Loading...
                    </div>
                ) : (
                    <>
                        {/* Standings tab */}
                        {tab === 'standings' && (
                            <DataWell>
                                <div className="table-wrap">
                                    <table className="standings">
                                        <thead>
                                            <tr>
                                                <Th label="Place"  sortKey="final_standing" currentKey={standingsSort.sortKey} currentDir={standingsSort.sortDir} onSort={standingsSort.handleSort} style={{ width: 42, textAlign: 'left' }} />
                                                <Th label="Owner"  sortKey="owner"          currentKey={standingsSort.sortKey} currentDir={standingsSort.sortDir} onSort={standingsSort.handleSort} style={{ textAlign: 'left' }} />
                                                <Th label="W"      sortKey="wins"           currentKey={standingsSort.sortKey} currentDir={standingsSort.sortDir} onSort={standingsSort.handleSort} />
                                                <Th label="L"      sortKey="losses"         currentKey={standingsSort.sortKey} currentDir={standingsSort.sortDir} onSort={standingsSort.handleSort} />
                                                <Th label="Win%"   sortKey="win_pct"        currentKey={standingsSort.sortKey} currentDir={standingsSort.sortDir} onSort={standingsSort.handleSort} />
                                                <Th label="PF"     sortKey="points_for"     currentKey={standingsSort.sortKey} currentDir={standingsSort.sortDir} onSort={standingsSort.handleSort} />
                                                <Th label="PA"     sortKey="points_against" currentKey={standingsSort.sortKey} currentDir={standingsSort.sortDir} onSort={standingsSort.handleSort} />
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {standingsSort.sorted.map(row => {
                                                const pct = row.wins + row.losses > 0
                                                    ? (row.wins / (row.wins + row.losses)).toFixed(3).replace(/^0/, '')
                                                    : '.000'
                                                return (
                                                    <tr
                                                        key={row.owner}
                                                        onClick={() => navigate(`/teams/${row.team_id}`)}
                                                        style={{ cursor: 'pointer' }}
                                                    >
                                                        <td className="rank">#{row.final_standing}</td>
                                                        <td className="team col-owner">{row.owner}</td>
                                                        <td className="num" style={{ color: 'var(--win)' }}>{row.wins}</td>
                                                        <td className="num" style={{ color: 'var(--steel-1)' }}>{row.losses}</td>
                                                        <td className="num">{pct}</td>
                                                        <td className="num">{fmt(row.points_for)}</td>
                                                        <td className="num" style={{ color: 'var(--steel-1)' }}>{fmt(row.points_against)}</td>
                                                        <td>
                                                            {row.championship && <Badge type="championship" count={1} />}
                                                            {row.sacko && <Badge type="sacko" count={1} />}
                                                            {row.most_points && <Badge type="topscore" count={1} />}
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </DataWell>
                        )}

                        {/* Weekly scores tab */}
                        {tab === 'weekly' && (
                            <DataWell>
                                <div className="table-wrap">
                                    <table className="standings">
                                        <thead>
                                            <tr>
                                                <th
                                                    onClick={() => handleWeeklySort('owner')}
                                                    style={{
                                                        cursor: 'pointer',
                                                        userSelect: 'none',
                                                        color: weeklySortKey === 'owner' ? 'var(--color-accent)' : undefined,
                                                    }}
                                                >
                                                    Owner
                                                    <span style={{ marginLeft: '0.3rem', opacity: weeklySortKey === 'owner' ? 1 : 0.3, fontSize: '0.7em' }}>
                                                        {weeklySortKey === 'owner' ? (weeklySortDir === 'asc' ? '▲' : '▼') : '▼'}
                                                    </span>
                                                </th>
                                                {weeks.map(w => (
                                                    <th
                                                        key={w}
                                                        onClick={() => handleWeeklySort(`w${w}`)}
                                                        style={{
                                                            textAlign: 'center',
                                                            cursor: 'pointer',
                                                            userSelect: 'none',
                                                            color: weeklySortKey === `w${w}` ? 'var(--color-accent)' : undefined,
                                                        }}
                                                    >
                                                        W{w}
                                                        <span style={{ marginLeft: '0.2rem', opacity: weeklySortKey === `w${w}` ? 1 : 0.3, fontSize: '0.7em' }}>
                                                            {weeklySortKey === `w${w}` ? (weeklySortDir === 'asc' ? '▲' : '▼') : '▼'}
                                                        </span>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sortedOwners.map(owner => (
                                                <tr key={owner}>
                                                    <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{owner}</td>
                                                    {weeks.map(w => {
                                                        const entry = weeklyMap[owner]?.[w]
                                                        if (!entry) return (
                                                            <td key={w} style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>—</td>
                                                        )
                                                        return (
                                                            <td key={w} style={{
                                                                textAlign: 'center',
                                                                color: entry.won === true
                                                                    ? 'var(--color-win)'
                                                                    : entry.won === false
                                                                    ? 'var(--color-loss)'
                                                                    : 'var(--color-text-muted)',
                                                                fontSize: '0.85rem',
                                                            }}>
                                                                {fmt(entry.score)}
                                                            </td>
                                                        )
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </DataWell>
                        )}

                        {/* Bullshit index tab */}
                        {tab === 'luck' && (
                            <>
                                <p style={{
                                    fontFamily: 'Inter, sans-serif',
                                    color: 'var(--steel-hi)',
                                    fontSize: '14px',
                                    letterSpacing: '0.02em',
                                    marginBottom: '1rem',
                                }}>
                                    Bullshit formula: actual wins minus expected wins based on weekly score vs rest of field.
                                    More negative = more bullshit.
                                </p>
                                <DataWell>
                                    <div className="table-wrap">
                                        <table className="standings">
                                            <thead>
                                                <tr>
                                                    <Th label="Owner"      sortKey="owner"         currentKey={luckSort.sortKey} currentDir={luckSort.sortDir} onSort={luckSort.handleSort} style={{ textAlign: 'left' }} />
                                                    <Th label="Actual W"   sortKey="actual_wins"   currentKey={luckSort.sortKey} currentDir={luckSort.sortDir} onSort={luckSort.handleSort} />
                                                    <Th label="Expected W" sortKey="expected_wins" currentKey={luckSort.sortKey} currentDir={luckSort.sortDir} onSort={luckSort.handleSort} />
                                                    <Th label="Bullshit"   sortKey="luck"          currentKey={luckSort.sortKey} currentDir={luckSort.sortDir} onSort={luckSort.handleSort} />
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {luckSort.sorted.map(row => {
                                                    const l = Number(row.luck)
                                                    return (
                                                        <tr key={row.owner}>
                                                            <td className="team col-owner">{row.owner}</td>
                                                            <td className="num">{row.actual_wins}</td>
                                                            <td className="num" style={{ color: 'var(--steel-1)' }}>{row.expected_wins}</td>
                                                            <td className="num" style={{
                                                                color: l > 0 ? 'var(--color-win)' : l < 0 ? 'var(--color-loss)' : undefined,
                                                            }}>
                                                                {l > 0 ? '+' : ''}{l.toFixed(2)}
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </DataWell>
                            </>
                        )}
                    </>
                )}
            </Placard>

        </Scene>
    )
}

export default SeasonPage
