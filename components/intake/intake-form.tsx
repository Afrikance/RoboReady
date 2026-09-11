"use client"

import { useState, useTransition } from "react"
import { INTAKE_SECTIONS, intakeCompletion, type IntakeField } from "@/lib/intake/questions"
import { saveIntake } from "@/app/actions/intake"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Check, Lock, Save, Sparkles, MapPin, BadgeCheck } from "lucide-react"
import { cn } from "@/lib/utils"

type Answers = Record<string, unknown>

export function IntakeForm({
  propertyId,
  initialAnswers,
  initialStatus,
  isAdmin = false,
  propertyStatus,
  prefill,
}: {
  propertyId: string
  initialAnswers: Answers
  initialStatus: string
  /** Admins/owners can edit a submitted intake; everyone else is view-only once it is locked. */
  isAdmin?: boolean
  /** The property's funnel status, used to tailor the field-work submit flow. */
  propertyStatus?: string
  /** Which fields the AI pre-filled vs left blank for the field operator. */
  prefill?: { filled: string[]; leftBlank: string[] }
}) {
  const [answers, setAnswers] = useState<Answers>(initialAnswers ?? {})
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useState(initialStatus)

  // A submitted intake is locked. Non-admins get a view-only form; admins keep
  // full edit access so they can correct or reopen it.
  const locked = status === "completed"
  const readOnly = locked && !isAdmin

  // Field-work handover: this property was handed over for on-site completion.
  const inHandover = propertyStatus === "handover"
  const inVerification = propertyStatus === "pending_verification"
  const filledSet = new Set(prefill?.filled ?? [])
  const blankSet = new Set(prefill?.leftBlank ?? [])

  const completion = intakeCompletion(answers)

  function set(id: string, value: unknown) {
    setAnswers((prev) => ({ ...prev, [id]: value }))
  }

  function toggleMulti(id: string, option: string) {
    setAnswers((prev) => {
      const current = Array.isArray(prev[id]) ? (prev[id] as string[]) : []
      const next = current.includes(option) ? current.filter((o) => o !== option) : [...current, option]
      return { ...prev, [id]: next }
    })
  }

  function submit(complete: boolean) {
    startTransition(async () => {
      const res = await saveIntake(propertyId, answers, complete)
      if (res.ok) {
        setStatus(complete ? "completed" : "draft")
        toast.success(complete ? "Intake completed" : "Progress saved")
      } else {
        toast.error(res.error)
      }
    })
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10">
            <svg viewBox="0 0 36 36" className="h-10 w-10 -rotate-90">
              <circle cx="18" cy="18" r="15" fill="none" stroke="var(--muted)" strokeWidth="4" />
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="var(--primary)"
                strokeWidth="4"
                strokeDasharray={`${(completion / 100) * 94.2} 94.2`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold tabular-nums">
              {completion}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium">Intake completion</p>
            <p className="text-xs text-muted-foreground">
              {readOnly
                ? "This intake was submitted and is now view-only."
                : locked
                  ? "This intake was submitted. As an admin you can still edit it."
                  : "Fill in what you know — you can update this later."}
            </p>
          </div>
        </div>
        {locked ? (
          <Badge className="gap-1 bg-[var(--score-high)] text-white">
            <Check className="h-3 w-3" /> Submitted
          </Badge>
        ) : (
          <Badge variant="secondary">Draft</Badge>
        )}
      </div>

      {readOnly ? (
        <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Submitted — view only</p>
            <p className="text-xs text-muted-foreground text-pretty">
              This intake form has been submitted and locked. Contact an admin if it needs to change.
            </p>
          </div>
        </div>
      ) : null}

      {inVerification ? (
        <div className="flex items-start gap-3 rounded-lg border border-[var(--score-mid)]/40 bg-[var(--score-mid)]/10 p-4">
          <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--score-mid)]" />
          <div>
            <p className="text-sm font-medium">In verification</p>
            <p className="text-xs text-muted-foreground text-pretty">
              Submitted to the admin verification queue. An admin will verify it or return it for more field work.
            </p>
          </div>
        </div>
      ) : null}

      {inHandover && !readOnly ? (
        <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-medium">Field work needed</p>
            <p className="text-xs text-muted-foreground text-pretty">
              An AI pre-filled the fields it could verify (marked <span className="font-medium text-primary">AI</span>).
              Complete the fields marked <span className="font-medium text-[var(--score-mid)]">Needs field data</span> on
              site, then submit for admin verification.
            </p>
          </div>
        </div>
      ) : null}

      {INTAKE_SECTIONS.map((section) => (
        <section key={section.id} className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold">{section.title}</h3>
            <p className="text-sm text-muted-foreground">{section.description}</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {section.fields.map((field) => (
              <Field
                key={field.id}
                field={field}
                value={answers[field.id]}
                readOnly={readOnly}
                hint={filledSet.has(field.id) ? "ai" : blankSet.has(field.id) ? "blank" : undefined}
                onChange={(v) => set(field.id, v)}
                onToggleMulti={(opt) => toggleMulti(field.id, opt)}
              />
            ))}
          </div>
        </section>
      ))}

      {readOnly ? null : (
        <div className="flex flex-wrap gap-3 border-t border-border pt-6">
          <Button variant="outline" onClick={() => submit(false)} disabled={pending}>
            <Save className="mr-2 h-4 w-4" /> Save draft
          </Button>
          <Button onClick={() => submit(true)} disabled={pending}>
            {locked ? "Update submitted intake" : inHandover ? "Submit for verification" : "Mark intake complete"}
          </Button>
        </div>
      )}
    </div>
  )
}

function Field({
  field,
  value,
  onChange,
  onToggleMulti,
  readOnly = false,
  hint,
}: {
  field: IntakeField
  value: unknown
  onChange: (v: unknown) => void
  onToggleMulti: (option: string) => void
  readOnly?: boolean
  /** "ai" = pre-filled by the AI; "blank" = deliberately left for on-site data. */
  hint?: "ai" | "blank"
}) {
  const isFull = field.type === "textarea" || field.type === "multiselect"
  const isEmpty = Array.isArray(value) ? value.length === 0 : value === undefined || value === null || value === ""
  return (
    <div className={cn("space-y-2", isFull && "sm:col-span-2")}>
      <Label className="flex flex-wrap items-center gap-2 text-sm">
        <span>{field.label}</span>
        {field.unit ? <span className="text-xs text-muted-foreground">({field.unit})</span> : null}
        {hint === "ai" ? (
          <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
            <Sparkles className="h-2.5 w-2.5" /> AI
          </span>
        ) : null}
        {hint === "blank" && isEmpty ? (
          <span className="inline-flex items-center gap-1 rounded bg-[var(--score-mid)]/15 px-1.5 py-0.5 text-[10px] font-medium text-[var(--score-mid)]">
            <MapPin className="h-2.5 w-2.5" /> Needs field data
          </span>
        ) : null}
      </Label>
      {field.help ? <p className="text-xs text-muted-foreground">{field.help}</p> : null}

      {field.type === "text" || field.type === "number" ? (
        <Input
          type={field.type === "number" ? "number" : "text"}
          placeholder={field.placeholder}
          disabled={readOnly}
          value={(value as string | number | undefined) ?? ""}
          onChange={(e) => onChange(field.type === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value)}
        />
      ) : null}

      {field.type === "textarea" ? (
        <Textarea
          placeholder={field.placeholder}
          disabled={readOnly}
          value={(value as string | undefined) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
        />
      ) : null}

      {field.type === "boolean" ? (
        <div className="flex gap-2">
          {["Yes", "No"].map((opt) => {
            const selected = (value === true && opt === "Yes") || (value === false && opt === "No")
            return (
              <button
                key={opt}
                type="button"
                disabled={readOnly}
                onClick={() => onChange(opt === "Yes")}
                className={cn(
                  "rounded-md border px-4 py-2 text-sm transition-colors",
                  selected ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted",
                  readOnly && "cursor-default opacity-60 hover:bg-transparent",
                )}
              >
                {opt}
              </button>
            )
          })}
        </div>
      ) : null}

      {field.type === "select" ? (
        <div className="flex flex-wrap gap-2">
          {field.options?.map((opt) => {
            const selected = value === opt
            return (
              <button
                key={opt}
                type="button"
                disabled={readOnly}
                onClick={() => onChange(opt)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm transition-colors",
                  selected ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted",
                  readOnly && "cursor-default opacity-60 hover:bg-transparent",
                )}
              >
                {opt}
              </button>
            )
          })}
        </div>
      ) : null}

      {field.type === "multiselect" ? (
        <div className="flex flex-wrap gap-2">
          {field.options?.map((opt) => {
            const selected = Array.isArray(value) && (value as string[]).includes(opt)
            return (
              <button
                key={opt}
                type="button"
                disabled={readOnly}
                onClick={() => onToggleMulti(opt)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm transition-colors",
                  selected ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted",
                  readOnly && "cursor-default opacity-60 hover:bg-transparent",
                )}
              >
                {opt}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
