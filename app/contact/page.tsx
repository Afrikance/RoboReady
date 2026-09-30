import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { SiteFooter } from '@/components/marketing/site-footer'
import { submitContactRequest } from './actions'

export const metadata: Metadata = {
  title: 'Contact RoboReady',
  description: 'Contact RoboReady about property assessments, government readiness, partnerships, and support.',
  alternates: { canonical: 'https://roboready.net/contact' },
}

type ContactPageProps = {
  searchParams: Promise<{ request?: string; sent?: string; error?: string }>
}

export default async function ContactPage({ searchParams }: ContactPageProps) {
  const params = await searchParams
  const isAssessment = params.request === 'government-assessment'
  const sent = params.sent === '1'
  const hasError = params.error === 'invalid' || params.error === 'unavailable'

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link href="/" aria-label="RoboReady home"><Logo size="sm" /></Link>
          <Link href={isAssessment ? '/government' : '/'} className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" aria-hidden="true" />
            {isAssessment ? 'Government overview' : 'Home'}
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section id="request" className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div className="flex flex-col items-start gap-5">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
              {isAssessment ? 'Government readiness' : 'Get in touch'}
            </p>
            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              {isAssessment ? 'Request a Government Readiness Assessment' : 'How can we help?'}
            </h1>
            <p className="max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
              {isAssessment
                ? 'Share your agency’s priorities and jurisdiction. Our team will follow up to discuss fit, scope, and a practical next step.'
                : 'Send the RoboReady team a note about an assessment, your property, or a partnership. We’ll get back to you by email.'}
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              No obligation to pursue both StaffGPT and RoboReady workstreams. Procurement and deployment requirements are confirmed during discovery.
            </p>
          </div>

          <div className="rounded-xl border bg-card p-5 sm:p-8">
            {sent ? (
              <div role="status" className="flex flex-col items-start gap-4 py-6">
                <CheckCircle2 className="size-8 text-primary" aria-hidden="true" />
                <h2 className="text-xl font-semibold">Request received</h2>
                <p className="leading-relaxed text-muted-foreground">Thanks for reaching out. The RoboReady team will follow up using the email address you provided.</p>
                <Button asChild variant="outline"><Link href={isAssessment ? '/government' : '/'}>{isAssessment ? 'Back to government overview' : 'Back home'}</Link></Button>
              </div>
            ) : (
              <form action={submitContactRequest} className="flex flex-col gap-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="contact-name" className="text-sm font-medium">Your name</label>
                    <Input id="contact-name" name="name" autoComplete="name" maxLength={120} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="contact-email" className="text-sm font-medium">Work email <span aria-hidden="true">*</span></label>
                    <Input id="contact-email" name="email" type="email" autoComplete="email" maxLength={254} required />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="contact-agency" className="text-sm font-medium">Company or agency <span aria-hidden="true">*</span></label>
                  <Input id="contact-agency" name="agency" autoComplete="organization" maxLength={180} required />
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="contact-jurisdiction" className="text-sm font-medium">State or jurisdiction</label>
                    <Input id="contact-jurisdiction" name="jurisdiction" maxLength={180} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="contact-interest" className="text-sm font-medium">Primary area of interest</label>
                    <Input id="contact-interest" name="interest" placeholder="AI workforce, site readiness, or both" maxLength={180} />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="contact-details" className="text-sm font-medium">What would you like to explore? <span aria-hidden="true">*</span></label>
                  <Textarea id="contact-details" name="details" rows={5} minLength={10} maxLength={1600} required placeholder="Tell us a little about your goals, facilities, or operational needs." />
                </div>
                <input type="hidden" name="request" value={isAssessment ? 'government-assessment' : ''} />
                <div aria-hidden="true" className="sr-only">
                  <label htmlFor="contact-website">Leave this field empty</label>
                  <input id="contact-website" name="website" tabIndex={-1} autoComplete="off" />
                </div>
                {hasError ? (
                  <p role="alert" className="text-sm text-destructive">
                    {params.error === 'invalid'
                      ? 'Please check your email and required fields, then try again.'
                      : 'We couldn’t submit your request just now. Please try again shortly.'}
                  </p>
                ) : null}
                <Button type="submit" size="lg" className="w-full sm:w-fit">
                  Send request
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
                <p className="text-xs leading-relaxed text-muted-foreground">We’ll use your details only to follow up on this request.</p>
              </form>
            )}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
