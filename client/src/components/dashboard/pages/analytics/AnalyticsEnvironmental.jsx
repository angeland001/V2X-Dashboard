import React from "react"
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/shadcn/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/shadcn/chart"

// Radar chart data
const radarData = [
  { metric: "Fuel Emission", industrial: 85, downtown: 65, suburban: 40 },
  { metric: "Particulate", industrial: 70, downtown: 55, suburban: 30 },
  { metric: "Thermal Use", industrial: 60, downtown: 75, suburban: 45 },
  { metric: "Energy Use", industrial: 90, downtown: 80, suburban: 50 },
  { metric: "Air Quality\nIndex", industrial: 40, downtown: 50, suburban: 80 },
  { metric: "Noise Levels", industrial: 75, downtown: 85, suburban: 35 },
]

const radarConfig = {
  industrial: {
    label: "Industrial Zone",
    color: "#8b5cf6",
  },
  downtown: {
    label: "Downtown",
    color: "#ef4444",
  },
  suburban: {
    label: "Suburban",
    color: "#06b6d4",
  },
}

// Horizontal bar chart data for environmental metrics
const environmentalMetrics = [
  {
    title: "Emissions",
    data: [
      { name: "CO2 Output", value: 78, fill: "#ef4444" },
      { name: "NOx Levels", value: 62, fill: "#f59e0b" },
      { name: "PM2.5", value: 45, fill: "#10b981" },
      { name: "SO2", value: 30, fill: "#8b5cf6" },
      { name: "VOC", value: 55, fill: "#ffffff" },
    ],
  },
  {
    title: "Automation",
    data: [
      { name: "Smart Signals", value: 85, fill: "#ef4444" },
      { name: "EV Stations", value: 60, fill: "#f59e0b" },
      { name: "Solar Panels", value: 72, fill: "#10b981" },
      { name: "Wind Power", value: 40, fill: "#8b5cf6" },
      { name: "Grid Sync", value: 68, fill: "#ffffff" },
    ],
  },
  {
    title: "CO2 Emissions",
    data: [
      { name: "Transport", value: 90, fill: "#ef4444" },
      { name: "Industrial", value: 75, fill: "#f59e0b" },
      { name: "Commercial", value: 55, fill: "#10b981" },
      { name: "Residential", value: 35, fill: "#8b5cf6" },
      { name: "Agriculture", value: 20, fill: "#ffffff" },
    ],
  },
  {
    title: "OSHA Violations",
    data: [
      { name: "Zone A", value: 15, fill: "#ef4444" },
      { name: "Zone B", value: 25, fill: "#f59e0b" },
      { name: "Zone C", value: 10, fill: "#10b981" },
      { name: "Zone D", value: 35, fill: "#8b5cf6" },
      { name: "Zone E", value: 20, fill: "#ffffff" },
    ],
  },
  {
    title: "OSHA Emission",
    data: [
      { name: "Category 1", value: 65, fill: "#ef4444" },
      { name: "Category 2", value: 50, fill: "#f59e0b" },
      { name: "Category 3", value: 80, fill: "#10b981" },
      { name: "Category 4", value: 40, fill: "#8b5cf6" },
      { name: "Category 5", value: 55, fill: "#ffffff" },
    ],
  },
]

// Summary cards data
const summaryCards = [
  {
    title: "Alerts Triggered",
    value: "Overloaded",
    subtitle: "System overloaded",
    textColor: "text-red-400",
  },
  {
    title: "System Grade",
    value: "B+ Grade",
    subtitle: "Above Average",
    textColor: "text-green-400",
  },
  {
    title: "Avg Energy Use",
    value: "78.5 kWh",
    subtitle: "+5.2% increase",
    textColor: "text-blue-400",
  },
]

export function AnalyticsEnvironmental() {
  return (
    <div className="space-y-6">
      <Card className="bg-black-900 border-neutral-800 shadow-[0_4px_6px_rgba(255,255,255,0.3)]">
        <CardHeader>
          <CardTitle className="text-neutral-100 text-lg">Environmental Impact Monitoring</CardTitle>
          <p className="text-sm text-neutral-500">
            Monitoring emissions, noise pollution, and energy consumption across different zones
          </p>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Radar Chart */}
          <div>
            <ChartContainer config={radarConfig} className="h-[400px] w-full">
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                <PolarGrid stroke="#3a3b40" />
                <PolarAngleAxis
                  dataKey="metric"
                  stroke="#8a8a8a"
                  fontSize={12}
                  tick={{ fill: "#8a8a8a" }}
                />
                <PolarRadiusAxis stroke="#3a3b40" fontSize={10} tick={{ fill: "#8a8a8a" }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Radar
                  name="industrial"
                  dataKey="industrial"
                  stroke="var(--color-industrial)"
                  fill="var(--color-industrial)"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
                <Radar
                  name="downtown"
                  dataKey="downtown"
                  stroke="var(--color-downtown)"
                  fill="var(--color-downtown)"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
                <Radar
                  name="suburban"
                  dataKey="suburban"
                  stroke="var(--color-suburban)"
                  fill="var(--color-suburban)"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </RadarChart>
            </ChartContainer>
          </div>

          {/* Horizontal Bar Charts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {environmentalMetrics.map((metric) => (
              <div key={metric.title} className="bg-[#2a2b30] rounded-lg border border-[#3a3b40] p-4">
                <h3 className="text-neutral-200 text-sm font-medium mb-3">{metric.title}</h3>
                <div className="space-y-3">
                  {metric.data.map((item) => (
                    <div key={item.name} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-neutral-400">{item.name}</span>
                        <span className="text-neutral-300">{item.value}%</span>
                      </div>
                      <div className="h-2 bg-neutral-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${item.value}%`,
                            backgroundColor: item.fill === "#ffffff" ? "#9ca3af" : item.fill,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {summaryCards.map((card) => (
              <div key={card.title} className="bg-black-900 border border-neutral-800 shadow-[0_4px_6px_rgba(255,255,255,0.3)] rounded-lg p-5">
                <p className={`text-sm ${card.textColor}`}>{card.title}</p>
                <p className="text-xl font-bold text-neutral-100 mt-1">{card.value}</p>
                <p className="text-sm text-neutral-400 mt-1">{card.subtitle}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AnalyticsEnvironmental
