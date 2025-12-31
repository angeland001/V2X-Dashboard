import React from "react"
import { Button } from "@/components/ui/shadcn/button"

export function GeofenceZones() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Geofence Zones</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage geographic boundaries for location-based monitoring
          </p>
        </div>
        <Button>Create New Zone</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="font-semibold mb-2">Downtown Area</h3>
          <p className="text-sm text-muted-foreground">Active geofence zone</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="font-semibold mb-2">Warehouse District</h3>
          <p className="text-sm text-muted-foreground">Active geofence zone</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="font-semibold mb-2">Airport Zone</h3>
          <p className="text-sm text-muted-foreground">Active geofence zone</p>
        </div>
      </div>
    </div>
  )
}

export default GeofenceZones
