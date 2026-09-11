import { cn } from "@/lib/utils"

type LogoSize = "sm" | "md" | "lg"

// gap / mark / wordmark sizing per scale. "lg" is ~2x "sm" for hero surfaces.
const SIZE_STYLES: Record<LogoSize, { gap: string; mark: string; text: string }> = {
  sm: { gap: "gap-2", mark: "size-6", text: "text-base" },
  md: { gap: "gap-2.5", mark: "size-9", text: "text-xl" },
  lg: { gap: "gap-3", mark: "size-12", text: "text-3xl" },
}

/**
 * RoboReady wordmark. The mark is a hexagonal "readiness" node with a
 * signal dot — technical, not a literal robot.
 */
export function Logo({
  className,
  showWordmark = true,
  invert = false,
  size = "sm",
}: {
  className?: string
  showWordmark?: boolean
  invert?: boolean
  size?: LogoSize
}) {
  const s = SIZE_STYLES[size]
  return (
    <span className={cn("inline-flex items-center", s.gap, className)}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className={cn(s.mark, "shrink-0")}
        aria-hidden="true"
      >
        <path
          d="M12 2 20.66 7v10L12 22 3.34 17V7L12 2Z"
          stroke="currentColor"
          strokeWidth="1.6"
          className={invert ? "text-sidebar-primary" : "text-primary"}
        />
        <circle cx="12" cy="12" r="3" className={invert ? "fill-sidebar-primary" : "fill-primary"} />
      </svg>
      {showWordmark && (
        <span
          className={cn(
            "font-semibold tracking-tight",
            s.text,
            invert ? "text-sidebar-foreground" : "text-foreground",
          )}
        >
          Robo<span className={invert ? "text-sidebar-primary" : "text-primary"}>Ready</span>
        </span>
      )}
    </span>
  )
}
