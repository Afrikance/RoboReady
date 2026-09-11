"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Printer } from "lucide-react"

export function PrintTrigger({ auto = false }: { auto?: boolean }) {
  useEffect(() => {
    if (auto) {
      const t = setTimeout(() => window.print(), 700)
      return () => clearTimeout(t)
    }
  }, [auto])

  return (
    <Button size="sm" onClick={() => window.print()} className="print:hidden">
      <Printer className="mr-1.5 h-4 w-4" /> Print / Save as PDF
    </Button>
  )
}
