import * as React from "react"
import { Badge, type BadgeProps } from "./badge"
import { cn } from "@/lib/utils"

export type StatusType = 
  | "pending" 
  | "scheduled" 
  | "confirmed" 
  | "in-progress" 
  | "completed" 
  | "cancelled" 
  | "failed" 
  | "active" 
  | "inactive";

interface StatusBadgeProps extends Omit<BadgeProps, "variant"> {
  status: StatusType;
  showDot?: boolean;
}

const statusConfig: Record<StatusType, { variant: BadgeProps["variant"]; label: string; dotClass: string }> = {
  "pending": { variant: "warning", label: "Pending", dotClass: "bg-amber-500" },
  "scheduled": { variant: "info", label: "Scheduled", dotClass: "bg-blue-500" },
  "confirmed": { variant: "info", label: "Confirmed", dotClass: "bg-blue-500" },
  "in-progress": { variant: "default", label: "In Progress", dotClass: "bg-primary" },
  "completed": { variant: "success", label: "Completed", dotClass: "bg-emerald-500" },
  "active": { variant: "success", label: "Active", dotClass: "bg-emerald-500" },
  "inactive": { variant: "secondary", label: "Inactive", dotClass: "bg-slate-500" },
  "cancelled": { variant: "destructive", label: "Cancelled", dotClass: "bg-red-500" },
  "failed": { variant: "destructive", label: "Failed", dotClass: "bg-red-500" },
};

export function StatusBadge({ status, showDot = true, className, ...props }: StatusBadgeProps) {
  const config = statusConfig[status] || { variant: "secondary", label: status, dotClass: "bg-slate-500" };

  return (
    <Badge variant={config.variant} className={cn("whitespace-nowrap capitalize", className)} {...props}>
      {showDot && (
        <span className="mr-1.5 flex h-2 w-2 relative">
          <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", config.dotClass)} />
          <span className={cn("relative inline-flex rounded-full h-2 w-2", config.dotClass)} />
        </span>
      )}
      {config.label}
    </Badge>
  )
}
