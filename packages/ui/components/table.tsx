import * as React from "react"
import { cn } from "@/lib/utils"

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full overflow-auto rounded-lg border border-border">
      <table ref={ref} className={cn("w-full caption-bottom text-sm max-sm:block", className)} {...props} />
    </div>
  )
)
Table.displayName = "Table"

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead ref={ref} className={cn("[&_tr]:border-b [&_tr]:border-border bg-muted/50 max-sm:hidden", className)} {...props} />
  )
)
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn("[&_tr:last-child]:border-0 max-sm:block", className)} {...props} />
  )
)
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tfoot ref={ref} className={cn("border-t border-border bg-muted/50 font-medium [&>tr]:last:border-b-0 max-sm:block", className)} {...props} />
  )
)
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr ref={ref} className={cn("border-b border-border transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted max-sm:block max-sm:mb-4 max-sm:border max-sm:rounded-xl max-sm:bg-card max-sm:shadow-sm", className)} {...props} />
  )
)
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th ref={ref} className={cn("h-10 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0", className)} {...props} />
  )
)
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0 max-sm:flex max-sm:justify-between max-sm:items-center max-sm:border-b max-sm:border-border/40 max-sm:last:border-0 max-sm:py-3 max-sm:px-4 max-sm:text-right before:max-sm:content-[attr(data-label)] before:max-sm:text-muted-foreground before:max-sm:text-xs before:max-sm:uppercase before:max-sm:font-medium before:max-sm:text-left", className)} {...props} />
  )
)
TableCell.displayName = "TableCell"

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell }
