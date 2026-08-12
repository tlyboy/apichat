import { useTheme } from '@/components/theme-provider'
import { flushSync } from 'react-dom'
import { Button } from './ui/button'

export function ModeToggle() {
  const { theme, setTheme } = useTheme()

  function toggleDark(event: React.MouseEvent<HTMLButtonElement>) {
    const isAppearanceTransition =
      typeof document.startViewTransition === 'function' &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const resolvedTheme =
      theme === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : theme
    const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark'

    if (!isAppearanceTransition) {
      setTheme(newTheme)
      return
    }

    // For keyboard- or programmatically triggered clicks, detail, clientX, and clientY are all 0,
    // so using them directly puts the circle center at the top-left of the viewport. Fall back to the button center.
    // React clears currentTarget after the handler returns, so read it synchronously.
    let x = event.clientX
    let y = event.clientY
    if (event.detail === 0) {
      const rect = event.currentTarget.getBoundingClientRect()
      x = rect.left + rect.width / 2
      y = rect.top + rect.height / 2
    }

    // Always use percentages for the center and radius, not pixels. The contents of ::view-transition-old/new(root) are
    // snapshots at devicePixelRatio scale. Pixel lengths are resolved against the snapshot size, then scaled back to the viewport; at dPR=2, coordinates
    // are halved, the center shifts toward the top-left, and the radius no longer covers the whole screen. Percentages are resolved against the pseudo-element's own box and are unaffected.
    const cx = (x / window.innerWidth) * 100
    const cy = (y / window.innerHeight) * 100
    // The percentage radius of circle() is based on sqrt(w² + h²) / sqrt(2)
    const radiusRef =
      Math.hypot(window.innerWidth, window.innerHeight) / Math.SQRT2
    const endPct =
      (Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y),
      ) /
        radiusRef) *
      100

    const transition = document.startViewTransition(() => {
      // setTheme only calls setState; the code that actually writes the class is in useEffect. Without flushSync,
      // the DOM still has the old theme when the callback returns, so the old and new snapshots are identical and the animation effectively does not run. If CSS uses .dark
      // to switch z-index, the delayed class update can also leave the animated layer underneath, completely covered.
      flushSync(() => setTheme(newTheme))
    })

    void transition.ready
      .then(() => {
        const clipPath = [
          `circle(0% at ${cx}% ${cy}%)`,
          `circle(${endPct}% at ${cx}% ${cy}%)`,
        ]
        const animation = document.documentElement.animate(
          {
            clipPath: newTheme === 'dark' ? [...clipPath].reverse() : clipPath,
          },
          {
            duration: 400,
            easing: 'ease-out',
            fill: 'forwards',
            pseudoElement:
              newTheme === 'dark'
                ? '::view-transition-old(root)'
                : '::view-transition-new(root)',
          },
        )
        // An animation with fill: 'forwards' doesn't disappear when it ends; it stays attached to documentElement.
        // One accumulates on each switch, and the same-named pseudo-element in the next transition keeps having its clip-path set by the previous leftover animation.
        void transition.finished.finally(() => animation.cancel())
      })
      // If the transition is interrupted (rapid clicks, route change), ready rejects with InvalidStateError.
      // The theme has already switched, so catch must be attached after then to catch the derived chain.
      .catch(() => {})
  }

  return (
    <Button
      variant="secondary"
      size="icon"
      className="size-8"
      title="切换深色模式"
      onClick={toggleDark}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-4.5"
      >
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
        <path d="M12 3l0 18" />
        <path d="M12 9l4.65 -4.65" />
        <path d="M12 14.3l7.37 -7.37" />
        <path d="M12 19.6l8.85 -8.85" />
      </svg>
    </Button>
  )
}
