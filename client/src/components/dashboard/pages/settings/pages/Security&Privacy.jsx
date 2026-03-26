import React, { useState } from 'react'
import { ShieldIcon } from 'lucide-react'
import { Separator } from '@/components/ui/shadcn/separator'
import { Checkbox } from '@/components/ui/shadcn/checkbox'
import { SettingsPageWrapper, ToggleRow } from '../components'
import {
  Card,
  CardHeader,
  CardBody,
  FieldLabel,
  OutlineButton,
  StatusBadge,
  SelectDropdown,
  DangerButton,
} from '@/components/ui/global/subcomponents'

/* ── Local helpers ───────────────────────────────────────────── */

function GreenBadge({ children }) {
  return (
    <span
      className="rounded-lg px-2 py-0.5 text-xs font-medium leading-[1.33] flex-shrink-0"
      style={{ background: '#0d542b', color: '#7bf1a8', border: '1px solid transparent' }}
    >
      {children}
    </span>
  )
}

function IpInput({ value, onChange, placeholder }) {
  return (
    <div
      className="flex items-center rounded-lg px-3 h-9"
      style={{ background: 'rgba(38,38,38,0.3)', border: '1px solid #262626' }}
    >
      <input
        className="bg-transparent outline-none w-full text-sm text-[#fafafa] placeholder:text-[#a1a1a1]"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    </div>
  )
}

/* ── Section 1: Login Sessions & Devices ────────────────────── */

function SessionRow({ name, detail, location, isCurrent }) {
  return (
    <div
      className="flex items-center justify-between rounded-[10px] px-3 py-3"
      style={{
        border: `1px solid ${isCurrent ? '#016630' : '#262626'}`,
        background: isCurrent ? 'rgba(3,46,21,0.2)' : 'transparent',
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center rounded-[10px] flex-shrink-0"
          style={{ width: 40, height: 40, background: isCurrent ? '#0d542b' : '#262626' }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="2" y="3" width="16" height="11" rx="2" stroke={isCurrent ? '#00a63e' : '#fafafa'} strokeWidth="1.67" />
            <path d="M6 17h8M10 14v3" stroke={isCurrent ? '#00a63e' : '#fafafa'} strokeWidth="1.67" strokeLinecap="round" />
          </svg>
        </div>
        <div className="space-y-0.5">
          <p className="text-base font-medium text-[#fafafa] leading-[1.5]">{name}</p>
          <p className="text-sm text-[#a1a1a1]">{detail}</p>
          <p className="text-xs text-[#a1a1a1]">{location}</p>
        </div>
      </div>
      {isCurrent
        ? <GreenBadge>Current</GreenBadge>
        : <OutlineButton className="h-8 text-sm flex-shrink-0">Revoke</OutlineButton>
      }
    </div>
  )
}

function LoginSessions() {
  return (
    <Card>
      <CardHeader
        title="Login Sessions & Devices"
        description="Manage your active sessions and connected devices"
      />
      <CardBody>
        <div className="space-y-3">
          <SessionRow
            name="Current Session"
            detail="Chrome on macOS • New York, NY"
            location="Active now"
            isCurrent
          />
          <SessionRow
            name="Mobile App"
            detail="iPhone • Last seen 2 hours ago"
            location="San Francisco, CA"
          />
          <SessionRow
            name="Firefox on Windows"
            detail="Last seen 1 day ago"
            location="Los Angeles, CA"
          />
        </div>

        <Separator className="bg-[#262626]" />

        <DangerButton>Sign Out All Other Sessions</DangerButton>
      </CardBody>
    </Card>
  )
}

/* ── Section 2: IP Whitelist & Blacklist ─────────────────────── */

function IpWhitelist() {
  const [ipRestrictions, setIpRestrictions] = useState(false)
  const [alertSuspicious, setAlertSuspicious] = useState(true)
  const [allowedIPs, setAllowedIPs] = useState('192.168.1.0/24, 10.0.0.1')
  const [blockedIPs, setBlockedIPs] = useState('')

  return (
    <Card>
      <CardHeader
        title="IP Whitelist & Blacklist"
        description="Control which IP addresses can access your account"
      />
      <CardBody>
        <ToggleRow
          label="Enable IP Restrictions"
          description="Only allow access from specific IP addresses"
          checked={ipRestrictions}
          onCheckedChange={setIpRestrictions}
        />

        <Separator className="bg-[#262626]" />

        <div>
          <FieldLabel>Allowed IP Addresses</FieldLabel>
          <IpInput
            value={allowedIPs}
            onChange={e => setAllowedIPs(e.target.value)}
            placeholder="192.168.1.0/24, 10.0.0.1"
          />
          <p className="text-xs text-[#a1a1a1] mt-1.5">
            Enter IP addresses or CIDR ranges separated by commas
          </p>
        </div>

        <div>
          <FieldLabel>Blocked IP Addresses</FieldLabel>
          <IpInput
            value={blockedIPs}
            onChange={e => setBlockedIPs(e.target.value)}
            placeholder="Enter blocked IP addresses"
          />
        </div>

        <ToggleRow
          label="Alert on Suspicious Activity"
          description="Get notified of login attempts from new locations"
          checked={alertSuspicious}
          onCheckedChange={setAlertSuspicious}
        />
      </CardBody>
    </Card>
  )
}

/* ── Section 3: Data Privacy Preferences ────────────────────── */

function DataPrivacy() {
  const [dataAnonymization, setDataAnonymization] = useState(true)
  const [usageAnalytics, setUsageAnalytics] = useState(true)
  const [cookies, setCookies] = useState({ analytics: true, marketing: false })

  const toggleCookie = (key) => setCookies(prev => ({ ...prev, [key]: !prev[key] }))

  return (
    <Card>
      <CardHeader
        title="Data Privacy Preferences"
        description="Configure how your data is collected and used"
      />
      <CardBody>
        <ToggleRow
          label="Data Anonymization"
          description="Automatically anonymize personal data in reports"
          checked={dataAnonymization}
          onCheckedChange={setDataAnonymization}
        />

        <Separator className="bg-[#262626]" />

        <ToggleRow
          label="Usage Analytics"
          description="Allow collection of anonymized usage data to improve the product"
          checked={usageAnalytics}
          onCheckedChange={setUsageAnalytics}
        />

        <Separator className="bg-[#262626]" />

        <SelectDropdown label="Data Retention Period" value="2 years" />

        <div>
          <FieldLabel>Cookie Preferences</FieldLabel>
          <div className="space-y-2">
            <div className="flex items-center gap-2 opacity-50">
              <Checkbox id="cookie-essential" checked readOnly />
              <label htmlFor="cookie-essential" className="text-sm font-medium text-[#fafafa]">
                Essential cookies (required)
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="cookie-analytics"
                checked={cookies.analytics}
                onCheckedChange={() => toggleCookie('analytics')}
              />
              <label htmlFor="cookie-analytics" className="text-sm font-medium text-[#fafafa] cursor-pointer">
                Analytics cookies
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="cookie-marketing"
                checked={cookies.marketing}
                onCheckedChange={() => toggleCookie('marketing')}
              />
              <label htmlFor="cookie-marketing" className="text-sm font-medium text-[#fafafa] cursor-pointer">
                Marketing cookies
              </label>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

/* ── Section 4: Audit Logs ───────────────────────────────────── */

function AuditLogRow({ title, description, time, badge }) {
  return (
    <div
      className="flex items-center justify-between rounded-[10px] px-3 py-3"
      style={{ border: '1px solid #262626' }}
    >
      <div className="space-y-0.5 min-w-0 pr-3">
        <p className="text-base font-medium text-[#fafafa] leading-[1.5]">{title}</p>
        <p className="text-sm text-[#a1a1a1] truncate">{description}</p>
        <p className="text-xs text-[#a1a1a1]">{time}</p>
      </div>
      <StatusBadge>{badge}</StatusBadge>
    </div>
  )
}

function AuditLogs() {
  const [auditLogging, setAuditLogging] = useState(true)

  return (
    <Card>
      <CardHeader
        title="Audit Logs"
        description="View who accessed what data and when"
      />
      <CardBody>
        <ToggleRow
          label="Enable Audit Logging"
          description="Track all data access and user activities"
          checked={auditLogging}
          onCheckedChange={setAuditLogging}
        />

        <Separator className="bg-[#262626]" />

        <div className="space-y-3">
          <AuditLogRow
            title="Dashboard Access"
            description="john.doe@company.com accessed Revenue Dashboard"
            time="2 minutes ago"
            badge="View"
          />
          <AuditLogRow
            title="Data Export"
            description="jane.smith@company.com exported user analytics"
            time="1 hour ago"
            badge="Export"
          />
          <AuditLogRow
            title="Settings Changed"
            description="admin@company.com modified user permissions"
            time="3 hours ago"
            badge="Admin"
          />
        </div>

        <OutlineButton className="w-full">View Full Audit Log</OutlineButton>

        <Separator className="bg-[#262626]" />

        <SelectDropdown label="Log Retention" value="90 days" />
      </CardBody>
    </Card>
  )
}

/* ── Section 5: Security Alerts ─────────────────────────────── */

function SecurityAlerts() {
  const [failedLogins, setFailedLogins] = useState(true)
  const [newDevice, setNewDevice] = useState(true)
  const [unusualLocation, setUnusualLocation] = useState(true)
  const [dataExportAlerts, setDataExportAlerts] = useState(false)

  return (
    <Card>
      <CardHeader
        title="Security Alerts"
        description="Configure security notifications and alerts"
      />
      <CardBody>
        <ToggleRow
          label="Failed Login Attempts"
          description="Alert after multiple failed login attempts"
          checked={failedLogins}
          onCheckedChange={setFailedLogins}
        />
        <ToggleRow
          label="New Device Login"
          description="Alert when logging in from a new device"
          checked={newDevice}
          onCheckedChange={setNewDevice}
        />
        <ToggleRow
          label="Unusual Location Access"
          description="Alert when accessing from unusual locations"
          checked={unusualLocation}
          onCheckedChange={setUnusualLocation}
        />
        <ToggleRow
          label="Data Export Alerts"
          description="Alert when large amounts of data are exported"
          checked={dataExportAlerts}
          onCheckedChange={setDataExportAlerts}
        />

        <Separator className="bg-[#262626]" />

        <SelectDropdown label="Alert Threshold" value="After 3 failed attempts" />
      </CardBody>
    </Card>
  )
}

/* ── Root export ─────────────────────────────────────────────── */

export function SecurityPrivacy() {
  return (
    <SettingsPageWrapper icon={ShieldIcon} title="Security &amp; Privacy">
      <LoginSessions />
      <IpWhitelist />
      <DataPrivacy />
      <AuditLogs />
      <SecurityAlerts />
    </SettingsPageWrapper>
  )
}
