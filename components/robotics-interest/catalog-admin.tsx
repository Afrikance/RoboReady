'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { BadgeCheck, CircleAlert, Pencil, Save, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import {
  saveRoboticsCapability,
  saveRoboticsManufacturer,
  saveRoboticsModel,
  saveRoboticsOffering,
  updateRoboticsSourcePriority,
  type getRoboticsCatalogAdminData,
} from '@/app/actions/robotics-sourcing'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

type CatalogData = NonNullable<Awaited<ReturnType<typeof getRoboticsCatalogAdminData>>>
type Manufacturer = CatalogData['manufacturers'][number]
type Model = CatalogData['models'][number]
type Capability = CatalogData['capabilities'][number]
type Offering = CatalogData['sourceOfferings'][number]
type Partner = CatalogData['partners'][number]
type SaveResult = { ok: true; id: string } | { ok: false; error: string }

const controlClass = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'
const verifiedOptions = [
  { value: 'unverified', label: 'Unverified' },
  { value: 'unknown', label: 'Unknown' },
  { value: 'verified', label: 'Verified' },
]
const partnershipOptions = [
  { value: 'unverified', label: 'Unverified — not eligible' },
  { value: 'paused', label: 'Paused — not eligible' },
  { value: 'participating', label: 'Participating' },
  { value: 'full_partner', label: 'Full partner' },
]
const sourceTypeOptions = ['manufacturer', 'distributor', 'retailer', 'rental', 'raas', 'integrator']

function labelize(value: string): string {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function FieldSelect({ id, label, name, defaultValue, children }: { id: string; label: string; name: string; defaultValue?: string; children: React.ReactNode }) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <select id={id} name={name} defaultValue={defaultValue} className={controlClass} required>
        {children}
      </select>
    </Field>
  )
}

function FieldText({ id, label, name, defaultValue, type = 'text', required = false, placeholder }: { id: string; label: string; name: string; defaultValue?: string | number | null; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input id={id} name={name} type={type} defaultValue={defaultValue ?? ''} required={required} placeholder={placeholder} maxLength={type === 'url' ? 2048 : undefined} />
    </Field>
  )
}

export function RoboticsCatalogAdmin({ initialData }: { initialData: CatalogData }) {
  const data = initialData
  const [manufacturerDraft, setManufacturerDraft] = useState<Partial<Manufacturer> | null>(null)
  const [modelDraft, setModelDraft] = useState<Partial<Model> | null>(null)
  const [capabilityDraft, setCapabilityDraft] = useState<Partial<Capability> | null>(null)
  const [offeringDraft, setOfferingDraft] = useState<Partial<Offering> | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function runSave(action: (input: unknown) => Promise<SaveResult>, input: unknown, reset: () => void) {
    startTransition(async () => {
      try {
        const result = await action(input)
        if (!result.ok) {
          toast.error(result.error)
          return
        }
        toast.success('Robotics sourcing record saved.')
        reset()
        router.refresh()
      } catch {
        toast.error('Could not save this robotics sourcing record.')
      }
    })
  }

  function submitForm(event: FormEvent<HTMLFormElement>, action: (input: unknown) => Promise<SaveResult>, reset: () => void, extra: (values: Record<string, FormDataEntryValue>) => unknown = (values) => values) {
    event.preventDefault()
    const form = event.currentTarget
    const values = Object.fromEntries(new FormData(form).entries())
    runSave(action, extra(values), () => {
      form.reset()
      reset()
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="source-roster-heading" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="source-roster-heading" className="text-lg font-semibold">Robotics source roster</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">Only active sources with participating or full-partner status can qualify. Priority orders eligible sources within their partnership tier; it never overrides fit evidence.</p>
        </div>
        {data.partners.length ? data.partners.map((partner) => (
          <SourcePriorityCard key={partner.id} partner={partner} pending={pending} onSave={(input) => runSave(updateRoboticsSourcePriority, input, () => undefined)} />
        )) : (
          <Card><CardContent className="py-6 text-sm text-muted-foreground">Add an organization robotics partner first in the Solution Partners area, then qualify it here.</CardContent></Card>
        )}
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Manufacturers</CardTitle>
            <CardDescription>Record the organization behind each robot or cobot. Verification requires a source URL.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <form onSubmit={(event) => submitForm(event, saveRoboticsManufacturer, () => setManufacturerDraft(null))} className="flex flex-col gap-4">
              {manufacturerDraft?.id ? <input type="hidden" name="id" value={manufacturerDraft.id} /> : null}
              <FieldGroup className="grid gap-4 sm:grid-cols-2">
                <FieldText id="manufacturer-name" name="name" label="Manufacturer" defaultValue={manufacturerDraft?.name} required placeholder="Northstar Robotics" />
                <FieldText id="manufacturer-country" name="country" label="Country" defaultValue={manufacturerDraft?.country} placeholder="United States" />
                <FieldText id="manufacturer-url" name="websiteUrl" label="Verification source URL" type="url" defaultValue={manufacturerDraft?.websiteUrl} placeholder="https://…" />
                <FieldSelect id="manufacturer-status" name="verificationStatus" label="Verification status" defaultValue={manufacturerDraft?.verificationStatus ?? 'unverified'}>
                  {verifiedOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </FieldSelect>
              </FieldGroup>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={pending}><Save data-icon="inline-start" />{pending ? 'Saving…' : manufacturerDraft?.id ? 'Update manufacturer' : 'Add manufacturer'}</Button>
                {manufacturerDraft?.id ? <Button type="button" variant="outline" onClick={() => setManufacturerDraft(null)}>Cancel edit</Button> : null}
              </div>
            </form>
            <div className="flex flex-col gap-2 border-t pt-4">
              {data.manufacturers.map((manufacturer) => (
                <div key={manufacturer.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="font-medium">{manufacturer.name}</span>
                    <span className="text-xs text-muted-foreground">{manufacturer.country || 'Country unknown'} · {manufacturer.verificationStatus}</span>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setManufacturerDraft(manufacturer)}><Pencil data-icon="inline-start" />Edit</Button>
                </div>
              ))}
              {data.manufacturers.length === 0 ? <p className="text-sm text-muted-foreground">No manufacturers in this organization yet.</p> : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Robot and cobot models</CardTitle>
            <CardDescription>Model status is separate from manufacturer, capability, and source-offering verification.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <form onSubmit={(event) => submitForm(event, saveRoboticsModel, () => setModelDraft(null))} className="flex flex-col gap-4">
              {modelDraft?.id ? <input type="hidden" name="id" value={modelDraft.id} /> : null}
              <FieldGroup className="grid gap-4 sm:grid-cols-2">
                <FieldSelect id="model-manufacturer" name="manufacturerId" label="Manufacturer" defaultValue={modelDraft?.manufacturerId ?? data.manufacturers[0]?.id}>
                  {data.manufacturers.map((manufacturer) => <option key={manufacturer.id} value={manufacturer.id}>{manufacturer.name}</option>)}
                </FieldSelect>
                <FieldText id="model-name" name="name" label="Model name" defaultValue={modelDraft?.name} required placeholder="Courier One" />
                <FieldText id="model-category" name="category" label="Robot category" defaultValue={modelDraft?.category} required placeholder="Indoor delivery" />
                <FieldText id="model-url" name="productUrl" label="Product source URL" type="url" defaultValue={modelDraft?.productUrl} placeholder="https://…" />
                <FieldSelect id="model-commercial" name="commercialStatus" label="Commercial status" defaultValue={modelDraft?.commercialStatus ?? 'unknown'}>
                  {['commercial', 'pilot', 'preorder', 'prototype', 'retired', 'unknown'].map((item) => <option key={item} value={item}>{labelize(item)}</option>)}
                </FieldSelect>
                <FieldSelect id="model-verification" name="verificationStatus" label="Verification status" defaultValue={modelDraft?.verificationStatus ?? 'unverified'}>
                  {verifiedOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </FieldSelect>
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="model-description">Description</FieldLabel>
                  <textarea id="model-description" name="description" rows={2} maxLength={2400} defaultValue={modelDraft?.description ?? ''} className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </Field>
              </FieldGroup>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={pending || data.manufacturers.length === 0}><Save data-icon="inline-start" />{pending ? 'Saving…' : modelDraft?.id ? 'Update model' : 'Add model'}</Button>
                {modelDraft?.id ? <Button type="button" variant="outline" onClick={() => setModelDraft(null)}>Cancel edit</Button> : null}
              </div>
            </form>
            <div className="flex flex-col gap-2 border-t pt-4">
              {data.models.map((model) => {
                const manufacturer = data.manufacturers.find((item) => item.id === model.manufacturerId)
                return (
                  <div key={model.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="font-medium">{model.name}</span>
                      <span className="text-xs text-muted-foreground">{manufacturer?.name ?? 'Unknown manufacturer'} · {model.commercialStatus} · {model.verificationStatus}</span>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setModelDraft(model)}><Pencil data-icon="inline-start" />Edit</Button>
                  </div>
                )
              })}
              {data.models.length === 0 ? <p className="text-sm text-muted-foreground">No models in this organization yet.</p> : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Capability evidence</CardTitle>
            <CardDescription>Only verified, current evidence can satisfy technical fit gates. Use normalized keys such as package_delivery, environment_indoor, and access_restricted.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <form onSubmit={(event) => submitForm(event, saveRoboticsCapability, () => setCapabilityDraft(null), (values) => ({ ...values, confidence: values.confidence === '' ? null : Number(values.confidence) }))} className="flex flex-col gap-4">
              {capabilityDraft?.id ? <input type="hidden" name="id" value={capabilityDraft.id} /> : null}
              <FieldGroup className="grid gap-4 sm:grid-cols-2">
                <FieldSelect id="capability-model" name="modelId" label="Model" defaultValue={capabilityDraft?.modelId ?? data.models[0]?.id}>
                  {data.models.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}
                </FieldSelect>
                <FieldText id="capability-key" name="capabilityKey" label="Normalized capability key" defaultValue={capabilityDraft?.capabilityKey} required placeholder="package_delivery" />
                <FieldText id="capability-value" name="capabilityValue" label="Recorded value or note" defaultValue={capabilityDraft?.capabilityValue} placeholder="Payload up to 10 kg" />
                <FieldText id="capability-evidence-title" name="evidenceTitle" label="Evidence title" defaultValue={capabilityDraft?.evidenceTitle} placeholder="Manufacturer specification" />
                <FieldText id="capability-evidence-url" name="evidenceUrl" label="Evidence URL" type="url" defaultValue={capabilityDraft?.evidenceUrl} placeholder="https://…" />
                <FieldSelect id="capability-status" name="verificationStatus" label="Verification status" defaultValue={capabilityDraft?.verificationStatus ?? 'unverified'}>
                  {verifiedOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </FieldSelect>
                <FieldText id="capability-confidence" name="confidence" label="Confidence (0–100)" type="number" defaultValue={capabilityDraft?.confidence} />
              </FieldGroup>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={pending || data.models.length === 0}><Save data-icon="inline-start" />{pending ? 'Saving…' : capabilityDraft?.id ? 'Update evidence' : 'Add capability evidence'}</Button>
                {capabilityDraft?.id ? <Button type="button" variant="outline" onClick={() => setCapabilityDraft(null)}>Cancel edit</Button> : null}
              </div>
            </form>
            <div className="flex flex-col gap-2 border-t pt-4">
              {data.capabilities.map((capability) => {
                const model = data.models.find((item) => item.id === capability.modelId)
                return (
                  <div key={capability.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="font-medium">{model?.name ?? 'Unknown model'} · {labelize(capability.capabilityKey)}</span>
                      <span className="text-xs text-muted-foreground">{capability.verificationStatus} · {capability.evidenceTitle ?? 'No evidence title'}</span>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setCapabilityDraft(capability)}><Pencil data-icon="inline-start" />Edit</Button>
                  </div>
                )
              })}
              {data.capabilities.length === 0 ? <p className="text-sm text-muted-foreground">No capability evidence recorded yet.</p> : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Source offerings</CardTitle>
            <CardDescription>Keep each supplier channel, availability, and commercial evidence separate from the product model.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <form onSubmit={(event) => submitForm(event, saveRoboticsOffering, () => setOfferingDraft(null), (values) => ({
              ...values,
              priceCents: values.price === '' ? null : Math.round(Number(values.price) * 100),
              priceCurrency: values.price === '' ? null : 'USD',
              priceBasis: values.price === '' ? null : values.priceBasis,
            }))} className="flex flex-col gap-4">
              {offeringDraft?.id ? <input type="hidden" name="id" value={offeringDraft.id} /> : null}
              <FieldGroup className="grid gap-4 sm:grid-cols-2">
                <FieldSelect id="offering-partner" name="partnerId" label="Source partner" defaultValue={offeringDraft?.partnerId ?? data.partners[0]?.id}>
                  {data.partners.map((partner) => <option key={partner.id} value={partner.id}>{partner.name}</option>)}
                </FieldSelect>
                <FieldSelect id="offering-model" name="modelId" label="Robot or cobot model" defaultValue={offeringDraft?.modelId ?? data.models[0]?.id}>
                  {data.models.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}
                </FieldSelect>
                <FieldSelect id="offering-type" name="sourceType" label="Supply channel" defaultValue={offeringDraft?.sourceType ?? 'integrator'}>
                  {sourceTypeOptions.map((item) => <option key={item} value={item}>{labelize(item)}</option>)}
                </FieldSelect>
                <FieldSelect id="offering-availability" name="availability" label="Availability" defaultValue={offeringDraft?.availability ?? 'unknown'}>
                  {['available', 'pilot', 'preorder', 'waitlist', 'unavailable', 'unknown'].map((item) => <option key={item} value={item}>{labelize(item)}</option>)}
                </FieldSelect>
                <FieldText id="offering-url" name="sourceUrl" label="Offering source URL" type="url" defaultValue={offeringDraft?.sourceUrl} placeholder="https://…" />
                <FieldSelect id="offering-verification" name="verificationStatus" label="Verification status" defaultValue={offeringDraft?.verificationStatus ?? 'unverified'}>
                  {verifiedOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </FieldSelect>
                <FieldText id="offering-price" name="price" label="Price (USD, optional)" type="number" defaultValue={offeringDraft?.priceCents == null ? '' : offeringDraft.priceCents / 100} />
                <FieldSelect id="offering-basis" name="priceBasis" label="Price basis" defaultValue={offeringDraft?.priceBasis ?? ''}>
                  <option value="">Not recorded</option>
                  {['one_time', 'monthly', 'annual', 'quote'].map((item) => <option key={item} value={item}>{labelize(item)}</option>)}
                </FieldSelect>
                <FieldText id="offering-price-evidence" name="pricingEvidenceUrl" label="Pricing evidence URL" type="url" defaultValue={offeringDraft?.pricingEvidenceUrl} placeholder="https://…" />
              </FieldGroup>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={pending || data.partners.length === 0 || data.models.length === 0}><Save data-icon="inline-start" />{pending ? 'Saving…' : offeringDraft?.id ? 'Update offering' : 'Add source offering'}</Button>
                {offeringDraft?.id ? <Button type="button" variant="outline" onClick={() => setOfferingDraft(null)}>Cancel edit</Button> : null}
              </div>
            </form>
            <div className="flex flex-col gap-2 border-t pt-4">
              {data.sourceOfferings.map((offering) => {
                const model = data.models.find((item) => item.id === offering.modelId)
                const partner = data.partners.find((item) => item.id === offering.partnerId)
                return (
                  <div key={offering.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="font-medium">{model?.name ?? 'Unknown model'} · {partner?.name ?? 'Unknown source'}</span>
                      <span className="text-xs text-muted-foreground">{labelize(offering.sourceType)} · {labelize(offering.availability)} · {offering.verificationStatus}</span>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setOfferingDraft(offering)}><Pencil data-icon="inline-start" />Edit</Button>
                  </div>
                )
              })}
              {data.sourceOfferings.length === 0 ? <p className="text-sm text-muted-foreground">No model-to-source offerings recorded yet.</p> : null}
            </div>
          </CardContent>
        </Card>
      </div>
      <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        Each organization has an isolated catalog. Unverified and stale records remain visible for review but cannot pass fit gates.
      </p>
    </div>
  )
}

function SourcePriorityCard({ partner, pending, onSave }: { partner: Partner; pending: boolean; onSave: (input: unknown) => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{partner.name}</span>
            <Badge variant={partner.roboticsSourceStatus === 'full_partner' ? 'default' : partner.roboticsSourceStatus === 'participating' ? 'secondary' : 'outline'}>
              {partner.roboticsSourceStatus === 'full_partner' ? <BadgeCheck data-icon="inline-start" /> : partner.roboticsSourceStatus === 'participating' ? null : <CircleAlert data-icon="inline-start" />}
              {labelize(partner.roboticsSourceStatus)}
            </Badge>
            {!partner.active ? <Badge variant="destructive">Inactive</Badge> : null}
          </div>
          <span className="text-xs text-muted-foreground">{labelize(partner.roboticsSourceType)} · {partner.category}</span>
        </div>
        <form className="grid w-full gap-3 sm:max-w-2xl sm:grid-cols-[minmax(0,1fr)_8rem_auto]" onSubmit={(event) => {
          event.preventDefault()
          const values = Object.fromEntries(new FormData(event.currentTarget).entries())
          onSave({ partnerId: partner.id, status: values.status, priority: Number(values.priority) })
        }}>
          <select name="status" aria-label={`${partner.name} partnership status`} defaultValue={partner.roboticsSourceStatus} className={controlClass}>
            {partnershipOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <Input name="priority" aria-label={`${partner.name} source priority`} type="number" min={0} max={10000} defaultValue={partner.roboticsSourcePriority} />
          <Button type="submit" variant="outline" disabled={pending}><Save data-icon="inline-start" />Save</Button>
        </form>
      </CardContent>
    </Card>
  )
}
