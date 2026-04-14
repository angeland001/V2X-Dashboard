import React from 'react'
import { BellIcon } from 'lucide-react'
import { Input } from '@/components/ui/shadcn/input'
import { Separator } from '@/components/ui/shadcn/separator'
import { Checkbox } from '@/components/ui/shadcn/checkbox'
import { Label } from '@/components/ui/label'
import { ToggleButton } from '@/components/ui/ToggleButton'
import { SettingsPageWrapper, SectionHeader, ToggleRow } from '../components'
import { useSettings } from '@/hooks/settings/useSettings'

export function NotificationsAlerts() {
  const { userSettings, globalSettings, updateUser, updateGlobal } = useSettings()
  const thresholdAlertsEnabled = userSettings.thresholdAlertsEnabled !== false
  const trafficDropEnabled = userSettings.trafficDropEnabled !== false
  const trafficDropValue = String(userSettings.trafficDropValue ?? '10')
  const trafficSpikeEnabled = Boolean(userSettings.trafficSpikeEnabled)
  const trafficSpikeValue = String(userSettings.trafficSpikeValue ?? '20')
  const priorityHigh = userSettings.priorityHigh !== false
  const priorityMedium = Boolean(userSettings.priorityMedium)
  const priorityLow = Boolean(userSettings.priorityLow)

  return (
    <SettingsPageWrapper icon={BellIcon} title="Notifications &amp; Alerts">
      {/* Threshold-based Alerts */}
      <div>
        <SectionHeader
          title="Threshold-based Alerts"
          description="Receive alerts when traffic or other metrics change significantly"
        />
        <div className="divide-y divide-neutral-800">
          <ToggleRow
            label="Enable Threshold Alerts"
            description="Master switch for all threshold-based notifications"
            checked={thresholdAlertsEnabled}
            onCheckedChange={(checked) => updateUser({ thresholdAlertsEnabled: checked })}
          />

          {/* Traffic Drop Alert */}
          <div className="py-3 space-y-2 opacity-100 transition-opacity"
            style={{ opacity: thresholdAlertsEnabled ? 1 : 0.4, pointerEvents: thresholdAlertsEnabled ? 'auto' : 'none' }}>
              <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-200">Traffic Drop Alert</p>
                <p className="text-xs text-neutral-500 mt-0.5">Notify when traffic decreases beyond the threshold</p>
              </div>
              <ToggleButton checked={trafficDropEnabled} onCheckedChange={(checked) => updateUser({ trafficDropEnabled: checked })} />
            </div>
            {trafficDropEnabled && (
              <div className="flex items-center gap-2 pl-0 pt-1">
                <Input
                  className="text-neutral-100 w-20 bg-neutral-800 border-neutral-700"
                  type="number"
                  min={1}
                  max={100}
                  value={trafficDropValue}
                  onChange={(e) => updateUser({ trafficDropValue: e.target.value })}
                />
                <p className="text-neutral-400 text-sm">% decrease from previous period</p>
              </div>
            )}
            <p className="text-xs text-neutral-600">
              Example: "Notify me when traffic drops by 20%"
            </p>
          </div>

          {/* Traffic Spike Alert */}
          <div className="py-3 space-y-2 transition-opacity"
            style={{ opacity: thresholdAlertsEnabled ? 1 : 0.4, pointerEvents: thresholdAlertsEnabled ? 'auto' : 'none' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-200">Traffic Spike Alert</p>
                <p className="text-xs text-neutral-500 mt-0.5">Notify when traffic increases beyond the threshold</p>
              </div>
              <ToggleButton checked={trafficSpikeEnabled} onCheckedChange={(checked) => updateUser({ trafficSpikeEnabled: checked })} />
            </div>
            {trafficSpikeEnabled && (
              <div className="flex items-center gap-2 pt-1">
                <Input
                  className="text-neutral-100 w-20 bg-neutral-800 border-neutral-700"
                  type="number"
                  min={1}
                  max={100}
                  value={trafficSpikeValue}
                  onChange={(e) => updateUser({ trafficSpikeValue: e.target.value })}
                />
                <p className="text-neutral-400 text-sm">% increase from previous period</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Separator className="bg-neutral-800" />

      {/* Notification Channels */}
      <div>
        <SectionHeader
          title="Notification Channels"
          description="Control how alerts are shared and when reports are sent"
        />
        <div className="space-y-1">
          <p className="text-sm font-medium text-neutral-200 mb-3">Priority Levels</p>
          <div className="flex items-center gap-2">
            <Checkbox
              id="priority-low"
              checked={priorityLow}
              onCheckedChange={(checked) => updateUser({ priorityLow: checked })}
            />
            <Label htmlFor="priority-low" className="text-sm text-neutral-300 cursor-pointer capitalize">
              Low Priority - Public
            </Label>
            <p className="text-xs text-neutral-600">
              Share with all team members
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="priority-medium"
              checked={priorityMedium}
              onCheckedChange={(checked) => updateUser({ priorityMedium: checked })}
            />
            <Label htmlFor="priority-medium" className="text-sm text-neutral-300 cursor-pointer capitalize">
              Medium Priority - Team Leads
            </Label>
            <p className="text-xs text-neutral-600">
              Share with team leads and managers
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="priority-high"
              checked={priorityHigh}
              onCheckedChange={(checked) => updateUser({ priorityHigh: checked })}
            />
            <Label htmlFor="priority-high" className="text-sm text-neutral-300 cursor-pointer capitalize">
              high priority - Private
            </Label>
            <p className="text-xs text-neutral-600">
              Share only with designated contacts
            </p>
          </div>
        </div>
        </div>

      <Separator className="bg-neutral-800" />

      <div className="divide-y divide-neutral-800">
        <ToggleRow
          label="Email Notifications"
          description="Enable email delivery for alert notifications"
          checked={globalSettings.emailNotifications !== false}
          onCheckedChange={(checked) => updateGlobal({ emailNotifications: checked })}
        />
        <div className="py-3 flex items-center justify-between">
          <p className="text-sm text-neutral-400">Alert threshold score (%)</p>
          <Input
            className="text-neutral-100 w-20 bg-neutral-800 border-neutral-700"
            type="number"
            min={1}
            max={100}
            value={String(globalSettings.alertThreshold ?? 80)}
            onChange={(e) => updateGlobal({ alertThreshold: Number(e.target.value) || 0 })}
          />
        </div>
      </div>
    </SettingsPageWrapper>
  )
}
