import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Sidebar, Menu, MenuItem, SubMenu } from "react-pro-sidebar";

function DashboardLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (path) => location.pathname === path;
  const sidebarWidth = collapsed ? 80 : 280;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        minHeight: "100vh",
        display: "flex",
      }}
    >
      <div
        style={{
          position: "relative",
          height: "100vh",
          width: collapsed ? "80px" : "280px",
          transition: "width 0.3s",
          zIndex: 1000,
        }}
      >
        <Sidebar
          collapsed={collapsed}
          backgroundColor="#1a1a1a"
          width="280px"
          collapsedWidth="80px"
          style={{
            height: "100vh",
            borderRight: "1px solid #333",
            position: "fixed",
            top: 0,
            left: 0,
          }}
        >
          <Menu
            menuItemStyles={{
              button: {
                backgroundColor: "#1a1a1a",
                color: "#e0e0e0",
                padding: "10px 20px",
                "&:hover": {
                  backgroundColor: "#2a2a2a",
                  color: "#ffffff",
                },
                "&.active": {
                  backgroundColor: "#0070FF",
                  color: "#ffffff",
                },
              },
              subMenuContent: {
                backgroundColor: "#2a2a2a",
              },
              label: {
                fontWeight: 500,
              },
            }}
          >
            <MenuItem
              onClick={() => setCollapsed(!collapsed)}
              style={{
                textAlign: "center",
                fontWeight: "bold",
                fontSize: "18px",
                borderBottom: "1px solid #333",
                paddingTop: "20px",
                paddingBottom: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
              }}
            >
              {collapsed ? (
                "☰"
              ) : (
                <div
                  style={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <img
                    src="/PrismLogo.png"
                    alt="Prism Logo"
                    style={{
                      width: "60px",
                      height: "60px",
                      filter: "brightness(0) invert(1)",
                      objectFit: "contain",
                    }}
                  />
                  <span style={{ margin: 0, padding: 0 }}>Prism Dashboard</span>
                </div>
              )}
            </MenuItem>

            <MenuItem
              onClick={() => navigate("/dashboard")}
              className={isActive("/dashboard") ? "active" : ""}
              icon={
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M3 13h8V3H3v10zM3 21h8v-6H3v6zM13 21h8V11h-8v10zM13 3v6h8V3h-8z" />
                </svg>
              }
            >
              Dashboard Home
            </MenuItem>

            <MenuItem
              onClick={() => navigate("/geofencing")}
              className={isActive("/geofencing") ? "active" : ""}
              icon={
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              }
            >
              GeoFencing
            </MenuItem>

            <SubMenu
              label="Data Layers"
              icon={
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              }
            >
              <MenuItem
                onClick={() => navigate("/data-layers")}
                icon={
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4l3 3" />
                  </svg>
                }
              >
                View Layers
              </MenuItem>
            </SubMenu>

          </Menu>

          {/* Logout button pinned to bottom */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              width: "100%",
              borderTop: "2px solid #333",
              backgroundColor: "#1a1a1a",
            }}
          >
            <Menu
              menuItemStyles={{
                button: {
                  backgroundColor: "#1a1a1a",
                  color: "#e0e0e0",
                  padding: "15px 20px",
                  "&:hover": {
                    backgroundColor: "#c62828",
                    color: "#ffffff",
                  },
                },
              }}
            >
              <MenuItem
                onClick={() => navigate("/")}
                icon={
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                }
              >
                {collapsed ? "" : "Logout"}
              </MenuItem>
            </Menu>
          </div>
        </Sidebar>
      </div>

      <div style={{ flex: 1, position: "relative", marginLeft: 0, overflowY: "auto", maxHeight: "100vh" }}>
        {React.cloneElement(children, { sidebarWidth })}
      </div>
    </div>
  );
}

export default DashboardLayout;
