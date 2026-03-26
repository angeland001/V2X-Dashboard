import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarInset,
  SidebarSeparator,
} from "@/components/ui/shadcn/sidebar";

import {
  LayoutDashboard,
  MapPin,
  Layers,
  Settings,
  HelpCircle,
  ChevronDown,
  MoreHorizontal,
  FileText,
  Waypoints,
  Route,
  Footprints,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@radix-ui/react-collapsible";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/shadcn/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/shadcn/dropdown-menu";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);

  const isActive = (path) => location.pathname === path;

  // Load user data from localStorage
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = () => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
  };

  const getInitials = () => {
    if (!user) return "U";
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    return user.username ? user.username.substring(0, 2).toUpperCase() : "U";
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex items-center justify-center rounded-lg aspect-square size-12 bg-sidebar-primary text-sidebar-primary-foreground">
                <img
                  src="/PrismLogo.png"
                  alt="Prism"
                  className="size-10 brightness-0 invert"
                />
              </div>
              <div className="grid flex-1 text-sm leading-tight text-left">
                <span className="font-semibold normal-case truncate">
                  Prism
                </span>
                <span className="text-xs normal-case truncate">Dashboard</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate("/dashboard")}
                  isActive={isActive("/dashboard")}
                  tooltip="Dashboard"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="normal-case">Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate("/geofencing")}
                  isActive={isActive("/geofencing")}
                  tooltip="Map Editor"
                >
                  <MapPin className="w-4 h-4" />
                  <span className="normal-case">Map Editor</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* V2X Config with Submenu */}
              <Collapsible defaultOpen className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip="V2X Config">
                      <Waypoints className="w-4 h-4" />
                      <span className="normal-case">V2X Config</span>
                      <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          onClick={() => navigate("/dashboard/geofences/zones")}
                          isActive={isActive("/dashboard/geofences/zones")}
                        >
                          <span className="normal-case">Intersections</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          onClick={() => navigate("/dashboard/lanes")}
                          isActive={isActive("/dashboard/lanes")}
                        >
                          <span className="normal-case">Lanes</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          onClick={() => navigate("/dashboard/crosswalks")}
                          isActive={isActive("/dashboard/crosswalks")}
                        >
                          <span className="normal-case">Crosswalks</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Data Layers with Submenu */}
              <Collapsible defaultOpen className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip="Data Layers">
                      <Layers className="w-4 h-4" />
                      <span className="normal-case">Data Layers</span>
                      <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          onClick={() => navigate("/data-layers")}
                          isActive={isActive("/data-layers")}
                        >
                          <span className="normal-case">Traffic Routes</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          onClick={() => navigate("/sdsm-events")}
                          isActive={isActive("/sdsm-events")}
                        >
                          <span className="normal-case">SDSM Events</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Documents Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Documents</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Reports">
                  <FileText className="w-4 h-4" />
                  <span className="normal-case">Reports</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() =>
                navigate("/dashboard/settings/dashboard-visualization")
              }
              isActive={location.pathname.startsWith("/dashboard/settings")}
              tooltip="Settings"
            >
              <Settings className="w-4 h-4" />
              <span className="normal-case">Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Get Help">
              <HelpCircle className="w-4 h-4" />
              <span className="normal-case">Get Help</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <SidebarSeparator />

        {/* User Profile with Dropdown */}
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="w-8 h-8 rounded-lg">
                    {user?.profile_picture ? (
                      <AvatarImage
                        src={`${API_URL}${user.profile_picture}`}
                        alt={user.username || "User"}
                      />
                    ) : null}
                    <AvatarFallback className="rounded-lg">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-sm leading-tight text-left">
                    <span className="font-semibold truncate">
                      {user?.username || "User"}
                    </span>
                    <span className="text-xs text-gray-500 truncate">
                      {user?.email || "No email"}
                    </span>
                  </div>
                  <MoreHorizontal className="w-4 h-4 ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                className="w-[--radix-popper-anchor-width] bg-sidebar-accent border-sidebar-border"
              >
                <DropdownMenuItem
                  onClick={() => navigate("/")}
                  className="cursor-pointer hover:bg-sidebar-primary focus:bg-sidebar-primary text-sidebar-foreground hover:text-white focus:text-white"
                >
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function DashboardLayout({ children }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}

export default DashboardLayout;
