y property with ameimport type { Metadata } from "next"
import { LegalShell } from "@/components/marketing/legal-shell"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How RoboReady collects, uses, and protects your information.",
}

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated="September 2026">
      <p>
        This Privacy Policy explains how RoboReady (&ldquo;we&rdquo;, &ldquo;us&rdquo;) collects, uses, and safeguards
        information when you use our autonomous-arrival readiness platform. By using RoboReady you agree to the practices
        described here.
      </p>

      <h2>Information we collect</h2>
      <p>
        We collect account details you provide (name, email, organization), property information you enter for
        assessments, and usage data generated as you interact with the platform. Payment details are processed by our
        payment provider and are never stored on our servers.
      </p>

      <h2>How we use information</h2>
      <p>
        We use your information to run assessments, generate reports, deliver the services you purchase, communicate with
        you, and improve the platform. We do not sell your personal information.
      </p>

      <h2>Data sharing</h2>
      <p>
        We share data only with service providers who help us operate the platform (such as hosting, database, and
        payment processing), and only to the extent needed to deliver the service. These providers are bound by
        confidentiality obligations.
      </p>

      <h2>Data retention & security</h2>
      <p>
        We retain your data for as long as your account is active or as needed to provide the service and meet legal
        obligations. We apply industry-standard safeguards, including encryption in transit and access controls, to
        protect your information.
      </p>

      <h2>Your rights</h2>
      <p>
        You may request access to, correction of, or deletion of your personal information. To exercise these rights,
        contact us at <a className="text-primary underline-offset-4 hover:underline" href="mailto:privacy@roboready.app">privacy@roboready.app</a>.
      </p>

      <h2>Changes</h2>
      <p>
        We may update this policy from time to time. Material changes will be reflected by the &ldquo;Last updated&rdquo;
        date above.
      </p>
    </LegalShell>
  )
}
