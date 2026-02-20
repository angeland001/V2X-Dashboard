"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { ChevronDown } from "lucide-react"

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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/shadcn/dropdown-menu"
import { Button } from "@/components/ui/shadcn/button"
import { ButtonGroup } from "@/components/ui/shadcn/button-group"
import MagicCard from "@/components/ui/MagicBento/MagicCard"

const chartConfig = {
  pedestrians: {
    label: "Pedestrians",
    color: "hsl(106 6.5% 72.7%)",
  },
  vehicles: {
    label: "Vehicles",
    color: "hsl(79 100% 98.7%)",
  },
}

export function TrafficChart({
  filteredData,
  location,
  setLocation,
  timeRange,
  setTimeRange,
  locations
}) {
  return (
    <MagicCard glowRadius={400}>
    <Card className="pt-0 bg-black border-neutral-800">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b border-neutral-800 py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle className="flex items-center gap-2 text-white">
            Traffic/Pedestrian Patterns for
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium hover:bg-neutral-900 hover:text-white focus:outline-none focus:ring-2 focus:ring-neutral-700 focus:ring-offset-2 focus:ring-offset-black">
                {location}
                <ChevronDown className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-neutral-900 border-neutral-800">
                {locations.map((loc) => (
                  <DropdownMenuItem
                    key={loc}
                    onClick={() => setLocation(loc)}
                    className="text-white hover:bg-neutral-800 focus:bg-neutral-800"
                  >
                    {loc}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </CardTitle>
          <CardDescription className="text-gray-400">
            Showing pedestrians and vehicles for the last 3 months
          </CardDescription>
        </div>
        <div className="sm:ml-auto flex items-center">
          <Button
            variant={timeRange === "90d" ? "default" : "outline"}
            onClick={() => setTimeRange("90d")}
            className={`!rounded-r-none !rounded-l-md normal-case ${timeRange === "90d" ? "bg-white text-black hover:bg-gray-200" : "text-gray-300 border-gray-700 hover:bg-gray-800 hover:text-white"}`}
          >
            Last 3 months
          </Button>
          <Button
            variant={timeRange === "30d" ? "default" : "outline"}
            onClick={() => setTimeRange("30d")}
            className={`!rounded-none !border-l-0 -ml-px normal-case ${timeRange === "30d" ? "bg-white text-black hover:bg-gray-200" : "text-gray-300 border-gray-700 hover:bg-gray-800 hover:text-white"}`}
          >
            Last 30 days
          </Button>
          <Button
            variant={timeRange === "7d" ? "default" : "outline"}
            onClick={() => setTimeRange("7d")}
            className={`!rounded-l-none !rounded-r-md !border-l-0 -ml-px normal-case ${timeRange === "7d" ? "bg-white text-black hover:bg-gray-200" : "text-gray-300 border-gray-700 hover:bg-gray-800 hover:text-white"}`}
          >
            Last 7 days
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 bg-black">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillVehicles" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-vehicles)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-vehicles)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillPedestrians" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-pedestrians)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-pedestrians)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="hsl(0, 0%, 20%)" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tick={{ fill: 'hsl(0, 0%, 60%)' }}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  className="bg-neutral-900 border-neutral-800 text-white"
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="pedestrians"
              type="natural"
              fill="url(#fillPedestrians)"
              stroke="var(--color-pedestrians)"
              stackId="a"
            />
            <Area
              dataKey="vehicles"
              type="natural"
              fill="url(#fillVehicles)"
              stroke="var(--color-vehicles)"
              stackId="a"
            />
            <ChartLegend content={<ChartLegendContent className="text-gray-300" />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
    </MagicCard>
  )
}
