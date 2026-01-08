"use client"

import * as React from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/shadcn/card"
import { Badge } from "@/components/ui/shadcn/badge"

export function StatCard({ title, value, trend, primaryDescription, secondaryDescription }) {
  const isPositive = parseFloat(trend) >= 0

  return (
    <Card className="bg-black-900 border-neutral-800 shadow-[0_4px_6px_rgba(255,255,255,0.3)] h-[220px] flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-white">{title}</CardTitle>
        <Badge variant="outline" className={`flex items-center gap-0.5 text-[10px] font-medium rounded-full px-2 py-0.5 ${isPositive ? 'border-green-500 text-green-500' : 'border-red-500 text-red-500'}`}>
          {isPositive ? '↗' : '↘'} {trend > 0 ? '+' : ''}{trend}%
        </Badge>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center">
        <div className="text-4xl font-bold text-white mb-4">{value}</div>
        <p className="text-sm text-gray-300 mb-2 flex items-center gap-1">
          {primaryDescription} {isPositive ? '↗' : '↘'}
        </p>
        <p className="text-xs text-gray-500">
          {secondaryDescription}
        </p>
      </CardContent>
    </Card>
  )
}
