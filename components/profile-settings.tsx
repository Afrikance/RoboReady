"use client"

import { useState, useTransition, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { KeyRound, Loader2, MapPin, Save, ShieldCheck, UserRound } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { updateAccountProfile } from "@/app/actions/profile"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSet, FieldLegend } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

type ProfileDraft = {
  name: string
  phone: string
  addressLine1: string
  addressLine2: string
  city: string
  region: string
  postalCode: string
  country: string
}

type ProfileSettingsProps = {
  email: string
  initial: ProfileDraft
}

export function ProfileSettings({ email, initial }: ProfileSettingsProps) {
  const router = useRouter()
  const [profile, setProfile] = useState(initial)
  const [profilePending, startProfileTransition] = useTransition()
  const [passwordPending, startPasswordTransition] = useTransition()
  const [passwordError, setPasswordError] = useState<string | null>(null)

  function updateField(key: keyof ProfileDraft, value: string) {
    setProfile((current) => ({ ...current, [key]: value }))
  }

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    startProfileTransition(async () => {
      try {
        const result = await updateAccountProfile(profile)
        if (!result.ok) {
          toast.error(result.error)
          return
        }

        setProfile({
          ...result.profile,
          phone: result.profile.phone ?? "",
          addressLine1: result.profile.addressLine1 ?? "",
          addressLine2: result.profile.addressLine2 ?? "",
          city: result.profile.city ?? "",
          region: result.profile.region ?? "",
          postalCode: result.profile.postalCode ?? "",
          country: result.profile.country ?? "",
        })
        toast.success("Profile details saved.")
        router.refresh()
      } catch {
        toast.error("Could not update your profile. Please try again.")
      }
    })
  }

  function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPasswordError(null)
    const form = new FormData(event.currentTarget)
    const currentPassword = String(form.get("currentPassword") ?? "")
    const newPassword = String(form.get("newPassword") ?? "")
    const confirmPassword = String(form.get("confirmPassword") ?? "")

    if (newPassword.length < 8) {
      setPasswordError("Your new password must be at least 8 characters.")
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("The new passwords do not match.")
      return
    }

    const passwordForm = event.currentTarget
    startPasswordTransition(async () => {
      try {
        const { error } = await authClient.changePassword({
          currentPassword,
          newPassword,
          revokeOtherSessions: true,
        })

        if (error) {
          setPasswordError("Could not change your password. Check your current password and try again.")
          return
        }

        passwordForm.reset()
        toast.success("Password changed. Other sessions have been signed out.")
        router.refresh()
      } catch {
        setPasswordError("Could not change your password. Check your current password and try again.")
      }
    })
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(20rem,0.85fr)]">
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UserRound aria-hidden="true" className="size-5" />
            </div>
            <div className="flex flex-col gap-1">
              <CardTitle>Personal profile</CardTitle>
              <CardDescription>Keep your contact and mailing details up to date.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="flex flex-col gap-6">
            <FieldSet>
              <FieldLegend variant="label">Contact details</FieldLegend>
              <FieldGroup className="gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="profile-name">Full name</FieldLabel>
                    <Input
                      id="profile-name"
                      autoComplete="name"
                      value={profile.name}
                      onChange={(event) => updateField("name", event.target.value)}
                      maxLength={120}
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="profile-phone">Mobile phone</FieldLabel>
                    <Input
                      id="profile-phone"
                      type="tel"
                      autoComplete="tel"
                      inputMode="tel"
                      placeholder="+1 555 010 1234"
                      value={profile.phone}
                      onChange={(event) => updateField("phone", event.target.value)}
                      maxLength={40}
                    />
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor="profile-email">Email address</FieldLabel>
                  <Input id="profile-email" type="email" autoComplete="email" value={email} readOnly />
                  <FieldDescription>Email changes require a separate verification flow.</FieldDescription>
                </Field>
              </FieldGroup>
            </FieldSet>

            <Separator />

            <FieldSet>
              <FieldLegend variant="label" className="flex items-center gap-2">
                <MapPin aria-hidden="true" className="size-4 text-muted-foreground" />
                Mailing address
              </FieldLegend>
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel htmlFor="profile-address-1">Street address</FieldLabel>
                  <Input
                    id="profile-address-1"
                    autoComplete="address-line1"
                    value={profile.addressLine1}
                    onChange={(event) => updateField("addressLine1", event.target.value)}
                    maxLength={160}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="profile-address-2">Apartment, suite, etc. <span className="font-normal text-muted-foreground">(optional)</span></FieldLabel>
                  <Input
                    id="profile-address-2"
                    autoComplete="address-line2"
                    value={profile.addressLine2}
                    onChange={(event) => updateField("addressLine2", event.target.value)}
                    maxLength={160}
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="profile-city">City</FieldLabel>
                    <Input
                      id="profile-city"
                      autoComplete="address-level2"
                      value={profile.city}
                      onChange={(event) => updateField("city", event.target.value)}
                      maxLength={100}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="profile-region">State or region</FieldLabel>
                    <Input
                      id="profile-region"
                      autoComplete="address-level1"
                      value={profile.region}
                      onChange={(event) => updateField("region", event.target.value)}
                      maxLength={100}
                    />
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="profile-postal">Postal code</FieldLabel>
                    <Input
                      id="profile-postal"
                      autoComplete="postal-code"
                      value={profile.postalCode}
                      onChange={(event) => updateField("postalCode", event.target.value)}
                      maxLength={32}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="profile-country">Country</FieldLabel>
                    <Input
                      id="profile-country"
                      autoComplete="country-name"
                      value={profile.country}
                      onChange={(event) => updateField("country", event.target.value)}
                      maxLength={100}
                    />
                  </Field>
                </div>
              </FieldGroup>
            </FieldSet>

            <div className="flex justify-end">
              <Button type="submit" disabled={profilePending}>
                {profilePending ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Save data-icon="inline-start" />}
                {profilePending ? "Saving profile" : "Save profile"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck aria-hidden="true" className="size-5" />
            </div>
            <div className="flex flex-col gap-1">
              <CardTitle>Password &amp; security</CardTitle>
              <CardDescription>Update your password to protect your account.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={changePassword} className="flex flex-col gap-5">
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel htmlFor="current-password">Current password</FieldLabel>
                <Input id="current-password" name="currentPassword" type="password" autoComplete="current-password" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="new-password">New password</FieldLabel>
                <Input id="new-password" name="newPassword" type="password" autoComplete="new-password" minLength={8} required />
                <FieldDescription>Use at least 8 characters.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="confirm-password">Confirm new password</FieldLabel>
                <Input id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required />
              </Field>
            </FieldGroup>

            {passwordError ? <p role="alert" className="text-sm text-destructive">{passwordError}</p> : null}

            <div className="flex items-start gap-2 rounded-md bg-muted p-3 text-sm text-muted-foreground">
              <KeyRound aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <p className="leading-relaxed">Changing your password signs out other active sessions.</p>
            </div>

            <Button type="submit" variant="outline" disabled={passwordPending}>
              <KeyRound data-icon="inline-start" />
              {passwordPending ? "Updating password" : "Change password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
