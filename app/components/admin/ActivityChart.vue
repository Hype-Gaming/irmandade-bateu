<template>
  <section class="admin-card chart-card">
    <div class="card-header">
      <div class="card-title">
        <h2>Atividade</h2>
        <span class="subtitle-tag">últimos 14 dias</span>
      </div>
      <div class="chart-toggle">
        <button :class="{ active: mode === 'users' }" @click="mode = 'users'">Novos usuários</button>
        <button :class="{ active: mode === 'pix' }" @click="mode = 'pix'">PIX gerados</button>
      </div>
    </div>

    <p v-if="error" class="state-msg error">{{ error }}</p>

    <div v-else-if="loading" class="chart-skeleton">
      <span v-for="n in 14" :key="n" class="skeleton bar-skel" :style="{ height: (20 + (n * 37) % 60) + '%' }" />
    </div>

    <div v-else class="chart-area">
      <svg :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" class="chart-svg">
        <defs>
          <linearGradient id="admAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(0, 204, 255, 0.34)" />
            <stop offset="55%" stop-color="rgba(0, 204, 255, 0.1)" />
            <stop offset="100%" stop-color="rgba(0, 204, 255, 0.015)" />
          </linearGradient>
        </defs>

        <line v-for="g in 4" :key="g" :x1="0" :x2="W" :y1="(H - PAD_B) * g / 4" :y2="(H - PAD_B) * g / 4" class="gridline" />

        <!-- série (re-anima ao trocar o modo) -->
        <g :key="mode" class="series">
          <path :d="areaPath" fill="url(#admAreaGrad)" class="area" />
          <path :d="linePath" pathLength="1" class="line" />
          <circle v-for="(p, i) in points" :key="i" :cx="p.x" :cy="p.y" r="2.4" class="dot" />
        </g>

        <template v-if="avgVal > 0">
          <line :x1="0" :x2="W" :y1="avgY" :y2="avgY" class="avg-line" />
          <text :x="W - 6" :y="avgY - 6" text-anchor="end" class="avg-label">
            média {{ Math.round(avgVal * 10) / 10 }}
          </text>
        </template>

        <!-- guia + ponto destacado no hover -->
        <template v-if="hoverPoint">
          <line :x1="hoverPoint.x" :x2="hoverPoint.x" :y1="0" :y2="H - PAD_B" class="hover-guide" />
          <circle :cx="hoverPoint.x" :cy="hoverPoint.y" r="5" class="dot-active" />
        </template>

        <!-- alvos invisíveis de hover (uma faixa por dia) -->
        <rect
          v-for="(p, i) in points"
          :key="`hit-${i}`"
          :x="i * slot"
          :y="0"
          :width="slot"
          :height="H"
          class="hit"
          @mouseenter="hoverIdx = i"
          @mouseleave="hoverIdx = -1"
        />
      </svg>

      <div class="chart-labels">
        <span v-for="(d, i) in days" :key="d.date" class="chart-label">
          {{ i % 2 === 0 ? shortDate(d.date) : '' }}
        </span>
      </div>

      <div v-if="hoverIdx >= 0 && days[hoverIdx]" class="chart-tooltip" :style="tooltipStyle">
        <strong>{{ shortDate(days[hoverIdx].date) }}</strong>
        <span v-if="mode === 'users'">{{ days[hoverIdx].newUsers }} novo(s) usuário(s)</span>
        <template v-else>
          <span>{{ days[hoverIdx].pixCount }} PIX</span>
          <span class="tt-sum">{{ formatBRL(days[hoverIdx].pixSum) }}</span>
        </template>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
interface DayPoint { date: string; newUsers: number; pixCount: number; pixSum: number }

const props = defineProps<{ days: DayPoint[]; loading: boolean; error: string }>()

const mode = ref<'users' | 'pix'>('users')
const hoverIdx = ref(-1)

const W = 700
const H = 220
const PAD_B = 6
const INNER_H = H - PAD_B - 14 // reserva topo p/ rótulo da média
const slot = computed(() => W / Math.max(1, props.days.length))

const value = (d: DayPoint) => (mode.value === 'users' ? d.newUsers : d.pixCount)
const maxVal = computed(() => Math.max(1, ...props.days.map(value)))

const yOf = (v: number) => H - PAD_B - (v / maxVal.value) * INNER_H

const points = computed(() =>
  props.days.map((d, i) => ({ x: slot.value * i + slot.value / 2, y: yOf(value(d)) }))
)

// curva suave (Catmull-Rom -> Bézier cúbica)
const linePath = computed(() => {
  const p = points.value
  if (!p.length) return ''
  if (p.length === 1) return `M ${p[0].x},${p[0].y}`
  let d = `M ${p[0].x},${p[0].y}`
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] || p[i]
    const p1 = p[i]
    const p2 = p[i + 1]
    const p3 = p[i + 2] || p2
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`
  }
  return d
})

const areaPath = computed(() => {
  const p = points.value
  if (!p.length) return ''
  const bottom = H - PAD_B
  return `${linePath.value} L ${p[p.length - 1].x},${bottom} L ${p[0].x},${bottom} Z`
})

const avgVal = computed(() => {
  if (!props.days.length) return 0
  return props.days.reduce((s, d) => s + value(d), 0) / props.days.length
})
const avgY = computed(() => H - PAD_B - (avgVal.value / maxVal.value) * INNER_H)

const hoverPoint = computed(() => (hoverIdx.value >= 0 ? points.value[hoverIdx.value] : null))

const shortDate = (iso: string) => {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

const tooltipStyle = computed(() => {
  const pct = ((hoverIdx.value + 0.5) / Math.max(1, props.days.length)) * 100
  return { left: `clamp(60px, ${pct}%, calc(100% - 70px))` }
})

watch(mode, () => { hoverIdx.value = -1 })
</script>

<style scoped>
.admin-card {
  background: #101010;
  border: 1px solid #1f1f1f;
  border-radius: 16px;
  padding: 22px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.card-title h2 {
  font-size: 17px;
  font-weight: 700;
}

.subtitle-tag {
  font-size: 12px;
  color: #777;
}

.chart-toggle {
  display: flex;
  gap: 6px;
  background: #161616;
  border: 1px solid #242424;
  border-radius: 10px;
  padding: 4px;
}

.chart-toggle button {
  border: none;
  background: transparent;
  color: #999;
  font-size: 13px;
  font-weight: 600;
  padding: 7px 13px;
  border-radius: 7px;
  cursor: pointer;
  transition: all 0.18s;
}

.chart-toggle button.active {
  background: rgba(0, 204, 255, 0.12);
  color: #00ccff;
}

.chart-area {
  position: relative;
}

.chart-svg {
  width: 100%;
  height: 220px;
  display: block;
  overflow: visible;
}

.gridline {
  stroke: #1c1c1c;
  stroke-width: 1;
}

.area {
  animation: admin-area-in 0.6s var(--adm-ease) both;
}

.line {
  fill: none;
  stroke: #00ccff;
  stroke-width: 2.4;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: drop-shadow(0 2px 6px rgba(0, 204, 255, 0.45));
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: admin-line-draw 0.9s var(--adm-ease) forwards;
}

.dot {
  fill: #0b0b0b;
  stroke: #00ccff;
  stroke-width: 1.6;
  opacity: 0;
  animation: admin-dot-in 0.3s ease forwards;
  animation-delay: 0.55s;
}

.dot-active {
  fill: #00ccff;
  stroke: #0b0b0b;
  stroke-width: 2;
  filter: drop-shadow(0 0 8px rgba(0, 204, 255, 0.8));
}

.hover-guide {
  stroke: rgba(0, 204, 255, 0.35);
  stroke-width: 1;
  stroke-dasharray: 3 3;
}

.hit {
  fill: transparent;
  cursor: pointer;
}

.avg-line {
  stroke: rgba(245, 197, 66, 0.45);
  stroke-width: 1;
  stroke-dasharray: 5 5;
}

.avg-label {
  fill: rgba(245, 197, 66, 0.7);
  font-size: 11px;
  font-weight: 600;
}

.chart-labels {
  display: flex;
  margin-top: 6px;
}

.chart-label {
  flex: 1;
  text-align: center;
  font-size: 10.5px;
  color: #666;
  font-variant-numeric: tabular-nums;
}

.chart-tooltip {
  position: absolute;
  top: -8px;
  transform: translateX(-50%);
  background: #1c1c1c;
  border: 1px solid #2e2e2e;
  border-radius: 9px;
  padding: 7px 11px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  color: #ddd;
  pointer-events: none;
  white-space: nowrap;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.45);
}

.chart-tooltip strong {
  color: #fff;
  font-size: 11px;
}

.tt-sum {
  color: #f5c542;
  font-weight: 700;
}

.chart-skeleton {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  height: 220px;
}

.bar-skel {
  flex: 1;
  border-radius: 4px 4px 0 0;
}

.skeleton {
  display: block;
  background: linear-gradient(90deg, #1a1a1a 25%, #242424 37%, #1a1a1a 63%);
  background-size: 400% 100%;
  animation: shimmer 1.3s ease infinite;
}

@keyframes shimmer {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}

@keyframes admin-line-draw {
  to { stroke-dashoffset: 0; }
}

@keyframes admin-area-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes admin-dot-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.state-msg.error {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 14px;
  padding: 18px 4px;
  color: #ef4444;
}
</style>
