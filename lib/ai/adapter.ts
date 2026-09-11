// The StaffGPT boundary. Everything RoboReady asks of the AI workforce goes
// through this interface, so the underlying provider (local AI Gateway now, the
// real StaffGPT API later) can be swapped without touching feature code.

import type { EmployeeSlug } from "@/lib/ai/employees"

export type AdapterKind = "local" | "staffgpt"

export type DispatchRequest<TInput = unknown> = {
  employeeSlug: EmployeeSlug
  jobType: string
  input: TInput
}

export type DispatchResult<TOutput = unknown> = {
  output: TOutput
  reasoning?: string
  raw: unknown
}

export interface StaffGPTAdapter {
  readonly kind: AdapterKind
  /**
   * Ask a named AI employee to perform a job and return structured output.
   * Implementations must throw on failure; the orchestrator records the error.
   */
  dispatch<TInput, TOutput>(req: DispatchRequest<TInput>): Promise<DispatchResult<TOutput>>
}
