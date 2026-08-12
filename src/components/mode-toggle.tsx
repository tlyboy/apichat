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

    // 键盘 / 程序化触发的 click，detail 为 0 且 clientX/Y 也是 0，
    // 直接用会让圆心落到视口左上角，所以退回到按钮中心。
    // currentTarget 在 handler 返回后会被 React 置空，必须同步读。
    let x = event.clientX
    let y = event.clientY
    if (event.detail === 0) {
      const rect = event.currentTarget.getBoundingClientRect()
      x = rect.left + rect.width / 2
      y = rect.top + rect.height / 2
    }

    // 圆心和半径一律用百分比，不用像素。::view-transition-old/new(root) 的内容是
    // devicePixelRatio 倍的快照，像素长度会按快照尺寸解析再缩回视口，dPR=2 时坐标
    // 被砍半、圆心朝左上偏且半径盖不满屏。百分比相对伪元素自身盒子解析，不受影响。
    const cx = (x / window.innerWidth) * 100
    const cy = (y / window.innerHeight) * 100
    // circle() 的百分比半径基准是 sqrt(w² + h²) / sqrt(2)
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
      // setTheme 只 setState，真正写 class 的那段在 useEffect 里。不 flushSync 的话
      // 回调返回时 DOM 还是旧主题，新旧快照一样，动画等于没跑；而 CSS 若用 .dark
      // 切 z-index，class 滞后还会让被动画的那层排到下层被完全盖住。
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
        // fill: 'forwards' 的动画结束后不会自己消失，会一直挂在 documentElement 上。
        // 每切一次多积一条，下一轮过渡的同名伪元素会被上一轮残留继续写 clip-path。
        void transition.finished.finally(() => animation.cancel())
      })
      // 过渡被打断（连点、路由切换）时 ready 会 reject 成 InvalidStateError。
      // 主题此时已经切好了，catch 挂在 then 之后才能盖住派生的那条链。
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
