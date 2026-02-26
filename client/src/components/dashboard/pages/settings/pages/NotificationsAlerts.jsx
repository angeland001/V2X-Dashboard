import React, { useState } from 'react'
import { BellIcon } from 'lucide-react'
import { SectionHeader } from './DashboardVisualization'
import { ToggleButton } from '@/components/ui/ToggleButton'
import { Input } from '@/components/ui/shadcn/input'
import { Separator } from '@/components/ui/shadcn/separator'
import { Checkbox } from '@/components/ui/shadcn/checkbox'
import { Label } from '@/components/ui/label'

function ToggleRow({ label, description, checked, onCheckedChange }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-neutral-200">{label}</p>
        {description && (
          <p className="text-xs text-neutral-500 mt-0.5">{description}</p>
        )}
      </div>
      <ToggleButton checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

export function NotificationsAlerts() {
  const [thresholdAlertsEnabled, setThresholdAlertsEnabled] = useState(true)
  const [trafficDropEnabled, setTrafficDropEnabled] = useState(true)
  const [trafficDropValue, setTrafficDropValue] = useState('10')
  const [trafficSpikeEnabled, setTrafficSpikeEnabled] = useState(false)
  const [trafficSpikeValue, setTrafficSpikeValue] = useState('20')
  const [shareWithTeam, setShareWithTeam] = useState(true)
  const [scheduledReports, setScheduledReports] = useState(true)
  const [priorityCritical, setPriorityCritical] = useState(true)
  const [priorityHigh, setPriorityHigh] = useState(true)
  const [priorityMedium, setPriorityMedium] = useState(false)
  const [priorityLow, setPriorityLow] = useState(false)

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900">
      {/* Page Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-neutral-800">
        <BellIcon className="h-5 w-5 text-neutral-400" />
        <h2 className="text-base font-semibold text-neutral-100">
          Notifications &amp; Alerts
        </h2>
      </div>

      <div className="px-6 py-5 space-y-6">

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
              onCheckedChange={setThresholdAlertsEnabled}
            />

            {/* Traffic Drop Alert */}
            <div className="py-3 space-y-2 opacity-100 transition-opacity"
              style={{ opacity: thresholdAlertsEnabled ? 1 : 0.4, pointerEvents: thresholdAlertsEnabled ? 'auto' : 'none' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-200">Traffic Drop Alert</p>
                  <p className="text-xs text-neutral-500 mt-0.5">Notify when traffic decreases beyond the threshold</p>
                </div>
                <ToggleButton checked={trafficDropEnabled} onCheckedChange={setTrafficDropEnabled} />
              </div>
              {trafficDropEnabled && (
                <div className="flex items-center gap-2 pl-0 pt-1">
                  <Input
                    className="text-neutral-100 w-20 bg-neutral-800 border-neutral-700"
                    type="number"
                    min={1}
                    max={100}
                    value={trafficDropValue}
                    onChange={(e) => setTrafficDropValue(e.target.value)}
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
                <ToggleButton checked={trafficSpikeEnabled} onCheckedChange={setTrafficSpikeEnabled} />
              </div>
              {trafficSpikeEnabled && (
                <div className="flex items-center gap-2 pt-1">
                  <Input
                    className="text-neutral-100 w-20 bg-neutral-800 border-neutral-700"
                    type="number"
                    min={1}
                    max={100}
                    value={trafficSpikeValue}
                    onChange={(e) => setTrafficSpikeValue(e.target.value)}
                  />
                  <p className="text-neutral-400 text-sm">% increase from previous period</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <Separator className="bg-neutral-800" />

        {/* Sharing & Reports */}
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
                onCheckedChange={setPriorityLow}
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
                onCheckedChange={setPriorityMedium}
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
                onCheckedChange={setPriorityHigh}
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

      </div>
    </div>
  )
}
