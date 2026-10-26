import gsap from 'gsap'

export const GSAP_EASE = {
  entrance: 'power2.out',
  spring: 'back.out(1.3)',
  exit: 'power1.in',
} as const

export function canAnimate(): boolean {
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function animateIn(target: gsap.TweenTarget, vars: gsap.TweenVars = {}) {
  return gsap.fromTo(
    target,
    { autoAlpha: 0, y: 10 },
    {
      autoAlpha: 1,
      y: 0,
      duration: 0.32,
      ease: GSAP_EASE.entrance,
      clearProps: 'opacity,visibility,transform',
      ...vars,
    },
  )
}

export function animateStagger(target: gsap.TweenTarget, vars: gsap.TweenVars = {}) {
  return gsap.fromTo(
    target,
    { autoAlpha: 0, y: 10 },
    {
      autoAlpha: 1,
      y: 0,
      duration: 0.28,
      ease: GSAP_EASE.entrance,
      stagger: 0.05,
      clearProps: 'opacity,visibility,transform',
      ...vars,
    },
  )
}
