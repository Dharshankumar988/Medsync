import * as React from "react"
import { cn } from "@/lib/utils"
import { Skeleton } from "./skeleton"

interface LoadingStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  type?: "card" | "spinner" | "list";
}

export function LoadingState({ className, title, description, type = "card", ...props }: LoadingStateProps) {
  if (type === "list") {
    return (
      <div className={cn("flex flex-col space-y-4 w-full", className)} {...props}>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    )
  }
  
  if (type === "spinner") {
    return (
      <div className={cn("flex flex-col items-center justify-center p-8", className)} {...props}>
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        {title && <h3 className="mt-4 text-lg font-semibold">{title}</h3>}
        {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
      </div>
    )
  }

  // Default: card skeleton
  return (
    <div 
      className={cn("flex flex-col items-center justify-center p-10 text-center rounded-2xl border border-dashed border-border/60 bg-card/30", className)} 
      {...props}
    >
      <Skeleton className="mb-5 h-16 w-16 rounded-2xl" />
      {title ? (
        <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
      ) : (
        <Skeleton className="h-6 w-48 mb-2" />
      )}
      {description ? (
        <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
          {description}
        </p>
      ) : (
        <Skeleton className="h-4 w-64 mt-2" />
      )}
    </div>
  )
}
