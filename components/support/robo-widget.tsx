"use client"

import { useEffect, useRef, useState } from "react"
import { Bot, Send, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useRoboChat } from "@/components/support/use-robo-chat"

export function RoboWidget() {
  const [open, setOpen] = useState(false)
  const { messages, status, send } = useRoboChat()
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, open])

  function submit() {
    const text = input
    if (!text.trim() || status === "streaming") return
    setInput("")
    void send(text)
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open ? (
        <section
          aria-label="Chat with Robo"
          className="flex h-[min(32rem,calc(100svh-6rem))] w-[min(23rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border bg-card shadow-xl"
        >
          <header className="flex items-center gap-3 border-b bg-secondary/50 px-4 py-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Bot className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight">Robo</p>
              <p className="truncate text-xs text-muted-foreground">RoboReady contact &amp; support</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed text-pretty",
                    m.role === "user"
                      ? "rounded-br-sm bg-primary text-primary-foreground"
                      : "rounded-bl-sm bg-muted text-foreground",
                  )}
                >
                  {m.content ||
                    (status === "streaming" && i === messages.length - 1 ? (
                      <span className="inline-flex gap-1" aria-label="Robo is typing">
                        <Dot /> <Dot delay="150ms" /> <Dot delay="300ms" />
                      </span>
                    ) : null)}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t bg-background p-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  // Enter submits, Shift+Enter newlines. Respect IME composition.
                  if (
                    e.key === "Enter" &&
                    !e.shiftKey &&
                    !e.nativeEvent.isComposing &&
                    e.keyCode !== 229
                  ) {
                    e.preventDefault()
                    submit()
                  }
                }}
                rows={1}
                placeholder="Ask Robo a question…"
                className="max-h-28 min-h-9 flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              />
              <button
                type="button"
                onClick={submit}
                disabled={!input.trim() || status === "streaming"}
                aria-label="Send message"
                className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                <Send className="size-4" />
              </button>
            </div>
            <p className="mt-2 px-1 text-[11px] leading-tight text-muted-foreground">
              Robo is an AI assistant and can make mistakes.
            </p>
          </div>
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close chat with Robo" : "Chat with Robo"}
        aria-expanded={open}
        className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {open ? <X className="size-6" /> : <Bot className="size-6" />}
      </button>
    </div>
  )
}

function Dot({ delay }: { delay?: string }) {
  return (
    <span
      className="inline-block size-1.5 animate-bounce rounded-full bg-muted-foreground/60"
      style={delay ? { animationDelay: delay } : undefined}
    />
  )
}
