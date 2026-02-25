import React, { useState } from 'react'
import { BarChart2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/shadcn/select'
import { Switch } from '@/components/ui/shadcn/switch'
import { Separator } from '@/components/ui/shadcn/separator'
import { Label } from '@/components/ui/label'

function SectionHeader({ title, description }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold text-neutral-100">{title}</h2>
      <p className="text-sm text-neutral-500 mt-0.5">{description}</p>
    </div>
  )
}

function ToggleRow({ label, description, checked, onCheckedChange }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-neutral-200">{label}</p>
        {description && (
          <p className="text-xs text-neutral-500 mt-0.5">{description}</p>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

export function DashboardVisualization() {
  const [defaultDashboard, setDefaultDashboard] = useState('sdsm')
  const [theme, setTheme] = useState('dark')
  const [gridView, setGridView] = useState(true)
  const [compactView, setCompactView] = useState(false)
  const [expandedView, setExpandedView] = useState(true)
  const [colorPalette, setColorPalette] = useState('mocha-latte')
  const [showDataLabels, setShowDataLabels] = useState(true)
  const [timeZone, setTimeZone] = useState('utc')
  const [dateFormat, setDateFormat] = useState('iso')

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900">
      {/* Page Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-neutral-800">
        <BarChart2 className="h-5 w-5 text-neutral-400" />
        <h2 className="text-base font-semibold text-neutral-100">
          Dashboard &amp; Visualization
        </h2>
      </div>

      <div className="px-6 py-5 space-y-6">
        {/* Default Dashboard */}
        <div>
          <SectionHeader
            title="Default Dashboard"
            description="Choose which analytics screen loads first"
          />
          <Select value={defaultDashboard} onValueChange={setDefaultDashboard}>
            <SelectTrigger className="w-full bg-neutral-800 border-neutral-700 text-neutral-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-neutral-800 border-neutral-700">
              <SelectItem value="sdsm">SDSM</SelectItem>
              <SelectItem value="analytics">Traffic Analytics</SelectItem>
              <SelectItem value="geofences">Geofences</SelectItem>
              <SelectItem value="home">Home View</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator className="bg-neutral-800" />

        {/* Theme */}
        <div>
          <SectionHeader
            title="Theme"
            description="Choose your preferred color scheme"
          />
          <Select value={theme} onValueChange={setTheme}>
            <SelectTrigger className="w-full bg-neutral-800 border-neutral-700 text-neutral-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-neutral-800 border-neutral-700">
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator className="bg-neutral-800" />

        {/* Layout Customization */}
        <div>
          <SectionHeader
            title="Layout Customization"
            description="Customize how your dashboard appears"
          />
          <div className="divide-y divide-neutral-800">
            <ToggleRow
              label="Grid View"
              description="Display data in grid format"
              checked={gridView}
              onCheckedChange={setGridView}
            />
            <ToggleRow
              label="Compact View"
              description="Use smaller chart sizes to fit more data"
              checked={compactView}
              onCheckedChange={setCompactView}
            />
            <ToggleRow
              label="Expanded View"
              description="Show detailed information for each chart"
              checked={expandedView}
              onCheckedChange={setExpandedView}
            />
          </div>
        </div>

        <Separator className="bg-neutral-800" />

        {/* Chart Preferences */}
        <div>
          <SectionHeader
            title="Chart Preferences"
            description="Configure chart display options"
          />
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-neutral-400 mb-1.5 block">
                Color Palette
              </Label>
              <Select value={colorPalette} onValueChange={setColorPalette}>
                <SelectTrigger className="w-full bg-neutral-800 border-neutral-700 text-neutral-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-neutral-800 border-neutral-700">
                  <SelectItem value="mocha-latte">Mocha &amp; Latte</SelectItem>
                  <SelectItem value="ocean-breeze">Ocean Breeze</SelectItem>
                  <SelectItem value="sunset-glow">Sunset Glow</SelectItem>
                  <SelectItem value="forest-mist">Forest Mist</SelectItem>
                  <SelectItem value="monochrome">Monochrome</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="divide-y divide-neutral-800">
              <ToggleRow
                label="Show Data Labels"
                description="Display data values on chart elements"
                checked={showDataLabels}
                onCheckedChange={setShowDataLabels}
              />
            </div>
          </div>
        </div>

        <Separator className="bg-neutral-800" />

        {/* Time Zone & Date Format */}
        <div>
          <SectionHeader
            title="Time Zone &amp; Date Format"
            description="Configure time and date display preferences"
          />
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-neutral-400 mb-1.5 block">
                Time Zone
              </Label>
              <Select value={timeZone} onValueChange={setTimeZone}>
                <SelectTrigger className="w-full bg-neutral-800 border-neutral-700 text-neutral-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-neutral-800 border-neutral-700">
                  <SelectItem value="utc">UTC (Coordinated Universal Time)</SelectItem>
                  <SelectItem value="est">EST (Eastern Standard Time)</SelectItem>
                  <SelectItem value="cst">CST (Central Standard Time)</SelectItem>
                  <SelectItem value="mst">MST (Mountain Standard Time)</SelectItem>
                  <SelectItem value="pst">PST (Pacific Standard Time)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm text-neutral-400 mb-1.5 block">
                Date Format
              </Label>
              <Select value={dateFormat} onValueChange={setDateFormat}>
                <SelectTrigger className="w-full bg-neutral-800 border-neutral-700 text-neutral-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-neutral-800 border-neutral-700">
                  <SelectItem value="iso">ISO Format (YYYY-MM-DD)</SelectItem>
                  <SelectItem value="us">US Format (MM/DD/YYYY)</SelectItem>
                  <SelectItem value="eu">EU Format (DD/MM/YYYY)</SelectItem>
                  <SelectItem value="long">Long Format (Month DD, YYYY)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardVisualization
