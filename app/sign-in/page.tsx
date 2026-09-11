import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { AuthShell } from "@/components/auth/auth-shell"
import { AuthForm } from "@/components/auth/auth-form"

export const metadata = { title: "Sign in" }

export default async function SignInPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect("/dashboard")

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your RoboReady workspace.">
      <AuthForm mode="sign-in" />
    </AuthShell>
  )
}
