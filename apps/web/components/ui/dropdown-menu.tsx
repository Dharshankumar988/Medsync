"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const DropdownMenuContext = React.createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
} | null>(null);

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div ref={ref} className="relative inline-block text-left">
        {children}
      </div>
    </DropdownMenuContext.Provider>
  )
}

export function DropdownMenuTrigger({ children, asChild = false }: { children: React.ReactNode, asChild?: boolean }) {
  const context = React.useContext(DropdownMenuContext);
  if (!context) throw new Error("DropdownMenuTrigger must be used within DropdownMenu");
  
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement, {
      onClick: (e: any) => {
        if (children.props.onClick) children.props.onClick(e);
        context.setOpen(!context.open);
      }
    });
  }
  
  return (
    <button type="button" onClick={() => context.setOpen(!context.open)}>
      {children}
    </button>
  )
}

export function DropdownMenuContent({ children, className, align = "right" }: { children: React.ReactNode, className?: string, align?: "left" | "right" }) {
  const context = React.useContext(DropdownMenuContext);
  if (!context) throw new Error("DropdownMenuContent must be used within DropdownMenu");
  
  if (!context.open) return null;
  
  return (
    <div className={cn(
      "absolute z-50 mt-2 min-w-[8rem] rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-80 zoom-in-95",
      align === "right" ? "right-0" : "left-0",
      className
    )}>
      {children}
    </div>
  )
}

export function DropdownMenuItem({ children, className, onClick }: { children: React.ReactNode, className?: string, onClick?: () => void }) {
  const context = React.useContext(DropdownMenuContext);
  
  return (
    <button
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        className
      )}
      onClick={(e) => {
        if (onClick) onClick();
        context?.setOpen(false);
      }}
    >
      {children}
    </button>
  )
}

export function DropdownMenuLabel({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={cn("px-2 py-1.5 text-sm font-semibold", className)}>
      {children}
    </div>
  )
}

export function DropdownMenuSeparator({ className }: { className?: string }) {
  return (
    <div className={cn("-mx-1 my-1 h-px bg-muted", className)} />
  )
}
