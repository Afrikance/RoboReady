import { streamText, tool, stepCountIs, type ModelMessage } from "ai"
import { z } from "zod"
import { getSessionUser } from "@/lib/tenancy"
import { createInquiry } from "@/lib/support/data"
import { roboSystemPrompt } from "@/lib/support/knowledge"
import { INQUIRY_TOPICS, isInquiryTopic, type ChatMessage } from "@/lib/support/types"

export const maxDuration = 30

const MODEL = "google/gemini-3.5-flash"

type IncomingMessage = { role: "user" | "assistant"; content: unknown }

// Keep only well-formed user/assistant text turns, cap length defensively.
function sanitizeMessages(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return []
  const out: ChatMessage[] = []
  for (const m of raw as IncomingMessage[]) {
    if (!m || (m.role !== "user" && m.role !== "assistant")) continue
    if (typeof m.content !== "string") continue
    const content = m.content.slice(0, 4000)
    if (!content.trim()) continue
    out.push({ role: m.role, content })
  }
  return out.slice(-20)
}

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return new Response("Invalid request", { status: 400 })
  }

  const { messages, pageContext } = (body ?? {}) as { messages?: unknown; pageContext?: unknown }
  const history = sanitizeMessages(messages)
  if (history.length === 0) {
    return new Response("No messages", { status: 400 })
  }

  const user = await getSessionUser().catch(() => null)
  const pageUrl = typeof pageContext === "string" ? pageContext.slice(0, 300) : null

  const result = streamText({
    model: MODEL,
    system: roboSystemPrompt(pageUrl ?? undefined),
    messages: history as ModelMessage[],
    stopWhen: stepCountIs(3),
    tools: {
      saveInquiry: tool({
        description:
          "Save the visitor's contact details so a human on the RoboReady team can follow up. Only call this once you have collected at least an email and a short summary of what they need.",
        inputSchema: z.object({
          name: z.string().max(120).optional().describe("The visitor's name, if provided."),
          email: z.string().email().describe("The visitor's email address. Required."),
          topic: z
            .enum(INQUIRY_TOPICS)
            .describe("Best-fit category for the request."),
          message: z
            .string()
            .max(2000)
            .describe("A concise summary of what the visitor needs and any useful context."),
        }),
        execute: async ({ name, email, topic, message }) => {
          try {
            const safeTopic = isInquiryTopic(topic) ? topic : "other"
            const { id } = await createInquiry({
              name: name ?? null,
              email,
              topic: safeTopic,
              message,
              conversation: history,
              pageUrl,
              userId: user?.id ?? null,
            })
            return { ok: true, id, message: "Saved. The RoboReady team will follow up by email." }
          } catch (err) {
            console.log("[v0] createInquiry failed:", (err as Error).message)
            return { ok: false, message: "Could not save the request. Please try again shortly." }
          }
        },
      }),
    },
  })

  return result.toTextStreamResponse()
}
