import { cn } from "@/lib/utils"

type LogoSize = "sm" | "md" | "lg"

// gap / mark / wordmark sizing per scale. Bumped up so the brand reads at
// roughly double the previous footprint across the app.
const SIZE_STYLES: Record<LogoSize, { gap: string; mark: string; text: string }> = {
  sm: { gap: "gap-2.5", mark: "size-9", text: "text-xl" },
  md: { gap: "gap-3", mark: "size-12", text: "text-2xl" },
  lg: { gap: "gap-3.5", mark: "size-16", text: "text-4xl" },
}

/**
 * RoboReady brand lockup. When `imageUrl` is set (a workspace's uploaded logo)
 * that image is shown as the mark; otherwise the default SVG — a hexagonal
 * "readiness" node with a signal dot — is drawn.
 */
export function Logo({
  className,
  showWordmark = true,
  invert = false,
  size = "sm",
  imageUrl = null,
}: {
  className?: string
  showWordmark?: boolean
  invert?: boolean
  size?: LogoSize
  imageUrl?: string | null
}) {
  const s = SIZE_STYLES[size]
  return (
    <span className={cn("inline-flex items-center", s.gap, className)}>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- user-supplied arbitrary Blob URL
        <img
          src={imageUrl || "/placeholder.svg"}
          alt="Workspace logo"
          className={cn(s.mark, "shrink-0 rounded-md object-contain")}
        />
      ) : (
        <svg viewBox="0 0 24 24" fill="none" className={cn(s.mark, "shrink-0")} aria-hidden="true">
          <path
            d="M12 2 20.66 7v10L12 22 3.34 17V7L12 2Z"
            stroke="currentColor"
            strokeWidth="1.6"
            className={invert ? "text-sidebar-primary" : "text-primary"}
          />
          <circle cx="12" cy="12" r="3" className={invert ? "fill-sidebar-primary" : "fill-primary"} />
        </svg>
      )}
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
