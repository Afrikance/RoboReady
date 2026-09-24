import "server-only"

import { zodToJsonSchema } from "zod-to-json-schema"
import type { StaffGPTAdapter, DispatchRequest, DispatchResult } from "@/lib/ai/adapter"
import { getEmployee } from "@/lib/ai/employees"
import { LocalOrchestrator, getJob, buildJobSystem } from "@/lib/ai/local-orchestrator"

const API_PREFIX = "/api/v1"

/** Shape of an employee row returned by GET /employees. */
type StaffGptEmployee = {
  slug?: string
  codename?: string
  role?: string
  name?: string
  department?: string
  kind?: string
}

/**
 * Resolves whatever the user put in STAFFGPT_API_URL to the API root
 * `<origin>/api/v1`. Tolerant of an origin, a trailing slash, or even a full
 * endpoint URL being pasted in (e.g. ".../api/v1/dispatch") — we always reduce
 * to the origin and re-append the version prefix.
 */
function normalizeApiRoot(raw: string): string {
  try {
    return new URL(raw).origin + API_PREFIX
  } catch {
    return raw.replace(/\/+$/, "").replace(/\/api\/v1(\/.*)?$/, "") + API_PREFIX
  }
}

/**
 * STAFFGPT_DEPARTMENT must be a slug (e.g. "roboready"). Guard against a URL or
 * other non-slug value being set by mistake — fall back to "roboready".
 */
function sanitizeDepartment(raw: string | undefined): string {
  const t = (raw ?? "").trim()
  return t && !/[:/\s]/.test(t) ? t : "roboready"
}

/**
 * Talks to the real StaffGPT external API (v1).
 *
 * Contract (Authorization: Bearer sgk_live_…):
 *   GET  /api/v1/employees?department=<dept>   → the department's employees
 *   POST /api/v1/employment  { department, employee }  → employ (idempotent)
 *   POST /api/v1/dispatch    { department, employee, jobType, instructions, input, outputSchema }
 *        → one structured AI call validated against the caller's JSON Schema
 *
 * RoboReady owns the persona + task (sent as `instructions` + `outputSchema`);
 * StaffGPT is the structured-compute worker. The RoboReady department and its
 * employees are created once via the StaffGPT plugin page
 * (https://www.staffgpt.net/en/plugin); this adapter then discovers them,
 * auto-employs on demand (403 not_employed → POST /employment → retry), and
 * dispatches.
 *
 * Resilience: any failure (unreachable, auth, missing department, invalid
 * schema, or a response that doesn't satisfy RoboReady's schema) falls back to
 * the local AI Gateway orchestrator so the user's action never breaks. Every
 * fallback is logged and tagged in the job's reasoning for traceability.
 *
 * Activated when STAFFGPT_API_URL + STAFFGPT_API_KEY are set; otherwise the
 * factory uses the LocalOrchestrator directly.
 */
export class StaffGPTApiAdapter implements StaffGPTAdapter {
  readonly kind = "staffgpt" as const

  private readonly apiRoot: string
  private readonly department: string
  private readonly local = new LocalOrchestrator()
  private employeeCache: StaffGptEmployee[] | null = null

  constructor(
    baseUrl: string,
    private readonly apiKey: string,
    department: string = "roboready",
  ) {
    this.apiRoot = normalizeApiRoot(baseUrl)
    this.department = sanitizeDepartment(department)
  }

  async dispatch<TInput, TOutput>(req: DispatchRequest<TInput>): Promise<DispatchResult<TOutput>> {
    try {
      return await this.dispatchRemote<TInput, TOutput>(req)
    } catch (err) {
      const message = (err as Error).message
      console.log("[v0] StaffGPT dispatch fell back to local AI Gateway:", req.jobType, message)
      const local = await this.local.dispatch<TInput, TOutput>(req)
      return {
        ...local,
        reasoning: `${local.reasoning ?? ""} [staffgpt fallback: ${message}]`.trim(),
      }
    }
  }

  private async dispatchRemote<TInput, TOutput>(
    req: DispatchRequest<TInput>,
  ): Promise<DispatchResult<TOutput>> {
    const employee = getEmployee(req.employeeSlug)
    const job = getJob(req.jobType)
    if (!job) throw new Error(`Unknown jobType: ${req.jobType}`)

    const staffEmployee = await this.resolveEmployee(req.employeeSlug, employee.name)
    const instructions = buildJobSystem(employee, job)
    const outputSchema = zodToJsonSchema(job.schema, { $refStrategy: "none" })

    const body = {
      department: this.department,
      employee: staffEmployee,
      jobType: req.jobType,
      instructions,
      input: req.input,
      outputSchema,
    }

    let res = await this.api("POST", "/dispatch", body)

    // Employment gate: employ this worker once, then retry the dispatch.
    if (res.status === 403 && (await this.isNotEmployed(res))) {
      await this.employ(staffEmployee)
      res = await this.api("POST", "/dispatch", body)
    }

    if (!res.ok) {
      const detail = await this.readError(res)
      throw new Error(`dispatch ${res.status}${detail ? `: ${detail}` : ""}`)
    }

    const json = (await res.json().catch(() => null)) as Record<string, unknown> | null
    if (!json) throw new Error("dispatch returned a non-JSON response")

    const candidate = json.output ?? json.data ?? json.result ?? json
    const parsed = job.schema.safeParse(candidate)
    if (!parsed.success) {
      throw new Error(`dispatch output did not match the ${req.jobType} schema`)
    }

    return {
      output: parsed.data as TOutput,
      reasoning:
        typeof json.reasoning === "string"
          ? json.reasoning
          : `${employee.name} (${employee.title}) via StaffGPT`,
      raw: json,
    }
  }

  /**
   * Finds the StaffGPT employee to dispatch to inside the RoboReady department.
   * Prefers an exact slug/codename/name match with the RoboReady employee.
   * RoboReady's own slugs (e.g. "network-navigator") usually won't match the
   * department's "rr-*" slugs, so the fallback is the department orchestrator
   * (Atlas) — RoboReady owns the persona via `instructions`, so the orchestrator
   * is the correct general-purpose runner — else the first employee. Throws
   * (→ local fallback) when the department is empty/missing, with an actionable
   * message.
   */
  private async resolveEmployee(slug: string, name: string): Promise<string> {
    const employees = await this.listEmployees()
    if (employees.length === 0) {
      throw new Error(
        `no employees in StaffGPT department "${this.department}" — create it at https://www.staffgpt.net/en/plugin`,
      )
    }
    const match =
      employees.find((e) => e.slug === slug || e.codename === slug) ??
      employees.find((e) => e.name === name) ??
      employees.find((e) => e.kind === "orchestrator") ??
      employees[0]
    const id = match.slug ?? match.codename ?? match.name
    if (!id) throw new Error(`StaffGPT department "${this.department}" employee has no usable identifier`)
    return id
  }

  private async listEmployees(): Promise<StaffGptEmployee[]> {
    if (this.employeeCache) return this.employeeCache
    const res = await this.api("GET", `/employees?department=${encodeURIComponent(this.department)}`)
    if (!res.ok) {
      const detail = await this.readError(res)
      throw new Error(`employees lookup ${res.status}${detail ? `: ${detail}` : ""}`)
    }
    const json = (await res.json().catch(() => null)) as unknown
    const list = Array.isArray(json)
      ? json
      : ((json as { employees?: unknown; data?: unknown })?.employees ??
          (json as { data?: unknown })?.data ??
          [])
    this.employeeCache = (Array.isArray(list) ? list : []) as StaffGptEmployee[]
    return this.employeeCache
  }

  private async employ(employee: string): Promise<void> {
    const res = await this.api("POST", "/employment", { department: this.department, employee })
    // 2xx = employed; a conflict/409 means already employed, which is fine.
    if (!res.ok && res.status !== 409) {
      const detail = await this.readError(res)
      throw new Error(`employment ${res.status}${detail ? `: ${detail}` : ""}`)
    }
  }

  private api(method: string, path: string, body?: unknown): Promise<Response> {
    return fetch(`${this.apiRoot}${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    })
  }

  /** True when a 403 body signals the employment gate (error code "not_employed"). */
  private async isNotEmployed(res: Response): Promise<boolean> {
    const detail = await this.readError(res)
    return detail.includes("not_employed")
  }

  private async readError(res: Response): Promise<string> {
    const text = await res.text().catch(() => "")
    return text.slice(0, 500)
  }
}
