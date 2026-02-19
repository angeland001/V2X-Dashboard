"use client"

import * as React from "react"
import { StatCard } from "@/components/ui/shadcn/stat-card"
import { TrafficChart } from "@/components/ui/shadcn/traffic-chart"
import { TrafficDataTable } from "@/components/dashboard/pages/traffic-data-table"
import { useSDSMOverview } from "@/hooks/useSDSMOverview"

export const description = "Traffic patterns showing pedestrians and vehicles over time"

const TIME_RANGE_TO_DAYS = { "90d": 90, "30d": 30, "7d": 7 }

export function TrafficOverview() {
  const [timeRange, setTimeRange] = React.useState("90d")

  const {
    serverOnline,
    intersections,
    selectedIntersection,
    setSelectedIntersection,
    days,
    setDays,
    dailyData,
    loading,
    error,
  } = useSDSMOverview()

  // Sync the time-range toggle with the hook's `days` value
  const handleTimeRangeChange = (range) => {
    setTimeRange(range)
    setDays(TIME_RANGE_TO_DAYS[range])
  }

  // Build the locations list for the dropdown from the intersection data
  // The dropdown shows labels, but we track selection by id
  const locationLabels = intersections.map((i) => i.label)
  const selectedLabel =
    intersections.find((i) => i.id === selectedIntersection)?.label ||
    intersections[0]?.label ||
    ""

  const handleLocationChange = (label) => {
    const match = intersections.find((i) => i.label === label)
    if (match) setSelectedIntersection(match.id)
  }

  // --- Server offline banner ---
  if (!serverOnline && !loading) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-yellow-600 bg-yellow-950/30 p-6 text-center">
          <p className="text-yellow-400 font-medium text-lg mb-1">
            Server Offline
          </p>
          <p className="text-yellow-500/70 text-sm">
            405 Not Allowed - The SDSM data server is currently unreachable. Please check your connection or contact support if the issue persists.
          </p>
        </div>
      </div>
    )
  }

  // --- Error state (before loading so failed intersection fetch is shown) ---
  if (error && dailyData.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-red-800 bg-red-950/30 p-6 text-center">
          <p className="text-red-400 font-medium text-lg mb-1">
            Failed to load data
          </p>
          <p className="text-red-500/70 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  // --- Loading state ---
  if (loading && dailyData.length === 0) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-[220px] rounded-lg border border-neutral-800 bg-black animate-pulse"
            />
          ))}
        </div>
        <div className="h-[350px] rounded-lg border border-neutral-800 bg-black animate-pulse" />
      </div>
    )
  }

  // --- Empty data state ---
  if (dailyData.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-neutral-800 bg-black p-6 text-center">
          <p className="text-gray-400 font-medium text-lg mb-1">
            No data available
          </p>
          <p className="text-gray-500 text-sm">
            No SDSM events have been recorded yet for this intersection.
            Make sure data is being ingested via POST /api/sdsm/store.
          </p>
        </div>
      </div>
    )
  }

  // --- Compute stats from live data ---
  const totalVehicles = dailyData.reduce((sum, item) => sum + item.vehicles, 0)
  const totalPedestrians = dailyData.reduce((sum, item) => sum + item.pedestrians, 0)
  const totalTraffic = totalVehicles + totalPedestrians
  const avgDailyTraffic = Math.round(totalTraffic / dailyData.length)

  // Trends: compare first half vs second half of the period
  const midpoint = Math.floor(dailyData.length / 2)
  const firstHalf = dailyData.slice(0, midpoint)
  const secondHalf = dailyData.slice(midpoint)

  const safeTrend = (first, second, accessor) => {
    const firstAvg = first.reduce((s, d) => s + accessor(d), 0) / (first.length || 1)
    const secondAvg = second.reduce((s, d) => s + accessor(d), 0) / (second.length || 1)
    if (firstAvg === 0) return "0.0"
    return (((secondAvg - firstAvg) / firstAvg) * 100).toFixed(1)
  }

  const trafficTrend = safeTrend(firstHalf, secondHalf, (d) => d.vehicles + d.pedestrians)
  const vehicleTrend = safeTrend(firstHalf, secondHalf, (d) => d.vehicles)
  const pedestrianTrend = safeTrend(firstHalf, secondHalf, (d) => d.pedestrians)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Traffic"
          value={totalTraffic}
          trend={trafficTrend}
          primaryDescription={parseFloat(trafficTrend) >= 0 ? 'Trending up this period' : 'Trending down this period'}
          secondaryDescription="Combined vehicles and pedestrians"
        />

        <StatCard
          title="Vehicle Count"
          value={totalVehicles}
          trend={vehicleTrend}
          primaryDescription={parseFloat(vehicleTrend) >= 0 ? 'Increase in vehicle traffic' : 'Decrease in vehicle traffic'}
          secondaryDescription={parseFloat(vehicleTrend) >= 0 ? 'Traffic volume growing' : 'Volume needs monitoring'}
        />

        <StatCard
          title="VRU Count"
          value={totalPedestrians}
          trend={pedestrianTrend}
          primaryDescription={parseFloat(pedestrianTrend) >= 0 ? 'Strong pedestrian activity' : 'Lower pedestrian activity'}
          secondaryDescription={parseFloat(pedestrianTrend) >= 0 ? 'Foot traffic exceeds baseline' : 'Activity below average'}
        />

        <StatCard
          title="Daily Average"
          value={avgDailyTraffic}
          trend={trafficTrend}
          primaryDescription={parseFloat(trafficTrend) >= 0 ? 'Daily average trending up' : 'Daily average trending down'}
          secondaryDescription={parseFloat(trafficTrend) >= 0 ? 'Higher recent daily volume' : 'Lower recent daily volume'}
        />
      </div>

      <TrafficChart
        filteredData={dailyData}
        location={selectedLabel}
        setLocation={handleLocationChange}
        timeRange={timeRange}
        setTimeRange={handleTimeRangeChange}
        locations={locationLabels}
      />

      <TrafficDataTable data={dailyData} location={selectedLabel} />
    </div>
  )
}
