'use client'

import { useActionState } from 'react'
import { ArrowLeft, Bot, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { submitRoboticsInterest, type RoboticsInterestActionState } from '@/app/actions/robotics-interest'
import { ROBOTICS_TASKS, ROBOTICS_USE_CASES } from '@/lib/robotics-interest/core'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const selectClassName = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function RoboticsInterestForm({
  propertyId,
  propertyName,
  contactName,
  contactEmail,
}: {
  propertyId: string
  propertyName: string
  contactName: string
  contactEmail: string
}) {
  const action = submitRoboticsInterest.bind(null, propertyId)
  const initialState: RoboticsInterestActionState = { status: 'idle', message: '' }
  const [state, formAction, pending] = useActionState(action, initialState)

  if (state.status === 'success') {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-4 pt-6">
          <CheckCircle2 className="size-8 text-primary" aria-hidden="true" />
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">Your robotics interest is with our team</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{state.message}</p>
          </div>
          <Button asChild variant="outline">
            <Link href={`/dashboard/properties/${propertyId}`}>
              <ArrowLeft data-icon="inline-start" /> Return to {propertyName}
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-primary/10 p-2 text-primary"><Bot className="size-5" aria-hidden="true" /></div>
          <div className="flex flex-col gap-1">
            <CardTitle>Tell us what you want robotics to do</CardTitle>
            <CardDescription>We&apos;ll review the operational fit for {propertyName}. You don&apos;t need to choose a robot, vendor, or manufacturer.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-8">
          {state.status === 'error' ? <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{state.message}</p> : null}

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="useCase">Primary goal</FieldLabel>
              <select id="useCase" name="useCase" className={selectClassName} required disabled={pending} defaultValue="">
                <option value="" disabled>Select the closest fit</option>
                {ROBOTICS_USE_CASES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
              <FieldDescription>Choose the main outcome you want to improve at this property.</FieldDescription>
            </Field>

            <FieldSet>
              <FieldLegend>Recurring tasks to explore</FieldLegend>
              <FieldDescription>Select every task you would like the team to consider.</FieldDescription>
              <div className="grid gap-2 sm:grid-cols-2">
                {ROBOTICS_TASKS.map((task) => (
                  <label key={task.value} className="flex min-h-11 items-center gap-3 rounded-md border px-3 py-2 text-sm">
                    <input type="checkbox" name="tasks" value={task.value} disabled={pending} className="size-4 accent-primary" />
                    {task.label}
                  </label>
                ))}
              </div>
              <Field>
                <FieldLabel htmlFor="otherTaskDetail">Describe another task</FieldLabel>
                <Input id="otherTaskDetail" name="otherTaskDetail" maxLength={240} disabled={pending} placeholder="Optional unless you selected another recurring task" />
              </Field>
            </FieldSet>
          </FieldGroup>

          <FieldSet>
            <FieldLegend>Property environment</FieldLegend>
            <FieldGroup className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="location">Where would the work happen?</FieldLabel>
                <select id="location" name="location" className={selectClassName} defaultValue="indoor" disabled={pending}>
                  <option value="indoor">Mostly indoors</option>
                  <option value="outdoor">Mostly outdoors</option>
                  <option value="mixed">Both indoor and outdoor</option>
                </select>
              </Field>
              <Field>
                <FieldLabel htmlFor="access">Who can access the work area?</FieldLabel>
                <select id="access" name="access" className={selectClassName} defaultValue="mixed" disabled={pending}>
                  <option value="public">Public or guest-facing</option>
                  <option value="restricted">Restricted to staff</option>
                  <option value="mixed">A mix of both</option>
                </select>
              </Field>
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="operatingHours">Operating hours</FieldLabel>
                <Input id="operatingHours" name="operatingHours" maxLength={160} disabled={pending} placeholder="For example, overnight cleaning or 7am–10pm daily" />
              </Field>
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="operatingConditions">Site conditions and constraints</FieldLabel>
                <Textarea id="operatingConditions" name="operatingConditions" maxLength={1200} rows={3} disabled={pending} placeholder="Floor surfaces, elevators, ramps, traffic patterns, weather exposure, or other constraints" />
              </Field>
              <Field>
                <FieldLabel htmlFor="humanHandoff">Human handoff or supervision</FieldLabel>
                <Textarea id="humanHandoff" name="humanHandoff" maxLength={1200} rows={3} disabled={pending} placeholder="When should a person take over or assist?" />
              </Field>
              <Field>
                <FieldLabel htmlFor="safetyRequirements">Safety requirements</FieldLabel>
                <Textarea id="safetyRequirements" name="safetyRequirements" maxLength={1200} rows={3} disabled={pending} placeholder="Known safety policies, sensitive areas, or operating rules" />
              </Field>
              <Field>
                <FieldLabel htmlFor="integrationNeeds">Systems to integrate with</FieldLabel>
                <Textarea id="integrationNeeds" name="integrationNeeds" maxLength={1200} rows={3} disabled={pending} placeholder="Access control, elevators, work orders, property software, or none known" />
              </Field>
              <Field>
                <FieldLabel htmlFor="serviceNeeds">Service and support expectations</FieldLabel>
                <Textarea id="serviceNeeds" name="serviceNeeds" maxLength={1200} rows={3} disabled={pending} placeholder="On-site support, maintenance, training, or response expectations" />
              </Field>
            </FieldGroup>
          </FieldSet>

          <FieldSet>
            <FieldLegend>Timing and planning</FieldLegend>
            <FieldGroup className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="targetTimeline">When are you hoping to move forward?</FieldLabel>
                <select id="targetTimeline" name="targetTimeline" className={selectClassName} defaultValue="Exploring options" disabled={pending}>
                  <option>As soon as practical</option>
                  <option>Within 3 months</option>
                  <option>Within 6 months</option>
                  <option>Within 12 months</option>
                  <option>Exploring options</option>
                </select>
              </Field>
              <Field>
                <FieldLabel htmlFor="budgetRange">Budget range (optional)</FieldLabel>
                <select id="budgetRange" name="budgetRange" className={selectClassName} defaultValue="" disabled={pending}>
                  <option value="">Not sure yet</option>
                  <option>Under $25,000</option>
                  <option>$25,000–$75,000</option>
                  <option>$75,000–$150,000</option>
                  <option>$150,000+</option>
                </select>
              </Field>
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="additionalContext">Anything else we should know?</FieldLabel>
                <Textarea id="additionalContext" name="additionalContext" maxLength={2400} rows={4} disabled={pending} placeholder="Goals, expected outcomes, or details that will help us assess the fit" />
              </Field>
            </FieldGroup>
          </FieldSet>

          <FieldSet>
            <FieldLegend>How should we follow up?</FieldLegend>
            <div className="grid gap-1 rounded-md border bg-muted/30 p-4 text-sm">
              <p className="font-medium">{contactName}</p>
              <p className="text-muted-foreground">{contactEmail}</p>
            </div>
            <FieldGroup className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="contactPreference">Preferred contact method</FieldLabel>
                <select id="contactPreference" name="contactPreference" className={selectClassName} defaultValue="email" disabled={pending}>
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                </select>
              </Field>
              <Field>
                <FieldLabel htmlFor="contactPhone">Phone number</FieldLabel>
                <Input id="contactPhone" name="contactPhone" type="tel" autoComplete="tel" maxLength={60} disabled={pending} placeholder="Required if you prefer a phone call" />
              </Field>
            </FieldGroup>
            <label className="flex items-start gap-3 rounded-md border p-3 text-sm leading-relaxed">
              <input type="checkbox" name="contactConsent" value="yes" required disabled={pending} className="mt-1 size-4 shrink-0 accent-primary" />
              <span>I agree that RoboReady may use these details to review this request and contact me about it. This does not authorize RoboReady to share my details with a solution partner.</span>
            </label>
          </FieldSet>

          <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-xs leading-relaxed text-muted-foreground">Submitting asks RoboReady to review the operational fit. It does not choose a robot model, create a partner referral, or guarantee availability or performance.</p>
            <Button type="submit" disabled={pending} className="shrink-0">
              {pending ? 'Sending request…' : 'Send for fit review'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
