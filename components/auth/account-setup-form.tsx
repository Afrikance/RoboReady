"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { completeAccountSetup } from "@/app/actions/team"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function AccountSetupForm({ token }: { token: string }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [accountEmail, setAccountEmail] = useState<string | null>(null)

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const form = new FormData(event.currentTarget)
    const password = String(form.get("password") ?? "")
    const confirmation = String(form.get("confirmPassword") ?? "")
    if (password !== confirmation) {
      setError("The passwords do not match.")
      return
    }

    startTransition(async () => {
      const result = await completeAccountSetup(token, password)
      if (result.ok) setAccountEmail(result.data.email)
      else setError(result.error)
    })
  }

  if (!token) {
    return (
      <div className="flex flex-col gap-4">
        <p role="alert" className="text-sm text-destructive">
          This setup link is incomplete. Ask your team owner for a new link.
        </p>
        <Link href="/sign-in" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
          Return to sign in
        </Link>
      </div>
    )
  }

  if (accountEmail) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Your password is set for <span className="font-medium text-foreground">{accountEmail}</span>. You can now sign in.
        </p>
        <Button asChild>
          <Link href="/sign-in">Continue to sign in</Link>
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          required
          placeholder="At least 12 characters"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          required
          placeholder="Enter the same password again"
        />
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Setting password…" : "Set password"}
      </Button>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Passwords must be between 12 and 128 characters. This setup link works once and expires after 24 hours.
      </p>
    </form>
  )
}

export function AccountSetupPageContent({ token }: { token: string }) {
  return (
    <>
      <AccountSetupForm token={token} />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/sign-in" className="font-medium text-primary underline-offset-4 hover:underline">
          Return to sign in
        </Link>
      </p>
    </>
  )
}
