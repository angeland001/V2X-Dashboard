import React from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  BarChart2,
  Bell,
  User,
  Database,
  Shield,
  HelpCircle,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const settingsNav = [
  {
    label: 'Dashboard & Visualization',
    description: 'Preferences and dashboard settings',
    icon: BarChart2,
    href: '/dashboard/settings/dashboard-visualization',
  },
  {
    label: 'Notifications & Alerts',
    description: 'Manage your notifications and reminders',
    icon: Bell,
    href: '/dashboard/settings/notifications',
  },
  {
    label: 'User Profiles & Accounts',
    description: 'Access, address & accounts',
    icon: User,
    href: '/dashboard/settings/users',
  },
  {
    label: 'Data & Analytics Settings',
    description: 'Analytics, updates and more',
    icon: Database,
    href: '/dashboard/settings/data',
  },
  {
    label: 'Security & Privacy',
    description: 'Protect your data and privacy',
    icon: Shield,
    href: '/dashboard/settings/security',
  },
  {
    label: 'Support & Help',
    description: 'Help, tips and guidance',
    icon: HelpCircle,
    href: '/dashboard/settings/support',
  },
]

export function SettingsLayout() {
  return (
    <div className="space-y-4 min-h-full pb-6">
      <div>
        <h1 className="text-3xl font-bold text-neutral-100">Settings</h1>
        <p className="text-neutral-400 mt-1">
          Manage your preferences and account settings
        </p>
      </div>

      <div className="flex gap-6 min-h-[calc(100vh-12rem)]">
        {/* Left Sidebar */}
        <aside className="w-64 shrink-0">
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 overflow-hidden">
            <p className="px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider border-b border-neutral-800">
              Settings Menu
            </p>
            <nav className="py-1">
              {settingsNav.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-4 py-3 text-sm transition-colors group',
                        isActive
                          ? 'bg-neutral-800 text-neutral-100'
                          : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200'
                      )
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium leading-tight truncate">{item.label}</p>
                      <p className="text-xs text-neutral-500 truncate mt-0.5">{item.description}</p>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-neutral-600 group-hover:text-neutral-400 transition-colors" />
                  </NavLink>
                )
              })}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default SettingsLayout
