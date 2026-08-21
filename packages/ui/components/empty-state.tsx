import * as React from "react"
import { cn } from "@/lib/utils"

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ className, icon, title, description, action, ...props }: EmptyStateProps) {
  return (
    <div 
      className={cn("flex flex-col items-center justify-center p-10 text-center rounded-2xl border border-dashed border-border/60 bg-card/30", className)} 
      {...props}
    >
      {icon && (
        <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          {icon}
        </div>
      )}
      <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-8">{action}</div>}
    </div>
  )
}
