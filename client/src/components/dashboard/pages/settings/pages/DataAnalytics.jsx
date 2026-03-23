import React, { useState } from 'react'
import { BarChart2 } from 'lucide-react'
import { Separator } from '@/components/ui/shadcn/separator'
import { Checkbox } from '@/components/ui/shadcn/checkbox'
import { ToggleButton } from '@/components/ui/ToggleButton'
import { SettingsPageWrapper, ToggleRow } from '../components'
import {
  Card,
  CardHeader,
  CardBody,
  FieldLabel,
  OutlineButton,
  StatusBadge,
  SelectDropdown,
  PrimaryButton,
} from '@/components/ui/global/subcomponents'

/* ── Section: Data Refresh Settings ─────────────────────────── */

function DataRefreshSettings() {
  const [autoRefresh, setAutoRefresh] = useState(true)

  return (
    <Card>
      <CardHeader
        title="Data Refresh Settings"
        description="Configure how frequently your data is updated"
      />
      <CardBody>
        <SelectDropdown label="Refresh Frequency" value="Hourly" />

        <Separator className="bg-[#262626]" />

        <ToggleRow
          label="Auto-refresh Dashboard"
          description="Automatically refresh dashboard data"
          checked={autoRefresh}
          onCheckedChange={setAutoRefresh}
        />

        <div>
          <FieldLabel>Last Refresh</FieldLabel>
          <div className="flex items-center gap-2">
            <StatusBadge>2 minutes ago</StatusBadge>
            <OutlineButton className="h-8 text-sm">Refresh Now</OutlineButton>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

/* ── Section: Data Export Preferences ───────────────────────── */

function DataExportPreferences() {
  const [formats, setFormats] = useState({ csv: true, excel: true, pdf: false, json: false })
  const [includeRawData, setIncludeRawData] = useState(false)

  const toggleFormat = (key) => setFormats(prev => ({ ...prev, [key]: !prev[key] }))

  const formatOptions = [
    { key: 'csv', label: 'CSV' },
    { key: 'excel', label: 'Excel (XLSX)' },
    { key: 'pdf', label: 'PDF' },
    { key: 'json', label: 'JSON' },
  ]

  return (
    <Card>
      <CardHeader
        title="Data Export Preferences"
        description="Choose your preferred formats for data exports"
      />
      <CardBody>
        <div>
          <FieldLabel>Default Export Formats</FieldLabel>
          <div className="grid grid-cols-2 gap-2">
            {formatOptions.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2">
                <Checkbox
                  id={`format-${key}`}
                  checked={formats[key]}
                  onCheckedChange={() => toggleFormat(key)}
                />
                <label htmlFor={`format-${key}`} className="text-sm font-medium text-[#fafafa] cursor-pointer">
                  {label}
                </label>
              </div>
            ))}
          </div>
        </div>

        <Separator className="bg-[#262626]" />

        <SelectDropdown label="Date Range for Exports" value="Last 30 days" />

        <ToggleRow
          label="Include Raw Data"
          description="Export unprocessed data along with aggregated metrics"
          checked={includeRawData}
          onCheckedChange={setIncludeRawData}
        />

        <PrimaryButton>Export Current Data</PrimaryButton>
      </CardBody>
    </Card>
  )
}

/* ── Section: API Key & Token Management ─────────────────────── */

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
      <div className="flex items-center gap-2 flex-shrink-0">
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
              className="relative h-2 rounded-full overflow-hidden"
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

/* ── Section: Data Filters ───────────────────────────────────── */

function DataFilters() {
  const [metrics, setMetrics] = useState({
    pageViews: true,
    uniqueUsers: true,
    sessions: true,
    bounceRate: false,
    conversionRate: false,
    revenue: false,
  })

  const toggleMetric = (key) => setMetrics(prev => ({ ...prev, [key]: !prev[key] }))

  const metricOptions = [
    { key: 'pageViews', label: 'Page Views' },
    { key: 'uniqueUsers', label: 'Unique Users' },
    { key: 'sessions', label: 'Sessions' },
    { key: 'bounceRate', label: 'Bounce Rate' },
    { key: 'conversionRate', label: 'Conversion Rate' },
    { key: 'revenue', label: 'Revenue' },
  ]

  return (
    <Card>
      <CardHeader
        title="Data Filters"
        description="Set default filters for metrics, regions, and time ranges"
      />
      <CardBody>
        <div>
          <FieldLabel>Default Metrics</FieldLabel>
          <div className="grid grid-cols-2 gap-2">
            {metricOptions.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2">
                <Checkbox
                  id={`metric-${key}`}
                  checked={metrics[key]}
                  onCheckedChange={() => toggleMetric(key)}
                />
                <label htmlFor={`metric-${key}`} className="text-sm font-medium text-[#fafafa] cursor-pointer">
                  {label}
                </label>
              </div>
            ))}
          </div>
        </div>

        <Separator className="bg-[#262626]" />

        <SelectDropdown label="Default Regions" value="All Regions" />
        <SelectDropdown label="Default Time Range" value="Last 30 days" />
      </CardBody>
    </Card>
  )
}

/* ── Section: Data Sharing Permissions ──────────────────────── */

function DataSharingPermissions() {
  const [dashboardSharing, setDashboardSharing] = useState(true)
  const [reportDownloads, setReportDownloads] = useState(true)
  const [passwordProtection, setPasswordProtection] = useState(false)

  return (
    <Card>
      <CardHeader
        title="Data Sharing Permissions"
        description="Control who can access and share your dashboards and reports"
      />
      <CardBody>
        <ToggleRow
          label="Allow Dashboard Sharing"
          description="Let team members share dashboards with external users"
          checked={dashboardSharing}
          onCheckedChange={setDashboardSharing}
        />

        <Separator className="bg-[#262626]" />

        <ToggleRow
          label="Allow Report Downloads"
          description="Let team members download and share reports"
          checked={reportDownloads}
          onCheckedChange={setReportDownloads}
        />

        <Separator className="bg-[#262626]" />

        <SelectDropdown label="Shared Dashboard Expiry" value="30 days" />

        <div>
          <FieldLabel>Password Protection</FieldLabel>
          <div className="flex items-center gap-2">
            <Checkbox
              id="password-protection"
              checked={passwordProtection}
              onCheckedChange={setPasswordProtection}
            />
            <label htmlFor="password-protection" className="text-sm font-medium text-[#fafafa] cursor-pointer">
              Require password for shared dashboards
            </label>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

/* ── Root export ─────────────────────────────────────────────── */

export function DataAnalytics() {
  return (
    <SettingsPageWrapper icon={BarChart2} title="Data &amp; Analytics Settings">
      <DataRefreshSettings />
      <DataExportPreferences />
      <ApiKeyManagement />
      <DataFilters />
      <DataSharingPermissions />
    </SettingsPageWrapper>
  )
}
