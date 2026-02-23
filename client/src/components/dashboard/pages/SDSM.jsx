"use client"

import * as React from "react"
import { StatCard } from "@/components/ui/shadcn/stat-card"
import { TrafficChart } from "@/components/ui/shadcn/traffic-chart"
import { TrafficDataTable } from "@/components/dashboard/pages/traffic-data-table"
import { useSDSMOverview } from "@/hooks/useSDSMOverview"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/shadcn/toggle-group"

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
    summaryScope,
    setSummaryScope,
    summary,
    summaryLoading,
    summaryError,
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

  const formatDate = (value) => {
    if (!value) return ""
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return ""
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  const todayKey = new Date().toDateString()
  const yesterdayKey = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString()
  const todayRow = dailyData.find((r) => new Date(r.date).toDateString() === todayKey)
  const yesterdayRow = dailyData.find((r) => new Date(r.date).toDateString() === yesterdayKey)

  // --- Compute stats based on toggle ---
  const fallbackTodayVehicles = todayRow?.vehicles ?? 0
  const fallbackTodayPedestrians = todayRow?.pedestrians ?? 0

  const fallbackLifetimeVehicles = dailyData.reduce((sum, item) => sum + item.vehicles, 0)
  const fallbackLifetimePedestrians = dailyData.reduce((sum, item) => sum + item.pedestrians, 0)

  const vehicles =
    summaryScope === "today"
      ? (summary?.vehicles ?? fallbackTodayVehicles)
      : (summary?.vehicles ?? fallbackLifetimeVehicles)

  const pedestrians =
    summaryScope === "today"
      ? (summary?.pedestrians ?? fallbackTodayPedestrians)
      : (summary?.pedestrians ?? fallbackLifetimePedestrians)

  const totalTraffic = vehicles + pedestrians
  const dayCount =
    summaryScope === "lifetime"
      ? (summary?.dayCount ?? dailyData.length)
      : 1

  const avgDailyTraffic =
    summaryScope === "lifetime"
      ? Math.round(totalTraffic / (dayCount || 1))
      : totalTraffic

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

  const todayVsYesterdayTrend = (todayValue, yesterdayValue) => {
    if (!yesterdayValue) return "0.0"
    return (((todayValue - yesterdayValue) / yesterdayValue) * 100).toFixed(1)
  }

  const yTraffic = (yesterdayRow?.vehicles ?? 0) + (yesterdayRow?.pedestrians ?? 0)
  const yVehicles = yesterdayRow?.vehicles ?? 0
  const yPedestrians = yesterdayRow?.pedestrians ?? 0

  const trafficTrend =
    summaryScope === "today"
      ? todayVsYesterdayTrend(totalTraffic, yTraffic)
      : safeTrend(firstHalf, secondHalf, (d) => d.vehicles + d.pedestrians)

  const vehicleTrend =
    summaryScope === "today"
      ? todayVsYesterdayTrend(vehicles, yVehicles)
      : safeTrend(firstHalf, secondHalf, (d) => d.vehicles)

  const pedestrianTrend =
    summaryScope === "today"
      ? todayVsYesterdayTrend(pedestrians, yPedestrians)
      : safeTrend(firstHalf, secondHalf, (d) => d.pedestrians)

  const subtitle =
    summaryScope === "today"
      ? `Today (${formatDate(new Date())})`
      : (summary?.firstDate && summary?.lastDate
        ? `Lifetime (${formatDate(summary.firstDate)} – ${formatDate(summary.lastDate)})`
        : "Lifetime")

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-400">
          Stat cards scope: <span className="text-white font-medium">{subtitle}</span>
        </div>
        <ToggleGroup
          type="single"
          value={summaryScope}
          onValueChange={(value) => value && setSummaryScope(value)}
        >
          <ToggleGroupItem
            value="today"
            aria-label="Today"
            className="text-gray-300 border-gray-700 hover:bg-gray-800 hover:text-white data-[state=on]:bg-white data-[state=on]:text-black"
          >
            Today
          </ToggleGroupItem>
          <ToggleGroupItem
            value="lifetime"
            aria-label="Lifetime"
            className="text-gray-300 border-gray-700 hover:bg-gray-800 hover:text-white data-[state=on]:bg-white data-[state=on]:text-black"
          >
            Lifetime
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {(summaryError || (summaryLoading && !summary)) && (
        <div className="rounded-lg border border-neutral-800 bg-black p-4 text-sm text-gray-400">
          {summaryError ? `Stat summary unavailable: ${summaryError}` : "Loading stat summary…"}
        </div>
      )}

      {summaryScope === "today" && totalTraffic === 0 && (
        <div className="rounded-lg border border-neutral-800 bg-black p-4 text-sm text-gray-400">
          No SDSM events recorded yet for today at this intersection.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Traffic"
          value={totalTraffic}
          trend={trafficTrend}
          primaryDescription={
            summaryScope === "today"
              ? (parseFloat(trafficTrend) >= 0 ? "Up vs yesterday" : "Down vs yesterday")
              : (parseFloat(trafficTrend) >= 0 ? "Trending up this period" : "Trending down this period")
          }
          secondaryDescription={
            summaryScope === "today"
              ? `Vehicles + VRUs on ${formatDate(new Date())}`
              : "Combined vehicles and pedestrians"
          }
        />

        <StatCard
          title="Vehicle Count"
          value={vehicles}
          trend={vehicleTrend}
          primaryDescription={
            summaryScope === "today"
              ? (parseFloat(vehicleTrend) >= 0 ? "Up vs yesterday" : "Down vs yesterday")
              : (parseFloat(vehicleTrend) >= 0 ? "Increase in vehicle traffic" : "Decrease in vehicle traffic")
          }
          secondaryDescription={
            summaryScope === "today"
              ? `Vehicles on ${formatDate(new Date())}`
              : (parseFloat(vehicleTrend) >= 0 ? "Traffic volume growing" : "Volume needs monitoring")
          }
        />

        <StatCard
          title="VRU Count"
          value={pedestrians}
          trend={pedestrianTrend}
          primaryDescription={
            summaryScope === "today"
              ? (parseFloat(pedestrianTrend) >= 0 ? "Up vs yesterday" : "Down vs yesterday")
              : (parseFloat(pedestrianTrend) >= 0 ? "Strong pedestrian activity" : "Lower pedestrian activity")
          }
          secondaryDescription={
            summaryScope === "today"
              ? `VRUs on ${formatDate(new Date())}`
              : (parseFloat(pedestrianTrend) >= 0 ? "Foot traffic exceeds baseline" : "Activity below average")
          }
        />

        <StatCard
          title="Daily Average"
          value={avgDailyTraffic}
          trend={trafficTrend}
          primaryDescription={
            summaryScope === "today"
              ? "Today (single-day total)"
              : (parseFloat(trafficTrend) >= 0 ? "Daily average trending up" : "Daily average trending down")
          }
          secondaryDescription={
            summaryScope === "today"
              ? "All SDSM events recorded so far today"
              : `Across ${Number(dayCount || 0).toLocaleString()} recorded day${dayCount === 1 ? "" : "s"}`
          }
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
