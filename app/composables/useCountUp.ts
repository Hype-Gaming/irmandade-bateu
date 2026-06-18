import type { Ref } from 'vue'

// Anima um número do valor atual até o alvo via requestAnimationFrame.
// Respeita prefers-reduced-motion: vai direto ao alvo.
export const useCountUp = (target: Ref<number | null | undefined>, duration = 800) => {
  const display = ref(0)
  let raf = 0

  const animate = (to: number) => {
    cancelAnimationFrame(raf)
    if (import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      display.value = to
      return
    }
    const from = display.value
    const start = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3) // easeOutCubic
      display.value = from + (to - from) * eased
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
  }

  watch(target, (v) => { if (typeof v === 'number') animate(v) }, { immediate: true })
  onUnmounted(() => cancelAnimationFrame(raf))
  return display
}
