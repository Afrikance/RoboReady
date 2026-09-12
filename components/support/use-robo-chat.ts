"use client"

import { useCallback, useRef, useState } from "react"
import { ROBO_GREETING } from "@/lib/support/knowledge"
import type { ChatMessage } from "@/lib/support/types"

type Status = "idle" | "streaming"

const FALLBACK =
  "Sorry — I hit a snag just then. Please try again, or email the team at hello@roboready.app and we'll get right back to you."

export function useRoboChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", content: ROBO_GREETING }])
  const [status, setStatus] = useState<Status>("idle")
  const abortRef = useRef<AbortController | null>(null)

  const send = useCallback(
    async (text: string) => {
      const content = text.trim()
      if (!content || status === "streaming") return

      // The transcript sent to the server excludes the canned greeting so the
      // model isn't confused into thinking it already spoke first.
      const priorTurns = messages.filter((m, i) => !(i === 0 && m.role === "assistant"))
      const outgoing: ChatMessage[] = [...priorTurns, { role: "user", content }]

      setMessages((prev) => [...prev, { role: "user", content }, { role: "assistant", content: "" }])
      setStatus("streaming")

      const controller = new AbortController()
      abortRef.current = controller

      try {
        const res = await fetch("/api/support", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: outgoing,
            pageContext: typeof window !== "undefined" ? window.location.pathname : undefined,
          }),
          signal: controller.signal,
        })

        if (!res.ok || !res.body) throw new Error(`Request failed: ${res.status}`)

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let acc = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          acc += decoder.decode(value, { stream: true })
          setMessages((prev) => {
            const next = [...prev]
            next[next.length - 1] = { role: "assistant", content: acc }
            return next
          })
        }

        // If the model streamed nothing (e.g. tool-only turn), surface a nudge.
        if (!acc.trim()) {
          setMessages((prev) => {
            const next = [...prev]
            next[next.length - 1] = {
              role: "assistant",
              content: "Got it — anything else I can help with?",
            }
            return next
          })
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return
        console.log("[v0] Robo chat error:", (err as Error).message)
        setMessages((prev) => {
          const next = [...prev]
          next[next.length - 1] = { role: "assistant", content: FALLBACK }
          return next
        })
      } finally {
        setStatus("idle")
        abortRef.current = null
      }
    },
    [messages, status],
  )

  return { messages, status, send }
}
