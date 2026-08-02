"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const TabsContext = React.createContext<{
  value: string;
  onValueChange: (value: string) => void;
} | null>(null);

const Tabs = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { defaultValue?: string, value?: string, onValueChange?: (value: string) => void }>(
  ({ className, defaultValue, value: controlledValue, onValueChange: controlledOnValueChange, children, ...props }, ref) => {
    const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue || "");
    const isControlled = controlledValue !== undefined;
    const value = isControlled ? controlledValue : uncontrolledValue;
    const onValueChange = isControlled ? controlledOnValueChange : setUncontrolledValue;

    return (
      <TabsContext.Provider value={{ value: value as string, onValueChange: onValueChange as any }}>
        <div ref={ref} className={cn("w-full", className)} {...props}>
          {children}
        </div>
      </TabsContext.Provider>
    )
  }
)
Tabs.displayName = "Tabs"

const TabsList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("inline-flex h-10 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground", className)} {...props} />
  )
)
TabsList.displayName = "TabsList"

const TabsTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }>(
  ({ className, value, ...props }, ref) => {
    const context = React.useContext(TabsContext);
    if (!context) throw new Error("TabsTrigger must be used within Tabs");
    const isSelected = context.value === value;

    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        aria-selected={isSelected}
        onClick={() => context.onValueChange(value)}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          isSelected ? "bg-background text-foreground shadow-sm" : "hover:bg-background/50 hover:text-foreground",
          className
        )}
        {...props}
      />
    )
  }
)
TabsTrigger.displayName = "TabsTrigger"

const TabsContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { value: string }>(
  ({ className, value, ...props }, ref) => {
    const context = React.useContext(TabsContext);
    if (!context) throw new Error("TabsContent must be used within Tabs");
    const isSelected = context.value === value;

    if (!isSelected) return null;

    return (
      <div
        ref={ref}
        role="tabpanel"
        className={cn("mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className)}
        {...props}
      />
    )
  }
)
TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent }
