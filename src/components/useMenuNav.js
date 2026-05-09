import { useState, useEffect } from 'react'

export default function useMenuNav(count) {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowDown') { setIdx(i => (i + 1) % count); e.preventDefault() }
      else if (e.key === 'ArrowUp') { setIdx(i => (i - 1 + count) % count); e.preventDefault() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [count])
  return [idx, setIdx]
}
