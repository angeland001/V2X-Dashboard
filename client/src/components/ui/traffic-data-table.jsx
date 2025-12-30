"use client"

import * as React from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export function TrafficDataTable({ data, location }) {
  const getTrafficStatus = (vehicles, pedestrians) => {
    const total = vehicles + pedestrians
    if (total > 2200) return "High Traffic"
    if (total < 1400) return "Low Traffic"
    return "Normal"
  }

  const recentData = data.slice(-7).reverse().map((item, index) => {
    const total = item.vehicles + item.pedestrians
    const status = getTrafficStatus(item.vehicles, item.pedestrians)
    const time = `${8 + Math.floor(index * 2)}:00 AM`
    return {
      date: new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      time,
      vehicles: item.vehicles,
      pedestrians: item.pedestrians,
      total,
      status,
    }
  })

  return (
    <Card className="bg-black border-neutral-800 shadow-[0_4px_6px_rgba(255,255,255,0.1)]">
      <CardHeader>
        <CardTitle className="text-white">Recent Traffic Data</CardTitle>
        <CardDescription className="text-gray-400">
          Last 7 days of traffic records for {location}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-neutral-800 hover:bg-neutral-900">
              <TableHead className="text-gray-300">Date</TableHead>
              <TableHead className="text-gray-300">Time</TableHead>
              <TableHead className="text-right text-gray-300">Vehicles</TableHead>
              <TableHead className="text-right text-gray-300">Pedestrians</TableHead>
              <TableHead className="text-right text-gray-300">Total</TableHead>
              <TableHead className="text-gray-300">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentData.map((row, index) => (
              <TableRow key={index} className="border-neutral-800 hover:bg-neutral-900">
                <TableCell className="font-medium text-white">{row.date}</TableCell>
                <TableCell className="text-gray-300">{row.time}</TableCell>
                <TableCell className="text-right text-white">{row.vehicles.toLocaleString()}</TableCell>
                <TableCell className="text-right text-white">{row.pedestrians.toLocaleString()}</TableCell>
                <TableCell className="text-right font-medium text-white">{row.total.toLocaleString()}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      row.status === "High Traffic"
                        ? "bg-gray-900 text-white"
                        : row.status === "Low Traffic"
                        ? "bg-gray-300 text-gray-800"
                        : "bg-gray-600 text-white"
                    }`}
                  >
                    {row.status}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
