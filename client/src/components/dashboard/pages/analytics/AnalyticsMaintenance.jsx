import React from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/shadcn/card"

// Maintenance schedule data  
const maintenanceData = [
  {
    name: "I-24 East",
    priority: "high",
    tasks: [
      { type: "scheduled", start: 30, width: 25, label: "Resurfacing" },
      { type: "inProgress", start: 60, width: 20, label: "Bridge Repair" },
    ],
  },
  {
    name: "Route 58",
    priority: "medium",
    tasks: [
      { type: "inProgress", start: 20, width: 15, label: "Pothole Repair" },
      { type: "scheduled", start: 50, width: 30, label: "Line Painting" },
    ],
  },
  {
    name: "Hwy 153",
    priority: "high",
    tasks: [
      { type: "overdue", start: 10, width: 20, label: "Drainage Fix" },
      { type: "inProgress", start: 45, width: 25, label: "Signal Upgrade" },
    ],
  },
  {
    name: "US-27 South",
    priority: "low",
    tasks: [
      { type: "scheduled", start: 35, width: 30, label: "Guardrail Replace" },
      { type: "overdue", start: 70, width: 15, label: "Sign Repair" },
    ],
  },
  {
    name: "MLK Blvd",
    priority: "medium",
    tasks: [
      { type: "scheduled", start: 15, width: 20, label: "Sidewalk Repair" },
      { type: "scheduled", start: 55, width: 25, label: "Crosswalk Paint" },
    ],
  },
  {
    name: "Broad St",
    priority: "high",
    tasks: [
      { type: "inProgress", start: 25, width: 35, label: "Sewer Line" },
      { type: "overdue", start: 75, width: 10, label: "Patch Work" },
    ],
  },
  {
    name: "4th Ave",
    priority: "low",
    tasks: [
      { type: "scheduled", start: 40, width: 20, label: "Tree Trimming" },
      { type: "scheduled", start: 65, width: 20, label: "Lighting" },
    ],
  },
]

const months = ["Jan 2026", "Feb 2026", "Mar 2026", "Apr 2026"]

const priorityColors = {
  high: "bg-[#525252]",
  medium: "bg-[#737373]",
  low: "bg-[#969696]",
}

const taskColors = {
  scheduled: "bg-[#737373]/80",
  inProgress: "bg-[#969696]/80",
  overdue: "bg-[#bdbdbd]/60",
}

const taskBorderColors = {
  scheduled: "border-[#737373]",
  inProgress: "border-[#969696]",
  overdue: "border-[#bdbdbd]",
}

export function AnalyticsMaintenance() {
  return (
    <div className="space-y-6">
      <Card className="bg-black-900 border-neutral-800 shadow-[0_4px_6px_rgba(255,255,255,0.3)]">
        <CardHeader>
          <CardTitle className="text-neutral-100 text-lg">Predictive Maintenance Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Timeline Header */}
          <div className="flex border-b border-neutral-700 mb-0">
            <div className="w-[200px] shrink-0" />
            {months.map((month) => (
              <div
                key={month}
                className="flex-1 text-center text-sm text-neutral-500 py-2 border-l border-neutral-700"
              >
                {month}
              </div>
            ))}
          </div>

          {/* Gantt Rows */}
          <div className="divide-y divide-neutral-800">
            {maintenanceData.map((row, index) => (
              <div
                key={row.name}
                className={`flex items-center min-h-[52px] ${index % 2 === 0 ? "bg-[#1a1b20]" : "bg-black-900"}`}
              >
                {/* Row Label */}
                <div className="w-[200px] shrink-0 px-4 py-3 flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${priorityColors[row.priority]}`} />
                  <div>
                    <p className="text-sm text-neutral-200 font-medium">{row.name}</p>
                    <p className="text-xs text-neutral-500 capitalize">{row.priority} priority</p>
                  </div>
                </div>

                {/* Timeline Bar */}
                <div className="flex-1 relative h-[40px]">
                  {row.tasks.map((task, taskIdx) => (
                    <div
                      key={taskIdx}
                      className={`absolute top-[6px] h-[28px] rounded ${taskColors[task.type]} border ${taskBorderColors[task.type]} flex items-center justify-center px-2 transition-all hover:opacity-90`}
                      style={{
                        left: `${task.start}%`,
                        width: `${task.width}%`,
                      }}
                      title={`${task.label} (${task.type})`}
                    >
                      <span className="text-xs text-white truncate font-medium drop-shadow-sm">
                        {task.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-neutral-800">
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 rounded bg-[#737373]/80" />
              <span className="text-sm text-neutral-400">Scheduled</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 rounded bg-[#969696]/80" />
              <span className="text-sm text-neutral-400">In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 rounded bg-[#bdbdbd]/60" />
              <span className="text-sm text-neutral-400">Overdue</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AnalyticsMaintenance
