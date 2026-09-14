"use client"

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react"

// Public Cloudflare Turnstile sitekey for this widget. Sitekeys are public
// (they ship in the browser), so this is intentionally in code rather than an
// env var — the NEXT_PUBLIC_TURNSTILE_SITE_KEY var proved unreliable to keep in
// sync. The private secret still lives server-side in TURNSTILE_SECRET_KEY.
const SITE_KEY = "0x4AAAAAAEjLnDp1B4-RZJCy"
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string
  reset: (id?: string) => void
  remove: (id?: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

export type TurnstileHandle = { reset: () => void }

/** Whether Turnstile is configured for the client. */
export const turnstileEnabled = Boolean(SITE_KEY)

/**
 * Renders a Cloudflare Turnstile widget and reports its token via `onToken`.
 * Passes an empty string when the token expires, errors, or is reset so the
 * parent form can block submission until a fresh token is available.
 */
export const TurnstileWidget = forwardRef<TurnstileHandle, { onToken: (token: string) => void }>(
  function TurnstileWidget({ onToken }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const widgetIdRef = useRef<string | null>(null)
    // Keep the latest callback without re-running the render effect.
    const onTokenRef = useRef(onToken)
    onTokenRef.current = onToken

    useImperativeHandle(ref, () => ({
      reset() {
        if (window.turnstile && widgetIdRef.current) {
          window.turnstile.reset(widgetIdRef.current)
          onTokenRef.current("")
        }
      },
    }))

    useEffect(() => {
      if (!SITE_KEY) return
      let cancelled = false
      let poll: ReturnType<typeof setInterval> | undefined

      function renderWidget() {
        if (cancelled || !containerRef.current || !window.turnstile || widgetIdRef.current) return
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          theme: "auto",
          // Turnstile Spin telemetry marker (account-level aggregate only).
          action: "turnstile-spin-v2",
          callback: (token: string) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(""),
          "error-callback": () => onTokenRef.current(""),
        })
      }

      if (window.turnstile) {
        renderWidget()
      } else {
        if (!document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
          const script = document.createElement("script")
          script.src = SCRIPT_SRC
          script.async = true
          script.defer = true
          document.head.appendChild(script)
        }
        // The script may already be loading; poll until the API is available.
        poll = setInterval(() => {
          if (window.turnstile) {
            clearInterval(poll)
            renderWidget()
          }
        }, 100)
      }

      return () => {
        cancelled = true
        if (poll) clearInterval(poll)
        if (window.turnstile && widgetIdRef.current) {
          window.turnstile.remove(widgetIdRef.current)
          widgetIdRef.current = null
        }
      }
    }, [])

    if (!SITE_KEY) return null

    return <div ref={containerRef} className="min-h-[65px]" />
  },
)
