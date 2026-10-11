import { AuthShell } from "@/components/auth/auth-shell"
import { AccountSetupPageContent } from "@/components/auth/account-setup-form"

export const metadata = { title: "Set up your RoboReady account" }

type AccountSetupPageProps = {
  searchParams: Promise<{ token?: string | string[] }>
}

export default async function AccountSetupPage({ searchParams }: AccountSetupPageProps) {
  const { token } = await searchParams
  const setupToken = typeof token === "string" ? token : ""

  return (
    <AuthShell title="Set up your account" subtitle="Choose a password to access your RoboReady workspace.">
      <AccountSetupPageContent token={setupToken} />
    </AuthShell>
  )
}
