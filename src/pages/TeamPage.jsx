import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchAllTeams, fetchTeam } from '../api/teams'
import { getTeamBestWeeks, getTeamPositionTotals } from '../api/boxscores'
import Scene from '../components/Scene'
import PixelPhoto from '../components/PixelPhoto'
import TopNav from '../components/TopNav'
import Placard from '../components/Placard'
import StatStamp from '../components/StatStamp'

// ── Helpers ──────────────────────────────────────────────────────────────────

function WinPct({ wins, losses }) {
    const pct = wins + losses > 0
        ? (wins / (wins + losses)).toFixed(3).replace(/^0/, '')
        : '.000'
    return <span>{pct}</span>
}

function SceneBg() {
    return (
        <>
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
                background: 'linear-gradient(90deg, rgba(0,0,0,0.2) 0%, transparent 4%, transparent 82%, rgba(0,0,0,0.55) 100%)',
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
                <div
                    key={i}
                    className="placard-rivet"
                    style={{ left: 'calc(72% - 5px)', top: 40 + i * 56, width: 10, height: 10, zIndex: 22, opacity: 0.6 }}
                />
            ))}
            <div className="stencil-paint" style={{
                position: 'absolute', top: 24, left: 32,
                fontSize: 96, opacity: 0.18, color: '#0a0820', zIndex: 23, letterSpacing: '12px'
            }}>
                ROCKWOOD
            </div>
        </>
    )
}

// ── Left panel — scrollable owner list ───────────────────────────────────────

const SORT_OPTIONS = [
    { key: 'win_pct',          label: 'WIN%' },
    { key: 'total_wins',       label: 'W' },
    { key: 'ppg',              label: 'PPG' },
    { key: 'total_points_for', label: 'PF' },
    { key: 'championships',    label: 'TTLS' },
    { key: 'seasons_played',   label: 'SZN' },
    { key: 'owner',            label: 'A–Z' },
]

function OwnerPanel({ teams, selectedId, loading }) {
    const navigate = useNavigate()
    const [sortKey, setSortKey] = useState('win_pct')
    const [sortDir, setSortDir] = useState('desc')

    const handleSort = (key) => {
        setSortDir(prev => key === sortKey ? (prev === 'desc' ? 'asc' : 'desc') : 'desc')
        setSortKey(key)
    }

    const sorted = [...teams].sort((a, b) => {
        const av = a[sortKey], bv = b[sortKey]
        if (av === null || av === undefined) return 1
        if (bv === null || bv === undefined) return -1
        const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv
        return sortDir === 'asc' ? cmp : -cmp
    })

    return (
        <div style={{
            position: 'absolute', left: 56, top: 72, bottom: 20, width: 300,
            overflowY: 'auto', zIndex: 50,
            background: 'rgba(10,9,25,0.72)',
            borderRight: '1px solid #2a2d3e',
        }}>
            {/* Sort strip */}
            <div style={{
                padding: '6px 8px 5px',
                borderBottom: '1px solid #2a2d3e',
                display: 'flex', flexWrap: 'wrap', gap: 3,
            }}>
                {SORT_OPTIONS.map(opt => (
                    <button
                        key={opt.key}
                        onClick={() => handleSort(opt.key)}
                        style={{
                            fontFamily: 'Inter, sans-serif', fontSize: 12, letterSpacing: 1,
                            padding: '3px 6px',
                            background: sortKey === opt.key ? 'var(--amber)' : 'transparent',
                            color: sortKey === opt.key ? '#1a1c26' : '#8a8c98',
                            border: `1px solid ${sortKey === opt.key ? 'var(--amber)' : '#3a3d4a'}`,
                            cursor: 'pointer',
                        }}
                    >
                        {opt.label}
                        {sortKey === opt.key && (
                            <span style={{ marginLeft: 2, fontSize: '0.8em' }}>
                                {sortDir === 'asc' ? '▲' : '▼'}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {loading ? (
                <div style={{ padding: 12, fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#8a8c98', letterSpacing: 0 }}>
                    ...
                </div>
            ) : sorted.map(t => {
                const isSelected = t.team_id === selectedId
                const winPct = t.total_wins + t.total_losses > 0
                    ? (t.total_wins / (t.total_wins + t.total_losses) * 100).toFixed(1)
                    : '0.0'

                return (
                    <div
                        key={t.team_id}
                        onClick={() => navigate(`/teams/${t.team_id}`)}
                        style={{
                            padding: '8px 10px',
                            borderLeft: isSelected ? '3px solid var(--amber)' : '3px solid transparent',
                            background: isSelected ? 'rgba(232,184,75,0.06)' : 'transparent',
                            cursor: 'pointer',
                            borderBottom: '1px solid rgba(42,45,62,0.5)',
                        }}
                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                    >
                        {/* Owner name */}
                        <div style={{
                            fontFamily: 'var(--f-display)', fontSize: '1.1rem',
                            letterSpacing: '0.03em',
                            color: isSelected ? '#f4eedd' : '#c8c4b4',
                            lineHeight: 1.1, marginBottom: 2,
                        }}>
                            {t.owner.toUpperCase()}
                        </div>

                        {/* Seasons */}
                        <div style={{
                            fontFamily: 'Inter, sans-serif', fontSize: 12, letterSpacing: 0,
                            color: '#8a8c98', marginBottom: 5,
                        }}>
                            {t.seasons_played} seasons
                        </div>

                        {/* W/L bar */}
                        <div style={{ height: 3, display: 'flex', overflow: 'hidden', marginBottom: 3 }}>
                            <div style={{ width: `${winPct}%`, background: 'var(--color-win)' }} />
                            <div style={{ flex: 1, background: 'var(--color-loss)', opacity: 0.4 }} />
                        </div>

                        {/* W–L + win% */}
                        <div style={{
                            display: 'flex', justifyContent: 'space-between',
                            fontFamily: 'Inter, sans-serif', fontSize: 12, letterSpacing: 0,
                        }}>
                            <span>
                                <span style={{ color: 'var(--color-win)' }}>{t.total_wins}</span>
                                <span style={{ color: '#8a8c98' }}>–</span>
                                <span style={{ color: 'var(--color-loss)' }}>{t.total_losses}</span>
                            </span>
                            <span style={{ color: '#8a8c98' }}>{winPct}%</span>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

// ── Right panel — team detail content ────────────────────────────────────────

const DETAIL_TABS     = ['seasons', 'h2h', 'boxscores']
const DETAIL_TAB_LBLS = ['Season History', 'Head-to-Head', 'Box Scores']

function TeamDetailPanel({ team, tab }) {
    const [bestWeeks,      setBestWeeks]      = useState([])
    const [positionTotals, setPositionTotals] = useState([])
    const [bsLoading,      setBsLoading]      = useState(false)
    const [bsLoaded,       setBsLoaded]       = useState(false)

    useEffect(() => {
        if (tab !== 'boxscores' || bsLoaded) return
        setBsLoading(true)
        Promise.all([
            getTeamBestWeeks(team.team_id, 20),
            getTeamPositionTotals(team.team_id),
        ]).then(([bw, pt]) => {
            setBestWeeks(bw)
            setPositionTotals(pt)
            setBsLoaded(true)
        }).finally(() => setBsLoading(false))
    }, [tab, bsLoaded, team.team_id])

    const c = team.career

    const formatPts = (n) =>
        Number(n).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

    const winPct = c.total_wins + c.total_losses > 0
        ? (c.total_wins / (c.total_wins + c.total_losses)).toFixed(3).replace(/^0/, '')
        : '.000'

    return (
        <>
            {/* Career stat stamps */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
                <StatStamp label="Wins"       value={c.total_wins} />
                <StatStamp label="Win%"       value={winPct} />
                <StatStamp label="PF"         value={formatPts(c.total_points_for)} />
                <StatStamp label="PPG"        value={formatPts(c.avg_score)} />
                <StatStamp label="Best Wk"    value={formatPts(c.highest_score)} />
                <StatStamp label="Worst Wk"   value={formatPts(c.lowest_score)} />
                <StatStamp label="Titles"     value={c.championships || '—'} />
                <StatStamp label="Avg Finish" value={`#${c.avg_standing}`} />
            </div>

            {/* Season history */}
            {tab === 'seasons' && (
                <div className="table-wrap">
                    <table className="standings">
                        <thead>
                            <tr>
                                <th>Season</th>
                                <th>W</th>
                                <th>L</th>
                                <th>Win%</th>
                                <th>PF</th>
                                <th>PA</th>
                                <th>Finish</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {team.seasons.map(s => (
                                <tr key={s.season}>
                                    <td className="num" style={{ fontWeight: 600 }}>{s.season}</td>
                                    <td className="num" style={{ color: 'var(--color-win)' }}>{s.wins}</td>
                                    <td className="num" style={{ color: 'var(--color-loss)' }}>{s.losses}</td>
                                    <td className="num"><WinPct wins={s.wins} losses={s.losses} /></td>
                                    <td className="num">{formatPts(s.points_for)}</td>
                                    <td className="num" style={{ color: 'var(--color-text-muted)' }}>{formatPts(s.points_against)}</td>
                                    <td className="num">
                                        #{s.final_standing}
                                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8em', marginLeft: '0.25rem' }}>
                                            of {s.teams_in_season}
                                        </span>
                                    </td>
                                    <td className="num">
                                        {s.championship && <span className="badge-tag gold">CHAMP</span>}
                                        {s.sacko && <span className="badge-tag bad">SACKO</span>}
                                        {s.most_points && <span className="badge-tag gold">TOP PF</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* H2H */}
            {tab === 'h2h' && (
                <div className="table-wrap">
                    <table className="standings">
                        <thead>
                            <tr>
                                <th>Opponent</th>
                                <th>W</th>
                                <th>L</th>
                                <th>T</th>
                                <th>Games</th>
                                <th>Avg For</th>
                                <th>Avg Vs</th>
                            </tr>
                        </thead>
                        <tbody>
                            {team.h2h.map(h => (
                                <tr key={h.opp_team_id}>
                                    <td className="team">{h.opponent}</td>
                                    <td className="num" style={{ color: 'var(--color-win)' }}>{h.wins}</td>
                                    <td className="num" style={{ color: 'var(--color-loss)' }}>{h.losses}</td>
                                    <td className="num" style={{ color: 'var(--color-text-muted)' }}>{h.ties || '—'}</td>
                                    <td className="num">{h.total_games}</td>
                                    <td className="num">{formatPts(h.avg_score_for)}</td>
                                    <td className="num" style={{ color: 'var(--color-text-muted)' }}>{formatPts(h.avg_score_against)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Box Scores */}
            {tab === 'boxscores' && (
                bsLoading ? (
                    <div className="loading" style={{ color: '#8a8c98', fontFamily: 'Inter, sans-serif', fontSize: 12 }}>
                        Loading...
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div>
                            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, letterSpacing: 3, color: 'var(--amber)', marginBottom: 6 }}>
                                TOP INDIVIDUAL PERFORMANCES
                            </div>
                            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, letterSpacing: 0, color: '#8a8c98', marginBottom: 10, lineHeight: 1.6 }}>
                                Highest single-week scores on this roster · 2018–2025
                            </p>
                            <div className="table-wrap">
                                <table className="standings">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Player</th>
                                            <th>Pos</th>
                                            <th>Pts</th>
                                            <th>Season</th>
                                            <th>Week</th>
                                            <th>Opp</th>
                                            <th>Type</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {bestWeeks.map((row, i) => (
                                            <tr key={i}>
                                                <td className="rank">{i + 1}</td>
                                                <td className="team">{row.player_name}</td>
                                                <td className="num">
                                                    <span style={{ color: 'var(--color-accent)', fontSize: 12, fontWeight: 700 }}>
                                                        {row.position}
                                                    </span>
                                                </td>
                                                <td className="num" style={{ color: 'var(--color-accent)', fontWeight: 700 }}>
                                                    {Number(row.points_scored).toFixed(1)}
                                                </td>
                                                <td className="num">{row.season}</td>
                                                <td className="num" style={{ color: 'var(--color-text-muted)' }}>W{row.week}</td>
                                                <td className="team" style={{ color: 'var(--color-text-muted)' }}>{row.opponent}</td>
                                                <td className="num">
                                                    {row.is_playoffs
                                                        ? <span className="badge-tag gold">PO</span>
                                                        : <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8em' }}>Reg</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div>
                            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, letterSpacing: 3, color: 'var(--amber)', marginBottom: 6 }}>
                                POINTS BY POSITION PER SEASON
                            </div>
                            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, letterSpacing: 0, color: '#8a8c98', marginBottom: 10, lineHeight: 1.6 }}>
                                Total points scored by each position group · 2018–2025
                            </p>
                            <div className="table-wrap">
                                <table className="standings">
                                    <thead>
                                        <tr>
                                            <th>Season</th>
                                            <th>QB</th>
                                            <th>RB</th>
                                            <th>WR</th>
                                            <th>TE</th>
                                            <th>K</th>
                                            <th>D/ST</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {positionTotals.map(s => {
                                            const byPos = {}
                                            s.positions.forEach(p => { byPos[p.position] = p.total_points })
                                            return (
                                                <tr key={s.season}>
                                                    <td className="num" style={{ fontWeight: 600 }}>{s.season}</td>
                                                    {['QB','RB','WR','TE','K','D/ST'].map(pos => (
                                                        <td key={pos} className="num" style={{ color: byPos[pos] ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
                                                            {byPos[pos] ? Number(byPos[pos]).toFixed(1) : '—'}
                                                        </td>
                                                    ))}
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )
            )}
        </>
    )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function TeamPage() {
    const { teamId } = useParams()
    const [teams,         setTeams]         = useState([])
    const [team,          setTeam]          = useState(null)
    const [listLoading,   setListLoading]   = useState(true)
    const [detailLoading, setDetailLoading] = useState(false)
    const [detailTab,     setDetailTab]     = useState('seasons')

    // Always load the full owner list
    useEffect(() => {
        setListLoading(true)
        fetchAllTeams().then(setTeams).finally(() => setListLoading(false))
    }, [])

    // Load specific team when URL changes
    useEffect(() => {
        if (!teamId) { setTeam(null); setDetailLoading(false); return }
        setDetailTab('seasons')
        setDetailLoading(true)
        fetchTeam(Number(teamId)).then(setTeam).finally(() => setDetailLoading(false))
    }, [teamId])

    const c = team?.career
    const placardTitle    = team ? team.owner.toUpperCase() : 'SELECT A TEAM'
    const placardSubtitle = team && c
        ? `${c.seasons_played} SEASONS · ${c.first_season}–${c.last_season}${c.championships > 0 ? ` · ${c.championships}× CHAMP` : ''}`
        : ''

    return (
        <Scene>
            <SceneBg />
            <TopNav />

            <OwnerPanel
                teams={teams}
                selectedId={teamId ? Number(teamId) : null}
                loading={listLoading}
            />

            <Placard
                variant="diorama"
                style={{ left: 376 }}
                tabs={team ? DETAIL_TAB_LBLS : []}
                activeTab={team ? DETAIL_TABS.indexOf(detailTab) : 0}
                onTabChange={i => setDetailTab(DETAIL_TABS[i])}
                title={placardTitle}
                subtitle={placardSubtitle}
            >
                {detailLoading ? (
                    <div style={{ color: '#8a8c98', fontFamily: 'Inter, sans-serif', fontSize: 12, letterSpacing: 0 }}>
                        Loading...
                    </div>
                ) : team ? (
                    <TeamDetailPanel key={team.team_id} team={team} tab={detailTab} />
                ) : (
                    <div style={{
                        fontFamily: 'Inter, sans-serif', fontSize: 12, letterSpacing: 2,
                        color: '#8a8c98', textAlign: 'center', paddingTop: 48,
                    }}>
                        ← SELECT AN OWNER
                    </div>
                )}
            </Placard>
        </Scene>
    )
}
