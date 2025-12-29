import React from "react"
import { ChartAreaInteractive } from "@/components/ui/chart-area-interactive"

export function HomeView() {
  return (
    <div className="flex-1 space-y-6 p-4 md:p-6 lg:p-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Traffic Analytics Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Monitor pedestrian and vehicle traffic patterns across key locations
        </p>
      </div>

      <ChartAreaInteractive />
    </div>
  )
}

export default HomeView
