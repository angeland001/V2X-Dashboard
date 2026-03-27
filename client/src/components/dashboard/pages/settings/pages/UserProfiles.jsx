import React, { useState, useEffect, useRef, useCallback } from 'react'
import { UserIcon, Upload, ImageIcon, X } from 'lucide-react'
import { ToggleButton } from '@/components/ui/ToggleButton'
import { Separator } from '@/components/ui/shadcn/separator'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/shadcn/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/shadcn/dialog'
import { SettingsPageWrapper, ToggleRow } from '../components'
import {
  Card,
  CardHeader,
  CardBody,
  FieldLabel,
  TextInput,
  OutlineButton,
  DangerButton,
  StatusBadge,
} from '@/components/ui/global/subcomponents'
import { useUserProfile } from '@/hooks/settings/user/useUserProfile'
import { useSettings } from '@/hooks/settings/useSettings'


/* ── Profile Picture Upload Modal ────────────────────────────── */
function ProfilePictureModal({ open, onOpenChange, onUpload }) {
  const [preview, setPreview] = useState(null)
  const [file, setFile] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef(null)

  const resetState = useCallback(() => {
    setPreview(null)
    setFile(null)
    setIsDragging(false)
    setIsUploading(false)
  }, [])

  const handleClose = useCallback((open) => {
    if (!open) resetState()
    onOpenChange(open)
  }, [onOpenChange, resetState])

  const handleFile = useCallback((selected) => {
    if (!selected) return
    if (!selected.type.startsWith('image/')) return
    if (selected.size > 5 * 1024 * 1024) return // 5MB limit

    setFile(selected)
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target.result)
    reader.readAsDataURL(selected)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) handleFile(dropped)
  }, [handleFile])

  const handleUpload = async () => {
    if (!file) return
    setIsUploading(true)
    try {
      await onUpload(file)
      handleClose(false)
    } catch {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Profile Picture</DialogTitle>
          <DialogDescription>
            Choose an image file. Max size 5MB. Supports JPG, PNG, GIF, WebP.
          </DialogDescription>
        </DialogHeader>

        {/* Drop zone / Preview */}
        {preview ? (
          <div className="relative flex justify-center">
            <div className="relative">
              <img
                src={preview}
                alt="Preview"
                className="w-40 h-40 rounded-full object-cover border-2 border-neutral-700"
              />
              <button
                type="button"
                onClick={() => { setPreview(null); setFile(null) }}
                className="absolute -top-1 -right-1 p-1 rounded-full bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 transition-colors"
              >
                <X className="w-3 h-3 text-neutral-300" />
              </button>
            </div>
          </div>
        ) : (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              flex flex-col items-center justify-center gap-3 py-10 rounded-lg border-2 border-dashed cursor-pointer transition-colors
              ${isDragging
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-neutral-700 hover:border-neutral-500 bg-neutral-800/30'
              }
            `}
          >
            <div className="p-3 rounded-full bg-neutral-800">
              {isDragging
                ? <Upload className="w-6 h-6 text-blue-400" />
                : <ImageIcon className="w-6 h-6 text-neutral-400" />
              }
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-neutral-200">
                {isDragging ? 'Drop image here' : 'Click to browse or drag and drop'}
              </p>
              <p className="text-xs text-neutral-500 mt-1">JPG, PNG, GIF, WebP up to 5MB</p>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        <DialogFooter>
          <OutlineButton onClick={() => handleClose(false)}>
            Cancel
          </OutlineButton>
          <button
            type="button"
            disabled={!file || isUploading}
            onClick={handleUpload}
            className="rounded-lg px-4 h-9 text-sm font-medium text-[#171717] bg-[#fafafa] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isUploading ? 'Uploading...' : 'Upload'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


/* ── Section: Profile Details ────────────────────────────────── */
const ROLE_OPTIONS = [
  { value: 'guest', label: 'Guest' },
  { value: 'admin', label: 'Admin' },
]

function ProfileDetails() {
  const { profile, isLoading, saveProfile, savePicture, removePicture } = useUserProfile()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName]   = useState('')
  const [email, setEmail]         = useState('')
  const [role, setRole]           = useState('guest')
  const [isSaving, setIsSaving]         = useState(false)
  const [saveStatus, setSaveStatus]     = useState(null) // 'success' | 'error'
  const [showUpload, setShowUpload]     = useState(false)

  // Sync form when data arrives
  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name ?? '')
      setLastName(profile.last_name ?? '')
      setEmail(profile.email ?? '')
      setRole(profile.role ?? 'user')
    }
  }, [profile])

  if (isLoading) return <p className="text-sm text-neutral-400 p-4">Loading...</p>

  const initials = (firstName?.[0] ?? '') + (lastName?.[0] ?? '')

  const handleSave = async () => {
    setIsSaving(true)
    setSaveStatus(null)
    try {
      await saveProfile({ first_name: firstName, last_name: lastName, email, role })
      setSaveStatus('success')
    } catch (err) {
      console.error('Failed to save profile:', err)
      setSaveStatus('error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemovePicture = async () => {
    try {
      await removePicture()
    } catch (err) {
      console.error('Failed to remove picture:', err)
    }
  }

  return (
    <Card>
      <CardHeader
        title="Profile Details"
        description="Update your personal information and profile picture"
      />
      <CardBody>
        {/* Avatar row */}
        <div className="flex items-center gap-6">
          {profile?.profile_picture ? (
            <img
              src={profile.profile_picture}
              alt="Profile"
              className="w-20 h-20 rounded-full object-cover flex-shrink-0 border border-[#262626]"
            />
          ) : (
            <div
              className="flex-shrink-0 flex items-center justify-center rounded-full text-[#fafafa] text-base font-medium uppercase"
              style={{ width: 80, height: 80, background: '#262626', border: '1px solid #262626' }}
            >
              {initials || 'U'}
            </div>
          )}
          <div className="flex gap-3">
            <OutlineButton onClick={() => setShowUpload(true)}>Change Picture</OutlineButton>
            {profile?.profile_picture && (
              <OutlineButton onClick={handleRemovePicture}>Remove Picture</OutlineButton>
            )}
          </div>
        </div>

        <ProfilePictureModal
          open={showUpload}
          onOpenChange={setShowUpload}
          onUpload={savePicture}
        />

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

        {/* Role */}
        <div>
          <FieldLabel>Role</FieldLabel>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger
              className="h-9 text-sm text-[#fafafa] border-[#262626]"
              style={{ background: 'rgba(38,38,38,0.3)' }}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-neutral-900 border-neutral-700">
              {ROLE_OPTIONS.map(opt => (
                <SelectItem
                  key={opt.value}
                  value={opt.value}
                  className="text-neutral-200 focus:bg-neutral-800 focus:text-neutral-100"
                >
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Save row */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="rounded-lg px-4 h-9 text-sm font-medium text-[#171717] bg-[#fafafa] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
          {saveStatus === 'success' && (
            <p className="text-sm text-green-400">Saved successfully</p>
          )}
          {saveStatus === 'error' && (
            <p className="text-sm text-red-400">Failed to save — check console</p>
          )}
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
