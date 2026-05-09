import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchAllTeams } from '../api/teams'
import { getH2H, getRandomH2H } from '../api/matchups'
import { getWeekBoxscores } from '../api/boxscores'
import Scene from '../components/Scene'
import PixelPhoto from '../components/PixelPhoto'
import TopNav from '../components/TopNav'
import Placard from '../components/Placard'
import StatStamp from '../components/StatStamp'

const fmt = (n) =>
    Number(n).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

export default function HeadToHead() {
    const { teamIdA, teamIdB } = useParams()
    const navigate = useNavigate()

    const [teams,    setTeams]    = useState([])
    const [selectA,  setSelectA]  = useState(teamIdA || '')
    const [selectB,  setSelectB]  = useState(teamIdB || '')
    const [h2h,      setH2h]      = useState(null)
    const [loading,  setLoading]  = useState(false)
    const [filter,   setFilter]   = useState('all') // all | regular | playoffs

    const [randomH2H,        setRandomH2H]        = useState(null)
    const [randomLoading,    setRandomLoading]    = useState(true)
    const [randomRefreshing, setRandomRefreshing] = useState(false)

    const [expandedGame,    setExpandedGame]    = useState(null)
    const [boxScoreCache,   setBoxScoreCache]   = useState({})
    const [boxScoreLoading, setBoxScoreLoading] = useState(false)

    const handleGameClick = async (game) => {
        if (game.season < 2018) return
        const key = `${game.season}-${game.week}`
        if (expandedGame === key) {
            setExpandedGame(null)
            return
        }
        setExpandedGame(key)
        if (boxScoreCache[key]) return
        setBoxScoreLoading(true)
        try {
            const data = await getWeekBoxscores(game.season, game.week)
            const filtered = {
                ...data,
                teams: data.teams.filter(t =>
                    t.team_id === teamA?.team_id || t.team_id === teamB?.team_id
                )
            }
            setBoxScoreCache(prev => ({ ...prev, [key]: filtered }))
        } catch {
            // box score not available
        } finally {
            setBoxScoreLoading(false)
        }
    }

    useEffect(() => {
        getRandomH2H()
            .then(setRandomH2H)
            .finally(() => setRandomLoading(false))
    }, [])

    const handleRefreshRandom = async () => {
        setRandomRefreshing(true)
        try {
            const data = await getRandomH2H()
            setRandomH2H(data)
        } finally {
            setRandomRefreshing(false)
        }
    }

    useEffect(() => {
        fetchAllTeams().then(setTeams)
    }, [])

    useEffect(() => {
        if (!teamIdA || !teamIdB) return
        setSelectA(teamIdA)
        setSelectB(teamIdB)
        setLoading(true)
        getH2H(teamIdA, teamIdB)
            .then(setH2h)
            .finally(() => setLoading(false))
    }, [teamIdA, teamIdB])

    const handleGo = () => {
        if (selectA && selectB && selectA !== selectB) {
            navigate(`/h2h/${selectA}/${selectB}`)
        }
    }

    const games = h2h?.games?.filter(g => {
        if (filter === 'regular')  return !g.is_playoffs
        if (filter === 'playoffs') return g.is_playoffs
        return true
    }) || []

    const teamA = teams.find(t => String(t.team_id) === String(selectA))
    const teamB = teams.find(t => String(t.team_id) === String(selectB))

    const aWins = games.filter(g => g.winner === 'A').length
    const bWins = games.filter(g => g.winner === 'B').length
    const ties  = games.filter(g => g.winner === 'TIE').length

    const placardTitle = h2h
        ? `${teamA?.owner?.toUpperCase() ?? '?'} vs ${teamB?.owner?.toUpperCase() ?? '?'}`
        : 'HEAD TO HEAD'
    const placardSubtitle = h2h
        ? `${h2h.games?.length ?? 0} GAMES ALL TIME`
        : 'ALL-TIME MATCHUP RECORDS'

    const selectStyle = {
        background: '#1a1c26',
        border: '2px solid #3a3d4a',
        color: '#f4eedd',
        padding: '6px 10px',
        fontFamily: 'Inter, sans-serif',
        fontSize: 12,
        letterSpacing: 0,
        cursor: 'pointer',
        flex: 1,
        minWidth: '140px',
    }

    const pixelBtn = (active) => ({
        fontFamily: 'Inter, sans-serif', fontSize: 12, letterSpacing: 0,
        padding: '5px 12px',
        background: active ? 'var(--amber)' : '#1a1c26',
        color: active ? '#1a1c26' : '#8a8c98',
        border: `2px solid ${active ? 'var(--amber)' : '#3a3d4a'}`,
        cursor: 'pointer',
    })

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
                title={placardTitle}
                subtitle={placardSubtitle}
            >
                {/* Owner selector */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 18 }}>
                    <select value={selectA} onChange={e => setSelectA(e.target.value)} style={selectStyle}>
                        <option value="">Owner A...</option>
                        {teams.map(t => (
                            <option key={t.team_id} value={String(t.team_id)}>{t.owner}</option>
                        ))}
                    </select>

                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, letterSpacing: 3, color: '#8a8c98', flexShrink: 0 }}>
                        VS
                    </span>

                    <select value={selectB} onChange={e => setSelectB(e.target.value)} style={selectStyle}>
                        <option value="">Owner B...</option>
                        {teams.map(t => (
                            <option key={t.team_id} value={String(t.team_id)}>{t.owner}</option>
                        ))}
                    </select>

                    <button
                        onClick={handleGo}
                        disabled={!selectA || !selectB || selectA === selectB}
                        style={{
                            ...pixelBtn(true),
                            opacity: (!selectA || !selectB || selectA === selectB) ? 0.4 : 1,
                            cursor: (!selectA || !selectB || selectA === selectB) ? 'not-allowed' : 'pointer',
                            flexShrink: 0,
                        }}
                    >
                        GO
                    </button>
                </div>

                {/* Featured rivalry — only when no matchup loaded */}
                {!h2h && !loading && (
                    <div style={{ marginBottom: 8 }}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, letterSpacing: 3, color: 'var(--amber)' }}>
                                ✦ FEATURED RIVALRY
                            </div>
                            <button
                                onClick={handleRefreshRandom}
                                disabled={randomRefreshing || randomLoading}
                                style={{
                                    ...pixelBtn(false),
                                    color: randomRefreshing ? '#8a8c98' : 'var(--amber)',
                                    borderColor: randomRefreshing ? '#3a3d4a' : 'var(--amber)',
                                    opacity: randomRefreshing ? 0.6 : 1,
                                    cursor: randomRefreshing ? 'wait' : 'pointer',
                                }}
                            >
                                {randomRefreshing ? '...' : '↻ NEW'}
                            </button>
                        </div>

                        {randomLoading ? (
                            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#8a8c98', letterSpacing: 0, padding: '12px 0' }}>
                                Loading...
                            </div>
                        ) : randomH2H ? (
                            <>
                                {/* Matchup header */}
                                <div style={{
                                    display: 'grid', gridTemplateColumns: '1fr auto 1fr',
                                    alignItems: 'center', gap: 16, marginBottom: 12,
                                }}>
                                    <div>
                                        <div style={{
                                            fontFamily: 'var(--f-display)', fontSize: '1.3rem',
                                            letterSpacing: '0.04em',
                                            color: randomH2H.summary.team_a_wins > randomH2H.summary.team_b_wins
                                                ? 'var(--color-win)' : '#f4eedd',
                                        }}>
                                            {randomH2H.team_a.owner.toUpperCase()}
                                        </div>
                                        <div style={{
                                            fontFamily: 'var(--f-display)', fontSize: '2.8rem', lineHeight: 1,
                                            color: randomH2H.summary.team_a_wins > randomH2H.summary.team_b_wins
                                                ? 'var(--color-win)' : '#f4eedd',
                                        }}>
                                            {randomH2H.summary.team_a_wins}
                                        </div>
                                    </div>

                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, letterSpacing: 0, color: '#8a8c98' }}>
                                            {randomH2H.summary.total_games} GAMES
                                        </div>
                                        {randomH2H.summary.ties > 0 && (
                                            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#8a8c98', marginTop: 3 }}>
                                                {randomH2H.summary.ties} TIE{randomH2H.summary.ties !== 1 ? 'S' : ''}
                                            </div>
                                        )}
                                        {randomH2H.summary.playoff_games > 0 && (
                                            <div style={{ marginTop: 5 }}>
                                                <span className="badge-tag gold">
                                                    {randomH2H.summary.playoff_games} PO
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{
                                            fontFamily: 'var(--f-display)', fontSize: '1.3rem',
                                            letterSpacing: '0.04em',
                                            color: randomH2H.summary.team_b_wins > randomH2H.summary.team_a_wins
                                                ? 'var(--color-win)' : '#f4eedd',
                                        }}>
                                            {randomH2H.team_b.owner.toUpperCase()}
                                        </div>
                                        <div style={{
                                            fontFamily: 'var(--f-display)', fontSize: '2.8rem', lineHeight: 1,
                                            color: randomH2H.summary.team_b_wins > randomH2H.summary.team_a_wins
                                                ? 'var(--color-win)' : '#f4eedd',
                                            textAlign: 'right',
                                        }}>
                                            {randomH2H.summary.team_b_wins}
                                        </div>
                                    </div>
                                </div>

                                {/* Avg scores */}
                                <div style={{
                                    display: 'flex', justifyContent: 'space-between',
                                    fontFamily: 'Inter, sans-serif', fontSize: 13, letterSpacing: 0,
                                    color: '#8a8c98', marginBottom: 12,
                                    paddingBottom: 12, borderBottom: '1px solid #2a2d3e',
                                }}>
                                    <span>AVG <span style={{ color: '#f4eedd' }}>{randomH2H.summary.team_a_avg.toFixed(1)}</span></span>
                                    <span>PTS PER GAME</span>
                                    <span>AVG <span style={{ color: '#f4eedd' }}>{randomH2H.summary.team_b_avg.toFixed(1)}</span></span>
                                </div>

                                {/* Highlights */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {[
                                        {
                                            lbl: 'BIGGEST BLOWOUT',
                                            d: randomH2H.highlights.biggest_margin,
                                            render: (d) => (
                                                <>
                                                    <span style={{ color: 'var(--color-win)' }}>{d.winner}</span>
                                                    {' won by '}
                                                    <span style={{ color: 'var(--amber)' }}>{d.margin.toFixed(1)} pts</span>
                                                    {` · ${d.winner_score.toFixed(1)}–${d.loser_score.toFixed(1)} · ${d.season} W${d.week}`}
                                                    {d.is_playoffs && <span className="badge-tag gold" style={{ marginLeft: 6 }}>PO</span>}
                                                </>
                                            ),
                                        },
                                        {
                                            lbl: 'CLOSEST GAME',
                                            d: randomH2H.highlights.closest_game,
                                            render: (d) => (
                                                <>
                                                    <span style={{ color: 'var(--color-win)' }}>{d.winner}</span>
                                                    {' won by '}
                                                    <span style={{ color: 'var(--amber)' }}>{d.margin.toFixed(1)} pts</span>
                                                    {` · ${d.winner_score.toFixed(1)}–${d.loser_score.toFixed(1)} · ${d.season} W${d.week}`}
                                                    {d.is_playoffs && <span className="badge-tag gold" style={{ marginLeft: 6 }}>PO</span>}
                                                </>
                                            ),
                                        },
                                    ].map(({ lbl, d, render }) => (
                                        <div key={lbl} style={{
                                            background: '#0e0d1a', border: '1px solid #2a2d3e', padding: '8px 10px',
                                        }}>
                                            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, letterSpacing: 0, color: '#8a8c98', marginBottom: 4 }}>
                                                {lbl}
                                            </div>
                                            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#c8c4b4', lineHeight: 1.6 }}>
                                                {render(d)}
                                            </div>
                                        </div>
                                    ))}

                                    {/* Best games — 2 col */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                                        {[
                                            { label: randomH2H.team_a.owner, data: randomH2H.highlights.team_a_best },
                                            { label: randomH2H.team_b.owner, data: randomH2H.highlights.team_b_best },
                                        ].map(({ label, data }) => (
                                            <div key={label} style={{
                                                background: '#0e0d1a', border: '1px solid #2a2d3e', padding: '8px 10px',
                                            }}>
                                                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, letterSpacing: 0, color: '#8a8c98', marginBottom: 4 }}>
                                                    {label.toUpperCase()}'S BEST
                                                </div>
                                                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, lineHeight: 1.6 }}>
                                                    <span style={{ color: 'var(--color-win)' }}>{data.score.toFixed(1)} pts</span>
                                                    <span style={{ color: '#8a8c98' }}> · {data.season} W{data.week}</span>
                                                    {data.is_playoffs && <span className="badge-tag gold" style={{ marginLeft: 6 }}>PO</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* CTA */}
                                <button
                                    onClick={() => {
                                        setSelectA(String(randomH2H.team_a.team_id))
                                        setSelectB(String(randomH2H.team_b.team_id))
                                        navigate(`/h2h/${randomH2H.team_a.team_id}/${randomH2H.team_b.team_id}`)
                                    }}
                                    style={{
                                        marginTop: 12, width: '100%',
                                        background: 'transparent',
                                        border: '2px solid #3a3d4a',
                                        color: '#8a8c98',
                                        fontFamily: 'Inter, sans-serif', fontSize: 13, letterSpacing: 0,
                                        padding: '8px', cursor: 'pointer',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--amber)'; e.currentTarget.style.color = 'var(--amber)' }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#3a3d4a'; e.currentTarget.style.color = '#8a8c98' }}
                                >
                                    VIEW FULL MATCHUP →
                                </button>
                            </>
                        ) : null}
                    </div>
                )}

                {loading && (
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#8a8c98', letterSpacing: 0, padding: '12px 0' }}>
                        Loading...
                    </div>
                )}

                {h2h && !loading && (
                    <>
                        {/* Stat stamps */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
                            <StatStamp
                                label={teamA?.owner ?? 'A'}
                                value={aWins}
                                caption="WINS"
                            />
                            <StatStamp
                                label={teamB?.owner ?? 'B'}
                                value={bWins}
                                caption="WINS"
                            />
                            <StatStamp
                                label="Total"
                                value={games.length}
                                caption="GAMES"
                            />
                            <StatStamp
                                label="Playoff"
                                value={games.filter(g => g.is_playoffs).length}
                                caption="GAMES"
                            />
                        </div>

                        {/* Filter + game log */}
                        <div style={{ display: 'flex', gap: 6, marginBottom: 10, alignItems: 'center' }}>
                            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, letterSpacing: 0, color: '#8a8c98', marginRight: 2 }}>
                                FILTER
                            </span>
                            {[
                                { key: 'all',      label: 'ALL' },
                                { key: 'regular',  label: 'REG' },
                                { key: 'playoffs', label: 'POST' },
                            ].map(f => (
                                <button
                                    key={f.key}
                                    onClick={() => setFilter(f.key)}
                                    style={pixelBtn(filter === f.key)}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        <div className="table-wrap">
                            <table className="standings">
                                <thead>
                                    <tr>
                                        <th>Season</th>
                                        <th>Wk</th>
                                        <th style={{ textAlign: 'right' }}>{teamA?.owner}</th>
                                        <th style={{ textAlign: 'center' }}>vs</th>
                                        <th>{teamB?.owner}</th>
                                        <th>Margin</th>
                                        <th>Type</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {games.map((g, i) => {
                                        const aWon   = g.winner === 'A'
                                        const bWon   = g.winner === 'B'
                                        const key    = `${g.season}-${g.week}`
                                        const isOpen = expandedGame === key
                                        const hasBox = g.season >= 2018
                                        const cached = boxScoreCache[key]

                                        return (
                                            <>
                                                <tr
                                                    key={i}
                                                    onClick={() => handleGameClick(g)}
                                                    style={{
                                                        cursor: hasBox ? 'pointer' : 'default',
                                                        background: isOpen ? 'rgba(232,184,75,0.05)' : undefined,
                                                    }}
                                                    onMouseEnter={e => { if (hasBox) e.currentTarget.style.background = 'rgba(42,45,62,0.5)' }}
                                                    onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = '' }}
                                                >
                                                    <td className="num">{g.season}</td>
                                                    <td className="num" style={{ color: '#8a8c98' }}>W{g.week}</td>
                                                    <td className="num" style={{
                                                        textAlign: 'right',
                                                        fontWeight: aWon ? 700 : 400,
                                                        color: aWon ? 'var(--color-win)' : bWon ? 'var(--color-loss)' : '#c8c4b4',
                                                    }}>
                                                        {fmt(g.team_a_score)}
                                                    </td>
                                                    <td style={{ textAlign: 'center', color: '#8a8c98', fontSize: '0.8em' }}>—</td>
                                                    <td className="num" style={{
                                                        fontWeight: bWon ? 700 : 400,
                                                        color: bWon ? 'var(--color-win)' : aWon ? 'var(--color-loss)' : '#c8c4b4',
                                                    }}>
                                                        {fmt(g.team_b_score)}
                                                    </td>
                                                    <td className="num" style={{ color: '#8a8c98' }}>{fmt(g.margin)}</td>
                                                    <td className="num">
                                                        {g.is_playoffs
                                                            ? <span className="badge-tag gold">PO</span>
                                                            : <span style={{ color: '#8a8c98', fontSize: '0.8em' }}>Reg</span>}
                                                    </td>
                                                    <td className="num" style={{ color: '#8a8c98', fontSize: '0.75em' }}>
                                                        {hasBox ? (isOpen ? '▲' : '▼') : ''}
                                                    </td>
                                                </tr>

                                                {/* Expanded box score */}
                                                {isOpen && (
                                                    <tr key={`${i}-box`}>
                                                        <td colSpan={8} style={{ padding: 0, background: '#0a0820' }}>
                                                            {boxScoreLoading && !cached ? (
                                                                <div style={{
                                                                    padding: '12px 16px',
                                                                    fontFamily: 'Inter, sans-serif',
                                                                    color: '#8a8c98',
                                                                    fontSize: 12, letterSpacing: 0,
                                                                }}>
                                                                    Loading box score...
                                                                </div>
                                                            ) : cached ? (
                                                                <div style={{
                                                                    display: 'grid',
                                                                    gridTemplateColumns: '1fr 1fr',
                                                                    gap: '1px',
                                                                    background: '#2a2d3e',
                                                                }}>
                                                                    {cached.teams.map(team => (
                                                                        <div key={team.owner} style={{
                                                                            background: '#0e0d1a',
                                                                            padding: '10px 14px',
                                                                        }}>
                                                                            <div style={{
                                                                                fontFamily: 'Inter, sans-serif',
                                                                                fontSize: 12,
                                                                                letterSpacing: 2,
                                                                                color: 'var(--amber)',
                                                                                marginBottom: 8,
                                                                                textTransform: 'uppercase',
                                                                            }}>
                                                                                {team.owner}
                                                                            </div>
                                                                            <table style={{ width: '100%', fontSize: '0.78rem' }}>
                                                                                <thead>
                                                                                    <tr>
                                                                                        {['Player', 'Pos', 'Pts'].map((h, hi) => (
                                                                                            <th key={h} style={{
                                                                                                textAlign: hi === 2 ? 'right' : 'left',
                                                                                                padding: '2px 4px',
                                                                                                color: '#8a8c98',
                                                                                                fontFamily: 'Inter, sans-serif',
                                                                                                fontSize: 12,
                                                                                                letterSpacing: 0,
                                                                                                textTransform: 'uppercase',
                                                                                                borderBottom: '1px solid #2a2d3e',
                                                                                                fontWeight: 400,
                                                                                            }}>
                                                                                                {h}
                                                                                            </th>
                                                                                        ))}
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody>
                                                                                    {team.players
                                                                                        .sort((a, b) => b.points_scored - a.points_scored)
                                                                                        .map((p, pi) => (
                                                                                            <tr key={pi} style={{ opacity: p.is_starter ? 1 : 0.5 }}>
                                                                                                <td style={{
                                                                                                    padding: '2px 4px',
                                                                                                    color: '#c8c4b4',
                                                                                                    fontFamily: 'Inter, sans-serif',
                                                                                                    fontSize: 12,
                                                                                                    fontWeight: p.is_starter ? 600 : 400,
                                                                                                }}>
                                                                                                    {p.player_name}
                                                                                                </td>
                                                                                                <td style={{
                                                                                                    padding: '2px 4px',
                                                                                                    color: '#8a8c98',
                                                                                                    fontFamily: 'Inter, sans-serif',
                                                                                                    fontSize: 12,
                                                                                                }}>
                                                                                                    {p.position}
                                                                                                </td>
                                                                                                <td style={{
                                                                                                    padding: '2px 4px',
                                                                                                    textAlign: 'right',
                                                                                                    fontFamily: 'Inter, sans-serif',
                                                                                                    fontSize: 12,
                                                                                                    color: p.points_scored >= 20
                                                                                                        ? 'var(--color-win)'
                                                                                                        : p.points_scored <= 5
                                                                                                        ? 'var(--color-loss)'
                                                                                                        : '#c8c4b4',
                                                                                                    fontWeight: p.is_starter ? 600 : 400,
                                                                                                }}>
                                                                                                    {Number(p.points_scored).toFixed(1)}
                                                                                                </td>
                                                                                            </tr>
                                                                                        ))}
                                                                                </tbody>
                                                                            </table>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div style={{
                                                                    padding: '10px 14px',
                                                                    fontFamily: 'Inter, sans-serif',
                                                                    color: '#8a8c98',
                                                                    fontSize: 12, letterSpacing: 0,
                                                                }}>
                                                                    Box score not available for this week.
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                )}
                                            </>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </Placard>
        </Scene>
    )
}
