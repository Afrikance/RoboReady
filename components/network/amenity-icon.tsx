import {
  Accessibility,
  BatteryCharging,
  Bot,
  Building2,
  Car,
  Cpu,
  PackageCheck,
  ParkingSquare,
  PlaneTakeoff,
  Plug,
  Route,
  Send,
  ShieldCheck,
  SunMedium,
  Zap,
  type LucideIcon,
} from "lucide-react"
import { getAmenity } from "@/lib/network/amenities"
import { cn } from "@/lib/utils"

const ICONS: Record<string, LucideIcon> = {
  Accessibility,
  BatteryCharging,
  Bot,
  Building2,
  Car,
  Cpu,
  PackageCheck,
  ParkingSquare,
  PlaneTakeoff,
  Plug,
  Route,
  Send,
  ShieldCheck,
  SunMedium,
  Zap,
}

/** Renders the lucide icon for an amenity id (falls back to a neutral dot). */
export function AmenityIcon({ id, className }: { id: string; className?: string }) {
  const amenity = getAmenity(id)
  const Icon = amenity ? ICONS[amenity.icon] ?? Bot : Bot
  return <Icon className={cn("size-4", className)} aria-hidden="true" />
}
