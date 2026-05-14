import * as React from "react"
import { Link } from "react-router-dom"


import { useIsMobile } from "@/hooks/use-mobile"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/shadcn/navigation-menu"





export function DashboardNav() {
  const isMobile = useIsMobile()
  

  return (
    <>
      <div className="flex items-center justify-between p-4">
        <NavigationMenu viewport={isMobile}>
          <NavigationMenuList className="flex-wrap">
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

      
    </div>

    
    </>
  )
}

export default DashboardNav
