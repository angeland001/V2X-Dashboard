"use client"

import * as React from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function StatCard({ title, value, trend, primaryDescription, secondaryDescription }) {
  const isPositive = parseFloat(trend) >= 0

  return (
    <Card className="bg-black border-neutral-800 shadow-[0_4px_6px_rgba(255,255,255,0.1)]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-white">{title}</CardTitle>
        <div className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded text-white">
          {isPositive ? '↗' : '↘'} {trend > 0 ? '+' : ''}{trend}%
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-white">{value}</div>
        <p className="text-sm text-gray-300 mt-2 flex items-center gap-1">
          {primaryDescription} {isPositive ? '↗' : '↘'}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {secondaryDescription}
        </p>
      </CardContent>
    </Card>
  )
}
