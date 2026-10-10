// TowerFX.jsx — atmospheric + victory effects layer for the Tower.
// Renders an absolute-positioned pixel layer that fills its parent. Pixel-snapped.
//
// Props:
//   victory : number  — bump this counter to (re)trigger fireworks/plane/blimp.
//                       Use a counter rather than a bool so retriggers work.
//   ambient : bool    — show twinkling stars + occasional shooting star +
//                       distant plane. Default true.
//
// Usage:
//   <TowerFX victory={victoryKey} />
//   ...then on 10/10:   setVictoryKey(k => k + 1)

import React, { useState, useEffect, useRef, useMemo } from 'react'

  // ---------- pixel font (5×7) ----------
  const FONT = {
    A: ['01110','10001','10001','11111','10001','10001','10001'],
    B: ['11110','10001','10001','11110','10001','10001','11110'],
    C: ['01111','10000','10000','10000','10000','10000','01111'],
    D: ['11110','10001','10001','10001','10001','10001','11110'],
    E: ['11111','10000','10000','11110','10000','10000','11111'],
    F: ['11111','10000','10000','11110','10000','10000','10000'],
    G: ['01111','10000','10000','10011','10001','10001','01111'],
    H: ['10001','10001','10001','11111','10001','10001','10001'],
    I: ['11111','00100','00100','00100','00100','00100','11111'],
    J: ['00011','00001','00001','00001','00001','10001','01110'],
    K: ['10001','10010','10100','11000','10100','10010','10001'],
    L: ['10000','10000','10000','10000','10000','10000','11111'],
    M: ['10001','11011','10101','10001','10001','10001','10001'],
    N: ['10001','11001','10101','10101','10101','10011','10001'],
    O: ['01110','10001','10001','10001','10001','10001','01110'],
    P: ['11110','10001','10001','11110','10000','10000','10000'],
    Q: ['01110','10001','10001','10001','10101','10010','01101'],
    R: ['11110','10001','10001','11110','10100','10010','10001'],
    S: ['01111','10000','10000','01110','00001','00001','11110'],
    T: ['11111','00100','00100','00100','00100','00100','00100'],
    U: ['10001','10001','10001','10001','10001','10001','01110'],
    V: ['10001','10001','10001','10001','10001','01010','00100'],
    W: ['10001','10001','10001','10101','11011','11011','10001'],
    X: ['10001','10001','01010','00100','01010','10001','10001'],
    Y: ['10001','10001','01010','00100','00100','00100','00100'],
    Z: ['11111','00001','00010','00100','01000','10000','11111'],
    '!': ['00100','00100','00100','00100','00100','00000','00100'],
    '?': ['01110','10001','00001','00010','00100','00000','00100'],
    '*': ['00000','10101','01110','11111','01110','10101','00000'],
    '.': ['00000','00000','00000','00000','00000','00000','00100'],
    "'": ['00100','00100','00000','00000','00000','00000','00000'],
    ' ': ['00000','00000','00000','00000','00000','00000','00000'],
  };

  function textGlyphRects(text, color) {
    const lw = 5, lh = 7, gap = 1;
    const out = [];
    const chars = [...text.toUpperCase()];
    let cx = 0;
    chars.forEach((ch) => {
      const glyph = FONT[ch] || FONT[' '];
      for (let ry = 0; ry < lh; ry++) {
        const row = glyph[ry];
        for (let rx = 0; rx < lw; rx++) {
          if (row[rx] === '1') out.push({ x: cx + rx, y: ry, c: color });
        }
      }
      cx += lw + gap;
    });
    return { rects: out, w: chars.length * lw + (chars.length - 1) * gap, h: lh };
  }

  // ---------- stage-size hook ----------
  function useStageSize(ref) {
    const [size, setSize] = useState(null);
    useEffect(() => {
      if (!ref.current) return;
      const update = () => {
        const r = ref.current.getBoundingClientRect();
        setSize({ w: r.width, h: r.height });
      };
      update();
      const ro = new ResizeObserver(update);
      ro.observe(ref.current);
      return () => ro.disconnect();
    }, []);
    return size;
  }

  // ---------- deterministic PRNG so star field is stable ----------
  function mulberry32(seed) {
    return function () {
      let t = (seed += 0x6D2B79F5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // =====================================================================
  // STARS — twinkling pixel field
  // =====================================================================
  function Stars({ W, H }) {
    const stars = useMemo(() => {
      const rng = mulberry32(0xC0FFEE);
      const density = Math.max(40, Math.floor((W * H) / 900));
      const arr = [];
      // sky-only band: ground starts ~62% down (.horizon is 38% tall), so cap
      // stars at 58% to leave a small buffer above the horizon line.
      const SKY_MAX = H * 0.58;
      for (let i = 0; i < density; i++) {
        const big = rng() < 0.15;
        arr.push({
          x: Math.floor(rng() * W),
          y: Math.floor(rng() * SKY_MAX),
          big,
          dim: rng() < 0.35,
          period: 1.4 + rng() * 3.6,
          delay: rng() * 4,
        });
      }
      return arr;
    }, [W, H]);

    return (
      <g>
        {stars.map((s, i) => {
          const baseColor = s.dim ? '#5A6480' : '#E8ECF2';
          const sz = s.big ? 2 : 1;
          return (
            <rect
              key={i}
              x={s.x}
              y={s.y}
              width={sz}
              height={sz}
              fill={baseColor}
            >
              <animate
                attributeName="opacity"
                values="0.25;1;0.25"
                dur={`${s.period}s`}
                begin={`${s.delay}s`}
                repeatCount="indefinite"
              />
            </rect>
          );
        })}
      </g>
    );
  }

  // =====================================================================
  // SHOOTING STAR — diagonal streak, fires every 6–12s
  // =====================================================================
  function ShootingStars({ W, H }) {
    const [shots, setShots] = useState([]);

    useEffect(() => {
      let mounted = true;
      function schedule() {
        const wait = 20000 + Math.random() * 10000;
        setTimeout(() => {
          if (!mounted) return;
          const id = Math.random();
          const fromTop = Math.random() < 0.6;
          // keep streaks entirely within the sky (above the ground at ~62% of H)
          const startX = fromTop ? Math.random() * W * 0.7 : -8;
          const startY = fromTop ? -4 : Math.random() * H * 0.15;
          const dx = 80 + Math.random() * 60;
          // limit dy so the streak endpoint never reaches the ground
          const dyMax = Math.max(20, H * 0.5 - startY);
          const dy = Math.min(dyMax, 25 + Math.random() * 30);
          const dur = 700 + Math.random() * 300;
          setShots((s) => [...s, { id, startX, startY, dx, dy, dur, t0: performance.now() }]);
          setTimeout(() => setShots((s) => s.filter((x) => x.id !== id)), dur + 200);
          schedule();
        }, wait);
      }
      schedule();
      return () => { mounted = false; };
    }, [W, H]);

    return (
      <g>
        {shots.map((s) => (
          <ShootingStar key={s.id} {...s} />
        ))}
      </g>
    );
  }

  function ShootingStar({ startX, startY, dx, dy, dur, t0 }) {
    const [tick, setTick] = useState(0);
    useEffect(() => {
      let raf;
      const loop = () => {
        setTick(performance.now());
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(raf);
    }, []);
    const t = Math.min(1, (tick - t0) / dur);
    if (t <= 0 || t >= 1) return null;
    const hx = startX + dx * t;
    const hy = startY + dy * t;
    // trail of fading particles behind the head
    const trail = [];
    const TR = 7;
    for (let i = 0; i < TR; i++) {
      const f = i / TR;
      const tx = hx - dx * 0.06 * (i + 1);
      const ty = hy - dy * 0.06 * (i + 1);
      trail.push({ x: Math.round(tx), y: Math.round(ty), o: (1 - f) * 0.8 });
    }
    return (
      <g>
        {trail.map((p, i) => (
          <rect key={i} x={p.x} y={p.y} width={1} height={1} fill="#E8ECF2" opacity={p.o} />
        ))}
        <rect x={Math.round(hx)} y={Math.round(hy)} width={2} height={2} fill="#FFFFFF" />
      </g>
    );
  }

  // =====================================================================
  // DISTANT PLANE — tiny dot with a slow blink crosses the upper sky
  // =====================================================================
  function DistantPlanes({ W, H }) {
    const [planes, setPlanes] = useState([]);

    useEffect(() => {
      let mounted = true;
      function schedule() {
        const wait = 12000 + Math.random() * 16000;
        setTimeout(() => {
          if (!mounted) return;
          const id = Math.random();
          const ltr = Math.random() < 0.5;
          const y = 10 + Math.random() * (H * 0.25);
          const dur = 24000 + Math.random() * 8000;
          setPlanes((p) => [...p, { id, ltr, y, dur, t0: performance.now() }]);
          setTimeout(() => setPlanes((p) => p.filter((x) => x.id !== id)), dur + 200);
          schedule();
        }, wait);
      }
      schedule();
      return () => { mounted = false; };
    }, [W, H]);

    return (
      <g>
        {planes.map((p) => (
          <DistantPlane key={p.id} {...p} W={W} />
        ))}
      </g>
    );
  }

  function DistantPlane({ ltr, y, dur, t0, W }) {
    const [tick, setTick] = useState(0);
    useEffect(() => {
      let raf;
      const loop = () => {
        setTick(performance.now());
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(raf);
    }, []);
    const t = Math.max(0, Math.min(1, (tick - t0) / dur));
    const x = Math.round(ltr ? -6 + (W + 12) * t : W + 6 - (W + 12) * t);
    const blink = Math.floor((tick - t0) / 400) % 2 === 0;
    return (
      <g>
        <rect x={x} y={Math.round(y)} width={2} height={1} fill="#9098A4" />
        <rect x={x + (ltr ? 2 : -1)} y={Math.round(y)} width={1} height={1} fill={blink ? '#FF8868' : '#7A2A18'} />
      </g>
    );
  }

  // =====================================================================
  // FIREWORKS — staggered radial bursts on victory
  // =====================================================================
  const BURST_COLORS = ['#FFD24A', '#FF8868', '#FFE08A', '#7ED957', '#FF8AC8', '#5BC0EB', '#C26A3A'];

  function Fireworks({ W, H, victory }) {
    const [bursts, setBursts] = useState([]);
    const lastV = useRef(0);

    useEffect(() => {
      if (victory === lastV.current) return;
      lastV.current = victory;
      if (victory === 0) return;

      const timers = [];
      const TOTAL = 9;
      for (let i = 0; i < TOTAL; i++) {
        timers.push(setTimeout(() => {
          const cx = Math.floor(W * (0.15 + Math.random() * 0.7));
          const cy = Math.floor(H * (0.15 + Math.random() * 0.25));
          const color = BURST_COLORS[Math.floor(Math.random() * BURST_COLORS.length)];
          const id = Math.random();
          // tiny rocket-rise streak before the burst
          const riseId = Math.random();
          setBursts((b) => [...b, { kind: 'rise', id: riseId, cx, cy: H - 4, targetY: cy, color, t0: performance.now() }]);
          setTimeout(() => {
            setBursts((b) => b.filter((x) => x.id !== riseId));
            setBursts((b) => [...b, { kind: 'burst', id, cx, cy, color, t0: performance.now() }]);
            setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 2400);
          }, 700);
        }, 200 + i * 600));
      }
      return () => timers.forEach(clearTimeout);
    }, [victory, W, H]);

    return (
      <g>
        {bursts.map((b) => b.kind === 'rise'
          ? <RocketRise key={b.id} {...b} />
          : <Burst key={b.id} {...b} />)}
      </g>
    );
  }

  function RocketRise({ cx, cy, targetY, color, t0 }) {
    const [tick, setTick] = useState(0);
    useEffect(() => {
      let raf;
      const loop = () => { setTick(performance.now()); raf = requestAnimationFrame(loop); };
      raf = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(raf);
    }, []);
    const t = Math.min(1, (tick - t0) / 700);
    const y = cy + (targetY - cy) * t;
    return (
      <g>
        <rect x={cx} y={Math.round(y)} width={1} height={2} fill={color} />
        <rect x={cx} y={Math.round(y) + 2} width={1} height={1} fill={color} opacity={0.6} />
        <rect x={cx} y={Math.round(y) + 3} width={1} height={1} fill={color} opacity={0.3} />
      </g>
    );
  }

  function Burst({ cx, cy, color, t0 }) {
    const [tick, setTick] = useState(0);
    useEffect(() => {
      let raf;
      const loop = () => { setTick(performance.now()); raf = requestAnimationFrame(loop); };
      raf = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(raf);
    }, []);

    const N = 22;
    const particles = useMemo(() => {
      return Array.from({ length: N }, (_, i) => {
        const angle = (i / N) * Math.PI * 2 + Math.random() * 0.18;
        const speed = 14 + Math.random() * 10;
        return { angle, speed };
      });
    }, []);

    const t = Math.max(0, (tick - t0) / 1000); // seconds
    if (t > 2.4) return null;
    const G = 9; // gravity
    const opacity = Math.max(0, 1 - t / 1.6);

    return (
      <g>
        {/* central flash for the first 100ms */}
        {t < 0.12 && (
          <rect x={cx - 2} y={cy - 2} width={4} height={4} fill="#FFFFFF" />
        )}
        {particles.map((p, i) => {
          const x = cx + Math.cos(p.angle) * p.speed * t;
          const y = cy + Math.sin(p.angle) * p.speed * t + 0.5 * G * t * t;
          const c = (i % 4 === 0) ? '#FFFFFF' : color;
          return (
            <rect
              key={i}
              x={Math.round(x)}
              y={Math.round(y)}
              width={1}
              height={1}
              fill={c}
              opacity={opacity}
            />
          );
        })}
      </g>
    );
  }

  // =====================================================================
  // BANNER PLANE — crosses upper third, banner says "YOU FUCKING DID IT!"
  // =====================================================================
  const PLANE_BODY = (color) => [
    { x: 0, y: 2, w: 4, h: 2, c: color.dark },     // tail
    { x: 3, y: 1, w: 7, h: 4, c: color.dark },     // body
    { x: 5, y: 0, w: 5, h: 2, c: color.dark },     // cockpit hump
    { x: 6, y: 1, w: 3, h: 1, c: '#7DD3FC' },      // window
    { x: 10, y: 2, w: 6, h: 1, c: color.dark },    // nose
    { x: 10, y: 3, w: 3, h: 1, c: color.dark },
    { x: 1, y: 0, w: 2, h: 1, c: color.dark },     // tail fin
    { x: 1, y: 1, w: 1, h: 1, c: color.dark },
    { x: 4, y: 5, w: 4, h: 1, c: color.dark },     // wing (under)
    { x: 4, y: 4, w: 6, h: 1, c: color.mid },
    { x: 15, y: 2, w: 1, h: 1, c: color.hi },      // prop
  ];

  function BannerPlane({ W, H, victory }) {
    const [run, setRun] = useState(null);
    const lastV = useRef(0);

    useEffect(() => {
      if (victory === lastV.current) return;
      lastV.current = victory;
      if (victory === 0) { setRun(null); return; }
      // small delay after fireworks start
      const t = setTimeout(() => {
        setRun({ id: Math.random(), t0: performance.now(), y: Math.floor(H * 0.18) });
      }, 1500);
      return () => clearTimeout(t);
    }, [victory, H]);

    if (!run) return null;
    return <BannerPlaneRun {...run} W={W} H={H} onDone={() => setRun(null)} />;
  }

  function BannerPlaneRun({ t0, y, W, H, onDone }) {
    const [tick, setTick] = useState(0);
    useEffect(() => {
      let raf;
      const loop = () => { setTick(performance.now()); raf = requestAnimationFrame(loop); };
      raf = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(raf);
    }, []);

    const DUR = 16000;
    const t = (tick - t0) / DUR;
    useEffect(() => { if (t >= 1.05) onDone && onDone(); });
    if (t >= 1.05) return null;

    const MSG = textGlyphRects('YOU FUCKING DID IT!', '#FFE08A');
    const bannerPadX = 3, bannerPadY = 2;
    const bannerW = MSG.w + bannerPadX * 2;
    const bannerH = MSG.h + bannerPadY * 2;
    const planeW = 17;
    const ropeLen = 4;
    const totalW = planeW + ropeLen + bannerW;

    // travel right-to-left. Plane faces LEFT (direction of travel), banner
    // trails to the RIGHT — banner's left edge ("YOU") enters the screen first.
    const planeX = Math.round(W + totalW + 8 - (W + totalW * 2 + 16) * t);
    const bob = Math.round(Math.sin((tick - t0) / 350) * 1.2);
    const yy = y + bob;
    const ropeX = planeX + planeW;
    const bannerX = ropeX + ropeLen;

    // propeller flicker frame (every 60ms toggles)
    const propFrame = Math.floor((tick - t0) / 60) % 2;

    const planeColor = { dark: '#1A1F26', mid: '#5A6470', hi: '#D2D8E0' };
    const planeRects = PLANE_BODY(planeColor);

    return (
      <g>
        {/* plane sprite — flipped horizontally to face LEFT */}
        <g transform={`translate(${planeX + planeW},${yy}) scale(-1,1)`}>
          {planeRects.map((r, i) => (
            <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.c} />
          ))}
          {/* propeller swirl (in pre-flip sprite coords this is the nose) */}
          {propFrame === 0
            ? <rect x={16} y={1} width={1} height={4} fill="#E0E5EC" opacity="0.7" />
            : <rect x={16} y={2} width={1} height={2} fill="#E0E5EC" />}
        </g>

        {/* rope from plane (now on the left) to banner (trailing right) */}
        <rect x={ropeX} y={yy + 3} width={ropeLen} height={1} fill="#3A2A0E" />

        {/* banner background */}
        <rect x={bannerX} y={yy} width={bannerW} height={bannerH} fill="#7E2A4E" />
        <rect x={bannerX} y={yy} width={bannerW} height={1} fill="#A8527A" />
        <rect x={bannerX} y={yy + bannerH - 1} width={bannerW} height={1} fill="#3A1024" />
        {/* tasseled trailing edge on the far right */}
        <rect x={bannerX + bannerW - 1} y={yy} width={1} height={bannerH} fill="#3A1024" />

        {/* banner text */}
        <g transform={`translate(${bannerX + bannerPadX},${yy + bannerPadY})`}>
          {MSG.rects.map((r, i) => (
            <rect key={i} x={r.x} y={r.y} width={1} height={1} fill={r.c} />
          ))}
        </g>
      </g>
    );
  }

  // =====================================================================
  // BLIMP — ambient slow drift across the sky with a rotating marquee
  // =====================================================================
  //
  // Schedule: first appearance 6–9s after mount, then every 45–75s.
  // Picks a random message each run.
  const BLIMP_MESSAGES = ['GO LIONS', 'WHO DEY'];

  function Blimp({ W, H }) {
    const [runs, setRuns] = useState([]);

    useEffect(() => {
      let mounted = true;
      function schedule(initial) {
        const wait = initial ? (6000 + Math.random() * 3000)
                             : (45000 + Math.random() * 30000);
        setTimeout(() => {
          if (!mounted) return;
          const id = Math.random();
          const y = Math.floor(H * (0.18 + Math.random() * 0.18));
          const dur = 30000 + Math.random() * 10000;
          const msg = BLIMP_MESSAGES[Math.floor(Math.random() * BLIMP_MESSAGES.length)];
          setRuns((r) => [...r, { id, t0: performance.now(), y, dur, msg }]);
          setTimeout(() => setRuns((r) => r.filter((x) => x.id !== id)), dur + 200);
          schedule(false);
        }, wait);
      }
      schedule(true);
      return () => { mounted = false; };
    }, [W, H]);

    return (
      <g>
        {runs.map((r) => (
          <BlimpRun key={r.id} {...r} W={W} H={H} />
        ))}
      </g>
    );
  }

  function BlimpRun({ t0, y, dur, msg, W, H }) {
    const [tick, setTick] = useState(0);
    useEffect(() => {
      let raf;
      const loop = () => { setTick(performance.now()); raf = requestAnimationFrame(loop); };
      raf = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(raf);
    }, []);

    const t = (tick - t0) / dur;
    if (t >= 1.05) return null;

    // blimp dimensions — taller body so it feels properly substantial
    const BW = 72, BH = 24;
    const totalW = BW + 8;
    const x = Math.round(-totalW + (W + totalW * 2) * t);
    const bob = Math.round(Math.sin((tick - t0) / 600) * 1.4);
    const yy = y + bob;

    const MSG = textGlyphRects(msg, '#FFE08A');
    const blinkIdx = Math.floor((tick - t0) / 220) % (msg.length + 2);
    const textW = MSG.w;
    const panelInset = 10;
    const panelW = BW - panelInset * 2;
    const textX = Math.floor((panelW - textW) / 2);
    // vertically center marquee panel on the blimp body
    const panelH = MSG.h + 4;
    const panelY = yy + Math.floor((BH - panelH) / 2);

    return (
      <g>
        {/* tail fins (left side) */}
        <polygon
          points={`${x - 3},${yy + 4} ${x + 9},${yy + BH / 2} ${x - 3},${yy + BH - 4}`}
          fill="#3A4050"
        />
        <polygon
          points={`${x + 9},${yy + BH / 2} ${x + 2},${yy + 2} ${x + 9},${yy + 6}`}
          fill="#5A6470"
        />
        <polygon
          points={`${x + 9},${yy + BH / 2} ${x + 2},${yy + BH - 2} ${x + 9},${yy + BH - 6}`}
          fill="#5A6470"
        />

        {/* body */}
        <ellipse cx={x + BW / 2} cy={yy + BH / 2} rx={BW / 2} ry={BH / 2} fill="#9098A4" />
        <ellipse cx={x + BW / 2} cy={yy + BH / 2 - 1} rx={BW / 2 - 2} ry={BH / 2 - 1} fill="#B8C0CC" />
        {/* top highlight */}
        <ellipse cx={x + BW / 2 - 6} cy={yy + 4} rx={BW / 2 - 18} ry={1} fill="#D2D8E0" />
        {/* belly shadow */}
        <ellipse cx={x + BW / 2} cy={yy + BH - 4} rx={BW / 2 - 8} ry={1} fill="#5A6470" opacity="0.7" />

        {/* dark marquee panel */}
        <rect x={x + panelInset} y={panelY} width={panelW} height={panelH} fill="#1A1F26" />
        <rect x={x + panelInset} y={panelY} width={panelW} height={1} fill="#3A2A0E" />
        <rect x={x + panelInset} y={panelY + panelH - 1} width={panelW} height={1} fill="#3A2A0E" />

        {/* marquee text with running letter-by-letter lit blink */}
        <g transform={`translate(${x + panelInset + textX},${panelY + 2})`}>
          {MSG.rects.map((r, i) => {
            const letterIdx = Math.floor(r.x / 6);
            const lit = letterIdx <= blinkIdx;
            const c = lit ? '#FFE08A' : '#7A5818';
            return <rect key={i} x={r.x} y={r.y} width={1} height={1} fill={c} />;
          })}
        </g>

        {/* gondola */}
        <rect x={x + BW / 2 - 6} y={yy + BH} width={12} height={3} fill="#1A1F26" />
        <rect x={x + BW / 2 - 5} y={yy + BH + 3} width={10} height={1} fill="#1A1F26" />
        <rect x={x + BW / 2 - 5} y={yy + BH} width={1} height={1} fill="#3A4050" />
        <rect x={x + BW / 2 + 4} y={yy + BH} width={1} height={1} fill="#3A4050" />
        {/* gondola windows */}
        <rect x={x + BW / 2 - 3} y={yy + BH + 1} width={1} height={1} fill="#FFE08A" />
        <rect x={x + BW / 2 - 1} y={yy + BH + 1} width={1} height={1} fill="#FFE08A" />
        <rect x={x + BW / 2 + 1} y={yy + BH + 1} width={1} height={1} fill="#FFE08A" />

        {/* nose strobe */}
        {Math.floor((tick - t0) / 350) % 2 === 0 && (
          <rect x={x + BW - 1} y={yy + BH / 2} width={2} height={1} fill="#FF8868" />
        )}
      </g>
    );
  }

  // =====================================================================
  // TRAIN — locomotive + boxcars rolling along the tracks at the horizon.
  // Cadence ~60–110s. The actual stage paints a 'dirt stripe' inside its
  // .horizon::after pseudo-element — we position the train so its wheels
  // ride along that stripe (≈74% of stage height).
  // =====================================================================
  function Train({ W, H }) {
    const [runs, setRuns] = useState([]);

    useEffect(() => {
      let mounted = true;
      function schedule(initial) {
        const wait = initial ? (8000 + Math.random() * 6000)
                             : (60000 + Math.random() * 50000);
        setTimeout(() => {
          if (!mounted) return;
          const id = Math.random();
          const dur = 14000 + Math.random() * 4000;
          setRuns((r) => [...r, { id, t0: performance.now(), dur }]);
          setTimeout(() => setRuns((r) => r.filter((x) => x.id !== id)), dur + 200);
          schedule(false);
        }, wait);
      }
      schedule(true);
      return () => { mounted = false; };
    }, [W, H]);

    return (
      <g>
        {runs.map((r) => (
          <TrainRun key={r.id} {...r} W={W} H={H} />
        ))}
      </g>
    );
  }

  // Boxcar sprite (15 wide × 7 tall + 2 wheels under).
  //   color   : body fill
  //   accent  : roof/edge dark
  function Boxcar({ x, y, color, accent = '#1A1A1A', wheelFrame }) {
    return (
      <g>
        {/* roof shadow */}
        <rect x={x} y={y - 7} width={15} height={1} fill={accent} />
        {/* body */}
        <rect x={x} y={y - 6} width={15} height={6} fill={color} />
        {/* upper highlight */}
        <rect x={x + 1} y={y - 6} width={13} height={1} fill="#FFFFFF" opacity="0.08" />
        {/* lower shadow */}
        <rect x={x} y={y - 1} width={15} height={1} fill="#000000" opacity="0.35" />
        {/* door */}
        <rect x={x + 6} y={y - 5} width={4} height={4} fill={accent} opacity="0.7" />
        <rect x={x + 7} y={y - 5} width={1} height={4} fill="#FFFFFF" opacity="0.08" />
        <rect x={x + 8} y={y - 3} width={1} height={1} fill="#888" />
        {/* ribbed siding */}
        <rect x={x + 2} y={y - 5} width={1} height={4} fill="#000000" opacity="0.2" />
        <rect x={x + 4} y={y - 5} width={1} height={4} fill="#000000" opacity="0.2" />
        <rect x={x + 11} y={y - 5} width={1} height={4} fill="#000000" opacity="0.2" />
        <rect x={x + 13} y={y - 5} width={1} height={4} fill="#000000" opacity="0.2" />
        {/* coupler (right side) */}
        <rect x={x + 15} y={y - 1} width={1} height={1} fill="#3A3A3A" />
        {/* wheels */}
        <TrainWheel x={x + 2} y={y} frame={wheelFrame} />
        <TrainWheel x={x + 11} y={y} frame={wheelFrame} />
      </g>
    );
  }

  // Locomotive sprite (24 wide × 7 tall + wheels). Nose on the RIGHT
  // (front of train when traveling left-to-right). Two-tone red/black
  // freight diesel with a yellow safety stripe at the pilot.
  function Locomotive({ x, y, wheelFrame, smokeT }) {
    return (
      <g>
        {/* cab roof (back/left, dark) */}
        <rect x={x} y={y - 8} width={9} height={1} fill="#1A1A1A" />
        {/* cab body */}
        <rect x={x} y={y - 7} width={9} height={6} fill="#7A2A18" />
        {/* cab windows */}
        <rect x={x + 1} y={y - 6} width={2} height={2} fill="#5BC0EB" />
        <rect x={x + 4} y={y - 6} width={2} height={2} fill="#5BC0EB" />
        <rect x={x + 7} y={y - 6} width={1} height={2} fill="#5BC0EB" />

        {/* long hood (front) */}
        <rect x={x + 9} y={y - 6} width={13} height={1} fill="#5A1810" />
        <rect x={x + 9} y={y - 5} width={13} height={4} fill="#7A2A18" />
        {/* hood vents */}
        <rect x={x + 11} y={y - 4} width={1} height={1} fill="#3A1810" />
        <rect x={x + 14} y={y - 4} width={1} height={1} fill="#3A1810" />
        <rect x={x + 17} y={y - 4} width={1} height={1} fill="#3A1810" />
        {/* exhaust stack */}
        <rect x={x + 11} y={y - 7} width={2} height={1} fill="#1A1A1A" />
        <rect x={x + 11} y={y - 8} width={2} height={1} fill="#2A2A2A" />

        {/* nose */}
        <rect x={x + 22} y={y - 5} width={2} height={4} fill="#5A1810" />
        {/* headlight */}
        <rect x={x + 23} y={y - 4} width={1} height={1} fill="#FFE08A" />
        {/* faint headlight beam */}
        <rect x={x + 24} y={y - 4} width={2} height={1} fill="#FFE08A" opacity="0.4" />
        <rect x={x + 24} y={y - 3} width={3} height={1} fill="#FFE08A" opacity="0.2" />

        {/* yellow safety stripe / pilot */}
        <rect x={x + 17} y={y - 1} width={7} height={1} fill="#F5B83A" />
        <rect x={x + 17} y={y} width={7} height={1} fill="#1A1A1A" />

        {/* underframe */}
        <rect x={x} y={y - 1} width={17} height={1} fill="#1A1A1A" />
        <rect x={x} y={y} width={17} height={1} fill="#000000" opacity="0.6" />

        {/* couplers */}
        <rect x={x - 1} y={y - 1} width={1} height={1} fill="#3A3A3A" />

        {/* wheels (3 axles) */}
        <TrainWheel x={x + 2} y={y} frame={wheelFrame} />
        <TrainWheel x={x + 9} y={y} frame={wheelFrame} />
        <TrainWheel x={x + 16} y={y} frame={wheelFrame} />

        {/* smoke puffs rising from stack */}
        {[0, 1, 2, 3].map((i) => {
          const phase = ((smokeT + i * 0.25) % 1);
          const px = Math.round(x + 11 + Math.sin(phase * 6) * 1) - i;
          const py = Math.round(y - 9 - phase * 8);
          const op = (1 - phase) * 0.55;
          if (op <= 0.05) return null;
          return (
            <rect key={i} x={px} y={py} width={2} height={2} fill="#6A6A6A" opacity={op} />
          );
        })}
      </g>
    );
  }

  // 2×2 pixel wheel with a tiny spinning spoke indicator.
  function TrainWheel({ x, y, frame }) {
    // frame: 0..3
    const spoke = frame % 4;
    return (
      <g>
        <rect x={x} y={y} width={2} height={2} fill="#3A3A3A" />
        <rect x={x} y={y + 2} width={2} height={1} fill="#000000" opacity="0.6" />
        {/* spinning hub pixel */}
        {spoke === 0 && <rect x={x} y={y} width={1} height={1} fill="#6A6A6A" />}
        {spoke === 1 && <rect x={x + 1} y={y} width={1} height={1} fill="#6A6A6A" />}
        {spoke === 2 && <rect x={x + 1} y={y + 1} width={1} height={1} fill="#6A6A6A" />}
        {spoke === 3 && <rect x={x} y={y + 1} width={1} height={1} fill="#6A6A6A" />}
      </g>
    );
  }

  function TrainRun({ t0, dur, W, H }) {
    const [tick, setTick] = useState(0);
    useEffect(() => {
      let raf;
      const loop = () => { setTick(performance.now()); raf = requestAnimationFrame(loop); };
      raf = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(raf);
    }, []);

    const t = (tick - t0) / dur;
    if (t >= 1.05) return null;

    // Formation: 3 boxcars + locomotive on the right (heading L→R)
    const LOCO_W = 24;
    const CAR_W = 15;
    const GAP = 2;
    const CAR_COUNT = 4;
    const trainW = LOCO_W + CAR_COUNT * (CAR_W + GAP);

    // x = leftmost pixel of formation
    const x = Math.round(-trainW - 4 + (W + trainW + 8) * t);
    // wheel baseline — tuned so wheels sit on the dirt stripe at ~74% of H
    const baseline = Math.floor(H * 0.81);

    // wheel rotation animation
    const wheelFrame = Math.floor((tick - t0) / 70) % 4;
    // smoke phase clock
    const smokeT = ((tick - t0) / 1200) % 1;

    // Boxcar colors — generic freight palette
    const carPalette = [
      { c: '#5A6470', a: '#1A1F26' }, // grey hopper
      { c: '#3A5B85', a: '#1A1F26' }, // blue tanker-ish
      { c: '#C8621A', a: '#1A1A1A' }, // orange freight car
      { c: '#1A1A1A', a: '#0D0D0D' }, // black (just behind loco)
    ];

    return (
      <g>
        {Array.from({ length: CAR_COUNT }, (_, i) => {
          const car = carPalette[i % carPalette.length];
          return (
            <Boxcar
              key={i}
              x={x + i * (CAR_W + GAP)}
              y={baseline}
              color={car.c}
              accent={car.a}
              wheelFrame={wheelFrame}
            />
          );
        })}
        <Locomotive
          x={x + CAR_COUNT * (CAR_W + GAP)}
          y={baseline}
          wheelFrame={wheelFrame}
          smokeT={smokeT}
        />
      </g>
    );
  }

  // =====================================================================
  // ROOT
  // =====================================================================
  // layer: 'ambient' | 'victory' | 'all'
  //   ambient  → stars / shooting stars / distant plane (typically behind the tower)
  //   victory  → fireworks / banner plane / blimp       (typically in front of the tower)
  //   all      → everything in one layer (legacy, fine when there's no tower to z-order around)
  function TowerFX({ victory = 0, ambient = true, layer = 'all' }) {
    const ref = useRef();
    const size = useStageSize(ref);
    const PX = 4;
    const W = size ? Math.max(40, Math.ceil(size.w / PX)) : 0;
    const H = size ? Math.max(40, Math.ceil(size.h / PX)) : 0;

    const showAmbient = (layer === 'all' || layer === 'ambient') && ambient;
    const showVictory = (layer === 'all' || layer === 'victory');

    return (
      <div
        ref={ref}
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
      >
        {size && <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          shapeRendering="crispEdges"
          style={{ imageRendering: 'pixelated', display: 'block' }}
        >
          {showAmbient && <Stars W={W} H={H} />}
          {showAmbient && <ShootingStars W={W} H={H} />}
          {showAmbient && <DistantPlanes W={W} H={H} />}
          {showAmbient && <Blimp W={W} H={H} />}
          {showAmbient && <Train W={W} H={H} />}
          {showVictory && <Fireworks W={W} H={H} victory={victory} />}
          {showVictory && <BannerPlane W={W} H={H} victory={victory} />}
        </svg>}
      </div>
    );
  }

export default TowerFX
