/* global React */
const { useEffect, useRef, useState, useMemo } = React;

/* ============================================================
   PIXEL PALETTE — chunky 16-color dusk lookup
   Used to quantize the actual tower photo into pixel art.
   ============================================================ */

const DUSK_PALETTE = [
  [10, 8, 32],     // sky deep
  [20, 16, 46],
  [37, 28, 69],
  [74, 38, 84],
  [106, 47, 77],   // plum
  [150, 60, 70],
  [196, 83, 58],   // ember
  [240, 160, 75],  // amber
  [255, 207, 120], // amber glow
  [56, 61, 74],    // tower shadow
  [110, 116, 128], // tower mid
  [144, 151, 163], // tower light
  [207, 210, 220], // tower hi
  [16, 12, 38],    // town silhouette
  [29, 22, 56],    // town silhouette light
  [7, 6, 26]       // ground
];

function nearestColor(palette, r, g, b) {
  let best = palette[0];
  let bestD = Infinity;
  for (let i = 0; i < palette.length; i++) {
    const p = palette[i];
    const dr = r - p[0], dg = g - p[1], db = b - p[2];
    const d = dr*dr + dg*dg*1.4 + db*db; // weight green a bit
    if (d < bestD) { bestD = d; best = p; }
  }
  return best;
}

/* Bayer 4×4 for ordered dithering — gives that genuine 16-bit feel */
const BAYER4 = [
  [ 0, 8, 2,10],
  [12, 4,14, 6],
  [ 3,11, 1, 9],
  [15, 7,13, 5]
];

/* ============================================================
   <PixelPhoto> — paints a photo onto a canvas, downsizes,
   palette-quantizes with dither, draws back at low res with
   image-rendering: pixelated to fill its container.
   ============================================================ */

function PixelPhoto({ src, lowW = 320, lowH = 180, dither = true, tint = 0, style }) {
  const ref = useRef(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      c.width = lowW; c.height = lowH;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;

      // cover-fit
      const ar = img.width / img.height;
      const tar = lowW / lowH;
      let sx, sy, sw, sh;
      if (ar > tar) {
        sh = img.height; sw = sh * tar;
        sx = (img.width - sw) / 2; sy = 0;
      } else {
        sw = img.width; sh = sw / tar;
        sx = 0; sy = (img.height - sh) / 2;
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, lowW, lowH);

      const data = ctx.getImageData(0, 0, lowW, lowH);
      const d = data.data;

      for (let y = 0; y < lowH; y++) {
        for (let x = 0; x < lowW; x++) {
          const i = (y * lowW + x) * 4;
          let r = d[i], g = d[i+1], b = d[i+2];

          // Tint towards dusk warmth (push reds, pull greens)
          if (tint > 0) {
            r = Math.min(255, r + tint * 28);
            g = Math.max(0,   g - tint * 14);
            b = Math.max(0,   b - tint * 6);
          }

          // Bayer dither offset
          if (dither) {
            const off = (BAYER4[y & 3][x & 3] - 7.5) * 4;
            r = Math.max(0, Math.min(255, r + off));
            g = Math.max(0, Math.min(255, g + off));
            b = Math.max(0, Math.min(255, b + off));
          }

          const [pr, pg, pb] = nearestColor(DUSK_PALETTE, r, g, b);
          d[i] = pr; d[i+1] = pg; d[i+2] = pb;
        }
      }
      ctx.putImageData(data, 0, 0);
    };
    img.src = src;
  }, [src, lowW, lowH, dither, tint]);

  return <canvas ref={ref} className="pixel-photo" style={style} />;
}

/* ============================================================
   <PixelTower> — hand-drawn SVG silhouette of the Rockwood tower.
   shape-rendering: crispEdges keeps it on the pixel grid.
   Variants:
     mode="silhouette" — flat dark, for ITB style A
     mode="lit"        — body visible with windows + ROCKWOOD text
   ============================================================ */

function PixelTower({ mode = 'silhouette', scale = 1, glowLight = true }) {
  // Silhouette body color
  const SIL = '#0d0a22';
  const SIL_EDGE = '#0a081e';
  // Lit colors
  const STEEL = '#5e6470';
  const STEEL_HI = '#9097a3';
  const STEEL_LO = '#383d4a';
  const BAND = '#2a2d38';
  const ROCK = '#14151c';

  const body = mode === 'silhouette' ? SIL : STEEL;
  const bodyHi = mode === 'silhouette' ? SIL : STEEL_HI;
  const bodyLo = mode === 'silhouette' ? SIL_EDGE : STEEL_LO;
  const struts = mode === 'silhouette' ? SIL_EDGE : '#2a2d38';

  // Native pixel grid: 96 wide × 128 tall. The viewBox is integer coords
  // so SVG renders truly crisp pixels at any size.
  return (
    <svg
      className="tower-svg"
      viewBox="0 0 96 128"
      width={96 * scale}
      height={128 * scale}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* === TANK BODY (bulbous) === */}
      {/* top dome — rows of rectangles getting wider */}
      <rect x="40" y="14" width="16" height="2" fill={body}/>
      <rect x="36" y="16" width="24" height="2" fill={body}/>
      <rect x="32" y="18" width="32" height="2" fill={body}/>
      <rect x="28" y="20" width="40" height="2" fill={body}/>
      <rect x="24" y="22" width="48" height="2" fill={body}/>
      <rect x="22" y="24" width="52" height="2" fill={body}/>
      <rect x="20" y="26" width="56" height="2" fill={body}/>
      <rect x="18" y="28" width="60" height="2" fill={body}/>
      <rect x="16" y="30" width="64" height="2" fill={body}/>
      <rect x="14" y="32" width="68" height="6" fill={body}/>
      <rect x="12" y="38" width="72" height="14" fill={body}/>
      <rect x="14" y="52" width="68" height="2" fill={body}/>
      <rect x="16" y="54" width="64" height="2" fill={body}/>
      <rect x="20" y="56" width="56" height="2" fill={body}/>
      <rect x="24" y="58" width="48" height="2" fill={body}/>

      {/* highlight rim on left of tank (catches dusk light) */}
      {mode === 'lit' && (
        <>
          <rect x="12" y="38" width="2" height="14" fill={bodyHi}/>
          <rect x="14" y="32" width="2" height="6"  fill={bodyHi}/>
          <rect x="16" y="30" width="2" height="2"  fill={bodyHi}/>
          <rect x="18" y="28" width="2" height="2"  fill={bodyHi}/>
          <rect x="20" y="26" width="2" height="2"  fill={bodyHi}/>
          {/* shadow underside */}
          <rect x="82" y="38" width="2" height="14" fill={bodyLo}/>
          <rect x="80" y="32" width="2" height="6"  fill={bodyLo}/>
          <rect x="14" y="50" width="68" height="2" fill={bodyLo}/>
          {/* horizontal seam */}
          <rect x="14" y="42" width="68" height="1" fill={bodyLo} opacity="0.5"/>
          {/* ROCKWOOD stencil band */}
          <rect x="22" y="38" width="52" height="6" fill="#0e0f15" opacity="0.0"/>
          {/* Letters as 3px-tall pixel glyphs centered around y=40 */}
          <g fill={ROCK}>
            {/* R */}
            <rect x="22" y="40" width="1" height="6"/><rect x="22" y="40" width="4" height="1"/><rect x="22" y="42" width="4" height="1"/><rect x="25" y="41" width="1" height="2"/><rect x="24" y="43" width="2" height="3"/>
            {/* O */}
            <rect x="28" y="40" width="4" height="1"/><rect x="28" y="45" width="4" height="1"/><rect x="28" y="40" width="1" height="6"/><rect x="31" y="40" width="1" height="6"/>
            {/* C */}
            <rect x="34" y="40" width="4" height="1"/><rect x="34" y="40" width="1" height="6"/><rect x="34" y="45" width="4" height="1"/>
            {/* K */}
            <rect x="40" y="40" width="1" height="6"/><rect x="42" y="42" width="1" height="2"/><rect x="43" y="40" width="1" height="2"/><rect x="43" y="44" width="1" height="2"/>
            {/* W */}
            <rect x="46" y="40" width="1" height="6"/><rect x="50" y="40" width="1" height="6"/><rect x="48" y="42" width="1" height="4"/>
            {/* O */}
            <rect x="53" y="40" width="4" height="1"/><rect x="53" y="45" width="4" height="1"/><rect x="53" y="40" width="1" height="6"/><rect x="56" y="40" width="1" height="6"/>
            {/* O */}
            <rect x="59" y="40" width="4" height="1"/><rect x="59" y="45" width="4" height="1"/><rect x="59" y="40" width="1" height="6"/><rect x="62" y="40" width="1" height="6"/>
            {/* D */}
            <rect x="65" y="40" width="3" height="1"/><rect x="65" y="45" width="3" height="1"/><rect x="65" y="40" width="1" height="6"/><rect x="68" y="41" width="1" height="4"/>
          </g>
        </>
      )}

      {/* === SPIRE + AIRCRAFT WARNING LIGHT === */}
      <rect x="46" y="6" width="4" height="8" fill={body}/>
      <rect x="44" y="10" width="8" height="2" fill={body}/>
      <rect x="47" y="2" width="2" height="4" fill={body}/>
      {/* light */}
      <g className={glowLight ? 'tower-light' : ''}>
        <rect x="46" y="0" width="4" height="2" fill="#ff4a3a"/>
        <rect x="47" y="-1" width="2" height="1" fill="#ffd07a"/>
      </g>

      {/* === RAILING GANTRY (thin band under tank) === */}
      <rect x="14" y="60" width="68" height="2" fill={body}/>
      <rect x="14" y="62" width="68" height="1" fill={struts}/>
      {/* railing posts */}
      {Array.from({length: 18}, (_, i) => (
        <rect key={i} x={16 + i*4} y="58" width="1" height="2" fill={struts}/>
      ))}

      {/* === SUPPORT LEGS (4 angled, pixel staircase) === */}
      {/* Outer left */}
      <g fill={struts}>
        <rect x="16" y="62" width="2" height="6"/>
        <rect x="14" y="68" width="2" height="8"/>
        <rect x="12" y="76" width="2" height="10"/>
        <rect x="10" y="86" width="2" height="14"/>
        <rect x="8"  y="100" width="2" height="20"/>
      </g>
      {/* Inner left */}
      <g fill={struts}>
        <rect x="30" y="62" width="2" height="58"/>
      </g>
      {/* Inner right */}
      <g fill={struts}>
        <rect x="64" y="62" width="2" height="58"/>
      </g>
      {/* Outer right */}
      <g fill={struts}>
        <rect x="78" y="62" width="2" height="6"/>
        <rect x="80" y="68" width="2" height="8"/>
        <rect x="82" y="76" width="2" height="10"/>
        <rect x="84" y="86" width="2" height="14"/>
        <rect x="86" y="100" width="2" height="20"/>
      </g>

      {/* === CROSS BRACING === */}
      <g fill={struts} opacity="0.85">
        {/* X braces between legs */}
        <rect x="18" y="74" width="12" height="1"/>
        <rect x="18" y="86" width="12" height="1"/>
        <rect x="18" y="98" width="12" height="1"/>
        <rect x="18" y="110" width="12" height="1"/>
        <rect x="32" y="74" width="32" height="1"/>
        <rect x="32" y="86" width="32" height="1"/>
        <rect x="32" y="98" width="32" height="1"/>
        <rect x="32" y="110" width="32" height="1"/>
        <rect x="66" y="74" width="12" height="1"/>
        <rect x="66" y="86" width="12" height="1"/>
        <rect x="66" y="98" width="12" height="1"/>
        <rect x="66" y="110" width="12" height="1"/>
      </g>

      {/* Ground line (only in lit mode — silhouette blends with bg) */}
      {mode === 'lit' && (
        <rect x="0" y="124" width="96" height="4" fill="#07061a"/>
      )}
    </svg>
  );
}

/* ============================================================
   <Fireflies> — drifting amber pixel dots
   ============================================================ */

function Fireflies({ count = 7, area = { left: 0, right: 100, top: 50, bottom: 90 } }) {
  const flies = useMemo(() =>
    Array.from({length: count}, (_, i) => ({
      id: i,
      x: area.left + Math.random() * (area.right - area.left),
      y: area.top + Math.random() * (area.bottom - area.top),
      d: 6 + Math.random() * 8,
      delay: -Math.random() * 6,
      anim: i % 2 ? 'ff1' : 'ff2'
    })),
    [count, area.left, area.right, area.top, area.bottom]
  );
  return flies.map(f => (
    <span
      key={f.id}
      className="firefly"
      style={{
        left: f.x + '%',
        top: f.y + '%',
        animation: `${f.anim} ${f.d}s ease-in-out ${f.delay}s infinite`
      }}
    />
  ));
}

/* ============================================================
   <DriftingClouds> — pixel cloud band SVG
   ============================================================ */

function DriftingClouds({ y = 30, opacity = 0.55 }) {
  return (
    <svg
      className="clouds"
      style={{ top: y + '%', opacity }}
      viewBox="0 0 320 30"
      preserveAspectRatio="none"
      shapeRendering="crispEdges"
    >
      {/* dithered cloud strips */}
      <g fill="#5c2a4a">
        <rect x="0" y="6" width="320" height="6"/>
        <rect x="0" y="12" width="320" height="4" opacity="0.5"/>
      </g>
      <g fill="#6a2f4d">
        <rect x="20" y="2" width="60" height="4"/>
        <rect x="120" y="4" width="80" height="3"/>
        <rect x="240" y="3" width="50" height="4"/>
      </g>
      <g fill="#8a3a5a">
        <rect x="40" y="0" width="30" height="2"/>
        <rect x="150" y="2" width="40" height="2"/>
        <rect x="260" y="1" width="20" height="2"/>
      </g>
    </svg>
  );
}

/* Expose to other Babel scripts */
Object.assign(window, { PixelPhoto, PixelTower, Fireflies, DriftingClouds });
