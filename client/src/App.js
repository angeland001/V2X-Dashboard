import React from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { SettingsProvider } from "./contexts/SettingsContext";
import Login from "./auth/Login";
import DashboardLayout from "./components/navigation/SidebarNav";
import GeoFencingMap from "./components/maps/GeoFencingMap";
import SDSMEventsMap from "./components/maps/SDSMEvents";
import Dashboard from "./components/dashboard/dashboard";
import HomeView from "./components/dashboard/pages/overview/HomeView";
import GeofenceZones from "./components/dashboard/pages/geofences/GeofenceZones";
import LanesPage from "./components/dashboard/pages/geofences/LanesPage";
import CrosswalksPage from "./components/dashboard/pages/geofences/CrosswalksPage";
import AnalyticsPage from "./components/dashboard/pages/analytics/AnalyticsPage";
import SettingsLayout from "./components/dashboard/pages/settings/nav/SettingsNav";
import DashboardVisualization from "./components/dashboard/pages/settings/pages/DashboardVisualization";
import NotFound from "./error/404NotFound";
import { NotificationsAlerts } from "./components/dashboard/pages/settings/pages/NotificationsAlerts";
import { UserProfiles } from "./components/dashboard/pages/settings/pages/UserProfiles";
import { DataAnalytics } from "./components/dashboard/pages/settings/pages/DataAnalytics";
import { SecurityPrivacy } from "./components/dashboard/pages/settings/pages/Security&Privacy";
import { Support } from "./components/dashboard/pages/settings/pages/Support";
import { ControllerConfig } from "./components/dashboard/pages/settings/pages/ControllerConfig";

export default function App() {
  return (
    <SettingsProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />

          <Route
            path="/dashboard"
            element={
              <DashboardLayout>
                <Dashboard />
              </DashboardLayout>
            }
          >
            <Route index element={<HomeView />} />
            <Route path="geofences/zones" element={<GeofenceZones />} />
            <Route path="lanes" element={<LanesPage />} />
            <Route path="crosswalks" element={<CrosswalksPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="settings" element={<SettingsLayout />}>
              <Route
                path="dashboard-visualization"
                element={<DashboardVisualization />}
              />
              <Route path="notifications" element={<NotificationsAlerts />} />
              <Route path="users" element={<UserProfiles />} />
              <Route path="data" element={<DataAnalytics />} />
              <Route path="security" element={<SecurityPrivacy />} />
              <Route path="support" element={<Support />} />
              <Route path="controllers" element={<ControllerConfig />} />
            </Route>
          </Route>

            <Route
              path="/geofencing"
              element={
                <DashboardLayout>
                  <Navigate to="/geofencing/intersection" replace />
                </DashboardLayout>
              }
            />
            <Route
              path="/geofencing/intersection"
              element={
                <DashboardLayout>
                  <GeoFencingMap editorMode="intersection" />
                </DashboardLayout>
              }
            />
            <Route
              path="/geofencing/spat-zone"
              element={
                <DashboardLayout>
                  <GeoFencingMap editorMode="spat" />
                </DashboardLayout>
              }
            />
            <Route
              path="/geofencing/preemption"
              element={
                <DashboardLayout>
                  <GeoFencingMap editorMode="preemption" />
                </DashboardLayout>
              }
            />
            <Route
              path="/sdsm-events"
              element={
                <DashboardLayout>
                  <SDSMEventsMap />
                </DashboardLayout>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </SettingsProvider>
  );
}
