import type { Metadata } from "next"
import { LegalShell } from "@/components/marketing/legal-shell"

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern your use of RoboReady.",
}

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" updated="September 2026">
      <p>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of RoboReady. By creating an account
        or using the platform, you agree to these Terms.
      </p>

      <h2>Use of the service</h2>
      <p>
        RoboReady provides AI-assisted assessments, reports, and infrastructure planning for autonomous-arrival
        readiness. You agree to use the platform only for lawful purposes and to provide accurate information for the
        properties you assess.
      </p>

      <h2>Assessments & reports</h2>
      <p>
        RoboReady Scores, findings, site concepts, and infrastructure plans are advisory. They are estimates generated
        from the information provided and do not constitute engineering, legal, or regulatory certification. You are
        responsible for verifying requirements with qualified professionals before any construction or deployment.
      </p>

      <h2>Payments</h2>
      <p>
        Paid products (assessment report tiers, proposal deposits, and service plans) are billed at the prices shown at
        checkout. One-time purchases are non-refundable once the associated report or work has been delivered. Recurring
        service plans continue until canceled and remain active through the end of the paid period.
      </p>

      <h2>Intellectual property</h2>
      <p>
        You retain ownership of the property data you submit. We retain ownership of the platform, models, and software.
        Reports we generate are licensed to you for your business use.
      </p>

      <h2>Disclaimers & liability</h2>
      <p>
        The service is provided &ldquo;as is&rdquo; without warranties of any kind. To the maximum extent permitted by
        law, RoboReady is not liable for indirect or consequential damages arising from use of the platform or reliance
        on its outputs.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these Terms? Reach us at <a className="text-primary underline-offset-4 hover:underline" href="mailto:legal@roboready.app">legal@roboready.app</a>.
      </p>
    </LegalShell>
  )
}
