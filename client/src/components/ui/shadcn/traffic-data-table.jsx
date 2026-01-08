"use client"

import * as React from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/shadcn/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/shadcn/table"
import { Button } from "@/components/ui/shadcn/button"
import { ButtonGroup } from "@/components/ui/shadcn/button-group"
import { Badge } from "@/components/ui/shadcn/badge"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/shadcn/dropdown-menu"
import {
  ArchiveIcon,
  MoreHorizontalIcon,
  MailCheckIcon,
  ChevronDownIcon,
} from "lucide-react"

export function TrafficDataTable({ data, location }) {
  const [columnVisibility, setColumnVisibility] = React.useState({
    date: true,
    time: true,
    vehicles: true,
    pedestrians: true,
    total: true,
    status: true,
  })

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
        <CardDescription className="text-black-400">
          Last 7 days of traffic records for {location}
        </CardDescription>
      </CardHeader>

      {/* Toolbar with Button Group and Columns Dropdown */}
      <div className="flex items-center justify-between px-6 pb-4">
        <ButtonGroup>
          <Button variant="outline" className="text-black-300 border-black-700 hover:bg-gray-800 hover:text-white">
            Archive
          </Button>
          <Button variant="outline" className="text-black-300 border-black-700 hover:bg-gray-800 hover:text-white">
            Report
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="More Options" className="text-black-300 border-black-700 hover:bg-gray-800 hover:text-white">
                <MoreHorizontalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 bg-black-900 border-black-700">
              <DropdownMenuCheckboxItem className="text-black-300 focus:bg-black-800 focus:text-white">
                <MailCheckIcon />
                Mark as Read
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem className="text-black-300 focus:bg-black-800 focus:text-white">
                <ArchiveIcon />
                Archive
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </ButtonGroup>

        {/* Columns Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto text-black-300 border-black-700 hover:bg-gray-800 hover:text-white">
              Columns <ChevronDownIcon className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-black-900 border-black-700">
            <DropdownMenuCheckboxItem
              checked={columnVisibility.date}
              onCheckedChange={(value) => setColumnVisibility({ ...columnVisibility, date: value })}
              className="text-black-300 focus:bg-black-800 focus:text-white"
            >
              Date
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={columnVisibility.time}
              onCheckedChange={(value) => setColumnVisibility({ ...columnVisibility, time: value })}
              className="text-black-300 focus:bg-black-800 focus:text-white"
            >
              Time
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={columnVisibility.vehicles}
              onCheckedChange={(value) => setColumnVisibility({ ...columnVisibility, vehicles: value })}
              className="text-black-300 focus:bg-black-800 focus:text-white"
            >
              Vehicles
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={columnVisibility.pedestrians}
              onCheckedChange={(value) => setColumnVisibility({ ...columnVisibility, pedestrians: value })}
              className="text-black-300 focus:bg-black-800 focus:text-white"
            >
              Pedestrians
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={columnVisibility.total}
              onCheckedChange={(value) => setColumnVisibility({ ...columnVisibility, total: value })}
              className="text-black-300 focus:bg-black-800 focus:text-white"
            >
              Total
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={columnVisibility.status}
              onCheckedChange={(value) => setColumnVisibility({ ...columnVisibility, status: value })}
              className="text-black-300 focus:bg-black-800 focus:text-white"
            >
              Status
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-neutral-800 bg-black-800 hover:bg-black-800">
              {columnVisibility.date && <TableHead className="text-black-300">Date</TableHead>}
              {columnVisibility.time && <TableHead className="text-black-300">Time</TableHead>}
              {columnVisibility.vehicles && <TableHead className="text-right text-black-300">Vehicles</TableHead>}
              {columnVisibility.pedestrians && <TableHead className="text-right text-black-300">Pedestrians</TableHead>}
              {columnVisibility.total && <TableHead className="text-right text-black-300">Total</TableHead>}
              {columnVisibility.status && <TableHead className="text-black-300">Status</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentData.map((row, index) => (
              <TableRow key={index} className="border-neutral-800 hover:bg-neutral-900">
                {columnVisibility.date && <TableCell className="font-medium text-white">{row.date}</TableCell>}
                {columnVisibility.time && <TableCell className="text-black-300">{row.time}</TableCell>}
                {columnVisibility.vehicles && <TableCell className="text-right text-white">{row.vehicles.toLocaleString()}</TableCell>}
                {columnVisibility.pedestrians && <TableCell className="text-right text-white">{row.pedestrians.toLocaleString()}</TableCell>}
                {columnVisibility.total && <TableCell className="text-right font-medium text-white">{row.total.toLocaleString()}</TableCell>}
                {columnVisibility.status && (
                  <TableCell>
                    <Badge
                      variant={
                        row.status === "High Traffic"
                          ? "destructive"
                          : row.status === "Low Traffic"
                          ? "secondary"
                          : "default"
                      }
                    >
                      {row.status}
                    </Badge>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
