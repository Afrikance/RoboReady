import { INTAKE_SECTIONS, type IntakeField } from "@/lib/intake/questions"

function formatAnswer(field: IntakeField, value: unknown): string {
  if (value === undefined || value === null || value === "") return ""
  if (Array.isArray(value)) return value.join(", ")
  if (typeof value === "boolean") return value ? "Yes" : "No"
  const suffix = field.unit ? ` ${field.unit}` : ""
  return `${String(value)}${suffix}`
}

/** Blank write-in line for the printable field. */
function WriteInLine() {
  return <div className="mt-1 h-6 border-b border-dashed border-muted-foreground/40" aria-hidden />
}

export function IntakePrintable({
  mode,
  answers,
  propertyName,
  organizationName,
}: {
  mode: "blank" | "filled"
  answers?: Record<string, unknown>
  propertyName?: string
  organizationName?: string
}) {
  return (
    <div className="space-y-8">
      <header className="border-b border-border pb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">RoboReady · Site Intake Form</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-balance">
          {mode === "blank" ? "Field Survey Intake (blank template)" : `Intake — ${propertyName ?? "Property"}`}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          {mode === "blank"
            ? "Field Operators complete this on-site, capturing the interior room-to-pickup path and physical measurements. Transfer answers into RoboReady after the visit."
            : `Completed intake${organizationName ? ` for ${organizationName}` : ""}. Includes interior survey data collected on-site.`}
        </p>
        {mode === "blank" ? (
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Property</dt>
              <WriteInLine />
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Operator</dt>
              <WriteInLine />
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Survey date</dt>
              <WriteInLine />
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Weather / conditions</dt>
              <WriteInLine />
            </div>
          </dl>
        ) : null}
      </header>

      {INTAKE_SECTIONS.map((section) => (
        <section key={section.id} className="break-inside-avoid space-y-3">
          <div>
            <h2 className="text-base font-semibold">{section.title}</h2>
            <p className="text-xs text-muted-foreground text-pretty">{section.description}</p>
          </div>
          <dl className="grid gap-3 sm:grid-cols-2">
            {section.fields.map((field) => {
              const filled = mode === "filled" ? formatAnswer(field, answers?.[field.id]) : ""
              return (
                <div key={field.id} className="break-inside-avoid rounded-md border border-border p-3">
                  <dt className="text-sm font-medium text-pretty">{field.label}</dt>
                  {field.help ? <p className="mt-0.5 text-xs text-muted-foreground text-pretty">{field.help}</p> : null}
                  {mode === "filled" ? (
                    filled ? (
                      <dd className="mt-1.5 text-sm text-pretty">{filled}</dd>
                    ) : (
                      <dd className="mt-1.5 text-sm italic text-muted-foreground">Not provided</dd>
                    )
                  ) : (
                    <dd>
                      <WriteInLine />
                      {field.options && field.options.length > 0 ? (
                        <p className="mt-1 text-[11px] text-muted-foreground text-pretty">
                          Options: {field.options.join(" · ")}
                        </p>
                      ) : null}
                    </dd>
                  )}
                </div>
              )
            })}
          </dl>
        </section>
      ))}
    </div>
  )
}
