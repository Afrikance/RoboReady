import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getRoboticsCatalogAdminData } from '@/app/actions/robotics-sourcing'
import { RoboticsCatalogAdmin } from '@/components/robotics-interest/catalog-admin'
import { Button } from '@/components/ui/button'

export const metadata = { title: 'Robotics Catalog and Sources' }

export default async function RoboticsCatalogPage() {
  const data = await getRoboticsCatalogAdminData()
  if (!data) redirect('/dashboard')

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6">
      <Button asChild variant="ghost" className="w-fit">
        <Link href="/dashboard/robotics-interest"><ArrowLeft data-icon="inline-start" />Back to fit review</Link>
      </Button>
      <header className="flex flex-col gap-2">
        <p className="text-sm font-medium text-primary">Curated catalog</p>
        <h1 className="text-2xl font-semibold tracking-tight text-balance">Robotics models and supply sources</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Record manufacturers, models, capability evidence, and distinct supplier channels. A model only becomes a verified fit when every requirement and source gate is supported by current evidence.
        </p>
      </header>
      <RoboticsCatalogAdmin initialData={data} />
    </main>
  )
}
