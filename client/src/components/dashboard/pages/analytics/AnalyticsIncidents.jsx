import React from "react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/shadcn/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/shadcn/chart"

// Response Time Distribution
const responseTimeData = [
  { range: "0-2 min", count: 45 },
  { range: "2-5 min", count: 82 },
  { range: "5-10 min", count: 65 },
  { range: "10-15 min", count: 38 },
  { range: "15-20 min", count: 22 },
  { range: "20-30 min", count: 15 },
  { range: "30+ min", count: 8 },
]

const responseTimeConfig = {
  count: {
    label: "Incident Count",
    color: "#fc8d59",
  },
}

// Response Time by Incident Type
const incidentTypes = [
  {
    title: "Accident",
    color: "#b30000",
    stats: [
      { label: "Avg Response", value: "6.2 min" },
      { label: "Total Incidents", value: "156" },
      { label: "Resolved", value: "142" },
      { label: "Pending", value: "14" },
    ],
    chartData: [
      { month: "Jan", value: 18 },
      { month: "Feb", value: 22 },
      { month: "Mar", value: 15 },
      { month: "Apr", value: 28 },
    ],
  },
  {
    title: "Water Issues",
    color: "#d7301f",
    stats: [
      { label: "Avg Response", value: "8.1 min" },
      { label: "Total Incidents", value: "89" },
      { label: "Resolved", value: "78" },
      { label: "Pending", value: "11" },
    ],
    chartData: [
      { month: "Jan", value: 12 },
      { month: "Feb", value: 8 },
      { month: "Mar", value: 20 },
      { month: "Apr", value: 15 },
    ],
  },
  {
    title: "% of Health",
    color: "#fc8d59",
    stats: [
      { label: "Avg Response", value: "4.5 min" },
      { label: "Total Incidents", value: "234" },
      { label: "Resolved", value: "220" },
      { label: "Pending", value: "14" },
    ],
    chartData: [
      { month: "Jan", value: 30 },
      { month: "Feb", value: 25 },
      { month: "Mar", value: 35 },
      { month: "Apr", value: 28 },
    ],
  },
  {
    title: "Medical",
    color: "#fdbb84",
    stats: [
      { label: "Avg Response", value: "3.8 min" },
      { label: "Total Incidents", value: "178" },
      { label: "Resolved", value: "170" },
      { label: "Pending", value: "8" },
    ],
    chartData: [
      { month: "Jan", value: 22 },
      { month: "Feb", value: 18 },
      { month: "Mar", value: 28 },
      { month: "Apr", value: 20 },
    ],
  },
]

// Defect Type Distribution pie data
const defectTypeData = [
  { name: "Potholes", value: 35, fill: "#b30000" },
  { name: "Cracks", value: 25, fill: "#d7301f" },
  { name: "Surface Wear", value: 20, fill: "#ef6548" },
  { name: "Drainage", value: 12, fill: "#fc8d59" },
  { name: "Signage", value: 8, fill: "#fdbb84" },
]

// Defects by Location stacked bar chart data
const defectsByLocation = [
  { location: "Highway A", potholes: 12, cracks: 8, surface: 5, drainage: 3, signage: 2 },
  { location: "Highway B", potholes: 8, cracks: 10, surface: 7, drainage: 4, signage: 1 },
  { location: "Downtown", potholes: 15, cracks: 6, surface: 8, drainage: 2, signage: 3 },
  { location: "Suburb N", potholes: 5, cracks: 12, surface: 4, drainage: 6, signage: 2 },
  { location: "Suburb S", potholes: 7, cracks: 4, surface: 9, drainage: 1, signage: 4 },
  { location: "Industrial", potholes: 10, cracks: 9, surface: 3, drainage: 5, signage: 1 },
]

// Defect reports table data
const defectReports = [
  { id: "DEF-001", type: "Pothole", location: "Highway A - KM 23", severity: "Critical", status: "Open", reported: "2026-02-08" },
  { id: "DEF-002", type: "Crack", location: "Downtown - Main St", severity: "Medium", status: "In Progress", reported: "2026-02-07" },
  { id: "DEF-003", type: "Drainage", location: "Suburb N - Oak Ave", severity: "High", status: "Open", reported: "2026-02-07" },
  { id: "DEF-004", type: "Surface Wear", location: "Industrial - Zone B", severity: "Low", status: "Resolved", reported: "2026-02-06" },
  { id: "DEF-005", type: "Signage", location: "Highway B - Exit 14", severity: "Medium", status: "Open", reported: "2026-02-05" },
]

// Severity summary
const severitySummary = [
  { label: "Critical", count: 3, textColor: "text-red-400" },
  { label: "High Priority", count: 7, textColor: "text-orange-400" },
  { label: "Medium", count: 12, textColor: "text-yellow-400" },
  { label: "Low Priority", count: 8, textColor: "text-green-400" },
]

const severityColors = {
  Critical: "text-red-400 bg-[#1e1f25] border-red-800",
  High: "text-orange-400 bg-[#1e1f25] border-orange-800",
  Medium: "text-yellow-400 bg-[#1e1f25] border-yellow-800",
  Low: "text-green-400 bg-[#1e1f25] border-green-800",
}

const statusColors = {
  Open: "text-red-400",
  "In Progress": "text-yellow-400",
  Resolved: "text-green-400",
}

export function AnalyticsIncidents() {
  return (
    <div className="space-y-6">
      {/* Incident Response Time Analysis */}
      <Card className="bg-black-900 border-neutral-800 shadow-[0_4px_6px_rgba(255,255,255,0.3)]">
        <CardHeader>
          <CardTitle className="text-neutral-100 text-lg">Incident Response Time Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Response Time Distribution */}
          <div>
            <h3 className="text-neutral-300 text-sm font-medium mb-4">Response Time Distribution</h3>
            <ChartContainer config={responseTimeConfig} className="h-[300px] w-full">
              <BarChart data={responseTimeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#303030" vertical={false} />
                <XAxis dataKey="range" stroke="#8a8a8a" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#8a8a8a" fontSize={12} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={60}>
                  {responseTimeData.map((entry, index) => {
                    const colors = ["#ff6b6b", "#ff5252", "#f44336", "#e53935", "#d32f2f", "#c62828", "#b71c1c"];
                    return <Cell key={`cell-${index}`} fill={colors[index]} />;
                  })}
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>

          {/* Response Time by Incident Type */}
          <div>
            <h3 className="text-neutral-300 text-sm font-medium mb-4">Response Time by Incident Type</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {incidentTypes.map((type) => (
                <div key={type.title} className="bg-black-900 rounded-lg border border-neutral-800 shadow-[0_4px_6px_rgba(255,255,255,0.3)] p-4">
                  <h4 className="text-neutral-200 text-sm font-medium mb-3">{type.title}</h4>
                  <div className="space-y-2 mb-4">
                    {type.stats.map((stat) => (
                      <div key={stat.label} className="flex justify-between text-xs">
                        <span className="text-neutral-500">{stat.label}</span>
                        <span className="text-neutral-300">{stat.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="h-[100px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={type.chartData}>
                        <XAxis dataKey="month" stroke="#8a8a8a" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis hide />
                        <Bar dataKey="value" fill={type.color} radius={[3, 3, 0, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Road Defects Overview */}
      <Card className="bg-black-900 border-neutral-800 shadow-[0_4px_6px_rgba(255,255,255,0.3)]">
        <CardHeader>
          <CardTitle className="text-neutral-100 text-lg">Road Defects Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Defect Type Pie Chart */}
            <div>
              <h3 className="text-neutral-300 text-sm font-medium mb-4">Defect Type Distribution</h3>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={defectTypeData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      stroke="none"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {defectTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1e1f25", border: "1px solid #3a3b40", borderRadius: "8px" }}
                      itemStyle={{ color: "#e9e9e9" }}
                    />
                    <Legend
                      formatter={(value) => <span className="text-neutral-400 text-xs">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Defects by Location Stacked Bar */}
            <div>
              <h3 className="text-neutral-300 text-sm font-medium mb-4">Defects by Location</h3>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={defectsByLocation} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#303030" horizontal={false} />
                    <XAxis type="number" stroke="#8a8a8a" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis dataKey="location" type="category" stroke="#8a8a8a" fontSize={11} tickLine={false} axisLine={false} width={80} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1e1f25", border: "1px solid #3a3b40", borderRadius: "8px" }}
                      itemStyle={{ color: "#e9e9e9" }}
                    />
                    <Legend
                      formatter={(value) => <span className="text-neutral-400 text-xs capitalize">{value}</span>}
                    />
                    <Bar dataKey="potholes" stackId="a" fill="#b30000" />
                    <Bar dataKey="cracks" stackId="a" fill="#d7301f" />
                    <Bar dataKey="surface" stackId="a" fill="#ef6548" />
                    <Bar dataKey="drainage" stackId="a" fill="#fc8d59" />
                    <Bar dataKey="signage" stackId="a" fill="#fdbb84" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Defect Reports Table */}
          <div>
            <h3 className="text-neutral-300 text-sm font-medium mb-4">Recent Defect Reports</h3>
            <div className="overflow-x-auto rounded-lg border border-neutral-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-800 bg-neutral-900/50">
                    <th className="text-left px-4 py-3 text-neutral-400 font-medium">ID</th>
                    <th className="text-left px-4 py-3 text-neutral-400 font-medium">Type</th>
                    <th className="text-left px-4 py-3 text-neutral-400 font-medium">Location</th>
                    <th className="text-left px-4 py-3 text-neutral-400 font-medium">Severity</th>
                    <th className="text-left px-4 py-3 text-neutral-400 font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-neutral-400 font-medium">Reported</th>
                  </tr>
                </thead>
                <tbody>
                  {defectReports.map((report) => (
                    <tr key={report.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30">
                      <td className="px-4 py-3 text-neutral-300">{report.id}</td>
                      <td className="px-4 py-3 text-neutral-300">{report.type}</td>
                      <td className="px-4 py-3 text-neutral-300">{report.location}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full border ${severityColors[report.severity]}`}>
                          {report.severity}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-sm ${statusColors[report.status]}`}>{report.status}</td>
                      <td className="px-4 py-3 text-neutral-400">{report.reported}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Severity Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {severitySummary.map((item) => (
              <div key={item.label} className="bg-black-900 border border-neutral-800 shadow-[0_4px_6px_rgba(255,255,255,0.3)] rounded-lg p-4">
                <p className={`text-sm ${item.textColor}`}>{item.label}</p>
                <p className="text-2xl font-bold text-neutral-100 mt-1">{item.count}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AnalyticsIncidents
