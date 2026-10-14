'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Clock3, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import {
  createRoboticsSourceCollaboration,
  updateRoboticsSourceCollaboration,
} from '@/app/actions/robotics-collaboration'
import type { getRoboticsInterestReviewData } from '@/app/actions/robotics-interest'
import { getRoboticsCollaborationNextStatuses } from '@/lib/robotics-interest/collaboration'
import type { RoboticsCollaborationStatus } from '@/lib/db/schema'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'

type ReviewData = NonNullable<Awaited<ReturnType<typeof getRoboticsInterestReviewData>>>
type InterestRequest = ReviewData['requests'][number]
type Collaboration = InterestRequest['sourceCollaborations'][number]
type MatchCandidate = NonNullable<InterestRequest['recommendationRun']>['results']['candidates'][number]

const controlClassName = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'
const statusLabels: Record<RoboticsCollaborationStatus, string> = {
  consent_pending: 'Owner approval requested',
  selected: 'Selected',
  shared: 'Shared with source',
  source_response: 'Source response recorded',
  fit_confirmed: 'Fit confirmed',
  fit_rejected: 'Fit rejected',
  pilot_planning: 'Pilot planning',
  pilot_in_progress: 'Pilot in progress',
  pilot_completed: 'Pilot completed',
  deployment_planning: 'Deployment planning',
  deployment_in_progress: 'Deployment in progress',
  deployment_completed: 'Deployment completed',
  closed: 'Closed',
  owner_declined: 'Owner declined',
  withdrawn: 'Withdrawn',
}

function dateLabel(value: Date | string): string {
  return new Date(value).toLocaleString()
}

export function RoboticsSourceCollaborations({ request }: { request: InterestRequest }) {
  const [overrideBasis, setOverrideBasis] = useState<'partner_unable' | 'owner_requested'>('partner_unable')
  const [overrideReason, setOverrideReason] = useState('')
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const candidates = request.recommendationRun?.results.candidates.filter((candidate) => candidate.eligible) ?? []
  const collaborations = request.sourceCollaborations as Collaboration[]

  function requestOwnerApproval(modelId: string, offeringId: string) {
    startTransition(async () => {
      try {
        const result = await createRoboticsSourceCollaboration({
          interestId: request.id,
          modelId,
          offeringId,
          overrideBasis,
          overrideReason: overrideReason.trim(),
        })
        if (!result.ok) {
          toast.error(result.error)
          return
        }
        toast.success('Owner approval request created. No source has been contacted.')
        router.refresh()
      } catch {
        toast.error('Could not create the source-collaboration request.')
      }
    })
  }

  function saveMilestone(collaborationId: string, formData: FormData) {
    const status = formData.get('status')
    const note = String(formData.get('note') ?? '').trim()
    if (typeof status !== 'string') return
    startTransition(async () => {
      try {
        const result = await updateRoboticsSourceCollaboration({ collaborationId, status, note })
        if (!result.ok) {
          toast.error(result.error)
          return
        }
        toast.success('Collaboration timeline updated.')
        router.refresh()
      } catch {
        toast.error('Could not update this collaboration milestone.')
      }
    })
  }

  return (
    <section className="flex flex-col gap-4 rounded-lg border p-4" aria-labelledby={`collaboration-heading-${request.id}`}>
      <div className="flex flex-col gap-1">
        <h3 id={`collaboration-heading-${request.id}`} className="text-sm font-semibold">Source collaboration and deployment</h3>
        <p className="text-xs leading-relaxed text-muted-foreground">Admin selects one or more eligible sources for owner approval, then records each source's response, pilot, and deployment milestones. Nothing is sent automatically.</p>
      </div>

      {candidates.length ? (
        <div className="flex flex-col gap-3">
          <h4 className="text-sm font-medium">Eligible model and source channels</h4>
          {candidates.map((candidate: MatchCandidate) => (
            <article key={candidate.modelId} className="flex flex-col gap-3 rounded-md border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium">{candidate.manufacturerName} · {candidate.modelName}</span>
                <Badge variant="secondary">{candidate.fitScore}% documented fit</Badge>
              </div>
              {candidate.offers.filter((offer) => offer.unmetRequirements.length === 0).map((offer) => {
                const alreadyOpen = collaborations.some((item) => item.offeringId === offer.offeringId && !['closed', 'owner_declined', 'withdrawn'].includes(item.status))
                return (
                  <div key={offer.offeringId} className="flex flex-col gap-2 rounded-md bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="text-sm font-medium">{offer.partnerName}</span>
                      <span className="text-xs text-muted-foreground">{offer.partnershipStatus.replaceAll('_', ' ')} · {offer.sourceType} · priority {offer.sourcePriority}</span>
                    </div>
                    <Button type="button" size="sm" variant="outline" disabled={pending || alreadyOpen} onClick={() => requestOwnerApproval(candidate.modelId, offer.offeringId)}>
                      <CheckCircle2 data-icon="inline-start" />{alreadyOpen ? 'Approval already requested' : 'Request owner approval'}
                    </Button>
                  </div>
                )
              })}
            </article>
          ))}
          <details className="rounded-md border p-3">
            <summary className="cursor-pointer text-sm font-medium">Existing partnership exception (only if relevant)</summary>
            <FieldGroup className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor={`override-basis-${request.id}`}>Reason basis</FieldLabel>
                <select id={`override-basis-${request.id}`} className={controlClassName} value={overrideBasis} onChange={(event) => setOverrideBasis(event.target.value as typeof overrideBasis)}>
                  <option value="partner_unable">Existing partner cannot meet the documented need</option>
                  <option value="owner_requested">Owner explicitly requested an alternative</option>
                </select>
                <FieldDescription>The owner sees and approves this reason before any source receives information.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor={`override-reason-${request.id}`}>Admin record</FieldLabel>
                <Textarea id={`override-reason-${request.id}`} value={overrideReason} onChange={(event) => setOverrideReason(event.target.value)} maxLength={500} rows={3} placeholder="Explain why the existing partnership cannot meet this need, or record the owner's request." />
              </Field>
            </FieldGroup>
          </details>
        </div>
      ) : (
        <p className="text-sm leading-relaxed text-muted-foreground">No source channel has passed every current fit and evidence gate. Update the catalog or record follow-up; a non-eligible lead cannot be shared.</p>
      )}

      {collaborations.length ? (
        <div className="flex flex-col gap-3 border-t pt-4">
          <h4 className="text-sm font-medium">Per-source collaboration timeline</h4>
          {collaborations.map((collaboration) => {
            const nextStatuses = getRoboticsCollaborationNextStatuses(collaboration.status)
            return (
              <Card key={collaboration.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex flex-col gap-1">
                      <CardTitle className="text-base">{collaboration.consentScope.providerName} · {collaboration.consentScope.modelName}</CardTitle>
                      <CardDescription>Selected {dateLabel(collaboration.createdAt)}</CardDescription>
                    </div>
                    <Badge variant={collaboration.status === 'fit_rejected' || collaboration.status === 'owner_declined' ? 'outline' : 'secondary'}>{statusLabels[collaboration.status]}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {collaboration.status === 'consent_pending' ? (
                    <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />Waiting for the property owner. No information has been shared with this source.</p>
                  ) : null}
                  {collaboration.sharedSnapshot ? (
                    <details className="rounded-md border p-3">
                      <summary className="cursor-pointer text-xs font-medium">Exact information snapshot shared</summary>
                      <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs">{JSON.stringify(collaboration.sharedSnapshot, null, 2)}</pre>
                    </details>
                  ) : null}
                  <ol className="flex flex-col gap-3 border-l pl-4">
                    {[...collaboration.events].reverse().map((event) => (
                      <li key={event.id} className="flex flex-col gap-1 text-xs leading-relaxed">
                        <span className="flex items-center gap-2 font-medium"><Clock3 className="size-3.5" aria-hidden="true" />{statusLabels[event.eventType as RoboticsCollaborationStatus] ?? event.eventType.replaceAll('_', ' ')} · {dateLabel(event.createdAt)}</span>
                        {event.note ? <span className="text-muted-foreground">{event.note}</span> : null}
                      </li>
                    ))}
                  </ol>
                  {nextStatuses.length ? (
                    <form action={(formData) => saveMilestone(collaboration.id, formData)} className="flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-end">
                      <FieldGroup className="grid flex-1 gap-3 sm:grid-cols-2">
                        <Field>
                          <FieldLabel htmlFor={`milestone-${collaboration.id}`}>Next milestone</FieldLabel>
                          <select id={`milestone-${collaboration.id}`} name="status" defaultValue={nextStatuses[0]} className={controlClassName} disabled={pending}>
                            {nextStatuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
                          </select>
                        </Field>
                        <Field>
                          <FieldLabel htmlFor={`milestone-note-${collaboration.id}`}>Response or outcome note</FieldLabel>
                          <Textarea id={`milestone-note-${collaboration.id}`} name="note" maxLength={2000} rows={2} disabled={pending} placeholder="Record the source response, decision, or pilot/deployment outcome." />
                        </Field>
                      </FieldGroup>
                      <Button type="submit" variant="outline" disabled={pending}>{pending ? 'Saving…' : 'Save milestone'}</Button>
                    </form>
                  ) : null}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}

export function RoboticsCollaborationConsentRequests({ requests }: {
  requests: Array<{
    id: string
    scope: {
      providerName: string
      modelName: string
      includedFields: string[]
      excludedFields: string[]
      overrideBasis: 'partner_unable' | 'owner_requested' | null
      overrideReason: string | null
    }
    overrideReason: string | null
    createdAt: string
  }>
}) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function respond(collaborationId: string, decision: 'approved' | 'declined') {
    startTransition(async () => {
      try {
        const result = await updateConsent(collaborationId, decision)
        if (!result.ok) {
          toast.error(result.error)
          return
        }
        toast.success(decision === 'approved' ? 'You approved this specific information-sharing request.' : 'You declined this source-sharing request.')
        router.refresh()
      } catch {
        toast.error('Could not save your sharing decision.')
      }
    })
  }

  return (
    <section className="flex flex-col gap-4" aria-labelledby="robotics-sharing-requests-heading">
      <div className="flex flex-col gap-1">
        <h2 id="robotics-sharing-requests-heading" className="text-lg font-semibold">Source-sharing requests</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">Each source requires your separate approval. Approving shares only the fields listed in that request; it does not create a quote or guarantee a pilot.</p>
      </div>
      {requests.map((request) => (
        <Card key={request.id}>
          <CardHeader>
            <CardTitle className="text-base">{request.scope.providerName} · {request.scope.modelName}</CardTitle>
            <CardDescription>Requested {new Date(request.createdAt).toLocaleString()}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {request.scope.overrideBasis ? (
              <div className="rounded-md border bg-muted/30 p-3 text-sm leading-relaxed">
                <p className="font-medium">This is an alternative to an existing robotics partnership.</p>
                <p className="mt-1 text-muted-foreground">{request.scope.overrideBasis === 'partner_unable' ? 'The Admin indicates the existing partner cannot meet the documented need.' : 'The Admin recorded that you explicitly requested an alternative source.'}</p>
                {request.scope.overrideReason ? <p className="mt-2">Admin record: {request.scope.overrideReason}</p> : null}
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <h3 className="text-sm font-medium">Information proposed for sharing</h3>
                <ul className="mt-2 flex flex-col gap-1 text-xs leading-relaxed text-muted-foreground">{request.scope.includedFields.map((field) => <li key={field}>{field.replaceAll('_', ' ').replaceAll('.', ' · ')}</li>)}</ul>
              </div>
              <div>
                <h3 className="text-sm font-medium">Never included</h3>
                <ul className="mt-2 flex flex-col gap-1 text-xs leading-relaxed text-muted-foreground">{request.scope.excludedFields.map((field) => <li key={field}>{field}</li>)}</ul>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t pt-3">
              <Button type="button" variant="outline" disabled={pending} onClick={() => respond(request.id, 'declined')}>Decline</Button>
              <Button type="button" disabled={pending} onClick={() => respond(request.id, 'approved')}>{pending ? 'Saving…' : 'Approve this source only'}</Button>
            </div>
          </CardContent>
        </Card>
      ))}
      {requests.length === 0 ? <p className="text-sm text-muted-foreground">There are no source-sharing requests waiting for your approval.</p> : null}
    </section>
  )
}

async function updateConsent(collaborationId: string, decision: 'approved' | 'declined') {
  const { respondToRoboticsCollaborationConsent } = await import('@/app/actions/robotics-collaboration')
  return respondToRoboticsCollaborationConsent({ collaborationId, decision })
}

export { statusLabels as roboticsCollaborationStatusLabels }
