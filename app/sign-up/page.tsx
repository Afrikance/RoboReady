import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { AuthShell } from "@/components/auth/auth-shell"
import { AuthForm } from "@/components/auth/auth-form"

export const metadata = { title: "Create account" }

export default async function SignUpPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect("/dashboard")

  return (
    <AuthShell
      title="Create your workspace"
      subtitle="Start assessing properties for autonomy readiness."
    >
      <AuthForm mode="sign-up" />
    </AuthShell>
  )
}
