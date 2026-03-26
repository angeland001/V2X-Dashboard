import React, { useState } from 'react'
import { UserIcon } from 'lucide-react'
import { ToggleButton } from '@/components/ui/ToggleButton'
import { Separator } from '@/components/ui/shadcn/separator'
import { Input } from '@/components/ui/shadcn/input'
import { SettingsPageWrapper, ToggleRow } from '../components'
import { Card, CardHeader, CardBody, FieldLabel, TextInput, OutlineButton, StatusBadge } from '@/components/ui/global/subcomponents'



/* ── Section: Profile Details ────────────────────────────────── */
function ProfileDetails() {
  const [firstName, setFirstName] = useState('John')
  const [lastName, setLastName] = useState('Doe')
  const [email, setEmail] = useState('john.doe@company.com')
  const [organization, setOrganization] = useState('Acme Corporation')
  const [role, setRole] = useState('Data Analyst')

  return (
    <Card>
      <CardHeader
        title="Profile Details"
        description="Update your personal information and profile picture"
      />
      <CardBody>
        {/* Avatar row */}
        <div className="flex items-center gap-6">
          <div
            className="flex-shrink-0 flex items-center justify-center rounded-full text-[#fafafa] text-base font-normal"
            style={{ width: 80, height: 80, background: '#262626', border: '1px solid #262626' }}
          >
            JD
          </div>
          <div className="flex gap-3">
            <OutlineButton>Change Picture</OutlineButton>
            <button
              type="button"
              className="rounded-lg px-3 h-8 text-sm font-medium text-[#fafafa]"
            >
              Remove Picture
            </button>
          </div>
        </div>

        <Separator className="bg-[#262626]" />

        {/* First / Last Name */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>First Name</FieldLabel>
            <TextInput value={firstName} onChange={e => setFirstName(e.target.value)} />
          </div>
          <div>
            <FieldLabel>Last Name</FieldLabel>
            <TextInput value={lastName} onChange={e => setLastName(e.target.value)} />
          </div>
        </div>

        {/* Email */}
        <div>
          <FieldLabel>Email Address</FieldLabel>
          <TextInput value={email} onChange={e => setEmail(e.target.value)} />
        </div>

        {/* Organization */}
        <div>
          <FieldLabel>Organization</FieldLabel>
          <TextInput value={organization} onChange={e => setOrganization(e.target.value)} />
        </div>

        {/* Role */}
        <div>
          <FieldLabel>Role</FieldLabel>
          <div
            className="flex items-center justify-between rounded-lg px-3 h-9 cursor-pointer"
            style={{ background: 'rgba(38,38,38,0.3)', border: '1px solid #262626' }}
          >
            <span className="text-sm text-[#fafafa]">{role}</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 6L8 10L12 6" stroke="#a1a1a1" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Save */}
        <div>
          <button
            type="button"
            className="rounded-lg px-4 h-9 text-sm font-medium text-[#171717] bg-[#fafafa]"
          >
            Save Changes
          </button>
        </div>
      </CardBody>
    </Card>
  )
}

/* ── Section: Password & Security ────────────────────────────── */
function PasswordSecurity() {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true)

  return (
    <Card>
      <CardHeader
        title="Password & Security"
        description="Manage your password and enable two-factor authentication"
      />
      <CardBody>
        {/* Change Password */}
        <OutlineButton className="w-full">Change Password</OutlineButton>

        <Separator className="bg-[#262626]" />

        {/* 2FA row */}
        <div className="flex items-center justify-between h-9">
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-[#fafafa] leading-none">Two-Factor Authentication</p>
            <p className="text-sm text-[#a1a1a1]">Add an extra layer of security to your account</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {twoFactorEnabled && <StatusBadge>Enabled</StatusBadge>}
            <ToggleButton checked={twoFactorEnabled} onCheckedChange={setTwoFactorEnabled} />
          </div>
        </div>

        {/* Manage 2FA */}
        <OutlineButton className="w-fit">Manage 2FA Settings</OutlineButton>
      </CardBody>
    </Card>
  )
}

/* ── Section: Connected Accounts ─────────────────────────────── */
function ConnectedAccountRow({ icon, name, detail, connected }) {
  return (
    <div
      className="flex items-center justify-between rounded-[10px] px-3 h-[70px]"
      style={{
        border: '1px solid #262626',
        opacity: connected ? 1 : 0.6,
      }}
    >
      {/* Left */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center rounded flex-shrink-0 text-white text-sm font-normal"
          style={{ width: 32, height: 32, background: icon.bg }}
        >
          {icon.letter}
        </div>
        <div>
          <p className="text-base font-medium text-[#fafafa] leading-[1.5]">{name}</p>
          <p className="text-sm text-[#a1a1a1]">{detail}</p>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {connected && <StatusBadge>Connected</StatusBadge>}
        <OutlineButton className="h-8 text-sm">
          {connected ? 'Disconnect' : 'Connect'}
        </OutlineButton>
      </div>
    </div>
  )
}

function ConnectedAccounts() {
  const accounts = [
    { icon: { bg: '#155dfc', letter: 'G' }, name: 'Google', detail: 'john.doe@gmail.com', connected: true },
    { icon: { bg: '#000000', letter: 'M' }, name: 'Microsoft', detail: 'john.doe@outlook.com', connected: true },
    { icon: { bg: '#1e2939', letter: 'G' }, name: 'GitHub', detail: 'Not connected', connected: false },
    { icon: { bg: '#9810fa', letter: 'S' }, name: 'Slack', detail: 'Not connected', connected: false },
  ]

  return (
    <Card>
      <CardHeader
        title="Connected Accounts"
        description="Manage your connected third-party accounts and integrations"
      />
      <CardBody>
        <div className="space-y-3">
          {accounts.map(acc => (
            <ConnectedAccountRow key={acc.name} {...acc} />
          ))}
        </div>
      </CardBody>
    </Card>
  )
}

/* ── Section: Notification Preferences ──────────────────────── */
function NotificationPreferences() {
  const [emailEnabled, setEmailEnabled] = useState(true)
  const [smsEnabled, setSmsEnabled] = useState(false)
  const [inAppEnabled, setInAppEnabled] = useState(true)
  const [phone, setPhone] = useState('+1 (555) 123-4567')

  return (
    <Card>
      <CardHeader
        title="Notification Preferences"
        description="Choose how you want to receive notifications"
      />
      <CardBody>
        <ToggleRow
          label="Email Notifications"
          description="Receive notifications via email"
          checked={emailEnabled}
          onCheckedChange={setEmailEnabled}
        />
        <Separator className="bg-[#262626]" />
        <ToggleRow
          label="SMS Notifications"
          description="Receive notifications via SMS"
          checked={smsEnabled}
          onCheckedChange={setSmsEnabled}
        />
        <Separator className="bg-[#262626]" />
        <ToggleRow
          label="In-App Alerts"
          description="Show notifications within the application"
          checked={inAppEnabled}
          onCheckedChange={setInAppEnabled}
        />
        <Separator className="bg-[#262626]" />
        <div>
          <FieldLabel>Phone Number (for SMS)</FieldLabel>
          <TextInput
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+1 (555) 000-0000"
          />
        </div>
      </CardBody>
    </Card>
  )
}

/* ── Section: Account Actions ────────────────────────────────── */
function AccountActions() {
  return (
    <Card>
      <CardHeader
        title="Account Actions"
        description="Manage your account settings and preferences"
      />
      <CardBody>
        <OutlineButton className="w-full">Export Account Data</OutlineButton>
        <OutlineButton className="w-full">Download Account Report</OutlineButton>

        <Separator className="bg-[#262626]" />

        <div className="space-y-2">
          <button
            type="button"
            className="w-full rounded-lg h-9 text-sm font-medium text-white flex items-center justify-center"
            style={{ background: 'rgba(130,24,26,0.6)' }}
          >
            Delete Account
          </button>
          <p className="text-xs text-[#a1a1a1] text-center">
            This action cannot be undone. All your data will be permanently deleted.
          </p>
        </div>
      </CardBody>
    </Card>
  )
}

/* ── Root export ─────────────────────────────────────────────── */
export function UserProfiles() {
  return (
    <SettingsPageWrapper icon={UserIcon} title="User Profiles &amp; Accounts">
      <ProfileDetails />
      <PasswordSecurity />
      <ConnectedAccounts />
      <NotificationPreferences />
      <AccountActions />
    </SettingsPageWrapper>
  )
}
