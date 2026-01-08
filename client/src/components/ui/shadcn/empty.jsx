import * as React from "react"
import { cn } from "@/lib/utils"

const Empty = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center animate-in fade-in-50",
      className
    )}
    {...props}
  />
))
Empty.displayName = "Empty"

const EmptyIcon = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("mx-auto flex h-12 w-12 items-center justify-center rounded-full", className)}
    {...props}
  />
))
EmptyIcon.displayName = "EmptyIcon"

const EmptyTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("mt-4 text-lg font-semibold", className)}
    {...props}
  />
))
EmptyTitle.displayName = "EmptyTitle"

const EmptyDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("mb-4 mt-2 text-sm text-muted-foreground", className)}
    {...props}
  />
))
EmptyDescription.displayName = "EmptyDescription"

const EmptyAction = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("mt-4", className)}
    {...props}
  />
))
EmptyAction.displayName = "EmptyAction"

export { Empty, EmptyIcon, EmptyTitle, EmptyDescription, EmptyAction }
