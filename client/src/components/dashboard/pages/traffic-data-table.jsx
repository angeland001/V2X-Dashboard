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
import { Badge } from "@/components/ui/shadcn/badge"
import { Checkbox } from "@/components/ui/shadcn/checkbox"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/shadcn/toggle-group"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/shadcn/dropdown-menu"
import SpinnerCircle3 from "@/components/ui/shadcn/spinner-circle"
import {
  ArchiveIcon,
  FileTextIcon,
  ChevronDownIcon,
  CheckCircle2,
} from "lucide-react"

export function TrafficDataTable({ data, location }) {
  const [columnVisibility, setColumnVisibility] = React.useState({
    date: true,
    vehicles: true,
    vru: true,
    total: true,
    status: true,
    processStatus: true,
  })
  const [selectedRows, setSelectedRows] = React.useState(new Set())
  const [actionMode, setActionMode] = React.useState("archive")

  const getTrafficStatus = (vehicles, pedestrians) => {
    const total = vehicles + pedestrians
    if (total > 2200) return "High Traffic"
    if (total < 1400) return "Low Traffic"
    return "Normal"
  }

  const todayStr = new Date().toDateString()

  const recentData = data.slice(-7).reverse().map((item, index) => {
    const total = item.vehicles + item.pedestrians
    const status = getTrafficStatus(item.vehicles, item.pedestrians)
    const itemDate = new Date(item.date)
    const isToday = itemDate.toDateString() === todayStr

    return {
      id: `row-${index}`,
      date: itemDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      vehicles: item.vehicles,
      vru: item.pedestrians,
      total,
      status,
      processStatus: isToday ? "Collecting" : "Complete",
    }
  })

  const toggleRowSelection = (rowId) => {
    const newSelection = new Set(selectedRows)
    if (newSelection.has(rowId)) {
      newSelection.delete(rowId)
    } else {
      newSelection.add(rowId)
    }
    setSelectedRows(newSelection)
  }

  const toggleAllRows = () => {
    if (selectedRows.size === recentData.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(recentData.map(row => row.id)))
    }
  }

  const dayCount = Math.min(data.length, 7)

  return (
    <Card className="bg-black border-neutral-800 shadow-[0_4px_6px_rgba(255,255,255,0.1)]">
      <CardHeader>
        <CardTitle className="text-white">Recent Traffic Data</CardTitle>
        <CardDescription className="text-black-400">
          {dayCount === 0
            ? `No recorded days yet for ${location}`
            : `Last ${dayCount} recorded day${dayCount === 1 ? '' : 's'} for ${location}`
          }
        </CardDescription>
      </CardHeader>

      {/* Toolbar with Toggle Group and Columns Dropdown */}
      <div className="flex items-center justify-between px-6 pb-4">
        <ToggleGroup type="single" value={actionMode} onValueChange={(value) => value && setActionMode(value)}>
          <ToggleGroupItem value="archive" aria-label="Archive" className="text-gray-300 border-gray-700 hover:bg-gray-800 hover:text-white data-[state=on]:bg-white data-[state=on]:text-black">
            <ArchiveIcon className="h-4 w-4 mr-2" />
            Archive
          </ToggleGroupItem>
          <ToggleGroupItem value="report" aria-label="Report" className="text-gray-300 border-gray-700 hover:bg-gray-800 hover:text-white data-[state=on]:bg-white data-[state=on]:text-black">
            <FileTextIcon className="h-4 w-4 mr-2" />
            Report
          </ToggleGroupItem>
        </ToggleGroup>

        {/* Columns Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto text-gray-300 border-gray-700 hover:bg-gray-800 hover:text-white">
              Columns <ChevronDownIcon className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-neutral-900 border-neutral-700">
            <DropdownMenuCheckboxItem
              checked={columnVisibility.date}
              onCheckedChange={(value) => setColumnVisibility({ ...columnVisibility, date: value })}
              className="text-gray-300 focus:bg-neutral-800 focus:text-white"
            >
              Date
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={columnVisibility.vehicles}
              onCheckedChange={(value) => setColumnVisibility({ ...columnVisibility, vehicles: value })}
              className="text-gray-300 focus:bg-neutral-800 focus:text-white"
            >
              Vehicles
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={columnVisibility.vru}
              onCheckedChange={(value) => setColumnVisibility({ ...columnVisibility, vru: value })}
              className="text-gray-300 focus:bg-neutral-800 focus:text-white"
            >
              VRU
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={columnVisibility.total}
              onCheckedChange={(value) => setColumnVisibility({ ...columnVisibility, total: value })}
              className="text-gray-300 focus:bg-neutral-800 focus:text-white"
            >
              Total
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={columnVisibility.status}
              onCheckedChange={(value) => setColumnVisibility({ ...columnVisibility, status: value })}
              className="text-gray-300 focus:bg-neutral-800 focus:text-white"
            >
              Traffic Status
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={columnVisibility.processStatus}
              onCheckedChange={(value) => setColumnVisibility({ ...columnVisibility, processStatus: value })}
              className="text-gray-300 focus:bg-neutral-800 focus:text-white"
            >
              Process Status
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-neutral-800 bg-neutral-900 hover:bg-neutral-900">
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedRows.size === recentData.length && recentData.length > 0}
                  onCheckedChange={toggleAllRows}
                  aria-label="Select all rows"
                />
              </TableHead>
              {columnVisibility.date && <TableHead className="text-gray-300">Date</TableHead>}
              {columnVisibility.vehicles && <TableHead className="text-right text-gray-300">Vehicles</TableHead>}
              {columnVisibility.vru && <TableHead className="text-right text-gray-300">VRU</TableHead>}
              {columnVisibility.total && <TableHead className="text-right text-gray-300">Total</TableHead>}
              {columnVisibility.status && <TableHead className="text-gray-300">Traffic Status</TableHead>}
              {columnVisibility.processStatus && <TableHead className="text-gray-300">Status</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentData.length === 0 ? (
              <TableRow className="border-neutral-800">
                <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                  No data recorded yet — the poller is collecting events.
                </TableCell>
              </TableRow>
            ) : (
              recentData.map((row, index) => (
                <TableRow key={row.id} className="border-neutral-800 hover:bg-neutral-900">
                  <TableCell>
                    <Checkbox
                      checked={selectedRows.has(row.id)}
                      onCheckedChange={() => toggleRowSelection(row.id)}
                      aria-label={`Select row ${index + 1}`}
                    />
                  </TableCell>
                  {columnVisibility.date && <TableCell className="font-medium text-white">{row.date}</TableCell>}
                  {columnVisibility.vehicles && <TableCell className="text-right text-white">{row.vehicles.toLocaleString()}</TableCell>}
                  {columnVisibility.vru && <TableCell className="text-right text-white">{row.vru.toLocaleString()}</TableCell>}
                  {columnVisibility.total && <TableCell className="text-right font-medium text-white">{row.total.toLocaleString()}</TableCell>}
                  {columnVisibility.status && (
                    <TableCell>
                      <Badge variant="outline" className="w-fit border-gray-700 text-gray-400 rounded-full px-2.5 py-0.5 text-xs">
                        {row.status}
                      </Badge>
                    </TableCell>
                  )}
                  {columnVisibility.processStatus && (
                    <TableCell>
                      {row.processStatus === "Collecting" ? (
                        <Badge variant="outline" className="flex items-center gap-1.5 w-fit border-gray-700 rounded-full px-2.5 py-0.5">
                          <SpinnerCircle3 />
                          <span className="text-gray-400 text-xs">Collecting</span>
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="flex items-center gap-1.5 w-fit border-green-500 rounded-full px-2.5 py-0.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                          <span className="text-green-500 text-xs">Complete</span>
                        </Badge>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
