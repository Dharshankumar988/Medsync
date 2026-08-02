import * as React from "react"
import { cn } from "@/lib/utils"

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  fallback?: string;
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt, fallback, ...props }, ref) => {
    const [error, setError] = React.useState(false);

    return (
      <div
        ref={ref}
        className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted", className)}
        {...props}
      >
        {src && !error ? (
          <img
            src={src}
            alt={alt || "Avatar"}
            className="aspect-square h-full w-full object-cover"
            onError={() => setError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-full bg-muted text-muted-foreground font-medium text-sm">
            {fallback?.substring(0, 2).toUpperCase() || "US"}
          </div>
        )}
      </div>
    )
  }
)
Avatar.displayName = "Avatar"

export { Avatar }
