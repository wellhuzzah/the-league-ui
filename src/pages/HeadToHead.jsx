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

    const allH2hGames = h2h?.games || []
    const blowout  = allH2hGames.length ? allH2hGames.reduce((a, b) => b.margin       > a.margin       ? b : a) : null
    const closestG = allH2hGames.length ? allH2hGames.reduce((a, b) => b.margin       < a.margin       ? b : a) : null
    const aBestG   = allH2hGames.length ? allH2hGames.reduce((a, b) => b.team_a_score > a.team_a_score ? b : a) : null
    const bBestG   = allH2hGames.length ? allH2hGames.reduce((a, b) => b.team_b_score > a.team_b_score ? b : a) : null

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
                background: 'radial-gradient(ellipse at 50% 38%, rgba(255,200,140,0.08), transparent 50%)',
                zIndex: 21
            }} />
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

                {/* Rando rivalry — only when no matchup loaded */}
                {!h2h && !loading && (
                    <div style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, letterSpacing: 3, color: 'var(--amber)' }}>
                                ✦ RANDO RIVALRY
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
                            <div style={{ maxWidth: 520, margin: '0 auto' }}>
                                {/* Wins header */}
                                <div style={{
                                    display: 'grid', gridTemplateColumns: '1fr auto 1fr',
                                    alignItems: 'center', gap: 16, marginBottom: 12,
                                }}>
                                    <div>
                                        <div style={{
                                            fontFamily: 'var(--f-display)', fontSize: '1.3rem', letterSpacing: '0.04em',
                                            color: randomH2H.summary.team_a_wins > randomH2H.summary.team_b_wins ? 'var(--color-win)' : '#f4eedd',
                                        }}>
                                            {randomH2H.team_a.owner.toUpperCase()}
                                        </div>
                                        <div style={{
                                            fontFamily: 'Inter, sans-serif', fontSize: '2.8rem', lineHeight: 1,
                                            color: randomH2H.summary.team_a_wins > randomH2H.summary.team_b_wins ? 'var(--color-win)' : '#f4eedd',
                                        }}>
                                            {randomH2H.summary.team_a_wins}
                                        </div>
                                    </div>

                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, letterSpacing: 0, color: '#a8b8cc' }}>
                                            {randomH2H.summary.total_games} GAMES
                                        </div>
                                        {randomH2H.summary.ties > 0 && (
                                            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#a8b8cc', marginTop: 3 }}>
                                                {randomH2H.summary.ties} TIE{randomH2H.summary.ties !== 1 ? 'S' : ''}
                                            </div>
                                        )}
                                        {randomH2H.summary.playoff_games > 0 && (
                                            <div style={{ marginTop: 5 }}>
                                                <span className="badge-tag gold">
                                                    {randomH2H.summary.playoff_games} PLAYOFF{randomH2H.summary.playoff_games !== 1 ? 'S' : ''}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{
                                            fontFamily: 'var(--f-display)', fontSize: '1.3rem', letterSpacing: '0.04em',
                                            color: randomH2H.summary.team_b_wins > randomH2H.summary.team_a_wins ? 'var(--color-win)' : '#f4eedd',
                                        }}>
                                            {randomH2H.team_b.owner.toUpperCase()}
                                        </div>
                                        <div style={{
                                            fontFamily: 'Inter, sans-serif', fontSize: '2.8rem', lineHeight: 1,
                                            color: randomH2H.summary.team_b_wins > randomH2H.summary.team_a_wins ? 'var(--color-win)' : '#f4eedd',
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
                                    color: '#a8b8cc', marginBottom: 12,
                                    paddingBottom: 12, borderBottom: '1px solid #2a2d3e',
                                }}>
                                    <span>AVG <span style={{ color: '#f4eedd' }}>{randomH2H.summary.team_a_avg.toFixed(1)}</span></span>
                                    <span>PTS PER GAME</span>
                                    <span>AVG <span style={{ color: '#f4eedd' }}>{randomH2H.summary.team_b_avg.toFixed(1)}</span></span>
                                </div>

                                {/* Highlight stamps */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                                    <StatStamp
                                        label="BLOWOUT"
                                        value={randomH2H.highlights.biggest_margin.margin.toFixed(1)}
                                        caption={`${randomH2H.highlights.biggest_margin.winner} · ${randomH2H.highlights.biggest_margin.season} W${randomH2H.highlights.biggest_margin.week}`}
                                    />
                                    <StatStamp
                                        label="CLOSEST"
                                        value={randomH2H.highlights.closest_game.margin.toFixed(1)}
                                        caption={`${randomH2H.highlights.closest_game.winner} · ${randomH2H.highlights.closest_game.season} W${randomH2H.highlights.closest_game.week}`}
                                    />
                                    <StatStamp
                                        label={`${randomH2H.team_a.owner.toUpperCase()} BEST`}
                                        value={randomH2H.highlights.team_a_best.score.toFixed(1)}
                                        caption={`${randomH2H.highlights.team_a_best.season} W${randomH2H.highlights.team_a_best.week}${randomH2H.highlights.team_a_best.is_playoffs ? ' · PO' : ''}`}
                                    />
                                    <StatStamp
                                        label={`${randomH2H.team_b.owner.toUpperCase()} BEST`}
                                        value={randomH2H.highlights.team_b_best.score.toFixed(1)}
                                        caption={`${randomH2H.highlights.team_b_best.season} W${randomH2H.highlights.team_b_best.week}${randomH2H.highlights.team_b_best.is_playoffs ? ' · PO' : ''}`}
                                    />
                                </div>

                                {/* CTA */}
                                <button
                                    onClick={() => {
                                        setSelectA(String(randomH2H.team_a.team_id))
                                        setSelectB(String(randomH2H.team_b.team_id))
                                        navigate(`/h2h/${randomH2H.team_a.team_id}/${randomH2H.team_b.team_id}`)
                                    }}
                                    style={{
                                        width: '100%',
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
                            </div>
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
                        {/* Wins header */}
                        <div style={{
                            display: 'grid', gridTemplateColumns: '1fr auto 1fr',
                            alignItems: 'center', gap: 16,
                            maxWidth: 520, margin: '0 auto 12px',
                        }}>
                            <div>
                                <div style={{
                                    fontFamily: 'var(--f-display)', fontSize: '1.3rem', letterSpacing: '0.04em',
                                    color: h2h.team_a_wins > h2h.team_b_wins ? 'var(--color-win)' : '#f4eedd',
                                }}>
                                    {teamA?.owner?.toUpperCase()}
                                </div>
                                <div style={{
                                    fontFamily: 'Inter, sans-serif', fontSize: '2.8rem', lineHeight: 1,
                                    color: h2h.team_a_wins > h2h.team_b_wins ? 'var(--color-win)' : '#f4eedd',
                                }}>
                                    {h2h.team_a_wins}
                                </div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, letterSpacing: 0, color: '#a8b8cc' }}>
                                    {h2h.total_games} GAMES
                                </div>
                                {h2h.ties > 0 && (
                                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#a8b8cc', marginTop: 3 }}>
                                        {h2h.ties} TIE{h2h.ties !== 1 ? 'S' : ''}
                                    </div>
                                )}
                                {h2h.playoff_games > 0 && (
                                    <div style={{ marginTop: 5 }}>
                                        <span className="badge-tag gold">
                                            {h2h.playoff_games} PLAYOFF{h2h.playoff_games !== 1 ? 'S' : ''}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{
                                    fontFamily: 'var(--f-display)', fontSize: '1.3rem', letterSpacing: '0.04em',
                                    color: h2h.team_b_wins > h2h.team_a_wins ? 'var(--color-win)' : '#f4eedd',
                                }}>
                                    {teamB?.owner?.toUpperCase()}
                                </div>
                                <div style={{
                                    fontFamily: 'Inter, sans-serif', fontSize: '2.8rem', lineHeight: 1,
                                    color: h2h.team_b_wins > h2h.team_a_wins ? 'var(--color-win)' : '#f4eedd',
                                    textAlign: 'right',
                                }}>
                                    {h2h.team_b_wins}
                                </div>
                            </div>
                        </div>

                        {/* Highlight stamps */}
                        {blowout && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, maxWidth: 520, margin: '0 auto 16px' }}>
                                <StatStamp
                                    label="BLOWOUT"
                                    value={fmt(blowout.margin)}
                                    caption={`${blowout.winner === 'A' ? teamA?.owner : teamB?.owner} · ${blowout.season} W${blowout.week}`}
                                />
                                <StatStamp
                                    label="CLOSEST"
                                    value={fmt(closestG.margin)}
                                    caption={`${closestG.winner === 'A' ? teamA?.owner : teamB?.owner} · ${closestG.season} W${closestG.week}`}
                                />
                                <StatStamp
                                    label={`${teamA?.owner?.toUpperCase() || 'A'} BEST`}
                                    value={fmt(aBestG.team_a_score)}
                                    caption={`${aBestG.season} W${aBestG.week}${aBestG.is_playoffs ? ' · PO' : ''}`}
                                />
                                <StatStamp
                                    label={`${teamB?.owner?.toUpperCase() || 'B'} BEST`}
                                    value={fmt(bBestG.team_b_score)}
                                    caption={`${bBestG.season} W${bBestG.week}${bBestG.is_playoffs ? ' · PO' : ''}`}
                                />
                            </div>
                        )}

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
