import React from 'react'
import { BarChart2 } from 'lucide-react'
import { Separator } from '@/components/ui/shadcn/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/shadcn/select'
import { SettingsPageWrapper, ToggleRow } from '../components'
import { useSettings } from '@/hooks/settings/useSettings'
import {
  Card,
  CardHeader,
  CardBody,
  FieldLabel,
  OutlineButton,
  StatusBadge,
  PrimaryButton,
} from '@/components/ui/global/subcomponents'

const REFRESH_OPTIONS = [
  { label: '30 seconds', value: 30 },
  { label: '1 minute', value: 60 },
  { label: '5 minutes', value: 300 },
  { label: '15 minutes', value: 900 },
]

const EXPORT_FORMAT_OPTIONS = [
  { label: 'CSV', value: 'csv' },
  { label: 'JSON', value: 'json' },
  { label: 'XLSX', value: 'xlsx' },
]

function DataRefreshSettings() {
  const { userSettings, updateUser, isValidating, refresh } = useSettings()

  const refreshInterval = Number(userSettings.refreshInterval ?? 30)
  const autoRefresh = userSettings.autoRefresh !== false

  return (
    <Card>
      <CardHeader
        title="Data Refresh Settings"
        description="Configure how frequently your data is updated"
      />
      <CardBody>
        <div>
          <FieldLabel>Refresh Frequency</FieldLabel>
          <Select
            value={String(refreshInterval)}
            onValueChange={(value) => updateUser({ refreshInterval: Number(value) })}
          >
            <SelectTrigger className="w-48 bg-neutral-800 border-neutral-700 text-neutral-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-neutral-800 border-neutral-700 text-neutral-200">
              {REFRESH_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={String(option.value)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator className="bg-[#262626]" />

        <ToggleRow
          label="Auto-refresh Dashboard"
          description="Automatically refresh dashboard data"
          checked={autoRefresh}
          onCheckedChange={(checked) => updateUser({ autoRefresh: checked })}
        />

        <div>
          <FieldLabel>Last Sync</FieldLabel>
          <div className="flex items-center gap-2">
            <StatusBadge>{isValidating ? 'Syncing...' : 'Synced'}</StatusBadge>
            <OutlineButton className="h-8 text-sm" onClick={refresh}>
              Sync Now
            </OutlineButton>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

function DataExportPreferences() {
  const { userSettings, updateUser } = useSettings()
  const includeRawData = Boolean(userSettings.includeRawData)
  const exportFormat = userSettings.exportFormat ?? 'csv'

  return (
    <Card>
      <CardHeader
        title="Data Export Preferences"
        description="Choose your preferred formats for data exports"
      />
      <CardBody>
        <div>
          <FieldLabel>Default Export Format</FieldLabel>
          <Select
            value={exportFormat}
            onValueChange={(value) => updateUser({ exportFormat: value })}
          >
            <SelectTrigger className="w-48 bg-neutral-800 border-neutral-700 text-neutral-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-neutral-800 border-neutral-700 text-neutral-200">
              {EXPORT_FORMAT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator className="bg-[#262626]" />

        <ToggleRow
          label="Include Raw Data"
          description="Export unprocessed data along with aggregated metrics"
          checked={includeRawData}
          onCheckedChange={(checked) => updateUser({ includeRawData: checked })}
        />

        <PrimaryButton>Export Current Data</PrimaryButton>
      </CardBody>
    </Card>
  )
}

function ApiKeyRow({ name, maskedKey, createdDate }) {
  return (
    <div
      className="flex items-center justify-between rounded-[10px] px-3 py-3"
      style={{ border: '1px solid #262626' }}
    >
      <div className="space-y-0.5">
        <p className="text-base font-medium text-[#fafafa] leading-[1.5]">{name}</p>
        <p className="text-sm text-[#a1a1a1]">{maskedKey}</p>
        <p className="text-xs text-[#a1a1a1]">{createdDate}</p>
      </div>
      <div className="flex items-center flex-shrink-0 gap-2">
        <StatusBadge>Active</StatusBadge>
        <OutlineButton className="h-8 text-sm">Revoke</OutlineButton>
      </div>
    </div>
  )
}

function ApiKeyManagement() {
  const apiUsagePercent = 30.8

  return (
    <Card>
      <CardHeader
        title="API Key & Token Management"
        description="Manage API keys and tokens for integrations"
      />
      <CardBody>
        <div className="space-y-3">
          <ApiKeyRow
            name="Production API Key"
            maskedKey="pk_live_****...8d2f"
            createdDate="Created: Jan 15, 2024"
          />
          <ApiKeyRow
            name="Development API Key"
            maskedKey="pk_test_****...9a1b"
            createdDate="Created: Jan 10, 2024"
          />
        </div>

        <PrimaryButton>Generate New API Key</PrimaryButton>

        <Separator className="bg-[#262626]" />

        <div>
          <FieldLabel>API Usage This Month</FieldLabel>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-[#fafafa]">
              <span>15,420 / 50,000 requests</span>
              <span>{apiUsagePercent}%</span>
            </div>
            <div
              className="relative h-2 overflow-hidden rounded-full"
              style={{ background: 'rgba(250,250,250,0.2)' }}
            >
              <div
                className="h-full rounded-full bg-[#fafafa]"
                style={{ width: `${apiUsagePercent}%` }}
              />
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

export function DataAnalytics() {
  return (
    <SettingsPageWrapper icon={BarChart2} title="Data &amp; Analytics Settings">
      <DataRefreshSettings />
      <DataExportPreferences />
      <ApiKeyManagement />
    </SettingsPageWrapper>
  )
}
