import * as React from "react"
import { Link } from "react-router-dom"
import { User } from "lucide-react"

import { useIsMobile } from "@/hooks/use-mobile"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/shadcn/navigation-menu"
import { ProfileModal } from "@/components/ui/Profile/ProfileModal"




function ListItem({ title, children, href, ...props }) {
  return (
    <li {...props}>
      <NavigationMenuLink asChild>
        <Link to={href}>
          <div className="text-sm leading-none font-medium">{title}</div>
          <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">
            {children}
          </p>
        </Link>
      </NavigationMenuLink>
    </li>
  )
}

export function DashboardNav() {
  const isMobile = useIsMobile()
  const [isProfileOpen, setIsProfileOpen] = React.useState(false)

  return (
    <>
      <div className="p-4 flex items-center justify-between">
        <NavigationMenu viewport={isMobile}>
          <NavigationMenuList className="flex-wrap">
          <NavigationMenuItem>
            <Link to="/dashboard">
              <NavigationMenuTrigger>SDSM</NavigationMenuTrigger>
            </Link>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <Link to="/dashboard/geofences/zones">
            <NavigationMenuTrigger>Geofences</NavigationMenuTrigger>
            </Link>
            
          </NavigationMenuItem>
          <NavigationMenuItem>
            <Link to="/dashboard/analytics">
              <NavigationMenuTrigger>Analytics</NavigationMenuTrigger>
            </Link>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <Link to="/dashboard/rules/location">
            
            <NavigationMenuTrigger>Rules & Triggers</NavigationMenuTrigger>
            </Link>
            <NavigationMenuContent>
             
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <Link to="/dashboard/alerts/active">
            <NavigationMenuTrigger>Alerts</NavigationMenuTrigger>
            </Link>
            
            
          </NavigationMenuItem>
          <NavigationMenuItem>
            <Link to="/dashboard/settings/dashboard-visualization">
              <NavigationMenuTrigger>Settings</NavigationMenuTrigger>
            </Link>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>

      {/* Profile Button */}
      <button
        onClick={() => setIsProfileOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 hover:border-red-600 transition-all duration-200 group"
      >
        <User className="w-4 h-4 text-neutral-400 group-hover:text-gray-100 transition-colors" />
        <span className="text-sm font-medium text-neutral-300 group-hover:text-white transition-colors">
          Profile
        </span>
      </button>
    </div>

    {/* Profile Modal */}
    <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </>
  )
}

export default DashboardNav
