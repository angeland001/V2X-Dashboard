import React from 'react'
import { BarChart2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/shadcn/select'
import { Separator } from '@/components/ui/shadcn/separator'
import { Label } from '@/components/ui/label'
import { SettingsPageWrapper, SectionHeader, ToggleRow } from '../components'
import { useSettings } from '@/hooks/settings/useSettings'

export function DashboardVisualization() {
  const { userSettings, updateUser } = useSettings()

  const defaultDashboard = userSettings.defaultDashboard || 'sdsm'
  const theme = userSettings.theme || 'system'
  const gridView = userSettings.gridView !== false
  const compactView = Boolean(userSettings.compactView)
  const expandedView = userSettings.expandedView !== false
  const colorPalette = userSettings.colorPalette || 'mocha-latte'
  const showDataLabels = userSettings.showDataLabels !== false
  const timeZone = userSettings.timezone || 'America/Chicago'
  const dateFormat = userSettings.dateFormat || 'iso'

  return (
    <SettingsPageWrapper icon={BarChart2} title="Dashboard &amp; Visualization">
      {/* Default Dashboard */}
      <div>
        <SectionHeader
          title="Default Dashboard"
          description="Choose which analytics screen loads first"
        />
        <Select value={defaultDashboard} onValueChange={(value) => updateUser({ defaultDashboard: value })}>
          <SelectTrigger className="w-48 bg-neutral-800 border-neutral-700 text-neutral-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="w-48 bg-neutral-800 border-neutral-700 text-neutral-200">
            <SelectItem value="sdsm">SDSM</SelectItem>
            <SelectItem value="analytics">Traffic Analytics</SelectItem>
            <SelectItem value="geofences">Geofences</SelectItem>
            
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
        <Select value={theme} onValueChange={(value) => updateUser({ theme: value })}>
          <SelectTrigger className="w-24 bg-neutral-800 border-neutral-700 text-neutral-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-neutral-800 border-neutral-700 text-neutral-200">
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
            onCheckedChange={(checked) => updateUser({ gridView: checked })}
          />
          <ToggleRow
            label="Compact View"
            description="Use smaller chart sizes to fit more data"
            checked={compactView}
            onCheckedChange={(checked) => updateUser({ compactView: checked })}
          />
          <ToggleRow
            label="Expanded View"
            description="Show detailed information for each chart"
            checked={expandedView}
            onCheckedChange={(checked) => updateUser({ expandedView: checked })}
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
            <Select value={colorPalette} onValueChange={(value) => updateUser({ colorPalette: value })}>
              <SelectTrigger className="w-48 bg-neutral-800 border-neutral-700 text-neutral-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-neutral-800 border-neutral-700 text-neutral-200">
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
              onCheckedChange={(checked) => updateUser({ showDataLabels: checked })}
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
            <Select value={timeZone} onValueChange={(value) => updateUser({ timezone: value })}>
              <SelectTrigger className="w-48 bg-neutral-800 border-neutral-700 text-neutral-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-neutral-800 border-neutral-700 text-neutral-200">
                <SelectItem value="UTC">UTC (Coordinated Universal Time)</SelectItem>
                <SelectItem value="America/New_York">EST (Eastern Standard Time)</SelectItem>
                <SelectItem value="America/Chicago">CST (Central Standard Time)</SelectItem>
                <SelectItem value="America/Denver">MST (Mountain Standard Time)</SelectItem>
                <SelectItem value="America/Los_Angeles">PST (Pacific Standard Time)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm text-neutral-400 mb-1.5 block">
              Date Format
            </Label>
            <Select value={dateFormat} onValueChange={(value) => updateUser({ dateFormat: value })}>
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
    </SettingsPageWrapper>
  )
}

export default DashboardVisualization
