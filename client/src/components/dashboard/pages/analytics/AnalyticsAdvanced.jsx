import React from "react"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/shadcn/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/shadcn/chart"

// Stat cards
const statCards = [
  { title: "Road Defects", value: "28", change: "+4 ↑", changeColor: "text-red-400" },
  { title: "Avg Response Time", value: "8.5 min", change: "-1.2 min ↓", changeColor: "text-green-400" },
  { title: "Avg Traffic Speed", value: "45.3 km/h", change: "+5.2% ↑", changeColor: "text-green-400" },
  { title: "Active Incidents", value: "12", change: "-3 ↓", changeColor: "text-green-400" },
]

// Traffic Density Heatmap data
const timeSlots = ["00-04", "04-08", "08-12", "12-16", "16-20", "20-24"]
const zones = ["Highway A", "Highway B", "Downtown", "Suburb North", "Suburb South", "Industrial"]

const heatmapData = [
  // Highway A
  [25, 18, 85, 72, 68, 22],
  // Highway B
  [15, 20, 78, 65, 62, 18],
  // Downtown
  [12, 15, 92, 88, 75, 30],
  // Suburb North
  [20, 22, 70, 55, 48, 28],
  // Suburb South
  [8, 10, 65, 50, 42, 20],
  // Industrial
  [18, 35, 60, 55, 48, 22],
]

// Color for heatmap values
function getHeatColor(value) {
  if (value >= 80) return { bg: "bg-[#252525]", text: "text-white" }
  if (value >= 60) return { bg: "bg-[#525252]", text: "text-white" }
  if (value >= 40) return { bg: "bg-[#737373]", text: "text-white" }
  if (value >= 20) return { bg: "bg-[#969696]", text: "text-white" }
  return { bg: "bg-[#bdbdbd]", text: "text-neutral-900" }
}

// Comparative Traffic Flow line chart data
const trafficFlowData = [
  { time: "00:00", weekday: 120, weekend: 80, beforeRoadWork: 140 },
  { time: "04:00", weekday: 80, weekend: 60, beforeRoadWork: 100 },
  { time: "08:00", weekday: 350, weekend: 150, beforeRoadWork: 380 },
  { time: "12:00", weekday: 280, weekend: 200, beforeRoadWork: 320 },
  { time: "16:00", weekday: 380, weekend: 180, beforeRoadWork: 400 },
  { time: "20:00", weekday: 220, weekend: 250, beforeRoadWork: 260 },
  { time: "23:00", weekday: 140, weekend: 160, beforeRoadWork: 170 },
]

const trafficFlowConfig = {
  weekday: {
    label: "Weekday Average",
    color: "#525252",
  },
  weekend: {
    label: "Weekend Average",
    color: "#737373",
  },
  beforeRoadWork: {
    label: "Before Road Work",
    color: "#969696",
  },
}

// Density legend
const densityLegend = [
  { label: "Low Traffic", color: "bg-[#d9d9d9]" },
  { label: "Moderate Traffic", color: "bg-[#bdbdbd]" },
  { label: "Medium Traffic", color: "bg-[#969696]" },
  { label: "Heavy Traffic", color: "bg-[#737373]" },
  { label: "Very Heavy Traffic", color: "bg-[#525252]" },
]

export function AnalyticsAdvanced() {
  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="bg-black-900 border-neutral-800 shadow-[0_4px_6px_rgba(255,255,255,0.3)]">
            <CardContent className="p-5">
              <p className="text-sm text-neutral-400">{stat.title}</p>
              <p className="text-2xl font-bold text-neutral-100 mt-1">{stat.value}</p>
              <p className={`text-sm mt-1 ${stat.changeColor}`}>{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Heatmap & Line Chart Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traffic Density Heatmap */}
        <Card className="bg-black-900 border-neutral-800 shadow-[0_4px_6px_rgba(255,255,255,0.3)]">
          <CardHeader>
            <CardTitle className="text-neutral-100 text-base">Traffic Density Heatmap</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left text-xs text-neutral-500 pb-2 pr-2 w-[100px]"></th>
                    {timeSlots.map((slot) => (
                      <th key={slot} className="text-center text-xs text-neutral-500 pb-2 px-1">{slot}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {zones.map((zone, rowIdx) => (
                    <tr key={zone}>
                      <td className="text-xs text-neutral-400 pr-2 py-1">{zone}</td>
                      {heatmapData[rowIdx].map((value, colIdx) => {
                        const colors = getHeatColor(value)
                        return (
                          <td key={colIdx} className="p-1">
                            <div
                              className={`${colors.bg} ${colors.text} rounded text-center text-xs font-medium py-3 opacity-90 hover:opacity-100 transition-opacity cursor-default`}
                              title={`${zone} at ${timeSlots[colIdx]}: ${value}%`}
                            >
                              {value}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Density Legend */}
            <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-neutral-800">
              <span className="text-xs text-neutral-500">Density:</span>
              {densityLegend.map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded ${item.color}`} />
                  <span className="text-xs text-neutral-400">{item.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Comparative Traffic Flow */}
        <Card className="bg-black-900 border-neutral-800 shadow-[0_4px_6px_rgba(255,255,255,0.3)]">
          <CardHeader>
            <CardTitle className="text-neutral-100 text-base">Comparative Traffic Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={trafficFlowConfig} className="h-[350px] w-full">
              <LineChart data={trafficFlowData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#303030" />
                <XAxis dataKey="time" stroke="#8a8a8a" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#8a8a8a" fontSize={12} tickLine={false} axisLine={false} label={{ value: "Traffic Volume", angle: -90, position: "insideLeft", style: { fill: "#8a8a8a", fontSize: 12 } }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line type="monotone" dataKey="weekday" stroke="var(--color-weekday)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="weekend" stroke="var(--color-weekend)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="beforeRoadWork" stroke="var(--color-beforeRoadWork)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default AnalyticsAdvanced
