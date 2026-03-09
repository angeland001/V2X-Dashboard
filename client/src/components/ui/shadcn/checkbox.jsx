"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { cn } from "@/lib/utils"

const Checkbox = React.forwardRef(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-neutral-500 bg-neutral-800 transition-colors",
      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "hover:border-neutral-300",
      "data-[state=checked]:bg-white data-[state=checked]:border-white",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex text-neutral-950 data-[state=unchecked]:hidden">
      <svg
        fill="currentColor"
        width="10"
        height="10"
        viewBox="0 0 10 10"
        className="size-3"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M1.314 5.13a.75.75 0 0 1 1.06-.01L3.996 6.74l3.617-3.617a.75.75 0 1 1 1.06 1.06L4.53 8.327a.75.75 0 0 1-1.065-.004L1.322 6.19a.75.75 0 0 1-.008-1.06Z"
        />
      </svg>
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = "Checkbox"

export { Checkbox }
