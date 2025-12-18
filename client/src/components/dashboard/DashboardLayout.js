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
        position: "absolute",
        width: "100%",
        height: "100%",
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

            <SubMenu
              label="Analysis"
              icon={
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              }
            >
              <MenuItem
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
                    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                    <line x1="9" y1="9" x2="9.01" y2="9" />
                    <line x1="15" y1="9" x2="15.01" y2="9" />
                  </svg>
                }
              >
                Heatmaps
              </MenuItem>
              <MenuItem
                icon={
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                  </svg>
                }
              >
                Statistics
              </MenuItem>
              <MenuItem
                icon={
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="12" y1="2" x2="12" y2="6" />
                    <line x1="12" y1="18" x2="12" y2="22" />
                    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
                    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
                    <line x1="2" y1="12" x2="6" y2="12" />
                    <line x1="18" y1="12" x2="22" y2="12" />
                    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
                    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
                  </svg>
                }
              >
                Timeline
              </MenuItem>
            </SubMenu>

            <MenuItem
              icon={
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 1v6m0 6v6m5-11.66l-3 5.2m-6-5.2l3 5.2M7 21l3-5.2M14 21l-3-5.2" />
                </svg>
              }
            >
              Map Settings
            </MenuItem>

            <MenuItem
              icon={
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              }
            >
              Export Data
            </MenuItem>
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

      <div style={{ flex: 1, position: "relative", marginLeft: 0 }}>
        {React.cloneElement(children, { sidebarWidth })}
      </div>
    </div>
  );
}

export default DashboardLayout;
