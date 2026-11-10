// The dithered dusk backdrop. The images in public/ (tower_320x180.png, tower_wide_400x225.png) were
// baked from the original photos by the runtime dither this component used to run (Bayer 4x4 onto a
// 16-colour dusk palette; see git history before audit Phase 5); each is byte-identical to its old
// canvas output.
export default function PixelPhoto({ src, style }) {
  return <img src={src} className="pixel-photo" style={style} alt="" />
}
