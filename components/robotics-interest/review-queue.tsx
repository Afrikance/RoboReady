'use client'

import { useActionState, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, ClipboardList, MapPin, RefreshCw, ShieldAlert } from 'lucide-react'
import { reviewRoboticsInterest, type RoboticsInterestActionState } from '@/app/actions/robotics-interest'
import { refreshRoboticsRecommendation } from '@/app/actions/robotics-sourcing'
import { AdminRoboticsCollaborationPanel } from '@/components/robotics-interest/collaboration-panels'
import { toast } from 'sonner'
import { ROBOTICS_TASKS, ROBOTICS_USE_CASES, roboticsInterestStatusLabel, type RoboticsInterestStatus } from '@/lib/robotics-interest/core'
import type { getRoboticsInterestReviewData } from '@/app/actions/robotics-interest'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'

type ReviewData = NonNullable<Awaited<ReturnType<typeof getRoboticsInterestReviewData>>>
type InterestRequest = ReviewData['requests'][number]

const selectClassName = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'
const statusOptions: Array<{ value: Exclude<RoboticsInterestStatus, 'submitted'>; label: string }> = [
  { value: 'under_review', label: 'Under review' },
  { value: 'needs_info', label: 'Follow-up needed' },
  { value: 'recommended', label: 'Fit selected' },
  { value: 'closed', label: 'Closed' },
]

function displayText(value: string | null | undefined): string {
  return value?.trim() || 'Not provided'
}

function taskLabel(task: string): string {
  if (task.startsWith('other:')) return task.slice('other:'.length)
  return ROBOTICS_TASKS.find((item) => item.value === task)?.label ?? task
}

export function RoboticsInterestReviewQueue({ initialData }: { initialData: ReviewData }) {
  const { requests, partners } = initialData

  return (
    <div className="flex flex-col gap-4">
      {requests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <ClipboardList className="size-8 text-muted-foreground" aria-hidden="true" />
            <h2 className="text-lg font-semibold">No robotics requests yet</h2>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              Customer fit-review requests for your organization will appear here. Submitting a request never sends a partner referral.
            </p>
          </CardContent>
        </Card>
      ) : (
        requests.map((request) => (
          <ReviewRequestCard key={request.id} request={request} partners={partners} />
        ))
      )}
    </div>
  )
}

function ReviewRequestCard({ request, partners }: { request: InterestRequest; partners: ReviewData['partners'] }) {
  const action = reviewRoboticsInterest.bind(null, request.id)
  const initialActionState: RoboticsInterestActionState = { status: 'idle', message: '' }
  const [state, formAction, pending] = useActionState<RoboticsInterestActionState, FormData>(action, initialActionState)
  const useCaseLabel = ROBOTICS_USE_CASES.find((item) => item.value === request.useCase)?.label ?? request.useCase
  const initialPartnerId = request.selectedPartnerId ?? request.recommendations[0]?.partnerId ?? ''
  const initialStatus = request.status === 'submitted' ? 'under_review' : request.status
  const environment = request.environment
  const location = environment?.location ?? 'Not provided'
  const access = environment?.access ?? 'Not provided'
  const operatingHours = environment?.operatingHours ?? 'Not provided'

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle>{request.propertyName}</CardTitle>
            <CardDescription className="flex items-start gap-1.5">
              <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {request.address || 'Property address not provided'}
            </CardDescription>
          </div>
          <Badge variant={request.status === 'recommended' ? 'default' : 'secondary'}>{roboticsInterestStatusLabel(request.status)}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Requested fit</h3>
            <p className="text-sm leading-relaxed"><span className="font-medium">Goal:</span> {useCaseLabel}</p>
            <p className="text-sm leading-relaxed"><span className="font-medium">Tasks:</span> {request.tasks.map(taskLabel).join(', ') || 'Not provided'}</p>
            <p className="text-sm leading-relaxed"><span className="font-medium">Environment:</span> {location}; {access} access</p>
            <p className="text-sm leading-relaxed"><span className="font-medium">Hours:</span> {operatingHours}</p>
            <p className="text-sm leading-relaxed"><span className="font-medium">Timeline:</span> {displayText(request.targetTimeline)}</p>
            <p className="text-sm leading-relaxed"><span className="font-medium">Budget:</span> {displayText(request.budgetRange)}</p>
          </section>
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Property and service constraints</h3>
            <p className="text-sm leading-relaxed"><span className="font-medium">Site:</span> {displayText(request.operatingConditions)}</p>
            <p className="text-sm leading-relaxed"><span className="font-medium">Human handoff:</span> {displayText(request.humanHandoff)}</p>
            <p className="text-sm leading-relaxed"><span className="font-medium">Safety:</span> {displayText(request.safetyRequirements)}</p>
            <p className="text-sm leading-relaxed"><span className="font-medium">Integrations:</span> {displayText(request.integrationNeeds)}</p>
            <p className="text-sm leading-relaxed"><span className="font-medium">Service:</span> {displayText(request.serviceNeeds)}</p>
            <p className="text-sm leading-relaxed"><span className="font-medium">Additional context:</span> {displayText(request.additionalContext)}</p>
          </section>
        </div>

        <section className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Preliminary partner-tag overlap</h3>
            <span className="text-xs text-muted-foreground">Submitted {new Date(request.submittedAt).toLocaleString()}</span>
          </div>
          {request.recommendations.length ? (
            <ul className="flex flex-col gap-3">
              {request.recommendations.map((recommendation) => (
                <li key={recommendation.partnerId} className="border-l-2 border-primary/30 pl-3">
                  <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium">{recommendation.partnerName}</p><Badge variant="outline">{recommendation.tagCoverage}% tag coverage</Badge></div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{recommendation.reasons.join(' ')}</p>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm leading-relaxed text-muted-foreground">No preliminary partner capability-tag overlap was found. This legacy signal is not a model-level fit recommendation.</p>}
        </section>

        <RecommendationPanel request={request} />
        <AdminRoboticsCollaborationPanel request={request} />

        <section className="grid gap-2 rounded-lg border p-4 sm:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold">Customer contact</h3>
            <p className="mt-1 text-sm">{displayText(request.contactName)}</p>
            <p className="text-sm text-muted-foreground">{displayText(request.contactEmail)}</p>
            <p className="text-sm text-muted-foreground">{displayText(request.contactPhone)}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Preferred follow-up: {request.contactPreference === 'phone' ? 'Phone' : 'Email'}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">RoboReady contact consent was recorded {request.contactConsentAt ? new Date(request.contactConsentAt).toLocaleString() : 'with this request'}. This is not consent to share details or create a partner referral.</p>
          </div>
        </section>

        <form action={formAction} className="flex flex-col gap-4 border-t pt-5">
          {state.status === 'success' ? <p role="status" className="flex items-center gap-2 text-sm text-primary"><CheckCircle2 className="size-4" aria-hidden="true" />{state.message}</p> : null}
          {state.status === 'error' ? <p role="alert" className="text-sm text-destructive">{state.message}</p> : null}
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor={`partner-${request.id}`}>Selected solution partner</FieldLabel>
              <select id={`partner-${request.id}`} name="selectedPartnerId" className={selectClassName} defaultValue={initialPartnerId} disabled={pending}>
                <option value="">No selection / manual follow-up</option>
                {partners.map((partner) => <option key={partner.id} value={partner.id}>{partner.name}</option>)}
              </select>
              <FieldDescription>Only active robotics-capable partners in this organization are selectable.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor={`status-${request.id}`}>Review status</FieldLabel>
              <select id={`status-${request.id}`} name="status" className={selectClassName} defaultValue={initialStatus} disabled={pending}>
                {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </Field>
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor={`notes-${request.id}`}>Internal review notes</FieldLabel>
              <Textarea id={`notes-${request.id}`} name="reviewNotes" maxLength={2000} rows={3} defaultValue={request.reviewNotes ?? ''} disabled={pending} placeholder="Record fit considerations or follow-up needed. These notes are not sent to partners." />
            </Field>
          </FieldGroup>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-xl text-xs leading-relaxed text-muted-foreground">Selecting a fit is an internal review decision only. Partner referrals still require the separate consent workflow.</p>
            <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save review'}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function RecommendationPanel({ request }: { request: InterestRequest }) {
  const [reason, setReason] = useState('Admin review')
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const recommendation = request.recommendationRun

  function rerun() {
    if (!reason.trim()) {
      toast.error('Add a reason for this rerun.')
      return
    }
    startTransition(async () => {
      const result = await refreshRoboticsRecommendation(request.id, reason.trim())
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('Recommendations refreshed from the current catalog and assessment.')
      router.refresh()
    })
  }

  return (
    <section className="flex flex-col gap-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold">Assessment-linked robot and cobot fit</h3>
          <p className="text-xs leading-relaxed text-muted-foreground">Deterministic gates use current catalog evidence, operating requirements, source eligibility, coverage, availability, and verified budget facts. Partnership tier never overrides fit.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {recommendation ? <Badge variant={recommendation.results.outcome === 'verified_fit' ? 'default' : 'secondary'}>{recommendation.results.outcome.replaceAll('_', ' ')}</Badge> : <Badge variant="outline">Not generated</Badge>}
          <span className="text-xs text-muted-foreground">{recommendation ? `Run ${recommendation.runNumber} · Assessment v${recommendation.assessmentVersion}` : 'Waiting for a completed assessment'}</span>
        </div>
      </div>

      {recommendation ? (
        <>
          <p className="text-sm leading-relaxed">{recommendation.results.summary}</p>
          <p className="text-xs text-muted-foreground">Generated {new Date(recommendation.createdAt).toLocaleString()} · Results are Admin review aids; no source has been contacted.</p>
          {recommendation.results.candidates.length ? (
            <div className="flex flex-col gap-3">
              {recommendation.results.candidates.map((candidate) => (
                <article key={candidate.modelId} className="flex flex-col gap-3 rounded-md border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-1">
                      <h4 className="font-semibold">{candidate.manufacturerName} · {candidate.modelName}</h4>
                      <p className="text-xs text-muted-foreground">{candidate.category} · {candidate.fitScore}% of documented capability requirements covered</p>
                    </div>
                    <Badge variant={candidate.eligible ? 'default' : 'outline'}>{candidate.eligible ? 'Passed all gates' : 'Follow-up only'}</Badge>
                  </div>
                  {candidate.offers.length ? (
                    <div className="flex flex-col gap-2">
                      {candidate.offers.map((offer) => (
                        <div key={offer.offeringId} className="rounded-md bg-muted/30 p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium">{offer.partnerName}</span>
                            <Badge variant={offer.partnershipStatus === 'full_partner' ? 'default' : 'outline'}>{offer.partnershipStatus.replaceAll('_', ' ')}</Badge>
                            <Badge variant="secondary">{offer.sourceType}</Badge>
                            <span className="text-xs text-muted-foreground">Priority {offer.sourcePriority} · {offer.availability}</span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">Last verified: {offer.lastVerifiedAt ? new Date(offer.lastVerifiedAt).toLocaleDateString() : 'unknown'}</p>
                          {offer.sourceUrl ? <a href={offer.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-primary underline underline-offset-4">Source evidence</a> : null}
                          {offer.matchReasons.length ? <p className="mt-2 text-xs leading-relaxed">{offer.matchReasons.join(' ')}</p> : null}
                          {offer.unmetRequirements.length ? <p className="mt-2 text-xs leading-relaxed text-destructive">Needs follow-up: {offer.unmetRequirements.join(' ')}</p> : null}
                          {offer.unknownEvidence.length ? <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Unknown evidence: {offer.unknownEvidence.join(' ')}</p> : null}
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-xs text-muted-foreground">No supplier channel is attached to this catalog model.</p>}
                  {candidate.roboticsAssessmentEvidence.length ? (
                    <details className="rounded-md border p-3">
                      <summary className="cursor-pointer text-xs font-medium">Robotics-specific assessment evidence ({candidate.roboticsAssessmentEvidence.length})</summary>
                      <ul className="mt-2 flex flex-col gap-2">
                        {candidate.roboticsAssessmentEvidence.map((item) => (
                          <li key={item.keyPointId} className="text-xs leading-relaxed">
                            <span className="font-medium">{item.keyPointId} · {item.points} points · {item.confidence} confidence</span>
                            {item.explanation ? <p className="text-muted-foreground">{item.explanation}</p> : null}
                            {item.evidence.length ? <p className="text-muted-foreground">{item.evidence.join(' · ')}</p> : null}
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </article>
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <p className="text-sm leading-relaxed text-muted-foreground">Recommendations are generated when the property assessment is complete and an open robotics-interest request exists.</p>
      )}

      <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-end sm:justify-between">
        <label className="flex w-full max-w-md flex-col gap-1 text-xs font-medium">
          Rerun reason
          <input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} className={selectClassName} />
        </label>
        <Button type="button" variant="outline" onClick={rerun} disabled={pending || request.status === 'closed'}>
          <RefreshCw data-icon="inline-start" />{pending ? 'Refreshing…' : 'Refresh recommendations'}
        </Button>
      </div>
      <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />A fit result does not share customer details, send a referral, or guarantee pricing, availability, compliance, or deployment readiness.</p>
    </section>
  )
}

