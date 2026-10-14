'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Clock3, ExternalLink, Handshake, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import {
  createRoboticsSourceCollaboration,
  respondToRoboticsCollaborationConsent,
  updateRoboticsSourceCollaboration,
} from '@/app/actions/robotics-collaboration'
import type { getRoboticsInterestReviewData } from '@/app/actions/robotics-interest'
import { getNextRoboticsCollaborationStatuses } from '@/lib/robotics-interest/collaboration'
import type { RoboticsCollaborationStatus, RoboticsConsentScope, RoboticsSharedSnapshot } from '@/lib/db/schema'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'

type ReviewData = NonNullable<Awaited<ReturnType<typeof getRoboticsInterestReviewData>>>
type InterestRequest = ReviewData['requests'][number]
type ReviewCollaboration = InterestRequest['sourceCollaborations'][number]

type OwnerCollaborationRequest = {
  id: string
  status: RoboticsCollaborationStatus
  scope: RoboticsConsentScope
  overrideReason: string | null
  ownerConsentDecision: string | null
  createdAt: string
  ownerConsentAt: string | null
  sharedAt: string | null
  sharedSnapshot: RoboticsSharedSnapshot | null
}

const selectClassName = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'

function statusLabel(status: string) {
  return status.replaceAll('_', ' ')
}

function readableField(value: string) {
  return value.replaceAll('.', ' · ').replaceAll('_', ' ')
}

export function OwnerRoboticsCollaborationConsent({ requests }: { requests: OwnerCollaborationRequest[] }) {
  if (requests.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Robotics source-sharing requests</CardTitle>
        <CardDescription>Each request is separate. Approval authorizes only the specific fields listed for the named source; it does not send an automatic referral or message.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {requests.map((request) => <OwnerConsentCard key={request.id} request={request} />)}
      </CardContent>
    </Card>
  )
}

function OwnerConsentCard({ request }: { request: OwnerCollaborationRequest }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const pendingConsent = request.status === 'consent_pending' && !request.ownerConsentDecision

  function respond(decision: 'approved' | 'declined') {
    startTransition(async () => {
      const result = await respondToRoboticsCollaborationConsent({ collaborationId: request.id, decision })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(decision === 'approved' ? 'Source-sharing scope approved.' : 'Source-sharing request declined.')
      router.refresh()
    })
  }

  return (
    <article className="flex flex-col gap-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold">{request.scope.providerName} · {request.scope.modelName}</h3>
          <p className="text-xs leading-relaxed text-muted-foreground">Requested {new Date(request.createdAt).toLocaleString()}</p>
        </div>
        <Badge variant={pendingConsent ? 'secondary' : request.ownerConsentDecision === 'approved' ? 'default' : 'outline'}>
          {pendingConsent ? 'Consent needed' : request.ownerConsentDecision === 'approved' ? 'Approved' : request.ownerConsentDecision === 'declined' ? 'Declined' : statusLabel(request.status)}
        </Badge>
      </div>

      {request.scope.overrideBasis ? (
        <p className="text-sm leading-relaxed"><span className="font-medium">Alternative-source reason:</span> {request.scope.overrideBasis === 'owner_requested' ? 'Owner-requested alternative' : 'Existing partner unable to meet the documented need'}{request.overrideReason ? ` — ${request.overrideReason}` : ''}</p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="flex flex-col gap-2">
          <h4 className="text-sm font-medium">Information that may be shared</h4>
          <ul className="flex flex-col gap-1 text-xs leading-relaxed text-muted-foreground">
            {request.scope.includedFields.map((field) => <li key={field}>{readableField(field)}</li>)}
          </ul>
        </section>
        <section className="flex flex-col gap-2">
          <h4 className="text-sm font-medium">Always excluded</h4>
          <ul className="flex flex-col gap-1 text-xs leading-relaxed text-muted-foreground">
            {request.scope.excludedFields.map((field) => <li key={field}>{field}</li>)}
          </ul>
        </section>
      </div>

      {request.sharedSnapshot ? (
        <details className="rounded-md border p-3">
          <summary className="cursor-pointer text-sm font-medium">Review the exact information recorded as shared</summary>
          <SharedSnapshotView snapshot={request.sharedSnapshot} />
        </details>
      ) : null}

      {request.sharedAt ? <p className="text-xs text-muted-foreground">Admin recorded a manual share on {new Date(request.sharedAt).toLocaleString()}. RoboReady does not send the information automatically.</p> : null}
      {request.ownerConsentAt && request.ownerConsentDecision ? <p className="text-xs text-muted-foreground">Your decision was recorded {new Date(request.ownerConsentAt).toLocaleString()}. Current collaboration status: {statusLabel(request.status)}.</p> : null}

      {pendingConsent ? (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-3">
          <Button type="button" variant="outline" disabled={pending} onClick={() => respond('declined')}>Decline sharing</Button>
          <Button type="button" disabled={pending} onClick={() => respond('approved')}>
            <CheckCircle2 data-icon="inline-start" />{pending ? 'Saving…' : 'Approve this scope'}
          </Button>
        </div>
      ) : null}
    </article>
  )
}

function SharedSnapshotView({ snapshot }: { snapshot: RoboticsSharedSnapshot }) {
  return (
    <dl className="mt-3 grid gap-x-4 gap-y-2 text-xs sm:grid-cols-2">
      <div><dt className="font-medium">Property</dt><dd className="text-muted-foreground">{snapshot.property.name || 'Not included'}{snapshot.property.city ? ` · ${snapshot.property.city}` : ''}{snapshot.property.region ? ` · ${snapshot.property.region}` : ''}{snapshot.property.country ? ` · ${snapshot.property.country}` : ''}</dd></div>
      <div><dt className="font-medium">Model</dt><dd className="text-muted-foreground">{snapshot.model.manufacturerName} · {snapshot.model.modelName} ({snapshot.model.category})</dd></div>
      <div><dt className="font-medium">Source</dt><dd className="text-muted-foreground">{snapshot.offering.sourceName} · {snapshot.offering.sourceType} · {snapshot.offering.availability}</dd></div>
      <div>
        <dt className="font-medium">Requirements</dt>
        <dd className="mt-1 text-muted-foreground">{Object.entries(snapshot.requirements).map(([key, value]) => `${readableField(key)}: ${Array.isArray(value) ? value.join(', ') : typeof value === 'object' ? JSON.stringify(value) : String(value)}`).join(' · ') || 'None included'}</dd>
      </div>
      <div>
        <dt className="font-medium">Robotics assessment</dt>
        <dd className="mt-1 text-muted-foreground">{snapshot.assessment.roboReadyScore == null ? 'Not included' : `RoboReady score: ${snapshot.assessment.roboReadyScore}`}</dd>
        {Array.isArray(snapshot.assessment.roboticsEvidence) ? <dd className="mt-1 text-muted-foreground">{snapshot.assessment.roboticsEvidence.map((item) => `${String(item.keyPointId)} · ${String(item.points)} points`).join(', ')}</dd> : null}
      </div>
    </dl>
  )
}

export function AdminRoboticsCollaborationPanel({ request }: { request: InterestRequest }) {
  const candidates = request.recommendationRun?.results.candidates ?? []
  const eligibleSources = candidates.flatMap((candidate) => candidate.eligible
    ? candidate.offers.filter((offer) => offer.unmetRequirements.length === 0).map((offer) => ({
      key: `${candidate.modelId}::${offer.offeringId}`,
      modelId: candidate.modelId,
      modelName: candidate.modelName,
      manufacturerName: candidate.manufacturerName,
      offeringId: offer.offeringId,
      partnerName: offer.partnerName,
      partnershipStatus: offer.partnershipStatus,
      sourceType: offer.sourceType,
      priority: offer.sourcePriority,
    }))
    : [])
  const [selectedOfferKey, setSelectedOfferKey] = useState(eligibleSources[0]?.key ?? '')
  const [overrideBasis, setOverrideBasis] = useState('')
  const [overrideReason, setOverrideReason] = useState('')
  const [statusDrafts, setStatusDrafts] = useState<Record<string, RoboticsCollaborationStatus>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function addSource() {
    const selected = eligibleSources.find((source) => source.key === selectedOfferKey)
    if (!selected) {
      toast.error('Choose a currently eligible model and source.')
      return
    }
    startTransition(async () => {
      const result = await createRoboticsSourceCollaboration({
        interestId: request.id,
        modelId: selected.modelId,
        offeringId: selected.offeringId,
        overrideBasis: overrideBasis || null,
        overrideReason,
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(`Consent request prepared for ${selected.partnerName}.`)
      setOverrideBasis('')
      setOverrideReason('')
      router.refresh()
    })
  }

  function updateMilestone(collaboration: ReviewCollaboration) {
    const nextStatus = statusDrafts[collaboration.id] ?? collaboration.status
    if (nextStatus === collaboration.status) {
      toast.error('Choose a new collaboration milestone first.')
      return
    }
    if (nextStatus === 'shared' && !window.confirm('This records a manual share of the owner-approved snapshot. No email or referral will be sent. Continue only after you have deliberately shared it outside RoboReady.')) return
    startTransition(async () => {
      const result = await updateRoboticsSourceCollaboration({
        collaborationId: collaboration.id,
        status: nextStatus,
        note: notes[collaboration.id] ?? '',
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(`Collaboration updated: ${statusLabel(nextStatus)}.`)
      router.refresh()
    })
  }

  return (
    <section className="flex flex-col gap-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><Handshake className="size-4" aria-hidden="true" />Source collaboration and delivery</h3>
          <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">Select one or more qualified sources in parallel. The owner approves each source and exact data scope before any manual sharing. This workflow never sends a message automatically.</p>
        </div>
        <Badge variant="outline">{request.sourceCollaborations.length} tracked</Badge>
      </div>

      {eligibleSources.length ? (
        <div className="grid gap-3 rounded-md bg-muted/20 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,0.7fr)]">
          <Field>
            <FieldLabel htmlFor={`source-choice-${request.id}`}>Eligible model and source</FieldLabel>
            <select id={`source-choice-${request.id}`} className={selectClassName} value={selectedOfferKey} onChange={(event) => setSelectedOfferKey(event.target.value)} disabled={pending}>
              {eligibleSources.map((source) => <option key={source.key} value={source.key}>{source.manufacturerName} · {source.modelName} — {source.partnerName} ({source.partnershipStatus.replaceAll('_', ' ')}, priority {source.priority})</option>)}
            </select>
            <FieldDescription>Only current candidates that pass every recorded fit and evidence gate are available here.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor={`override-basis-${request.id}`}>If replacing an existing robotics partner</FieldLabel>
            <select id={`override-basis-${request.id}`} className={selectClassName} value={overrideBasis} onChange={(event) => setOverrideBasis(event.target.value)} disabled={pending}>
              <option value="">No override stated</option>
              <option value="partner_unable">Existing partner cannot meet need</option>
              <option value="owner_requested">Owner requested an alternative</option>
            </select>
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor={`override-reason-${request.id}`}>Override rationale</FieldLabel>
            <Textarea id={`override-reason-${request.id}`} value={overrideReason} onChange={(event) => setOverrideReason(event.target.value)} maxLength={500} rows={2} disabled={pending} placeholder="Required only when an existing partner is being bypassed" />
          </Field>
          <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">Adding a source creates an owner-consent request only. It does not send customer information or contact the source.</p>
            <Button type="button" onClick={addSource} disabled={pending} className="shrink-0">{pending ? 'Saving…' : 'Request owner consent'}</Button>
          </div>
        </div>
      ) : (
        <p className="rounded-md border border-dashed p-3 text-sm leading-relaxed text-muted-foreground">No current source offering passes every gate. Refresh the recommendation or resolve the catalog evidence gaps before selecting a source.</p>
      )}

      {request.sourceCollaborations.length ? (
        <div className="flex flex-col gap-3">
          {request.sourceCollaborations.map((collaboration) => {
            const nextStatuses = getNextRoboticsCollaborationStatuses(collaboration.status)
            const draftStatus = statusDrafts[collaboration.id] ?? collaboration.status
            const waitingForOwner = collaboration.status === 'consent_pending'
            return (
              <article key={collaboration.id} className="flex flex-col gap-3 rounded-md border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <h4 className="font-medium">{collaboration.consentScope.providerName} · {collaboration.consentScope.modelName}</h4>
                    <p className="text-xs text-muted-foreground">Selected {new Date(collaboration.createdAt).toLocaleString()} · source-specific record</p>
                    {collaboration.overrideBasis ? <p className="text-xs leading-relaxed">Override: {statusLabel(collaboration.overrideBasis)} — {collaboration.overrideReason}</p> : null}
                  </div>
                  <Badge variant={collaboration.status === 'deployment_completed' ? 'default' : 'secondary'}>{statusLabel(collaboration.status)}</Badge>
                </div>

                {collaboration.sharedSnapshot ? (
                  <details className="rounded-md border p-3">
                    <summary className="cursor-pointer text-xs font-medium">Minimum-data snapshot recorded for sharing</summary>
                    <SharedSnapshotView snapshot={collaboration.sharedSnapshot} />
                    {collaboration.sharedSnapshot.offering.sourceUrl ? <a href={collaboration.sharedSnapshot.offering.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-primary underline underline-offset-4">Offering evidence <ExternalLink className="size-3" aria-hidden="true" /></a> : null}
                  </details>
                ) : null}

                {waitingForOwner ? (
                  <p className="flex items-center gap-2 rounded-md bg-muted/30 p-3 text-sm text-muted-foreground"><Clock3 className="size-4" aria-hidden="true" />Waiting for the owner to approve this source and sharing scope. No details have been shared.</p>
                ) : nextStatuses.length ? (
                  <div className="grid gap-3 rounded-md bg-muted/20 p-3 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor={`milestone-${collaboration.id}`}>Next milestone</FieldLabel>
                      <select id={`milestone-${collaboration.id}`} className={selectClassName} value={draftStatus} onChange={(event) => setStatusDrafts((current) => ({ ...current, [collaboration.id]: event.target.value as RoboticsCollaborationStatus }))} disabled={pending}>
                        <option value={collaboration.status}>Keep current status</option>
                        {nextStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
                      </select>
                      {draftStatus === 'shared' ? <FieldDescription>Records the exact approved snapshot and current assessment evidence. The actual outreach remains manual.</FieldDescription> : null}
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`milestone-note-${collaboration.id}`}>Source response or milestone note</FieldLabel>
                      <Textarea id={`milestone-note-${collaboration.id}`} value={notes[collaboration.id] ?? ''} onChange={(event) => setNotes((current) => ({ ...current, [collaboration.id]: event.target.value }))} maxLength={2000} rows={2} disabled={pending} placeholder={draftStatus === 'source_response' ? 'Required: record the source response' : 'Optional internal context for this timeline event'} />
                    </Field>
                    <div className="flex items-center justify-between gap-3 sm:col-span-2">
                      <p className="text-xs leading-relaxed text-muted-foreground">Every status update is timestamped and attributed in this source's timeline.</p>
                      <Button type="button" variant="outline" onClick={() => updateMilestone(collaboration)} disabled={pending || draftStatus === collaboration.status}>
                        {pending ? 'Saving…' : 'Save milestone'}
                      </Button>
                    </div>
                  </div>
                ) : <p className="text-xs text-muted-foreground">This source's collaboration is closed. Its audit history is retained.</p>}

                <ol className="flex flex-col gap-2 border-l pl-4">
                  {[...collaboration.events].reverse().map((event) => (
                    <li key={event.id} className="relative flex flex-col gap-0.5 text-xs leading-relaxed">
                      <span className="font-medium">{statusLabel(event.eventType)} · {event.actorType}</span>
                      <span className="text-muted-foreground">{new Date(event.createdAt).toLocaleString()}{event.note ? ` — ${event.note}` : ''}</span>
                    </li>
                  ))}
                </ol>
              </article>
            )
          })}
        </div>
      ) : <p className="text-sm text-muted-foreground">No sources selected. A recommendation never initiates collaboration by itself.</p>}

      <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />Before sharing, current partnership status and technical fit are checked again. If an existing robotics partner covers the need, only that partner is eligible unless the documented exception is recorded.</p>
    </section>
  )
}

export type { OwnerCollaborationRequest }
