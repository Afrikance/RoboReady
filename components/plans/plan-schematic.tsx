// Renders a floor/site plan as a clean 2D SVG schematic from normalized
// (0-100) layout data. This is abstract diagram data — not cartographic data —
// so drawing it directly is appropriate.

type Rect = { name: string; kind: string; x: number; y: number; w: number; h: number }
type Point = { x: number; y: number }
type Marker = { x: number; y: number; label: string; kind?: string; role?: string }

// Kinds that should stand out (arrival infrastructure + route endpoints).
const EMPHASIS = new Set([
  "pickup",
  "accessible",
  "overflow",
  "entrance",
  "exit",
  "elevator",
  "start",
  "curb",
])

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, Number.isFinite(n) ? n : lo))
}

export function PlanSchematic({
  rects,
  path,
  markers,
  ariaLabel,
}: {
  rects: Rect[]
  path?: Point[]
  markers?: Marker[]
  ariaLabel: string
}) {
  const safeRects = (rects ?? []).map((r) => ({
    ...r,
    x: clamp(r.x, 0, 100),
    y: clamp(r.y, 0, 100),
    w: clamp(r.w, 1, 100),
    h: clamp(r.h, 1, 100),
  }))
  const safePath = (path ?? []).map((p) => ({ x: clamp(p.x, 0, 100), y: clamp(p.y, 0, 100) }))
  const safeMarkers = (markers ?? []).map((m) => ({ ...m, x: clamp(m.x, 0, 100), y: clamp(m.y, 0, 100) }))

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={ariaLabel}
      className="h-full w-full rounded-md bg-[var(--muted)]/30"
    >
      {/* grid */}
      {Array.from({ length: 9 }, (_, i) => (i + 1) * 10).map((g) => (
        <g key={g} stroke="var(--border)" strokeWidth={0.15} opacity={0.5}>
          <line x1={g} y1={0} x2={g} y2={100} />
          <line x1={0} y1={g} x2={100} y2={g} />
        </g>
      ))}

      {/* spaces / elements */}
      {safeRects.map((r, i) => {
        const emphasis = EMPHASIS.has(r.kind)
        return (
          <g key={i}>
            <rect
              x={r.x}
              y={r.y}
              width={r.w}
              height={r.h}
              rx={1}
              fill={emphasis ? "var(--primary)" : "var(--card)"}
              fillOpacity={emphasis ? 0.16 : 0.9}
              stroke={emphasis ? "var(--primary)" : "var(--border)"}
              strokeWidth={emphasis ? 0.5 : 0.3}
            />
            <text
              x={r.x + r.w / 2}
              y={r.y + r.h / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={r.w > 18 ? 2.6 : 2.1}
              fill="var(--foreground)"
              opacity={0.75}
            >
              {r.name.length > 22 ? `${r.name.slice(0, 21)}…` : r.name}
            </text>
          </g>
        )
      })}

      {/* route */}
      {safePath.length > 1 ? (
        <polyline
          points={safePath.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={0.9}
          strokeDasharray="2 1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}

      {/* markers — labels are stacked with vertical offsets so nearby markers
          (e.g. several points along one route) don't collide, and each label
          carries a light halo stroke to stay legible over the diagram. */}
      {safeMarkers.map((m, i) => {
        const label = m.label.length > 24 ? `${m.label.slice(0, 23)}…` : m.label
        // Alternate above/below and step outward by index to fan out clusters.
        const below = i % 2 === 1
        const step = Math.floor(i / 2)
        const dy = (below ? 3.4 : -2.6) + (below ? 1 : -1) * step * 3.2
        const ty = clamp(m.y + dy, 3, 98)
        const anchorRight = m.x > 78
        return (
          <g key={i}>
            <line
              x1={m.x}
              y1={m.y}
              x2={m.x}
              y2={ty - (below ? 1.6 : -1.6)}
              stroke="var(--primary)"
              strokeWidth={0.25}
              opacity={0.5}
            />
            <circle cx={m.x} cy={m.y} r={1.4} fill="var(--primary)" stroke="var(--background)" strokeWidth={0.4} />
            <text
              x={anchorRight ? m.x - 0.4 : m.x + 0.4}
              y={ty}
              textAnchor={anchorRight ? "end" : "start"}
              fontSize={2.2}
              fontWeight={600}
              fill="var(--primary)"
              stroke="var(--background)"
              strokeWidth={0.6}
              paintOrder="stroke"
            >
              {label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
