import { useEffect, useState } from 'react'

export function useIsMobile(query = '(max-width: 767px)'): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const media = window.matchMedia(query)
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches)
    media.addEventListener('change', listener)
    setMatches(media.matches)
    return () => media.removeEventListener('change', listener)
  }, [query])

  return matches
}
