import React from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/shadcn/tabs"
import AnalyticsTraffic from "./AnalyticsTraffic"
import AnalyticsIncidents from "./AnalyticsIncidents"
import AnalyticsMaintenance from "./AnalyticsMaintenance"
import AnalyticsAdvanced from "./AnalyticsAdvanced"
import AnalyticsEnvironmental from "./AnalyticsEnvironmental"

export function AnalyticsPage() {
  return (
    <div className="space-y-6 min-h-full pb-6">
      <div>
        <h1 className="text-3xl font-bold text-neutral-100">Traffic Analytics</h1>
        <p className="text-neutral-400 mt-2">
          Comprehensive traffic analysis, incident tracking, and environmental monitoring
        </p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap gap-1 bg-neutral-900/80 border border-neutral-800 p-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="incidents">Incidents &amp; Response</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="advanced">Advanced Analytics</TabsTrigger>
          <TabsTrigger value="environmental">Environmental</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <AnalyticsTraffic />
        </TabsContent>

        <TabsContent value="incidents">
          <AnalyticsIncidents />
        </TabsContent>

        <TabsContent value="maintenance">
          <AnalyticsMaintenance />
        </TabsContent>

        <TabsContent value="advanced">
          <AnalyticsAdvanced />
        </TabsContent>

        <TabsContent value="environmental">
          <AnalyticsEnvironmental />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default AnalyticsPage
