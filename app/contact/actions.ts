'use server'

import { redirect } from 'next/navigation'
import { createInquiry } from '@/lib/support/data'

function getText(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

export async function submitContactRequest(formData: FormData) {
  const honeypot = getText(formData, 'website')
  const isAssessment = getText(formData, 'request') === 'government-assessment'
  const returnTo = isAssessment ? '/contact?request=government-assessment' : '/contact'
  const statusUrl = (status: string) => `${returnTo}${isAssessment ? '&' : '?'}${status}`
  if (honeypot) redirect(statusUrl('sent=1'))

  const name = getText(formData, 'name')
  const email = getText(formData, 'email')
  const agency = getText(formData, 'agency')
  const jurisdiction = getText(formData, 'jurisdiction')
  const interest = getText(formData, 'interest')
  const details = getText(formData, 'details')

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  if (
    !validEmail ||
    email.length > 254 ||
    name.length > 120 ||
    agency.length < 2 ||
    agency.length > 180 ||
    jurisdiction.length > 180 ||
    interest.length > 180 ||
    details.length < 10 ||
    details.length > 1600
  ) {
    redirect(statusUrl('error=invalid'))
  }

  const message = isAssessment
    ? [
        'Government Readiness Assessment request',
        `Agency: ${agency}`,
        `Jurisdiction: ${jurisdiction || 'Not provided'}`,
        `Primary interest: ${interest || 'Not specified'}`,
        '',
        details,
      ].join('\n')
    : [`Organization: ${agency}`, `Area of interest: ${interest || 'Not specified'}`, '', details].join('\n')

  try {
    await createInquiry({
      name: name || null,
      email,
      topic: isAssessment ? 'partnership' : 'question',
      message,
      conversation: [],
      pageUrl: isAssessment ? '/government' : '/contact',
    })
  } catch {
    redirect(statusUrl('error=unavailable'))
  }

  redirect(statusUrl('sent=1'))
}
