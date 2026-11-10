import { useEffect, useState } from 'react'

// The OS "reduce motion" setting, kept current if it changes while the page is open.
const QUERY = '(prefers-reduced-motion: reduce)'

export function usePrefersReducedMotion() {
    const [reduce, setReduce] = useState(() => window.matchMedia?.(QUERY).matches ?? false)
    useEffect(() => {
        const mq = window.matchMedia?.(QUERY)
        if (!mq) return
        const onChange = () => setReduce(mq.matches)
        mq.addEventListener('change', onChange)
        return () => mq.removeEventListener('change', onChange)
    }, [])
    return reduce
}
