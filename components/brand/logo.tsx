import { cn } from "@/lib/utils"

/**
 * RoboReady wordmark. The mark is a hexagonal "readiness" node with a
 * signal dot — technical, not a literal robot.
 */
export function Logo({
  className,
  showWordmark = true,
  invert = false,
}: {
  className?: string
  showWordmark?: boolean
  invert?: boolean
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="size-6 shrink-0"
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
            "text-base font-semibold tracking-tight",
            invert ? "text-sidebar-foreground" : "text-foreground",
          )}
        >
          Robo<span className={invert ? "text-sidebar-primary" : "text-primary"}>Ready</span>
        </span>
      )}
    </span>
  )
}
