"use client"

import * as React from "react"
import { useVSSEvents } from "@/hooks/vss/useVSSEvents"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/shadcn/toggle-group"
import { StatCard } from "@/components/ui/shadcn/stat-card"
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts"

const TIME_RANGE_TO_DAYS = { "7d": 7, "30d": 30, "90d": 90 }

export function VSSEventsPage() {
    const [timeRange, setTimeRange] = React.useState("30d")

    const {
        cameras,
        selectedCamera,
        setSelectedCamera,
        events,
        summary,
        dailyData,
        scope,
        setScope,
        days,
        setDays,
        loading,
        error,
    } = useVSSEvents()

    const handleTimeRangeChange = (range) => {
        setTimeRange(range)
        setDays(TIME_RANGE_TO_DAYS[range])
    }

    // Aggregate summary counts by event_type for stat cards
    const totalToday = summary?.breakdown?.reduce((acc, r) => acc + r.count, 0) ?? 0
    // TODO: surface the top event_type from summary.breakdown as a secondary stat card if useful

    if (error && events.length === 0) {
        return (
            <div className="flex-1 space-y-6 p-4 md:p-6 lg:p-8">
                <div className="rounded-lg border border-red-800 bg-red-950/30 p-6 text-center">
                    <p className="text-red-400 font-medium text-lg mb-1">Failed to load VSS data</p>
                    <p className="text-red-500/70 text-sm">{error}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 space-y-6 p-4 md:p-6 lg:p-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Video Analytics</h1>
                    <p className="text-muted-foreground mt-1">
                        NVIDIA VSS — AI-detected events from camera streams
                    </p>
                </div>

                {/* Camera selector */}
                <select
                    className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                    value={selectedCamera || ""}
                    onChange={(e) => setSelectedCamera(e.target.value || null)}
                >
                    <option value="">Select camera…</option>
                    {cameras.map((c) => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                </select>
            </div>

            {!selectedCamera ? (
                <div className="rounded-lg border border-border p-10 text-center text-muted-foreground">
                    Select a camera above to view event data.
                </div>
            ) : loading && events.length === 0 ? (
                <div className="rounded-lg border border-border p-10 text-center text-muted-foreground">
                    Loading…
                </div>
            ) : (
                <>
                    {/* Scope toggle */}
                    <div className="flex items-center gap-4">
                        <ToggleGroup
                            type="single"
                            value={scope}
                            onValueChange={(v) => v && setScope(v)}
                            className="border border-border rounded-lg p-1"
                        >
                            <ToggleGroupItem value="today" className="text-xs px-3">Today</ToggleGroupItem>
                            <ToggleGroupItem value="lifetime" className="text-xs px-3">Lifetime</ToggleGroupItem>
                        </ToggleGroup>
                    </div>

                    {/* Stat cards */}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard
                            title="Total Events"
                            value={totalToday}
                            description={scope === "today" ? "Today" : "All time"}
                        />
                        {/* TODO: add per-event-type stat cards once real event types are known */}
                        {summary?.breakdown?.slice(0, 3).map((b) => (
                            <StatCard
                                key={b.event_type}
                                title={b.event_type}
                                value={b.count}
                                description={scope === "today" ? "Today" : "All time"}
                            />
                        ))}
                    </div>

                    {/* Daily event count chart */}
                    <div className="rounded-lg border border-border bg-card p-4 space-y-2">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-foreground">Daily Events</h2>
                            <ToggleGroup
                                type="single"
                                value={timeRange}
                                onValueChange={(v) => v && handleTimeRangeChange(v)}
                                className="border border-border rounded-lg p-1"
                            >
                                <ToggleGroupItem value="7d" className="text-xs px-3">7d</ToggleGroupItem>
                                <ToggleGroupItem value="30d" className="text-xs px-3">30d</ToggleGroupItem>
                                <ToggleGroupItem value="90d" className="text-xs px-3">90d</ToggleGroupItem>
                            </ToggleGroup>
                        </div>
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={dailyData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip />
                                <Legend />
                                {/* TODO: add one Bar per event_type if multiple types should be shown separately */}
                                <Bar dataKey="count" name="Events" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Recent events table */}
                    <div className="rounded-lg border border-border bg-card overflow-hidden">
                        <div className="px-4 py-3 border-b border-border">
                            <h2 className="text-sm font-semibold text-foreground">Recent Events</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/40">
                                        <th className="px-4 py-2 text-left font-medium text-muted-foreground">Timestamp</th>
                                        <th className="px-4 py-2 text-left font-medium text-muted-foreground">Camera</th>
                                        <th className="px-4 py-2 text-left font-medium text-muted-foreground">Event Type</th>
                                        <th className="px-4 py-2 text-left font-medium text-muted-foreground">Description</th>
                                        <th className="px-4 py-2 text-right font-medium text-muted-foreground">Confidence</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {events.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                                                No events recorded yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        events.map((evt) => (
                                            <tr key={evt.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                                                <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                                                    {new Date(evt.timestamp).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-2">{evt.camera_id}</td>
                                                <td className="px-4 py-2">
                                                    <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium">
                                                        {evt.event_type}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2 text-muted-foreground max-w-xs truncate">
                                                    {evt.description || "—"}
                                                </td>
                                                <td className="px-4 py-2 text-right text-muted-foreground">
                                                    {evt.confidence != null ? `${(evt.confidence * 100).toFixed(1)}%` : "—"}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

export default VSSEventsPage
