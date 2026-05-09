import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getDraftSeasons, getDraft, getDraftByTeam, getKeepers, searchPlayer } from '../api/draft'
import Scene from '../components/Scene'
import PixelPhoto from '../components/PixelPhoto'
import TopNav from '../components/TopNav'
import Placard from '../components/Placard'
import StatStamp from '../components/StatStamp'

const POS_COLORS = {
    QB:    '#e07c4a',
    RB:    '#4a9b6f',
    WR:    '#4a7bc9',
    TE:    '#9b6f4a',
    K:     '#7b7b9b',
    'D/ST':'#6f9b9b',
    UNK:   '#8a8c98',
}

function PosBadge({ position }) {
    const color = POS_COLORS[position] || POS_COLORS.UNK
    return (
        <span style={{
            display: 'inline-block',
            fontFamily: 'Inter, sans-serif',
            fontSize: 12,
            letterSpacing: 0,
            padding: '2px 5px',
            background: `${color}22`,
            color,
            border: `1px solid ${color}66`,
            marginRight: 4,
            verticalAlign: 'middle',
        }}>
            {position || '?'}
        </span>
    )
}

// ── Round-by-round board ──────────────────────────────────────────────────────

function DraftBoard({ data }) {
    const rounds   = data.rounds
    const numTeams = rounds[0]?.picks.length || 0

    const pickMap = {}
    rounds.forEach(r => {
        pickMap[r.round] = {}
        r.picks.forEach(p => { pickMap[r.round][p.pick_in_round] = p })
    })

    return (
        <div className="table-wrap">
            <table className="standings">
                <thead>
                    <tr>
                        <th style={{ width: 40 }}>Rd</th>
                        {Array.from({ length: numTeams }, (_, i) => (
                            <th key={i} style={{ minWidth: 120 }}>Pick {i + 1}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rounds.map(r => (
                        <tr key={r.round}>
                            <td style={{
                                fontFamily: 'var(--f-display)', fontSize: '1.1rem',
                                color: 'var(--amber)', textAlign: 'center',
                            }}>
                                {r.round}
                            </td>
                            {Array.from({ length: numTeams }, (_, i) => {
                                const pick = pickMap[r.round]?.[i + 1]
                                if (!pick) return <td key={i} style={{ color: '#8a8c98' }}>—</td>
                                return (
                                    <td key={i} style={{ verticalAlign: 'top', padding: '6px 10px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 2 }}>
                                            <PosBadge position={pick.position} />
                                            {pick.is_keeper && (
                                                <span className="badge-tag gold" style={{ fontSize: 12 }}>K</span>
                                            )}
                                        </div>
                                        <div style={{
                                            fontFamily: 'Inter, sans-serif', fontSize: 13,
                                            color: '#f4eedd', lineHeight: 1.3,
                                        }}>
                                            {pick.player_name || '—'}
                                        </div>
                                        <div style={{
                                            fontFamily: 'Inter, sans-serif', fontSize: 12,
                                            color: '#8a8c98', marginTop: 2,
                                        }}>
                                            {pick.owner}
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
            {data.teams.map(team => (
                <div key={team.owner} style={{
                    background: '#0e0d1a', border: '2px solid #252840', padding: '10px 12px',
                }}>
                    <div style={{
                        fontFamily: 'var(--f-display)', fontSize: '1.05rem',
                        letterSpacing: '0.04em', color: 'var(--amber)',
                        marginBottom: 8,
                    }}>
                        {team.owner.toUpperCase()}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {team.picks.map(pick => (
                            <div key={pick.overall_pick} style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '3px 0', borderBottom: '1px solid #1a1c26',
                            }}>
                                <span style={{
                                    fontFamily: 'Inter, sans-serif', fontSize: 12,
                                    color: '#8a8c98', width: 52, flexShrink: 0, letterSpacing: 0,
                                }}>
                                    R{pick.round_num}.{String(pick.pick_in_round).padStart(2, '0')}
                                </span>
                                <PosBadge position={pick.position} />
                                <span style={{
                                    fontFamily: 'Inter, sans-serif', fontSize: 13,
                                    color: '#f4eedd', flex: 1,
                                }}>
                                    {pick.player_name || '—'}
                                </span>
                                {pick.is_keeper && (
                                    <span className="badge-tag gold" style={{ marginLeft: 'auto' }}>K</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}

// ── Player search ─────────────────────────────────────────────────────────────

function PlayerSearch() {
    const [query,     setQuery]     = useState('')
    const [results,   setResults]   = useState(null)
    const [searching, setSearching] = useState(false)

    const handleSearch = async (e) => {
        e.preventDefault()
        if (!query.trim()) return
        setSearching(true)
        try {
            const data = await searchPlayer(query.trim())
            setResults(data)
        } finally {
            setSearching(false)
        }
    }

    return (
        <div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, letterSpacing: 3, color: 'var(--amber)', marginBottom: 10 }}>
                PLAYER DRAFT HISTORY
            </div>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search player name..."
                    style={{
                        flex: 1,
                        background: '#1a1c26',
                        border: '2px solid #3a3d4a',
                        color: '#f4eedd',
                        fontFamily: 'Inter, sans-serif',
                        fontSize: 13,
                        letterSpacing: 0,
                        padding: '6px 10px',
                        outline: 'none',
                    }}
                />
                <button
                    type="submit"
                    disabled={searching}
                    style={{
                        background: searching ? '#1a1c26' : 'var(--amber)',
                        border: '2px solid var(--amber)',
                        color: searching ? '#8a8c98' : '#1a1c26',
                        fontFamily: 'Inter, sans-serif',
                        fontSize: 13,
                        letterSpacing: 0,
                        padding: '6px 14px',
                        cursor: searching ? 'wait' : 'pointer',
                    }}
                >
                    {searching ? '...' : 'SEARCH'}
                </button>
            </form>

            {results && (
                results.times_drafted === 0 ? (
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#8a8c98', letterSpacing: 0 }}>
                        No results for "{results.query}"
                    </div>
                ) : (
                    <>
                        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#8a8c98', letterSpacing: 0, marginBottom: 10 }}>
                            "{results.query}" — drafted {results.times_drafted} time{results.times_drafted !== 1 ? 's' : ''}
                        </div>
                        <div className="table-wrap">
                            <table className="standings">
                                <thead>
                                    <tr>
                                        <th>Season</th>
                                        <th>Player</th>
                                        <th>Pos</th>
                                        <th>Pick</th>
                                        <th>Round</th>
                                        <th>Owner</th>
                                        <th>Keeper</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {results.results.map((r, i) => (
                                        <tr key={i}>
                                            <td className="num">{r.season}</td>
                                            <td className="team">{r.player_name}</td>
                                            <td className="num"><PosBadge position={r.position} /></td>
                                            <td className="num" style={{ color: '#8a8c98' }}>#{r.overall_pick}</td>
                                            <td className="num" style={{ color: '#8a8c98' }}>R{r.round_num}.{String(r.pick_in_round).padStart(2, '0')}</td>
                                            <td className="team">{r.owner}</td>
                                            <td className="num">
                                                {r.is_keeper ? <span className="badge-tag gold">K</span> : '—'}
                                            </td>
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

// ── Main export ───────────────────────────────────────────────────────────────

const TABS      = ['board', 'byteam', 'search']
const TAB_LBLS  = ['Draft Board', 'By Team', 'Player Search']

export default function Draft() {
    const { year } = useParams()
    const navigate  = useNavigate()

    const [seasons,      setSeasons]      = useState([])
    const [selectedYear, setSelectedYear] = useState(year || null)
    const [tab,          setTab]          = useState('board')
    const [boardData,    setBoardData]    = useState(null)
    const [teamData,     setTeamData]     = useState(null)
    const [loading,      setLoading]      = useState(true)

    useEffect(() => {
        getDraftSeasons().then(data => {
            setSeasons(data)
            if (!selectedYear && data.length > 0) {
                const latest = String(data[0].season)
                setSelectedYear(latest)
                navigate(`/draft/${latest}`, { replace: true })
            }
        })
    }, [])

    useEffect(() => {
        if (!selectedYear) return
        setLoading(true)
        if (tab === 'board') {
            getDraft(selectedYear)
                .then(setBoardData)
                .finally(() => setLoading(false))
        } else if (tab === 'byteam') {
            getDraftByTeam(selectedYear)
                .then(setTeamData)
                .finally(() => setLoading(false))
        } else {
            setLoading(false)
        }
    }, [selectedYear, tab])

    // Keep original handler (no logic change, select removed from JSX but function retained)
    const handleYearChange = (e) => {
        const y = e.target.value
        setSelectedYear(y)
        setBoardData(null)
        setTeamData(null)
        navigate(`/draft/${y}`)
    }

    // Placard season prev/next — derived from seasons array (desc order: seasons[0] = latest)
    const seasonIdx    = seasons.findIndex(s => String(s.season) === String(selectedYear))
    const onSeasonPrev = seasonIdx < seasons.length - 1
        ? () => { const y = String(seasons[seasonIdx + 1].season); setSelectedYear(y); setBoardData(null); setTeamData(null); navigate(`/draft/${y}`) }
        : undefined
    const onSeasonNext = seasonIdx > 0
        ? () => { const y = String(seasons[seasonIdx - 1].season); setSelectedYear(y); setBoardData(null); setTeamData(null); navigate(`/draft/${y}`) }
        : undefined

    // Stat stamps — derived from boardData when available
    const numTeams     = boardData ? (boardData.rounds[0]?.picks.length || 0) : null
    const numRounds    = boardData ? boardData.rounds.length : null
    const totalKeepers = boardData
        ? boardData.rounds.reduce((sum, r) => sum + r.picks.filter(p => p.is_keeper).length, 0)
        : null

    return (
        <Scene>
            {/* Background layers */}
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
                background: 'linear-gradient(90deg, rgba(0,0,0,0.55), transparent 18%, transparent 82%, rgba(0,0,0,0.55))',
                zIndex: 20
            }} />
            <div style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(ellipse at 50% 38%, rgba(255,200,140,0.08), transparent 50%)',
                zIndex: 21
            }} />
            <div style={{
                position: 'absolute', top: 0, bottom: 0, left: '72%', width: 2,
                background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.4) 20%, rgba(0,0,0,0.4) 80%, transparent)',
                zIndex: 22
            }} />
            {Array.from({ length: 12 }, (_, i) => (
                <div key={i} className="placard-rivet"
                    style={{ left: 'calc(72% - 5px)', top: 40 + i * 56, width: 10, height: 10, zIndex: 22, opacity: 0.6 }} />
            ))}
            <div className="stencil-paint" style={{
                position: 'absolute', top: 24, left: 32,
                fontSize: 96, opacity: 0.18, color: '#0a0820', zIndex: 23, letterSpacing: '12px'
            }}>
                ROCKWOOD
            </div>

            <TopNav />

            <Placard
                variant="detached"
                tabs={TAB_LBLS}
                activeTab={TABS.indexOf(tab)}
                onTabChange={i => setTab(TABS[i])}
                title="DRAFT HISTORY"
                subtitle="ROUND-BY-ROUND PICKS & PLAYER SEARCH"
                season={selectedYear}
                onSeasonPrev={onSeasonPrev}
                onSeasonNext={onSeasonNext}
            >
                {/* Stat stamps — shown when board data is loaded */}
                {boardData && numTeams !== null && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
                        <StatStamp label="Teams"   value={numTeams}    caption={`${selectedYear} DRAFT`} />
                        <StatStamp label="Rounds"  value={numRounds}   caption="TOTAL ROUNDS" />
                        <StatStamp label="Keepers" value={totalKeepers} caption="KEPT FROM PREV" />
                    </div>
                )}

                {tab === 'search' ? (
                    <PlayerSearch />
                ) : loading ? (
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#8a8c98', letterSpacing: 0 }}>
                        Loading...
                    </div>
                ) : (
                    <>
                        {tab === 'board'  && boardData && <DraftBoard data={boardData} />}
                        {tab === 'byteam' && teamData  && <DraftByTeam data={teamData} />}
                    </>
                )}
            </Placard>
        </Scene>
    )
}
