import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchAllTeams, fetchTeam } from '../api/teams'
import Scene from '../components/Scene'
import DataBackdrop from '../components/DataBackdrop'
import TopNav from '../components/TopNav'
import Placard from '../components/Placard'
import StatStamp from '../components/StatStamp'
import Badge from '../components/Badge'
import TeamWaivers from '../components/TeamWaivers'
import PosChip from '../components/PosChip'
import TeamChip from '../components/TeamChip'
import PlayerName from '../components/PlayerName'
import { competitionRanks } from '../utils/ranks'
import { useTieFold } from '../utils/tieFold'
import TieFoldLine from '../components/TieFoldLine'
import GameTag from '../components/GameTag'
import { winPct as nflWinPct, pct3 } from '../utils/winPct'

const cx = (...names) => names.filter(Boolean).join(' ')

// ── Left panel — scrollable owner list ───────────────────────────────────────

const SORT_OPTIONS = [
    { key: 'win_pct',          label: 'WIN%' },
    { key: 'total_wins',       label: 'W' },
    { key: 'ppg',              label: 'PPG' },
    { key: 'total_points_for', label: 'PF' },
    { key: 'championships',    label: 'TTLS' },
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

    const getSortValue = (t) => {
        if (sortKey === 'ppg') {
            const games = t.total_wins + t.total_losses
            return games > 0 ? t.total_points_for / games : 0
        }
        return t[sortKey]
    }

    const sorted = [...teams].sort((a, b) => {
        const av = getSortValue(a), bv = getSortValue(b)
        if (av === null || av === undefined) return 1
        if (bv === null || bv === undefined) return -1
        const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv
        return sortDir === 'asc' ? cmp : -cmp
    })

    const getDisplayStat = (t) => {
        switch (sortKey) {
            case 'win_pct':          return `${(t.win_pct * 100).toFixed(1)}%`
            case 'total_wins':       return `${t.total_wins}W`
            case 'ppg': {
                const games = t.total_wins + t.total_losses
                return games > 0 ? (t.total_points_for / games).toFixed(1) : '—'
            }
            case 'total_points_for': return t.total_points_for?.toFixed(0) ?? '—'
            case 'championships':    return t.championships > 0 ? `${t.championships}×🏆` : '—'
            case 'sackos':           return t.sackos > 0 ? `${t.sackos}×💩` : '—'
            case 'owner':            return `${(t.win_pct * 100).toFixed(1)}%`
            default:                 return `${(t.win_pct * 100).toFixed(1)}%`
        }
    }

    return (
        <div className="rw-roster" style={{
            position: 'absolute', left: 40, top: 72, bottom: 20, width: 316,
            overflowY: 'auto', zIndex: 50,
        }}>
            <div className="head">
                <h2 className="rw-label">Roster</h2>
                <div className="rw-seg" role="group" aria-label="Sort owners">
                    {SORT_OPTIONS.map(opt => (
                        <button key={opt.key} type="button" onClick={() => handleSort(opt.key)} className={sortKey === opt.key ? 'on' : undefined} aria-pressed={sortKey === opt.key}>
                            {opt.label}
                            {sortKey === opt.key && <span style={{ marginLeft: 2, fontSize: '0.8em' }}>{sortDir === 'asc' ? '▲' : '▼'}</span>}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="rw-loading" style={{ padding: 12 }}>...</div>
            ) : sorted.map((t, idx) => {
                const isSelected = t.team_id === selectedId
                const winPct = (t.win_pct * 100).toFixed(1)
                const isGoat = t.team_id === 14

                return (
                    <button
                        key={t.team_id}
                        type="button"
                        className={cx('rw-roster-row', isSelected && 'on')}
                        aria-current={isSelected ? 'page' : undefined}
                        onClick={() => navigate(`/teams/${t.team_id}`)}
                    >
                        <span className="r">#{idx + 1}</span>
                        <span className="n">{t.owner}{isGoat && <Badge type="goat" />}</span>
                        <span className="v">{getDisplayStat(t)}</span>
                        <span className="s">
                            {t.seasons_played} seasons ·{' '}
                            <span className="rw-plus">{t.total_wins}</span>–{t.total_losses}
                        </span>
                        <span className="bar" aria-hidden="true"><i style={{ width: `${winPct}%` }} /></span>
                    </button>
                )
            })}
        </div>
    )
}

// ── Right panel — team detail content ────────────────────────────────────────

const DETAIL_TABS     = ['seasons', 'h2h', 'boxscores', 'waivers']
const DETAIL_TAB_LBLS = ['Season History', 'Head-to-Head', 'Box Scores', 'Waivers']

function TeamDetailPanel({ team, tab }) {
    const [bestWeeks,      setBestWeeks]      = useState([])
    const bestWeekFold  = useTieFold(bestWeeks, 20)    // top 20; 3+ tied at the cutoff fold
    const bestWeekRows  = bestWeekFold.shown(bestWeeks)
    const bestWeekRanks = competitionRanks(bestWeekRows, r => r.points_scored)
    const [positionTotals, setPositionTotals] = useState([])
    const [bsLoading,      setBsLoading]      = useState(false)
    const [bsLoaded,       setBsLoaded]       = useState(false)

    // Best weeks and position totals come with the team (GET /teams/{id})
    useEffect(() => {
        if (tab !== 'boxscores' || bsLoaded) return
        setBestWeeks(team.best_weeks)
        setPositionTotals(team.position_totals)
        setBsLoaded(true)
        setBsLoading(false)
    }, [tab, bsLoaded, team])

    const c = team.career

    const formatPts = (n) =>
        Number(n).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

    const winPct = pct3(c.win_pct)
    const hasDraws = team.seasons.some(s => s.draws > 0)

    const totalGames = c.total_wins + c.total_losses + c.total_draws
    const totalPA = team.seasons.reduce((sum, s) => sum + (Number(s.points_against) || 0), 0)
    const papg = formatPts(totalGames > 0 ? totalPA / totalGames : 0)

    // Each position's best season total is gold
    const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'D/ST']
    const posBest = {}
    positionTotals.forEach(s => s.positions.forEach(p => {
        if (posBest[p.position] === undefined || p.total_points > posBest[p.position]) posBest[p.position] = p.total_points
    }))

    return (
        <>
            {/* 4 career stat stamps */}
            <div className="rw-stamps">
                <StatStamp label="Wins"  value={c.total_wins} />
                <StatStamp label="Win%"  value={winPct} />
                <StatStamp label="PAPG"  value={papg} />
                <StatStamp label="PPG"   value={formatPts(c.avg_score)} />
            </div>

            {/* Season history */}
            {tab === 'seasons' && (
                <div className="rw-block">
                    <h2 className="rw-label">Season History</h2>
                    <div className="table-wrap">
                        <table className="rw-table rw-standings rw-2line rw-norank">
                            <thead>
                                <tr>
                                    <th className="num">Season</th>
                                    <th className="num">W</th>
                                    <th className="num">L</th>
                                    {hasDraws && <th className="num">T</th>}
                                    <th className="num">Win%</th>
                                    <th className="num">PF</th>
                                    <th className="num">PA</th>
                                    <th className="num">Finish</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {team.seasons.map(s => (
                                    <tr key={s.season}>
                                        <td className="num name m1">{s.season}</td>
                                        <td className="num win m1 rec">{s.wins}</td>
                                        <td className="num l m1 rec p-tight">{s.losses}</td>
                                        {hasDraws && <td className="num t m1 rec p-tight">{s.draws}</td>}
                                        <td className="num mk"><span>{pct3(nflWinPct(s.wins, s.losses, s.draws))}</span></td>
                                        <td className="num m2 m2s p-lbl" data-ml="PF">{formatPts(s.points_for)}</td>
                                        <td className="num meta m2 p-lbl" data-ml="PA">{formatPts(s.points_against)}</td>
                                        <td className="num m2 p-lbl" data-ml="Finish">
                                            #{s.final_standing}
                                            <span className="meta" style={{ fontSize: '0.85em', marginLeft: '0.25rem' }}>of {s.teams_in_season}</span>
                                        </td>
                                        <td className="num badges m2 p-sp">
                                            {s.championship && <Badge type="championship" count={1} />}
                                            {s.sacko && <Badge type="sacko" count={1} />}
                                            {s.most_points && <Badge type="topscore" count={1} />}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* H2H */}
            {tab === 'h2h' && (
                <div className="rw-block">
                    <h2 className="rw-label">Head-to-Head</h2>
                    <div className="table-wrap">
                        <table className="rw-table rw-standings rw-2line rw-norank">
                            <thead>
                                <tr>
                                    <th>Opponent</th>
                                    <th className="num">W</th>
                                    <th className="num">L</th>
                                    <th className="num">T</th>
                                    <th className="num">Games</th>
                                    <th className="num">Avg For</th>
                                    <th className="num">Avg Vs</th>
                                </tr>
                            </thead>
                            <tbody>
                                {team.h2h.map(h => (
                                    <tr key={h.opp_team_id}>
                                        <td className="owner m1">{h.opponent}</td>
                                        <td className="num win m1 rec">{h.wins}</td>
                                        <td className="num l m1 rec p-tight">{h.losses}</td>
                                        <td className="num t m1 rec p-tight">{h.ties || '—'}</td>
                                        <td className="num mk">{h.total_games}</td>
                                        <td className="num m2 m2s p-lbl" data-ml="Avg for">{formatPts(h.avg_score_for)}</td>
                                        <td className="num meta m2 p-lbl" data-ml="Avg vs">{formatPts(h.avg_score_against)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Box Scores */}
            {tab === 'boxscores' && (
                bsLoading ? (
                    <div className="rw-loading">Loading...</div>
                ) : (
                    <div className="rw-stack">
                        <div className="rw-block">
                            <h2 className="rw-label">Top Individual Performances</h2>
                            <p className="rw-note">Highest single-week scores on this roster · 2018–2025</p>
                            <div className="table-wrap">
                                <table className="rw-table rw-ranked rw-2line">
                                    <thead>
                                        <tr>
                                            <th className="num">#</th>
                                            <th>Player</th>
                                            <th>Pos</th>
                                            <th className="num">Pts</th>
                                            <th className="num">Season</th>
                                            <th className="num">Week</th>
                                            <th>Opp</th>
                                            <th>Type</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {bestWeekRows.map((row, i) => {
                                            const rank = bestWeekRanks[i]
                                            const rep  = i > 0 && bestWeekRanks[i - 1] === rank
                                            const tie  = rep || bestWeekRanks[i + 1] === rank
                                            return (
                                                <tr key={i} className={tie ? 'tie' : undefined}>
                                                    <td className={cx('rank', rep && 'rep')}>{rank}</td>
                                                    <td className="name m1"><PlayerName id={row.espn_player_id} name={row.player_name} /></td>
                                                    <td className="m1 p-sp"><PosChip position={row.position} /><TeamChip abbrev={row.nfl_team} name={row.nfl_team_name} title={`NFL team in Week ${row.week}`} /></td>
                                                    <td className={cx('num key mk', rank === 1 && 'top')}>{Number(row.points_scored).toFixed(1)}</td>
                                                    <td className="num meta gap-r m2 m2s">{row.season}</td>
                                                    <td className="num meta m2 p-sp">W{row.week}</td>
                                                    <td className="soft m2 p-lbl" data-ml="vs">{row.opponent}</td>
                                                    <td className="m2 m-tag p-dot">
                                                        <GameTag game={row} regular={<span className="meta" style={{ fontSize: 12 }}>Reg</span>} />
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                        <TieFoldLine data fold={bestWeekFold} format={r => Number(r.points_scored).toFixed(1)} colSpan={8} />
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="rw-block">
                            <h2 className="rw-label">Points by Position per Season</h2>
                            <p className="rw-note">Total points scored by each position group · 2018–2025; each position's best season in gold</p>
                            <div className="table-wrap">
                                <table className="rw-table rw-board">
                                    <thead>
                                        <tr>
                                            <th className="num stick">Season</th>
                                            {POSITIONS.map(pos => <th key={pos} className="num">{pos}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {positionTotals.map(s => {
                                            const byPos = {}
                                            s.positions.forEach(p => { byPos[p.position] = p.total_points })
                                            return (
                                                <tr key={s.season}>
                                                    <td className="num name stick">{s.season}</td>
                                                    {POSITIONS.map(pos => (
                                                        <td key={pos} className={cx('num', !byPos[pos] ? 'dash' : byPos[pos] === posBest[pos] ? 'cell-top' : undefined)}>
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

            {/* Waivers */}
            {tab === 'waivers' && <TeamWaivers teamId={team.team_id} lastFinishedSeason={c.last_season} />}
        </>
    )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function TeamPage() {
    const { teamId } = useParams()
    const navigate = useNavigate()
    const [teams,         setTeams]         = useState([])
    const [team,          setTeam]          = useState(null)
    const [listLoading,   setListLoading]   = useState(true)
    const [detailLoading, setDetailLoading] = useState(false)
    const [detailTab,     setDetailTab]     = useState('seasons')
    const [isMobile,      setIsMobile]      = useState(() => window.innerWidth <= 600)

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth <= 600)
        window.addEventListener('resize', check)
        return () => window.removeEventListener('resize', check)
    }, [])

    useEffect(() => {
        setListLoading(true)
        fetchAllTeams().then(setTeams).finally(() => setListLoading(false))
    }, [])

    useEffect(() => {
        if (!teamId) { setTeam(null); setDetailLoading(false); return }
        setDetailTab('seasons')
        setDetailLoading(true)
        fetchTeam(Number(teamId)).then(setTeam).finally(() => setDetailLoading(false))
    }, [teamId])

    const c = team?.career
    const placardTitle    = team ? team.owner.toUpperCase() : 'SELECT A TEAM'
    const placardSubtitle = team && c
        ? `${c.seasons_played} SEASONS · ${c.first_season}–${c.last_season}`
        : ''

    // Badge data for header right
    const isGoat        = team?.team_id === 14
    const champCount    = c?.championships || 0
    const topScoreCount = team ? team.seasons.filter(s => s.most_points).length : 0
    const sackoCount    = team ? team.seasons.filter(s => s.sacko).length : 0

    const headerRight = team ? (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {isGoat && <Badge type="goat" />}
            {champCount > 0 && <Badge type="championship" count={champCount} />}
            {topScoreCount > 0 && <Badge type="topscore" count={topScoreCount} />}
            {sackoCount > 0 && <Badge type="sacko" count={sackoCount} />}
        </div>
    ) : null

    return (
        <Scene>
            <DataBackdrop />
            <TopNav />

            {!isMobile && (
                <OwnerPanel
                    teams={teams}
                    selectedId={teamId ? Number(teamId) : null}
                    loading={listLoading}
                />
            )}

            <Placard
                variant="diorama"
                data
                style={{ left: 380, width: 'min(1000px, calc(100vw - 420px))' }}
                tabs={team ? DETAIL_TAB_LBLS : []}
                activeTab={team ? DETAIL_TABS.indexOf(detailTab) : 0}
                onTabChange={i => setDetailTab(DETAIL_TABS[i])}
                title={placardTitle}
                subtitle={placardSubtitle}
                headerRight={headerRight}
            >
                {isMobile && (
                    <select
                        className="rw-select"
                        value={teamId || ''}
                        onChange={e => {
                            if (e.target.value) navigate(`/teams/${e.target.value}`)
                            else navigate('/teams')
                        }}
                        aria-label="Owner"
                        style={{ width: '100%', marginBottom: 12 }}
                    >
                        <option value="">— Select an owner —</option>
                        {teams.map(t => (
                            <option key={t.team_id} value={String(t.team_id)}>{t.owner}</option>
                        ))}
                    </select>
                )}

                {detailLoading ? (
                    <div className="rw-loading">Loading...</div>
                ) : team ? (
                    <TeamDetailPanel key={team.team_id} team={team} tab={detailTab} />
                ) : (
                    <div className="rw-loading" style={{ paddingTop: 48 }}>
                        {isMobile ? '↑ SELECT AN OWNER ABOVE' : '← SELECT AN OWNER'}
                    </div>
                )}
            </Placard>
        </Scene>
    )
}
