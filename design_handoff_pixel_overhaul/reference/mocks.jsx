/* global React, PixelPhoto, PixelTower, Fireflies, DriftingClouds */
const { useState, useEffect, useCallback } = React;

const MENU_ITEMS = [
  { label: 'Season Standings', sub: '14 teams · current campaign' },
  { label: 'All-Time Records', sub: 'every record, every team' },
  { label: 'Draft History',    sub: 'every pick since season 1' },
  { label: 'Team Pages',       sub: '14 dossiers' },
  { label: 'Head to Head',     sub: 'rivalries & series' }
];

/* Keyboard nav hook — arrow up/down + Enter */
function useMenuNav(count) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowDown') { setIdx(i => (i + 1) % count); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { setIdx(i => (i - 1 + count) % count); e.preventDefault(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [count]);
  return [idx, setIdx];
}

/* ============================================================
   MAIN MENU A — "Into the Breach"
   Asymmetric: tower silhouette right third, menu list left,
   massive ROCKWOOD wordmark top-left, dusk parallax sky.
   ============================================================ */

function MenuA() {
  const [active, setActive] = useMenuNav(MENU_ITEMS.length);

  return (
    <div className="scene" data-screen-label="Menu A · ITB silhouette">
      {/* Sky gradient */}
      <div className="sky" />

      {/* Pixelated photo of the wide shot, low opacity, behind silhouette */}
      <PixelPhoto
        src="assets/tower_wide.jpg"
        lowW={400}
        lowH={225}
        dither={true}
        tint={1}
        style={{ opacity: 0.92 }}
      />



      {/* Drifting cloud strip */}
      <DriftingClouds y={30} opacity={0.5} />
      <DriftingClouds y={40} opacity={0.35} />

      {/* Subtle left-side darkening so the menu reads cleanly on the photo */}
      <div style={{
        position:'absolute', inset:0,
        background:'linear-gradient(90deg, rgba(7,6,26,0.78) 0%, rgba(7,6,26,0.5) 30%, rgba(7,6,26,0.05) 55%, transparent 70%)',
        zIndex: 38
      }}/>

      {/* Fireflies in the dusk sky */}
      <Fireflies count={5} area={{ left: 55, right: 90, top: 30, bottom: 60 }} />

      {/* TITLE — top-left */}
      <div style={{ position:'absolute', left:64, top:60, zIndex:50 }}>
        <div className="title-sub" style={{ marginBottom: 12 }}>· EST. 2005 ·</div>
        <div className="title-rockwood" style={{ fontSize: 96 }}>ROCK<wbr/>WOOD</div>
        <div style={{
          fontFamily:'var(--f-display)', fontWeight:700, fontSize:34, letterSpacing:'8px',
          color:'#f4eedd', marginTop: 4,
          textShadow:'-2px 2px 0 #2a1f4a'
        }}>THE LEAGUE</div>
      </div>

      {/* MENU — left, just under title */}
      <ul className="menu-list" style={{ position:'absolute', left:48, top:300, zIndex:55 }}>
        {MENU_ITEMS.map((it, i) => (
          <li
            key={it.label}
            className={'menu-row' + (i === active ? ' is-active' : '')}
            onMouseEnter={() => setActive(i)}
          >
            <span className="num">{String(i+1).padStart(2,'0')}</span>
            <span className="arrow">▸</span>
            <span>{it.label}</span>
          </li>
        ))}
      </ul>

      {/* Footer chrome */}
      <div className="scene-footer">
        <div>
          <span className="lbl">PROFILE:</span> commissioner_cherwood
          <span style={{ marginLeft: 24 }} className="lbl">SEASON:</span> 2025
        </div>
        <div className="hint">
          <span className="key">↑↓</span> select <span className="key" style={{ marginLeft: 8 }}>↵</span> enter
          <span style={{ marginLeft: 24, color:'#8a8c98' }}>v.0.12</span>
        </div>
      </div>

      {/* CRT overlays */}
      <div className="scanlines" />
      <div className="chroma" />
      <div className="crt-vignette" />
    </div>
  );
}

/* ============================================================
   MAIN MENU B — "Graveyard Keeper" diorama
   Centered tower, full scene, menu in a boxed panel below title.
   Lit tower (windows visible), more atmospheric.
   ============================================================ */

function MenuB() {
  const [active, setActive] = useMenuNav(MENU_ITEMS.length);

  return (
    <div className="scene" data-screen-label="Menu B · Graveyard Keeper diorama">
      <div className="sky" />

      <PixelPhoto
        src="assets/tower_wide.jpg"
        lowW={400}
        lowH={225}
        dither={true}
        tint={1}
        style={{ opacity: 0.85 }}
      />

      <DriftingClouds y={28} opacity={0.6} />
      <DriftingClouds y={36} opacity={0.4} />

      {/* Foreground darken */}
      <div style={{
        position:'absolute', inset:0,
        background:'radial-gradient(ellipse at 50% 65%, transparent 30%, rgba(7,6,26,0.65) 80%)',
        zIndex: 30
      }}/>

      {/* TOWER — centered, lit, smaller, on a hill silhouette */}
      <div style={{
        position:'absolute',
        left:'50%', bottom:'14%',
        transform:'translateX(-50%)',
        zIndex:40
      }}>
        <PixelTower mode="lit" scale={3.4} />
      </div>

      {/* Hill silhouette under tower */}
      <svg
        viewBox="0 0 320 30"
        preserveAspectRatio="none"
        style={{ position:'absolute', left:0, right:0, bottom:'10%', width:'100%', height:'8%', zIndex:38 }}
        shapeRendering="crispEdges"
      >
        <path d="M0 30 L0 14 L30 12 L60 16 L100 8 L140 6 L180 10 L220 4 L260 8 L300 14 L320 16 L320 30 Z" fill="#07061a"/>
      </svg>

      {/* Ground plane */}
      <div style={{
        position:'absolute', left:0, right:0, bottom:0, height:'14%',
        background:'#07061a', zIndex:39
      }}/>
      {/* Grass tufts */}
      <svg
        viewBox="0 0 320 6"
        preserveAspectRatio="none"
        style={{ position:'absolute', left:0, right:0, bottom:'13%', width:'100%', height:'1.5%', zIndex:39 }}
        shapeRendering="crispEdges"
      >
        <g fill="#07061a">
          {Array.from({length: 100}, (_, i) => (
            <rect key={i} x={i*3.2} y={(i%4)} width="1" height={2 + (i%3)} />
          ))}
        </g>
      </svg>

      <Fireflies count={9} area={{ left: 20, right: 80, top: 50, bottom: 78 }} />

      {/* TITLE — top center */}
      <div style={{
        position:'absolute', left:0, right:0, top:48,
        textAlign:'center', zIndex:50
      }}>
        <div className="title-sub" style={{ marginBottom: 10 }}>· FANTASY FOOTBALL ·</div>
        <div className="title-rockwood" style={{ fontSize: 84, display:'inline-block' }}>ROCKWOOD</div>
        <div style={{
          fontFamily:'var(--f-display)', fontWeight:700, fontSize:22, letterSpacing:'10px',
          color:'#f0a04b', marginTop: 4
        }}>— THE LEAGUE —</div>
      </div>

      {/* MENU — boxed panel, bottom-left */}
      <div className="menu-box" style={{
        position:'absolute', left:60, bottom:80, zIndex:55, minWidth:340
      }}>
        <ul className="menu-list">
          {MENU_ITEMS.map((it, i) => (
            <li
              key={it.label}
              className={'menu-row' + (i === active ? ' is-active' : '')}
              onMouseEnter={() => setActive(i)}
              style={{ fontSize: 28, padding: '6px 24px 6px 18px', minWidth: 320 }}
            >
              <span className="num">{String(i+1).padStart(2,'0')}</span>
              <span className="arrow">▸</span>
              <span>{it.label}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Footer */}
      <div className="scene-footer">
        <div><span className="lbl">PROFILE:</span> commissioner_cherwood</div>
        <div className="hint">
          <span className="key">↑↓</span> select <span className="key" style={{ marginLeft: 8 }}>↵</span> enter
          <span style={{ marginLeft: 24, color:'#8a8c98' }}>v.0.12 · season 2025</span>
        </div>
      </div>

      {/* CRT overlays — Menu B */}
      <div className="scanlines" />
      <div className="chroma" />
      <div className="crt-vignette" />
    </div>
  );
}

/* ============================================================
   PLACARD PAGE — "Season Standings" riveted to tower wall
   We zoom into a section of the tower — the curved tank wall
   fills the background with rivet seams, ROCKWOOD paint visible
   peeking around edges, and a steel placard is bolted to it.
   ============================================================ */

const TEAMS = [
  { letter:'A', name:'Team A · Wishbone Warriors',  rec:'12-2', pf:1842.7, pa:1521.3, streak:'W7', tag:'CHAMP' },
  { letter:'B', name:'Team B · Goal Line Goons',    rec:'10-4', pf:1779.4, pa:1610.8, streak:'W2' },
  { letter:'C', name:'Team C · Rust Belt Renegades',rec:'9-5',  pf:1701.2, pa:1588.0, streak:'L1' },
  { letter:'D', name:'Team D · Toledo Strip',       rec:'9-5',  pf:1689.5, pa:1602.4, streak:'W3' },
  { letter:'E', name:'Team E · Monroe Maulers',     rec:'8-6',  pf:1654.9, pa:1599.7, streak:'W1' },
  { letter:'F', name:'Team F · Detroit District',   rec:'8-6',  pf:1632.1, pa:1614.5, streak:'L2' },
  { letter:'G', name:'Team G · Flat Rock Floods',   rec:'7-7',  pf:1605.6, pa:1612.2, streak:'L1' },
  { letter:'H', name:'Team H · River Raisin Wolves',rec:'7-7',  pf:1588.3, pa:1631.0, streak:'W2' },
  { letter:'I', name:'Team I · Trenton Tinmen',     rec:'6-8',  pf:1572.0, pa:1628.4, streak:'L3' },
  { letter:'J', name:'Team J · Woodhaven Wraiths',  rec:'6-8',  pf:1541.7, pa:1655.9, streak:'W1' },
  { letter:'K', name:'Team K · Gibraltar Guards',   rec:'5-9',  pf:1488.2, pa:1672.6, streak:'L2' },
  { letter:'L', name:'Team L · South Rockwood',     rec:'4-10', pf:1455.9, pa:1718.3, streak:'L4' },
  { letter:'M', name:'Team M · Brownstown Brawlers',rec:'3-11', pf:1402.5, pa:1745.2, streak:'L5' },
  { letter:'N', name:'Team N · Carleton Catfish',   rec:'2-12', pf:1351.0, pa:1801.4, streak:'L8', tag:'SACKO' }
];

const TABS = ['Standings', 'Weekly', 'Playoffs', 'Awards'];

function PlacardStandings() {
  const [tab, setTab] = useState(0);

  return (
    <div className="scene" data-screen-label="Inner Page · Standings placard">
      {/* Background: zoomed tower-tank curved wall */}
      <div className="sky" style={{
        background:'linear-gradient(180deg,#0a0820 0%,#1a1535 30%,#2a1f4a 60%,#4a2654 100%)'
      }}/>

      {/* Pixelated zoomed tower (tighter crop) */}
      <PixelPhoto
        src="assets/tower.jpg"
        lowW={320}
        lowH={180}
        dither={true}
        tint={0.5}
        style={{ opacity: 0.9 }}
      />

      {/* Curvature shading — sells "we're standing close to a curved wall" */}
      <div style={{
        position:'absolute', inset:0,
        background:'linear-gradient(90deg, rgba(0,0,0,0.55), transparent 18%, transparent 82%, rgba(0,0,0,0.55))',
        zIndex: 20
      }}/>
      <div style={{
        position:'absolute', inset:0,
        background:'radial-gradient(ellipse at 50% 38%, rgba(255,200,140,0.08), transparent 50%)',
        zIndex:21
      }}/>

      {/* Rivet seam — vertical line down the tank, slightly off-center */}
      <div style={{
        position:'absolute', top:0, bottom:0, left:'72%', width:2,
        background:'linear-gradient(180deg, transparent, rgba(0,0,0,0.4) 20%, rgba(0,0,0,0.4) 80%, transparent)',
        zIndex:22
      }}/>
      {/* Rivets along that seam */}
      {Array.from({length: 12}, (_, i) => (
        <div key={i} className="placard-rivet" style={{
          left:'calc(72% - 5px)', top: 40 + i * 56, width:10, height:10, zIndex:22, opacity:0.6
        }}/>
      ))}

      {/* Faint ROCKWOOD paint peeking behind the placard, top */}
      <div className="stencil-paint" style={{
        position:'absolute', top:24, left:32, fontSize:96, opacity:0.18, color:'#0a0820', zIndex:23,
        letterSpacing:'12px'
      }}>
        ROCKWOOD
      </div>

      {/* === TOP NAV BAR (still here on inner pages) === */}
      <div style={{
        position:'absolute', top:18, left:32, right:32, zIndex:60,
        display:'flex', alignItems:'center', gap:24,
        fontFamily:'var(--f-pixel)', fontSize:11, letterSpacing:2
      }}>
        <span style={{ color:'var(--amber)' }}>◀ ROCKWOOD</span>
        <span style={{ color:'#8a8c98' }}>HOME</span>
        <span style={{ color:'#f4eedd', borderBottom:'2px solid var(--amber)', paddingBottom:2 }}>SEASONS</span>
        <span style={{ color:'#8a8c98' }}>RECORDS</span>
        <span style={{ color:'#8a8c98' }}>DRAFT</span>
        <span style={{ color:'#8a8c98' }}>TEAMS</span>
        <span style={{ color:'#8a8c98' }}>H2H</span>
        <span style={{ marginLeft:'auto', color:'var(--amber)' }}>2025 ▾</span>
      </div>

      {/* === THE PLACARD === */}
      <div style={{
        position:'absolute',
        left:'50%',
        top:54,
        transform:'translateX(-50%)',
        width: 1080,
        zIndex: 50
      }}>
        {/* tabs sit on top of the placard, like file folders */}
        <div className="placard-tabs" style={{ marginLeft: 24 }}>
          {TABS.map((t, i) => (
            <div
              key={t}
              className={'placard-tab' + (i === tab ? ' is-active' : '')}
              onClick={() => setTab(i)}
            >{t}</div>
          ))}
        </div>

        <div className="placard" style={{ padding: '24px 28px 28px', position:'relative' }}>
          {/* corner rivets (8) */}
          <div className="placard-rivet" style={{ top:10,  left:10  }}/>
          <div className="placard-rivet" style={{ top:10,  right:10 }}/>
          <div className="placard-rivet" style={{ bottom:10, left:10  }}/>
          <div className="placard-rivet" style={{ bottom:10, right:10 }}/>
          <div className="placard-rivet" style={{ top:10,  left:'50%', transform:'translateX(-50%)' }}/>
          <div className="placard-rivet" style={{ bottom:10, left:'50%', transform:'translateX(-50%)' }}/>
          <div className="placard-rivet" style={{ top:'50%', left:10,  transform:'translateY(-50%)' }}/>
          <div className="placard-rivet" style={{ top:'50%', right:10, transform:'translateY(-50%)' }}/>

          {/* Header */}
          <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom: 14 }}>
            <div>
              <div className="stencil" style={{ fontSize: 36 }}>SEASON STANDINGS</div>
              <div style={{ fontFamily:'var(--f-pixel)', fontSize:11, letterSpacing:2, color:'#3a3d4a', marginTop:4 }}>
                CAMPAIGN 2025 · WEEK 14 OF 14 · 14 TEAMS
              </div>
            </div>
            {/* Season pickers */}
            <div style={{ display:'flex', gap:6, fontFamily:'var(--f-pixel)', fontSize:10, letterSpacing:1 }}>
              {['◀','2025','▶'].map((t, i) => (
                <div key={i} style={{
                  padding:'6px 10px',
                  background: i === 1 ? 'var(--amber)' : '#1a1c26',
                  color:    i === 1 ? '#1a1c26' : '#f4eedd',
                  border:'2px solid #1a1c26', cursor:'pointer'
                }}>{t}</div>
              ))}
            </div>
          </div>

          {/* Stat stamps — at-a-glance season summary */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:10, marginBottom:14 }}>
            <div className="stat-stamp">
              <div className="lbl">High Score</div>
              <div className="val">187.4</div>
              <div style={{ fontFamily:'var(--f-pixel)', fontSize:9, color:'#8a8c98', marginTop:4 }}>TEAM A · WK 9</div>
            </div>
            <div className="stat-stamp">
              <div className="lbl">Low Score</div>
              <div className="val">62.1</div>
              <div style={{ fontFamily:'var(--f-pixel)', fontSize:9, color:'#8a8c98', marginTop:4 }}>TEAM N · WK 11</div>
            </div>
            <div className="stat-stamp">
              <div className="lbl">Avg PF</div>
              <div className="val">114.6</div>
              <div style={{ fontFamily:'var(--f-pixel)', fontSize:9, color:'#8a8c98', marginTop:4 }}>LEAGUE WIDE</div>
            </div>
            <div className="stat-stamp">
              <div className="lbl">Tightest Game</div>
              <div className="val">0.4</div>
              <div style={{ fontFamily:'var(--f-pixel)', fontSize:9, color:'#8a8c98', marginTop:4 }}>D vs E · WK 6</div>
            </div>
          </div>

          {/* The standings table */}
          <table className="standings">
            <thead>
              <tr>
                <th style={{ width:42 }}>#</th>
                <th>Team</th>
                <th style={{ width:76 }}>Record</th>
                <th style={{ width:96, textAlign:'right' }}>PF</th>
                <th style={{ width:96, textAlign:'right' }}>PA</th>
                <th style={{ width:96, textAlign:'right' }}>DIFF</th>
                <th style={{ width:60, textAlign:'right' }}>STRK</th>
              </tr>
            </thead>
            <tbody>
              {TEAMS.map((t, i) => {
                const diff = (t.pf - t.pa).toFixed(1);
                const diffPos = parseFloat(diff) >= 0;
                return (
                  <tr key={t.letter}>
                    <td className="rank">{String(i+1).padStart(2,'0')}</td>
                    <td className="team">
                      {t.name}
                      {t.tag === 'CHAMP' && <span className="badge-tag gold">★ CHAMP</span>}
                      {t.tag === 'SACKO' && <span className="badge-tag bad">SACKO</span>}
                    </td>
                    <td style={{ fontFamily:'var(--f-pixel)', fontSize:13, letterSpacing:1 }}>{t.rec}</td>
                    <td className="num">{t.pf.toFixed(1)}</td>
                    <td className="num" style={{ color:'#5a5d68' }}>{t.pa.toFixed(1)}</td>
                    <td className="num" style={{ color: diffPos ? '#2a6a3a' : '#7a2a2a' }}>
                      {diffPos ? '+' : ''}{diff}
                    </td>
                    <td className="num" style={{
                      color: t.streak.startsWith('W') ? '#2a6a3a' : '#7a2a2a'
                    }}>{t.streak}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Curve shadow on placard edges */}
        <div className="placard-curve" style={{ position:'absolute', inset:0 }}/>
      </div>

      {/* Footer hint */}
      <div className="scene-footer" style={{ bottom: 12 }}>
        <div><span className="lbl">VIEW:</span> standings · sortable</div>
        <div className="hint">
          <span className="key">ESC</span> back &nbsp;
          <span className="key">←→</span> change season &nbsp;
          <span className="key">TAB</span> switch view
        </div>
      </div>

      <div className="scanlines" />
      <div className="chroma" />
      <div className="crt-vignette" />
    </div>
  );
}

/* ============================================================
   PLACARD — DIORAMA variant
   Tower remains visible at the edge of frame; smaller placard
   floats in front, riveted to the curved tank wall. Less data
   density, but stronger sense of place. Best for narrative pages
   (team profiles, weekly recap, single-game).
   ============================================================ */

function PlacardDiorama() {
  const [tab, setTab] = useState(0);

  return (
    <div className="scene" data-screen-label="Inner Page · Diorama (tower in frame)">
      <div className="sky" />

      <PixelPhoto
        src="assets/tower_wide.jpg"
        lowW={400}
        lowH={225}
        dither={true}
        tint={1}
        style={{ opacity: 0.92 }}
      />

      {/* Heavy darkening on left so the placard reads */}
      <div style={{
        position:'absolute', inset:0,
        background:'linear-gradient(90deg, rgba(7,6,26,0.85) 0%, rgba(7,6,26,0.55) 38%, rgba(7,6,26,0.05) 62%, transparent 78%)',
        zIndex: 28
      }}/>

      <DriftingClouds y={28} opacity={0.45} />
      <Fireflies count={5} area={{ left: 60, right: 92, top: 48, bottom: 78 }} />

      {/* === TOP NAV BAR === */}
      <div style={{
        position:'absolute', top:18, left:32, right:32, zIndex:60,
        display:'flex', alignItems:'center', gap:24,
        fontFamily:'var(--f-pixel)', fontSize:11, letterSpacing:2
      }}>
        <span style={{ color:'var(--amber)' }}>◀ ROCKWOOD</span>
        <span style={{ color:'#8a8c98' }}>HOME</span>
        <span style={{ color:'#f4eedd', borderBottom:'2px solid var(--amber)', paddingBottom:2 }}>SEASONS</span>
        <span style={{ color:'#8a8c98' }}>RECORDS</span>
        <span style={{ color:'#8a8c98' }}>DRAFT</span>
        <span style={{ color:'#8a8c98' }}>TEAMS</span>
        <span style={{ color:'#8a8c98' }}>H2H</span>
        <span style={{ marginLeft:'auto', color:'var(--amber)' }}>2025 ▾</span>
      </div>

      {/* === PLACARD — smaller, anchored left over the photo === */}
      <div style={{
        position:'absolute',
        left: 56,
        top: 72,
        width: 700,
        zIndex: 50
      }}>
        <div className="placard-tabs" style={{ marginLeft: 24 }}>
          {TABS.map((t, i) => (
            <div key={t}
                 className={'placard-tab' + (i === tab ? ' is-active' : '')}
                 onClick={() => setTab(i)}>{t}</div>
          ))}
        </div>

        <div className="placard" style={{ padding: '20px 22px 22px', position:'relative' }}>
          {/* corner rivets */}
          <div className="placard-rivet" style={{ top:8,  left:8  }}/>
          <div className="placard-rivet" style={{ top:8,  right:8 }}/>
          <div className="placard-rivet" style={{ bottom:8, left:8  }}/>
          <div className="placard-rivet" style={{ bottom:8, right:8 }}/>

          {/* Header */}
          <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom: 12 }}>
            <div>
              <div className="stencil" style={{ fontSize: 28 }}>SEASON STANDINGS</div>
              <div style={{ fontFamily:'var(--f-pixel)', fontSize:10, letterSpacing:2, color:'#3a3d4a', marginTop:4 }}>
                CAMPAIGN 2025 · WEEK 14 · 14 TEAMS
              </div>
            </div>
            <div style={{ display:'flex', gap:4, fontFamily:'var(--f-pixel)', fontSize:10, letterSpacing:1 }}>
              {['◀','2025','▶'].map((t, i) => (
                <div key={i} style={{
                  padding:'4px 8px',
                  background: i === 1 ? 'var(--amber)' : '#1a1c26',
                  color:    i === 1 ? '#1a1c26' : '#f4eedd',
                  border:'2px solid #1a1c26', cursor:'pointer'
                }}>{t}</div>
              ))}
            </div>
          </div>

          {/* Compact stat stamps — only 2 in diorama variant */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:8, marginBottom:12 }}>
            <div className="stat-stamp" style={{ padding:'8px 12px 10px' }}>
              <div className="lbl">High Score</div>
              <div className="val" style={{ fontSize:15 }}>187.4</div>
              <div style={{ fontFamily:'var(--f-pixel)', fontSize:9, color:'#8a8c98', marginTop:3 }}>TEAM A · WK 9</div>
            </div>
            <div className="stat-stamp" style={{ padding:'8px 12px 10px' }}>
              <div className="lbl">Tightest Game</div>
              <div className="val" style={{ fontSize:15 }}>0.4</div>
              <div style={{ fontFamily:'var(--f-pixel)', fontSize:9, color:'#8a8c98', marginTop:3 }}>D vs E · WK 6</div>
            </div>
          </div>

          {/* Compact standings — fewer columns */}
          <table className="standings" style={{ fontSize: 17 }}>
            <thead>
              <tr>
                <th style={{ width:32 }}>#</th>
                <th>Team</th>
                <th style={{ width:60 }}>W-L</th>
                <th style={{ width:80, textAlign:'right' }}>PF</th>
                <th style={{ width:60, textAlign:'right' }}>STRK</th>
              </tr>
            </thead>
            <tbody>
              {TEAMS.map((t, i) => (
                <tr key={t.letter}>
                  <td className="rank" style={{ fontSize:14 }}>{String(i+1).padStart(2,'0')}</td>
                  <td className="team" style={{ fontSize:17 }}>
                    {t.name.replace(/^Team [A-N] · /, '')}
                    {t.tag === 'CHAMP' && <span className="badge-tag gold">★</span>}
                    {t.tag === 'SACKO' && <span className="badge-tag bad">SACKO</span>}
                  </td>
                  <td style={{ fontFamily:'var(--f-pixel)', fontSize:11, letterSpacing:1 }}>{t.rec}</td>
                  <td className="num" style={{ fontSize:11 }}>{t.pf.toFixed(1)}</td>
                  <td className="num" style={{
                    fontSize:11,
                    color: t.streak.startsWith('W') ? '#2a6a3a' : '#7a2a2a'
                  }}>{t.streak}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer hint */}
      <div className="scene-footer" style={{ bottom: 12 }}>
        <div><span className="lbl">VIEW:</span> standings · diorama</div>
        <div className="hint">
          <span className="key">ESC</span> back &nbsp;
          <span className="key">←→</span> change season &nbsp;
          <span className="key">TAB</span> switch view
        </div>
      </div>

      <div className="scanlines" />
      <div className="chroma" />
      <div className="crt-vignette" />
    </div>
  );
}

Object.assign(window, { MenuA, MenuB, PlacardStandings, PlacardDiorama });
