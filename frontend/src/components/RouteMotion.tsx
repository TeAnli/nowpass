import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import gsap from 'gsap'

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function RouteMotion({ children }: { children: ReactNode }) {
  const location = useLocation()
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const element = containerRef.current
    if (!element || prefersReducedMotion()) return

    gsap.killTweensOf(element)
    gsap.fromTo(
      element,
      { autoAlpha: 0, y: 10 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.34,
        ease: 'power2.out',
        clearProps: 'opacity,visibility,transform',
      },
    )

    return () => {
      gsap.killTweensOf(element)
    }
  }, [location.pathname])

  return (
    <div ref={containerRef} className="route-motion">
      {children}
    </div>
  )
}
