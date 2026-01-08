"use client"

import React, { useState } from "react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { Car, AlertTriangle, Clock, TrendingUp, ChevronDown } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/shadcn/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/shadcn/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/shadcn/select"
import { Badge } from "@/components/ui/shadcn/badge"

// Placeholder data for different geofences
const geofenceData = {
  "Downtown District": {
    vehiclesPassed: 15847,
    nearMisses: 23,
    avgSpeed: 28,
    peakHour: "5:00 PM",
    trend: "+12%",
    weeklyData: [
      { day: "Mon", vehicles: 2100, nearMisses: 3, avgSpeed: 27 },
      { day: "Tue", vehicles: 2340, nearMisses: 4, avgSpeed: 26 },
      { day: "Wed", vehicles: 2150, nearMisses: 2, avgSpeed: 29 },
      { day: "Thu", vehicles: 2450, nearMisses: 5, avgSpeed: 25 },
      { day: "Fri", vehicles: 2890, nearMisses: 6, avgSpeed: 24 },
      { day: "Sat", vehicles: 1950, nearMisses: 2, avgSpeed: 30 },
      { day: "Sun", values: 1967, nearMisses: 1, avgSpeed: 31 },
    ],
    hourlyTraffic: [
      { hour: "12 AM", count: 145 },
      { hour: "3 AM", count: 89 },
      { hour: "6 AM", count: 567 },
      { hour: "9 AM", count: 1234 },
      { hour: "12 PM", count: 1456 },
      { hour: "3 PM", count: 1789 },
      { hour: "6 PM", count: 2103 },
      { hour: "9 PM", count: 892 },
    ],
    metrics: [
      { name: "Traffic Volume", value: 89, color: "bg-blue-500" },
      { name: "Speed Compliance", value: 76, color: "bg-green-500" },
      { name: "Safety Score", value: 92, color: "bg-purple-500" },
      { name: "Congestion Level", value: 45, color: "bg-orange-500" },
    ],
  },
  "Highway 75": {
    vehiclesPassed: 28943,
    nearMisses: 12,
    avgSpeed: 62,
    peakHour: "7:30 AM",
    trend: "+8%",
    weeklyData: [
      { day: "Mon", vehicles: 4100, nearMisses: 2, avgSpeed: 61 },
      { day: "Tue", vehicles: 4230, nearMisses: 1, avgSpeed: 63 },
      { day: "Wed", vehicles: 4050, nearMisses: 2, avgSpeed: 62 },
      { day: "Thu", vehicles: 4350, nearMisses: 3, avgSpeed: 60 },
      { day: "Fri", vehicles: 4520, nearMisses: 2, avgSpeed: 59 },
      { day: "Sat", vehicles: 3850, nearMisses: 1, avgSpeed: 64 },
      { day: "Sun", vehicles: 3843, nearMisses: 1, avgSpeed: 65 },
    ],
    hourlyTraffic: [
      { hour: "12 AM", count: 456 },
      { hour: "3 AM", count: 234 },
      { hour: "6 AM", count: 1890 },
      { hour: "9 AM", count: 2456 },
      { hour: "12 PM", count: 2234 },
      { hour: "3 PM", count: 2567 },
      { hour: "6 PM", count: 2890 },
      { hour: "9 PM", count: 1567 },
    ],
    metrics: [
      { name: "Traffic Volume", value: 95, color: "bg-blue-500" },
      { name: "Speed Compliance", value: 88, color: "bg-green-500" },
      { name: "Safety Score", value: 97, color: "bg-purple-500" },
      { name: "Congestion Level", value: 28, color: "bg-orange-500" },
    ],
  },
  "School Zone": {
    vehiclesPassed: 8932,
    nearMisses: 8,
    avgSpeed: 18,
    peakHour: "8:00 AM",
    trend: "+5%",
    weeklyData: [
      { day: "Mon", vehicles: 1450, nearMisses: 1, avgSpeed: 17 },
      { day: "Tue", vehicles: 1520, nearMisses: 2, avgSpeed: 18 },
      { day: "Wed", vehicles: 1380, nearMisses: 1, avgSpeed: 19 },
      { day: "Thu", vehicles: 1490, nearMisses: 2, avgSpeed: 17 },
      { day: "Fri", vehicles: 1560, nearMisses: 2, avgSpeed: 18 },
      { day: "Sat", vehicles: 780, nearMisses: 0, avgSpeed: 20 },
      { day: "Sun", vehicles: 752, nearMisses: 0, avgSpeed: 21 },
    ],
    hourlyTraffic: [
      { hour: "12 AM", count: 12 },
      { hour: "3 AM", count: 8 },
      { hour: "6 AM", count: 234 },
      { hour: "9 AM", count: 890 },
      { hour: "12 PM", count: 456 },
      { hour: "3 PM", count: 923 },
      { hour: "6 PM", count: 234 },
      { hour: "9 PM", count: 45 },
    ],
    metrics: [
      { name: "Traffic Volume", value: 67, color: "bg-blue-500" },
      { name: "Speed Compliance", value: 94, color: "bg-green-500" },
      { name: "Safety Score", value: 96, color: "bg-purple-500" },
      { name: "Congestion Level", value: 22, color: "bg-orange-500" },
    ],
  },
}

const chartConfig = {
  vehicles: {
    label: "Vehicles",
    color: "hsl(220, 70%, 50%)",
  },
  nearMisses: {
    label: "Near Misses",
    color: "hsl(0, 70%, 50%)",
  },
  avgSpeed: {
    label: "Avg Speed",
    color: "hsl(142, 70%, 45%)",
  },
}

export function AnalyticsTraffic() {
  const [selectedGeofence, setSelectedGeofence] = useState("Downtown District")
  const [timeRange, setTimeRange] = useState("week")

  const currentData = geofenceData[selectedGeofence]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-900 p-6 space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Car className="w-8 h-8" />
            Geofence Analytics
          </h1>
          <p className="text-gray-400 mt-1">Real-time vehicle and safety monitoring</p>
        </div>
        <Select value={selectedGeofence} onValueChange={setSelectedGeofence}>
          <SelectTrigger className="w-64 bg-neutral-900 border-gray-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-neutral-900 border-gray-700">
            {Object.keys(geofenceData).map((zone) => (
              <SelectItem key={zone} value={zone} className="text-white hover:bg-neutral-800">
                {zone}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Vehicles Passed</CardTitle>
            <Car className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{currentData.vehiclesPassed.toLocaleString()}</div>
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3 text-green-400" />
              {currentData.trend} from last week
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-cyan-500/30 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Near Miss Incidents</CardTitle>
            <AlertTriangle className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{currentData.nearMisses}</div>
            <p className="text-xs text-gray-400 mt-1">Safety alerts this week</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Avg Speed</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{currentData.avgSpeed} mph</div>
            <p className="text-xs text-gray-400 mt-1">Within speed limits</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/20 to-red-500/20 border-orange-500/30 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Peak Traffic Hour</CardTitle>
            <Clock className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{currentData.peakHour}</div>
            <p className="text-xs text-gray-400 mt-1">Highest congestion time</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart and Sidebar */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Chart Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Weekly Traffic Flow */}
          <Card className="bg-neutral-900/50 border-gray-800 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-white">Traffic Flow Analysis</CardTitle>
                <CardDescription className="text-gray-400">Weekly vehicle patterns and trends</CardDescription>
              </div>
              <Badge variant="outline" className="border-gray-700 text-gray-300">
                Last 7 Days
              </Badge>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <AreaChart data={currentData.weeklyData}>
                  <defs>
                    <linearGradient id="fillVehicles" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-vehicles)" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="var(--color-vehicles)" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="fillNearMisses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-nearMisses)" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="var(--color-nearMisses)" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 20%)" />
                  <XAxis dataKey="day" stroke="hsl(0, 0%, 60%)" />
                  <YAxis stroke="hsl(0, 0%, 60%)" />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        className="bg-neutral-900 border-gray-800 text-white"
                        indicator="dot"
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="vehicles"
                    stroke="var(--color-vehicles)"
                    fill="url(#fillVehicles)"
                    strokeWidth={2}
                  />
                  <ChartLegend content={<ChartLegendContent className="text-gray-300" />} />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Hourly Traffic Distribution */}
          <Card className="bg-neutral-900/50 border-gray-800 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white">Hourly Traffic Distribution</CardTitle>
              <CardDescription className="text-gray-400">Peak hours and traffic patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <BarChart data={currentData.hourlyTraffic}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 20%)" />
                  <XAxis dataKey="hour" stroke="hsl(0, 0%, 60%)" />
                  <YAxis stroke="hsl(0, 0%, 60%)" />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        className="bg-neutral-900 border-gray-800 text-white"
                      />
                    }
                  />
                  <Bar dataKey="count" fill="hsl(220, 70%, 50%)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Metrics */}
        <div className="space-y-4">
          <Card className="bg-neutral-900/50 border-gray-800 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white">Performance Metrics</CardTitle>
              <CardDescription className="text-gray-400">Key performance indicators</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentData.metrics.map((metric, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">{metric.name}</span>
                    <span className="text-white font-semibold">{metric.value}%</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${metric.color} rounded-full transition-all duration-500`}
                      style={{ width: `${metric.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-neutral-900/50 border-gray-800 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white">Safety Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Speed Compliance</p>
                  <p className="text-xs text-gray-400">Most vehicles within limits</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Peak Hour Alert</p>
                  <p className="text-xs text-gray-400">Monitor {currentData.peakHour} closely</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Traffic Flow</p>
                  <p className="text-xs text-gray-400">Smooth operations overall</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default AnalyticsTraffic
