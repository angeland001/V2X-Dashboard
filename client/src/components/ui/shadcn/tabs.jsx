import * as React from "react"
import { cn } from "@/lib/utils"

const Tabs = React.forwardRef(({ className, defaultValue, value, onValueChange, children, ...props }, ref) => {
  const [selectedValue, setSelectedValue] = React.useState(value || defaultValue || "")

  React.useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value)
    }
  }, [value])

  const handleValueChange = (newValue) => {
    if (value === undefined) {
      setSelectedValue(newValue)
    }
    onValueChange?.(newValue)
  }

  return (
    <div ref={ref} className={cn("", className)} {...props} data-slot="tabs">
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child
        return React.cloneElement(child, {
          _selectedValue: selectedValue,
          _onValueChange: handleValueChange,
        })
      })}
    </div>
  )
})
Tabs.displayName = "Tabs"

const TabsList = React.forwardRef(({ className, _selectedValue, _onValueChange, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-lg bg-neutral-900 p-1 text-neutral-400",
      className
    )}
    role="tablist"
    {...props}
  >
    {React.Children.map(children, (child) => {
      if (!React.isValidElement(child)) return child
      return React.cloneElement(child, {
        _selectedValue,
        _onValueChange,
      })
    })}
  </div>
))
TabsList.displayName = "TabsList"

const TabsTrigger = React.forwardRef(({ className, value, _selectedValue, _onValueChange, children, ...props }, ref) => {
  const isActive = _selectedValue === value
  return (
    <button
      ref={ref}
      role="tab"
      aria-selected={isActive}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        isActive
          ? "bg-neutral-800 text-neutral-100 shadow-sm"
          : "text-neutral-400 hover:text-neutral-200",
        className
      )}
      onClick={() => _onValueChange?.(value)}
      {...props}
    >
      {children}
    </button>
  )
})
TabsTrigger.displayName = "TabsTrigger"

const TabsContent = React.forwardRef(({ className, value, _selectedValue, _onValueChange, children, ...props }, ref) => {
  if (_selectedValue !== value) return null
  return (
    <div
      ref={ref}
      role="tabpanel"
      className={cn("mt-4 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className)}
      {...props}
    >
      {children}
    </div>
  )
})
TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent }
