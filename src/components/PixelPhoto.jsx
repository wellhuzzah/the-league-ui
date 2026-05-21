import { useEffect, useState } from 'react'

const DUSK_PALETTE = [
  [10, 8, 32], [20, 16, 46], [37, 28, 69], [74, 38, 84],
  [106, 47, 77], [150, 60, 70], [196, 83, 58], [240, 160, 75],
  [255, 207, 120], [56, 61, 74], [110, 116, 128], [144, 151, 163],
  [207, 210, 220], [16, 12, 38], [29, 22, 56], [7, 6, 26]
]

function nearestColor(palette, r, g, b) {
  let best = palette[0]
  let bestD = Infinity
  for (let i = 0; i < palette.length; i++) {
    const p = palette[i]
    const dr = r - p[0], dg = g - p[1], db = b - p[2]
    const d = dr * dr + dg * dg * 1.4 + db * db
    if (d < bestD) { bestD = d; best = p }
  }
  return best
}

const BAYER4 = [
  [ 0, 8,  2, 10],
  [12, 4, 14,  6],
  [ 3, 11,  1,  9],
  [15,  7, 13,  5]
]

export default function PixelPhoto({ src, lowW = 320, lowH = 180, dither = true, tint = 0, style }) {
  const [dataUrl, setDataUrl] = useState(null)

  useEffect(() => {
    const offscreen = document.createElement('canvas')
    offscreen.width = lowW
    offscreen.height = lowH
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const ctx = offscreen.getContext('2d')
      ctx.imageSmoothingEnabled = false

      const ar = img.width / img.height
      const tar = lowW / lowH
      let sx, sy, sw, sh
      if (ar > tar) {
        sh = img.height; sw = sh * tar
        sx = (img.width - sw) / 2; sy = 0
      } else {
        sw = img.width; sh = sw / tar
        sx = 0; sy = (img.height - sh) / 2
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, lowW, lowH)

      const data = ctx.getImageData(0, 0, lowW, lowH)
      const d = data.data

      for (let y = 0; y < lowH; y++) {
        for (let x = 0; x < lowW; x++) {
          const i = (y * lowW + x) * 4
          let r = d[i], g = d[i + 1], b = d[i + 2]
          if (tint > 0) {
            r = Math.min(255, r + tint * 28)
            g = Math.max(0, g - tint * 14)
            b = Math.max(0, b - tint * 6)
          }
          if (dither) {
            const off = (BAYER4[y & 3][x & 3] - 7.5) * 4
            r = Math.max(0, Math.min(255, r + off))
            g = Math.max(0, Math.min(255, g + off))
            b = Math.max(0, Math.min(255, b + off))
          }
          const [pr, pg, pb] = nearestColor(DUSK_PALETTE, r, g, b)
          d[i] = pr; d[i + 1] = pg; d[i + 2] = pb
        }
      }
      ctx.putImageData(data, 0, 0)
      setDataUrl(offscreen.toDataURL())
    }
    img.src = src
  }, [src, lowW, lowH, dither, tint])

  if (!dataUrl) return null
  return <img src={dataUrl} className="pixel-photo" style={style} alt="" />
}
