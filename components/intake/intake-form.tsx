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
import { Check, Save } from "lucide-react"
import { cn } from "@/lib/utils"

type Answers = Record<string, unknown>

export function IntakeForm({
  propertyId,
  initialAnswers,
  initialStatus,
}: {
  propertyId: string
  initialAnswers: Answers
  initialStatus: string
}) {
  const [answers, setAnswers] = useState<Answers>(initialAnswers ?? {})
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useState(initialStatus)

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
            <p className="text-xs text-muted-foreground">Fill in what you know — you can update this later.</p>
          </div>
        </div>
        {status === "completed" ? (
          <Badge className="gap-1 bg-[var(--score-high)] text-white">
            <Check className="h-3 w-3" /> Completed
          </Badge>
        ) : (
          <Badge variant="secondary">Draft</Badge>
        )}
      </div>

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
                onChange={(v) => set(field.id, v)}
                onToggleMulti={(opt) => toggleMulti(field.id, opt)}
              />
            ))}
          </div>
        </section>
      ))}

      <div className="flex flex-wrap gap-3 border-t border-border pt-6">
        <Button variant="outline" onClick={() => submit(false)} disabled={pending}>
          <Save className="mr-2 h-4 w-4" /> Save draft
        </Button>
        <Button onClick={() => submit(true)} disabled={pending}>
          Mark intake complete
        </Button>
      </div>
    </div>
  )
}

function Field({
  field,
  value,
  onChange,
  onToggleMulti,
}: {
  field: IntakeField
  value: unknown
  onChange: (v: unknown) => void
  onToggleMulti: (option: string) => void
}) {
  const isFull = field.type === "textarea" || field.type === "multiselect"
  return (
    <div className={cn("space-y-2", isFull && "sm:col-span-2")}>
      <Label className="text-sm">
        {field.label}
        {field.unit ? <span className="ml-1 text-xs text-muted-foreground">({field.unit})</span> : null}
      </Label>
      {field.help ? <p className="text-xs text-muted-foreground">{field.help}</p> : null}

      {field.type === "text" || field.type === "number" ? (
        <Input
          type={field.type === "number" ? "number" : "text"}
          placeholder={field.placeholder}
          value={(value as string | number | undefined) ?? ""}
          onChange={(e) => onChange(field.type === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value)}
        />
      ) : null}

      {field.type === "textarea" ? (
        <Textarea
          placeholder={field.placeholder}
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
                onClick={() => onChange(opt === "Yes")}
                className={cn(
                  "rounded-md border px-4 py-2 text-sm transition-colors",
                  selected ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted",
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
                onClick={() => onChange(opt)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm transition-colors",
                  selected ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted",
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
                onClick={() => onToggleMulti(opt)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm transition-colors",
                  selected ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted",
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
