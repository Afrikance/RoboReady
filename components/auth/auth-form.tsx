"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { TurnstileWidget, turnstileEnabled, type TurnstileHandle } from "@/components/auth/turnstile-widget"

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [captchaToken, setCaptchaToken] = useState("")
  const turnstileRef = useRef<TurnstileHandle>(null)

  const isSignUp = mode === "sign-up"

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (turnstileEnabled && !captchaToken) {
      setError("Please complete the verification challenge below.")
      setLoading(false)
      return
    }

    const form = new FormData(e.currentTarget)
    const email = String(form.get("email") ?? "")
    const password = String(form.get("password") ?? "")
    const name = String(form.get("name") ?? "")

    // Turnstile plugin reads the token from this header and verifies it.
    const fetchOptions = turnstileEnabled
      ? { headers: { "x-captcha-response": captchaToken } }
      : undefined

    try {
      if (isSignUp) {
        const { error } = await authClient.signUp.email({ email, password, name }, fetchOptions)
        if (error) throw new Error(error.message)
      } else {
        const { error } = await authClient.signIn.email({ email, password }, fetchOptions)
        if (error) throw new Error(error.message)
      }
      router.push("/dashboard")
      router.refresh()
    } catch (err) {
      // Generic message; never reveal whether an email is registered.
      setError(
        isSignUp
          ? "Could not create your account. Please check your details and try again."
          : "Invalid email or password.",
      )
      console.log("[v0] auth error:", (err as Error).message)
      // Tokens are single-use — reset so the user can retry.
      turnstileRef.current?.reset()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {isSignUp && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" name="name" autoComplete="name" required placeholder="Jordan Rivera" />
        </div>
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Work email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@company.com"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={isSignUp ? "new-password" : "current-password"}
          required
          minLength={8}
          placeholder="At least 8 characters"
        />
      </div>

      {turnstileEnabled && <TurnstileWidget ref={turnstileRef} onToken={setCaptchaToken} />}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={loading || (turnstileEnabled && !captchaToken)}
        className="mt-1 w-full"
      >
        {loading && <Loader2 className="size-4 animate-spin" />}
        {isSignUp ? "Create account" : "Sign in"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {isSignUp ? (
          <>
            Already have an account?{" "}
            <Link href="/sign-in" className="font-medium text-primary underline-offset-4 hover:underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New to RoboReady?{" "}
            <Link href="/sign-up" className="font-medium text-primary underline-offset-4 hover:underline">
              Create an account
            </Link>
          </>
        )}
      </p>
    </form>
  )
}
