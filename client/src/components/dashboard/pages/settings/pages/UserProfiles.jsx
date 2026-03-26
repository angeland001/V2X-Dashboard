import React, { useState, useEffect } from 'react'
import { UserIcon } from 'lucide-react'
import { ToggleButton } from '@/components/ui/ToggleButton'
import { Separator } from '@/components/ui/shadcn/separator'
import { SettingsPageWrapper, ToggleRow } from '../components'
import {
  Card,
  CardHeader,
  CardBody,
  FieldLabel,
  TextInput,
  OutlineButton,
  PrimaryButton,
  DangerButton,
  SelectDropdown,
  StatusBadge,
} from '@/components/ui/global/subcomponents'
import { useUserProfile } from '@/hooks/settings/user/useUserProfile'
import { useSettings } from '@/hooks/settings/useSettings'


/* ── Section: Profile Details ────────────────────────────────── */
function ProfileDetails() {
  const {profile, isLoading} = useUserProfile();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [organization, setOrganization] = useState('UTC')

  //Sync form when data arrives 
  useEffect(() => {
      if (profile) {
        setFirstName(profile.first_name ?? '')
        setLastName(profile.last_name ?? '')
        setEmail(profile.email ?? '')
      }
    }, [profile])
    
    if (isLoading) return <p>Loading...</p>
    
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
            <OutlineButton>Remove Picture</OutlineButton>
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
        <SelectDropdown label="Role" value="Data Analyst" />

        {/* Save */}
        <PrimaryButton>Save Changes</PrimaryButton>
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
        <OutlineButton className="w-full">Change Password</OutlineButton>

        <Separator className="bg-[#262626]" />

        {/* 2FA */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-[#fafafa] leading-none">Two-Factor Authentication</p>
            <p className="text-sm text-[#a1a1a1]">Add an extra layer of security to your account</p>
          </div>
          <div className="flex items-center flex-shrink-0 gap-2">
            {twoFactorEnabled && <StatusBadge>Enabled</StatusBadge>}
            <ToggleButton checked={twoFactorEnabled} onCheckedChange={setTwoFactorEnabled} />
          </div>
        </div>

        <OutlineButton className="w-fit">Manage 2FA Settings</OutlineButton>
      </CardBody>
    </Card>
  )
}


/* ── Section: Connected Accounts ─────────────────────────────── */
const CONNECTED_ACCOUNTS = [
  { icon: { bg: '#155dfc', letter: 'G' }, name: 'Google',    detail: 'john.doe@gmail.com',    connected: true  },
  { icon: { bg: '#000000', letter: 'M' }, name: 'Microsoft', detail: 'john.doe@outlook.com',  connected: true  },
  { icon: { bg: '#1e2939', letter: 'G' }, name: 'GitHub',    detail: 'Not connected',          connected: false },
  { icon: { bg: '#9810fa', letter: 'S' }, name: 'Slack',     detail: 'Not connected',          connected: false },
]

function ConnectedAccountRow({ icon, name, detail, connected }) {
  return (
    <div
      className="flex items-center justify-between rounded-[10px] px-3 h-[70px]"
      style={{ border: '1px solid #262626', opacity: connected ? 1 : 0.6 }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center flex-shrink-0 text-sm font-normal text-white rounded"
          style={{ width: 32, height: 32, background: icon.bg }}
        >
          {icon.letter}
        </div>
        <div>
          <p className="text-base font-medium text-[#fafafa] leading-[1.5]">{name}</p>
          <p className="text-sm text-[#a1a1a1]">{detail}</p>
        </div>
      </div>

      <div className="flex items-center flex-shrink-0 gap-2">
        {connected && <StatusBadge>Connected</StatusBadge>}
        <OutlineButton className="h-8 text-sm">
          {connected ? 'Disconnect' : 'Connect'}
        </OutlineButton>
      </div>
    </div>
  )
}

function ConnectedAccounts() {
  return (
    <Card>
      <CardHeader
        title="Connected Accounts"
        description="Manage your connected third-party accounts and integrations"
      />
      <CardBody>
        <div className="space-y-3">
          {CONNECTED_ACCOUNTS.map(acc => (
            <ConnectedAccountRow key={acc.name} {...acc} />
          ))}
        </div>
      </CardBody>
    </Card>
  )
}


/* ── Section: Notification Preferences ──────────────────────── */
function NotificationPreferences() {
  // emailNotifications is a global setting — read + write via context
  const { globalSettings, updateGlobal, isLoading } = useSettings()
  const emailEnabled = globalSettings.emailNotifications ?? true

  const [smsEnabled, setSmsEnabled]     = useState(false)
  const [inAppEnabled, setInAppEnabled] = useState(true)
  const [phone, setPhone]               = useState('+1 (555) 123-4567')

  if (isLoading) return null

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
          onCheckedChange={val => updateGlobal({ emailNotifications: val })}
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
          <DangerButton>Delete Account</DangerButton>
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
