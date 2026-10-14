import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowUpRight } from 'lucide-react'
import { getRoboticsInterestReviewData } from '@/app/actions/robotics-interest'
import { Button } from '@/components/ui/button'
import { RoboticsInterestReviewQueue } from '@/components/robotics-interest/review-queue'

export const metadata = { title: 'Robotics Interest' }

export default async function RoboticsInterestPage() {
  const data = await getRoboticsInterestReviewData()
  if (!data) redirect('/dashboard')

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-medium text-primary">Customer requests</p>
        <h1 className="text-2xl font-semibold tracking-tight text-balance">Robotics fit review</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Review customer requirements and neutral, explainable catalog matches. A selected fit is internal only; a partner referral must still follow the separate owner-consent workflow.
        </p>
        <Button asChild variant="outline" className="mt-2 w-fit">
          <Link href="/dashboard/robotics-interest/catalog">Manage catalog and source eligibility<ArrowUpRight data-icon="inline-end" /></Link>
        </Button>
      </header>
      <RoboticsInterestReviewQueue initialData={data} />
    </div>
  )
}
