"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { HardHat, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { assignStaff, unassignStaff } from "@/app/actions/assignments"

const ROLE_LABEL: Record<string, string> = {
  operator: "Field Operator",
  vendor: "Vendor",
  contractor: "Contractor",
}

export type AssignmentItem = {
  id: string
  userId: string
  role: string
  name: string
  email: string
}

export type StaffOption = {
  userId: string
  role: string
  name: string
  email: string
}

export function PropertyAssignments({
  propertyId,
  assignments,
  staff,
}: {
  propertyId: string
  assignments: AssignmentItem[]
  staff: StaffOption[]
}) {
  const [selected, setSelected] = useState("")
  const [pending, startTransition] = useTransition()

  const assignedIds = new Set(assignments.map((a) => a.userId))
  const available = staff.filter((s) => !assignedIds.has(s.userId))

  function add() {
    if (!selected) {
      toast.error("Choose a person to assign.")
      return
    }
    startTransition(async () => {
      const res = await assignStaff(propertyId, selected)
      if (res.ok) {
        toast.success("Assigned to this property.")
        setSelected("")
      } else {
        toast.error(res.error)
      }
    })
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <HardHat className="size-4 text-primary" />
        <h2 className="text-sm font-semibold">Assigned field staff</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground text-pretty">
        Field operators, vendors, and contractors you assign here can open this property to build out its intake,
        documents, and assessment. They only see properties assigned to them.
      </p>

      {assignments.length > 0 ? (
        <ul className="mt-4 divide-y divide-border rounded-md border border-border">
          {assignments.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 p-3">
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                  {a.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium">{a.name}</p>
                  <p className="text-xs text-muted-foreground">{a.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{ROLE_LABEL[a.role] ?? a.role}</Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Unassign ${a.name}`}
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const res = await unassignStaff(a.id)
                      if (res.ok) toast.success(`${a.name} unassigned.`)
                      else toast.error(res.error)
                    })
                  }
                >
                  <X className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">No one is assigned yet.</p>
      )}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <Select value={selected} onValueChange={setSelected} disabled={available.length === 0}>
          <SelectTrigger className="sm:flex-1" aria-label="Field staff to assign">
            <SelectValue placeholder={available.length === 0 ? "No available field staff" : "Choose a person…"} />
          </SelectTrigger>
          <SelectContent>
            {available.map((s) => (
              <SelectItem key={s.userId} value={s.userId}>
                {s.name} · {ROLE_LABEL[s.role] ?? s.role}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={add} disabled={pending || available.length === 0}>
          Assign
        </Button>
      </div>
      {staff.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Invite field operators, vendors, or contractors from the Team page first.
        </p>
      ) : null}
    </div>
  )
}
