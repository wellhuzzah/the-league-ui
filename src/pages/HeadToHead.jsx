import { Fragment, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchAllTeams } from '../api/teams'
import { getH2H, getRandomH2H } from '../api/matchups'
import { getWeekBoxscores } from '../api/boxscores'
import Scene from '../components/Scene'
import DataBackdrop from '../components/DataBackdrop'
import PosChip from '../components/PosChip'
import TeamChip from '../components/TeamChip'
import PlayerName from '../components/PlayerName'
import TopNav from '../components/TopNav'
import Placard from '../components/Placard'
import StatStamp from '../components/StatStamp'
import GameTag from '../components/GameTag'
import AdjMark from '../components/AdjMark'
import { gameTagSuffix, isPlayoffGame, isToiletGame } from '../utils/gameType'

const fmt = (n) =>
    Number(n).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

const cx = (...names) => names.filter(Boolean).join(' ')

// The two owners and their win counts, the leader in green (the rivalry card and a loaded matchup)
function Versus({ a, b, aWins, bWins, total, ties, playoffs }) {
    return (
        <div className="rw-versus">
            <div>
                <div className={cx('who', aWins > bWins && 'lead')}>{a}</div>
                <div className={cx('wins', aWins > bWins && 'lead')}>{aWins}</div>
            </div>
            <div className="mid">
                <div>{total} GAMES</div>
                {ties > 0 && <div>{ties} TIE{ties !== 1 ? 'S' : ''}</div>}
                {playoffs > 0 && (
                    <div style={{ marginTop: 5 }}>
                        <span className="rw-tag-po">{playoffs} PLAYOFF{playoffs !== 1 ? 'S' : ''}</span>
                    </div>
                )}
            </div>
            <div style={{ textAlign: 'right' }}>
                <div className={cx('who', bWins > aWins && 'lead')}>{b}</div>
                <div className={cx('wins', bWins > aWins && 'lead')}>{bWins}</div>
            </div>
        </div>
    )
}

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
            // The API returns just these two teams; the filter below keeps the old behaviour if
            // the team list hasn't loaded yet (ids unknown)
            const data = await getWeekBoxscores(game.season, game.week,
                teamA && teamB ? [teamA.team_id, teamB.team_id] : null)
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
        if (filter === 'playoffs') return isPlayoffGame(g)   // toilet bowl games show under ALL only
        return true
    }) || []

    const teamA = teams.find(t => String(t.team_id) === String(selectA))
    const teamB = teams.find(t => String(t.team_id) === String(selectB))

    const aWins = games.filter(g => g.winner === 'A').length
    const bWins = games.filter(g => g.winner === 'B').length
    const ties  = games.filter(g => g.winner === 'TIE').length

    // Highlights and the game count leave out toilet bowl games, like the record (the API's counts)
    const allH2hGames = (h2h?.games || []).filter(g => !isToiletGame(g))
    const blowout  = allH2hGames.length ? allH2hGames.reduce((a, b) => b.margin       > a.margin       ? b : a) : null
    // Closest leaves out equal scores: a tie, even when ESPN's tiebreak named a winner
    const decidedG = allH2hGames.filter(g => g.margin > 0)
    const closestG = decidedG.length ? decidedG.reduce((a, b) => b.margin < a.margin ? b : a) : null
    const aBestG   = allH2hGames.length ? allH2hGames.reduce((a, b) => b.team_a_score > a.team_a_score ? b : a) : null
    const bBestG   = allH2hGames.length ? allH2hGames.reduce((a, b) => b.team_b_score > a.team_b_score ? b : a) : null

    const placardTitle = h2h
        ? `${teamA?.owner?.toUpperCase() ?? '?'} vs ${teamB?.owner?.toUpperCase() ?? '?'}`
        : 'HEAD TO HEAD'
    const placardSubtitle = h2h
        ? `${h2h.total_games ?? 0} GAMES ALL TIME`
        : 'ALL-TIME MATCHUP RECORDS'

    const canGo = selectA && selectB && selectA !== selectB

    return (
        <Scene>
            <DataBackdrop />

            <TopNav />

            <Placard
                variant="detached"
                data
                title={placardTitle}
                subtitle={placardSubtitle}
            >
                <div className="rw-stack" style={{ width: 'min(880px, 100%)' }}>
                {/* Owner selector */}
                <div className="rw-ctls" style={{ marginBottom: 22, flexWrap: 'wrap' }}>
                    <select className="rw-select" value={selectA} onChange={e => setSelectA(e.target.value)} aria-label="Owner A" style={{ flex: 1, minWidth: 140 }}>
                        <option value="">Owner A...</option>
                        {teams.map(t => (
                            <option key={t.team_id} value={String(t.team_id)}>{t.owner}</option>
                        ))}
                    </select>

                    <span className="rw-ctl-lbl">VS</span>

                    <select className="rw-select" value={selectB} onChange={e => setSelectB(e.target.value)} aria-label="Owner B" style={{ flex: 1, minWidth: 140 }}>
                        <option value="">Owner B...</option>
                        {teams.map(t => (
                            <option key={t.team_id} value={String(t.team_id)}>{t.owner}</option>
                        ))}
                    </select>

                    <button type="button" className="rw-btn" onClick={handleGo} disabled={!canGo}>GO</button>
                </div>

                {/* Rando rivalry — only when no matchup loaded */}
                {!h2h && !loading && (
                    <div style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 12 }}>
                            <h2 className="rw-label" style={{ flex: 1, margin: 0 }}>✦ Rando Rivalry</h2>
                            <div className="rw-seg">
                                <button type="button" onClick={handleRefreshRandom} disabled={randomRefreshing || randomLoading}>
                                    {randomRefreshing ? '...' : '↻ NEW'}
                                </button>
                            </div>
                        </div>

                        {randomLoading ? (
                            <div className="rw-loading">Loading...</div>
                        ) : randomH2H ? (
                            <div style={{ maxWidth: 560, margin: '0 auto' }}>
                                <Versus
                                    a={randomH2H.team_a.owner} b={randomH2H.team_b.owner}
                                    aWins={randomH2H.summary.team_a_wins} bWins={randomH2H.summary.team_b_wins}
                                    total={randomH2H.summary.total_games} ties={randomH2H.summary.ties}
                                    playoffs={randomH2H.summary.playoff_games}
                                />

                                {/* Avg scores */}
                                <div className="rw-avg">
                                    <span>AVG <b>{randomH2H.summary.team_a_avg.toFixed(1)}</b></span>
                                    <span>PTS PER GAME</span>
                                    <span>AVG <b>{randomH2H.summary.team_b_avg.toFixed(1)}</b></span>
                                </div>

                                {/* Highlight stamps */}
                                <div className="rw-stamps rw-stamps-2">
                                    <StatStamp
                                        label="BLOWOUT"
                                        value={randomH2H.highlights.biggest_margin.margin.toFixed(1)}
                                        caption={`${randomH2H.highlights.biggest_margin.winner} · ${randomH2H.highlights.biggest_margin.season} W${randomH2H.highlights.biggest_margin.week}`}
                                    />
                                    <StatStamp
                                        label="CLOSEST"
                                        value={randomH2H.highlights.closest_game ? randomH2H.highlights.closest_game.margin.toFixed(1) : '—'}
                                        caption={randomH2H.highlights.closest_game ? `${randomH2H.highlights.closest_game.winner} · ${randomH2H.highlights.closest_game.season} W${randomH2H.highlights.closest_game.week}` : 'no decided games'}
                                    />
                                    <StatStamp
                                        label={`${randomH2H.team_a.owner.toUpperCase()} BEST`}
                                        value={randomH2H.highlights.team_a_best.score.toFixed(1)}
                                        caption={`${randomH2H.highlights.team_a_best.season} W${randomH2H.highlights.team_a_best.week}${gameTagSuffix(randomH2H.highlights.team_a_best)}`}
                                    />
                                    <StatStamp
                                        label={`${randomH2H.team_b.owner.toUpperCase()} BEST`}
                                        value={randomH2H.highlights.team_b_best.score.toFixed(1)}
                                        caption={`${randomH2H.highlights.team_b_best.season} W${randomH2H.highlights.team_b_best.week}${gameTagSuffix(randomH2H.highlights.team_b_best)}`}
                                    />
                                </div>

                                {/* CTA */}
                                <button
                                    type="button"
                                    className="rw-cta"
                                    onClick={() => {
                                        setSelectA(String(randomH2H.team_a.team_id))
                                        setSelectB(String(randomH2H.team_b.team_id))
                                        navigate(`/h2h/${randomH2H.team_a.team_id}/${randomH2H.team_b.team_id}`)
                                    }}
                                >
                                    VIEW FULL MATCHUP →
                                </button>
                            </div>
                        ) : null}
                    </div>
                )}

                {loading && <div className="rw-loading">Loading...</div>}

                {h2h && !loading && (
                    <>
                        <div style={{ maxWidth: 560, margin: '0 auto 14px' }}>
                            <Versus
                                a={teamA?.owner} b={teamB?.owner}
                                aWins={h2h.team_a_wins} bWins={h2h.team_b_wins}
                                total={h2h.total_games} ties={h2h.ties} playoffs={h2h.playoff_games}
                            />
                        </div>

                        {/* Highlight stamps */}
                        {blowout && (
                            <div className="rw-stamps rw-stamps-2" style={{ maxWidth: 560, margin: '0 auto 24px' }}>
                                <StatStamp
                                    label="BLOWOUT"
                                    value={fmt(blowout.margin)}
                                    caption={`${blowout.winner === 'A' ? teamA?.owner : teamB?.owner} · ${blowout.season} W${blowout.week}`}
                                />
                                <StatStamp
                                    label="CLOSEST"
                                    value={closestG ? fmt(closestG.margin) : '—'}
                                    caption={closestG ? `${closestG.winner === 'A' ? teamA?.owner : teamB?.owner} · ${closestG.season} W${closestG.week}` : 'no decided games'}
                                />
                                <StatStamp
                                    label={`${teamA?.owner?.toUpperCase() || 'A'} BEST`}
                                    value={fmt(aBestG.team_a_score)}
                                    caption={`${aBestG.season} W${aBestG.week}${gameTagSuffix(aBestG)}`}
                                />
                                <StatStamp
                                    label={`${teamB?.owner?.toUpperCase() || 'B'} BEST`}
                                    value={fmt(bBestG.team_b_score)}
                                    caption={`${bBestG.season} W${bBestG.week}${gameTagSuffix(bBestG)}`}
                                />
                            </div>
                        )}

                        {/* Filter + game log */}
                        <h2 className="rw-label">Game Log</h2>
                        <div className="rw-ctls" style={{ marginBottom: 10 }}>
                            <span className="rw-ctl-lbl">Filter</span>
                            <div className="rw-seg">
                                {[
                                    { key: 'all',      label: 'ALL' },
                                    { key: 'regular',  label: 'REG' },
                                    { key: 'playoffs', label: 'POST' },
                                ].map(f => (
                                    <button key={f.key} type="button" onClick={() => setFilter(f.key)} className={filter === f.key ? 'on' : undefined} aria-pressed={filter === f.key}>
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="table-wrap">
                            <table className="rw-table rw-ledger rw-2line rw-norank" style={{ width: '100%' }}>
                                <thead>
                                    <tr>
                                        <th className="num">Season</th>
                                        <th className="num">Wk</th>
                                        <th className="num">{teamA?.owner}</th>
                                        <th style={{ textAlign: 'center' }}>vs</th>
                                        <th>{teamB?.owner}</th>
                                        <th className="num">Margin</th>
                                        <th>Type</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {games.map((g) => {
                                        const aWon   = g.winner === 'A'
                                        const bWon   = g.winner === 'B'
                                        const key    = `${g.season}-${g.week}`
                                        const isOpen = expandedGame === key
                                        const hasBox = g.season >= 2018
                                        const cached = boxScoreCache[key]
                                        const scoreCls = (won, lost) => won ? 'key win' : lost ? 'soft' : undefined

                                        return (
                                            <Fragment key={key}>
                                                <tr
                                                    className={cx(hasBox && 'link', isOpen && 'open')}
                                                    tabIndex={hasBox ? 0 : undefined}
                                                    aria-expanded={hasBox ? isOpen : undefined}
                                                    onClick={() => handleGameClick(g)}
                                                    onKeyDown={e => { if (hasBox && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); handleGameClick(g) } }}
                                                >
                                                    <td className="num m2 m2s">{g.season}</td>
                                                    <td className="num meta m2 p-sp">W{g.week}</td>
                                                    <td className={cx('num m1 p-own', scoreCls(aWon, bWon))} data-ml={teamA?.owner}>
                                                        {fmt(g.team_a_score)}<AdjMark adj={g.team_a_adjustment} />
                                                    </td>
                                                    <td className="meta m-hide" style={{ textAlign: 'center', fontSize: '0.8em' }}>—</td>
                                                    <td className={cx('num m1 p-dash s-after', scoreCls(bWon, aWon))} data-ma={teamB?.owner} style={{ textAlign: 'left' }}>
                                                        {fmt(g.team_b_score)}<AdjMark adj={g.team_b_adjustment} />
                                                    </td>
                                                    <td className="num meta mk" style={{ fontWeight: 600 }}>{fmt(g.margin)}</td>
                                                    <td className="m2 m-tag p-dot">
                                                        <GameTag game={g} regular={<span className="meta" style={{ fontSize: 12 }}>Reg</span>} />
                                                    </td>
                                                    <td className="num meta m-hide" style={{ fontSize: '0.75em' }}>
                                                        {hasBox ? (isOpen ? '▲' : '▼') : ''}
                                                    </td>
                                                </tr>

                                                {/* Expanded box score */}
                                                {isOpen && (
                                                    <tr className="detail">
                                                        <td colSpan={8} style={{ padding: 0, height: 'auto', whiteSpace: 'normal' }}>
                                                            {boxScoreLoading && !cached ? (
                                                                <div className="rw-loading" style={{ padding: 12 }}>Loading box score...</div>
                                                            ) : cached ? (
                                                                <div className="rw-boxpair">
                                                                    {cached.teams.map(team => (
                                                                        <div key={team.owner}>
                                                                            <div className="rw-card-head">{team.owner}</div>
                                                                            <table className="rw-table rw-board" style={{ width: '100%' }}>
                                                                                <thead>
                                                                                    <tr><th>Player</th><th>Pos</th><th className="num">Pts</th></tr>
                                                                                </thead>
                                                                                <tbody>
                                                                                    {team.players
                                                                                        .sort((a, b) => b.points_scored - a.points_scored)
                                                                                        .map((p, pi) => (
                                                                                            <tr key={pi} className={p.is_starter ? undefined : 'bench'}>
                                                                                                <td className={p.is_starter ? 'name' : 'soft'}><PlayerName id={p.espn_player_id} name={p.player_name} /></td>
                                                                                                <td style={{ whiteSpace: 'nowrap' }}><PosChip position={p.position} /><TeamChip abbrev={p.nfl_team} name={p.nfl_team_name} variant="chip" /></td>
                                                                                                <td className={cx('num', p.is_starter && 'name', p.points_scored >= 20 ? 'rw-plus' : p.points_scored <= 5 ? 'rw-minus' : undefined)}>
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
                                                                <p className="rw-note" style={{ padding: '10px 14px', margin: 0 }}>Box score not available for this week.</p>
                                                            )}
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
                </div>
            </Placard>
        </Scene>
    )
}
