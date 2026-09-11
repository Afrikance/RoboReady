import "server-only"

import type { StaffGPTAdapter, DispatchRequest, DispatchResult } from "@/lib/ai/adapter"
import { getEmployee } from "@/lib/ai/employees"

/**
 * Talks to the real StaffGPT workforce API.
 *
 * IMPORTANT: StaffGPT (staffgpt-landing-page) does not yet expose a documented
 * external dispatch API — it is driven by internal server actions and
 * department "studios". This adapter is the integration seam: once the real
 * endpoint + auth contract exists, wire it here WITHOUT inventing endpoints.
 * The expected shape below is a placeholder to be replaced with the actual API.
 *
 * Activated when STAFFGPT_API_URL (and STAFFGPT_API_KEY) are set; otherwise the
 * factory falls back to the LocalOrchestrator.
 */
export class StaffGPTApiAdapter implements StaffGPTAdapter {
  readonly kind = "staffgpt" as const

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
  ) {}

  async dispatch<TInput, TOutput>(req: DispatchRequest<TInput>): Promise<DispatchResult<TOutput>> {
    const employee = getEmployee(req.employeeSlug)

    // Placeholder request shape. Replace with the real StaffGPT contract.
    const res = await fetch(`${this.baseUrl.replace(/\/$/, "")}/dispatch`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        department: employee.department,
        employee: employee.slug,
        jobType: req.jobType,
        input: req.input,
      }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new Error(`StaffGPT dispatch failed (${res.status}): ${text.slice(0, 500)}`)
    }

    const json = (await res.json()) as { output: TOutput; reasoning?: string }
    return { output: json.output, reasoning: json.reasoning, raw: json }
  }
}
