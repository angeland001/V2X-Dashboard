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

const geofenceFeatures = [
  {
    title: "Geofence Zones",
    href: "/dashboard/geofences/zones",
    description:
      "Create and manage geographic boundaries for location-based monitoring and alerts.",
  },
  {
    title: "Entry/Exit Events",
    href: "/dashboard/geofences/events",
    description:
      "View and track all entry and exit events triggered by geofence boundaries.",
  },
  {
    title: "Proximity Alerts",
    href: "/dashboard/geofences/proximity",
    description:
      "Configure alerts when assets approach or leave designated areas.",
  },
  {
    title: "Zone Analytics",
    href: "/dashboard/geofences/analytics",
    description:
      "Analyze traffic patterns and dwell times within geofence zones.",
  },
]

const analyticsFeatures = [
  {
    title: "Traffic Patterns",
    href: "/dashboard/analytics/traffic",
    description:
      "Visualize traffic flow patterns and congestion hotspots on the map.",
  },
  {
    title: "Heat Maps",
    href: "/dashboard/analytics/heatmaps",
    description:
      "View density maps showing high-traffic areas and movement trends.",
  },
  {
    title: "Route Analysis",
    href: "/dashboard/analytics/routes",
    description:
      "Analyze common routes and travel paths between locations.",
  },
 
]

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

  return (
    <div className="p-4">
      <NavigationMenu viewport={isMobile}>
        <NavigationMenuList className="flex-wrap">
          <NavigationMenuItem>
            <Link to="/dashboard">
              <NavigationMenuTrigger>Overview</NavigationMenuTrigger>
            </Link>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Geofences</NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid gap-2 p-4 sm:w-[400px] md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                {geofenceFeatures.map((feature) => (
                  <ListItem
                    key={feature.title}
                    title={feature.title}
                    href={feature.href}
                  >
                    {feature.description}
                  </ListItem>
                ))}
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Analytics</NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid gap-2 p-4 sm:w-[400px] md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                {analyticsFeatures.map((feature) => (
                  <ListItem
                    key={feature.title}
                    title={feature.title}
                    href={feature.href}
                  >
                    {feature.description}
                  </ListItem>
                ))}
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Rules & Triggers</NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid w-[400px] gap-4 p-4">
                <ListItem href="/dashboard/rules/location" title="Location Rules">
                  Create rules based on geographic conditions and movement patterns.
                </ListItem>
                <ListItem href="/dashboard/rules/triggers" title="Event Triggers">
                  Configure automated triggers for location-based events.
                </ListItem>
                <ListItem href="/dashboard/rules/schedules" title="Schedules">
                  Set up time-based rules and recurring event patterns.
                </ListItem>
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Alerts</NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid w-[400px] gap-4 p-4">
                <ListItem href="/dashboard/alerts/active" title="Active Alerts">
                  View and manage currently active proximity and geofence alerts.
                </ListItem>
                <ListItem href="/dashboard/alerts/history" title="Alert History">
                  Review historical alert data and event logs.
                </ListItem>
                <ListItem href="/dashboard/alerts/settings" title="Notification Settings">
                  Configure alert channels and notification preferences.
                </ListItem>
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Settings</NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid w-[400px] gap-4 p-4">
                <ListItem href="/dashboard/settings/data" title="Data Sources">
                  Manage PostGIS connections and data imports.
                </ListItem>
                <ListItem href="/dashboard/settings/users" title="Users & Access">
                  Configure user permissions and access control.
                </ListItem>
                <ListItem href="/dashboard/settings/preferences" title="Preferences">
                  Customize dashboard appearance and defaults.
                </ListItem>
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  )
}

export default DashboardNav
