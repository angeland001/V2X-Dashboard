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
import { ProfileModal } from "@/components/ui/Profile/ProfileModal";
import {
  LayoutDashboard,
  MapPin,
  Layers,
  Settings,
  HelpCircle,
  ChevronDown,
  MoreHorizontal,
  FileText,
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
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [user, setUser] = useState(null);

  const isActive = (path) => location.pathname === path;

  // Load user data from localStorage
  useEffect(() => {
    loadUserData();
  }, []);

  // Reload user data when profile modal closes
  useEffect(() => {
    if (!isProfileOpen) {
      loadUserData();
    }
  }, [isProfileOpen]);

  const loadUserData = () => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  };

  const getInitials = () => {
    if (!user) return 'U';
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    return user.username ? user.username.substring(0, 2).toUpperCase() : 'U';
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
              <div className="flex aspect-square size-12 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <img
                  src="/PrismLogo.png"
                  alt="Prism"
                  className="size-10 brightness-0 invert"
                />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold normal-case">
                  Prism
                </span>
                <span className="truncate text-xs normal-case">Dashboard</span>
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
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="normal-case">Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate("/geofencing")}
                  isActive={isActive("/geofencing")}
                  tooltip="GeoFencing"
                >
                  <MapPin className="h-4 w-4" />
                  <span className="normal-case">GeoFencing</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Data Layers with Submenu */}
              <Collapsible defaultOpen className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip="Data Layers">
                      <Layers className="h-4 w-4" />
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
                  <FileText className="h-4 w-4" />
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
            <SidebarMenuButton tooltip="Settings">
              <Settings className="h-4 w-4" />
              <span className="normal-case">Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Get Help">
              <HelpCircle className="h-4 w-4" />
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
                  <Avatar className="h-8 w-8 rounded-lg">
                    {user?.profile_picture ? (
                      <AvatarImage
                        src={`${API_URL}${user.profile_picture}`}
                        alt={user.username || "User"}
                      />
                    ) : null}
                    <AvatarFallback className="rounded-lg">{getInitials()}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {user?.username || 'User'}
                    </span>
                    <span className="truncate text-xs text-gray-500">
                      {user?.email || 'No email'}
                    </span>
                  </div>
                  <MoreHorizontal className="ml-auto h-4 w-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                className="w-[--radix-popper-anchor-width] bg-sidebar-accent border-sidebar-border"
              >
                <DropdownMenuItem
                  onClick={() => setIsProfileOpen(true)}
                  className="hover:bg-sidebar-primary focus:bg-sidebar-primary text-sidebar-foreground hover:text-white focus:text-white cursor-pointer"
                >
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate("/")}
                  className="hover:bg-sidebar-primary focus:bg-sidebar-primary text-sidebar-foreground hover:text-white focus:text-white cursor-pointer"
                >
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
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
