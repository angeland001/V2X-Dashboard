import React from "react";
import keplerGlReducer from "@kepler.gl/reducers";
import { createStore, combineReducers, applyMiddleware } from "redux";
import { taskMiddleware } from "react-palm/tasks";
import { Provider } from "react-redux";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Login from "./auth/Login";
import DashboardLayout from "./components/navigation/SidebarNav";
import GeoFencingMap from "./components/maps/GeoFencingMap";
import DataLayersMap from "./components/maps/TrafficRoutes";
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

const customKeplerReducer = keplerGlReducer.initialState({
  uiState: {
    currentModal: null,
  },
});

const reducers = combineReducers({
  keplerGl: customKeplerReducer,
});

const store = createStore(reducers, {}, applyMiddleware(taskMiddleware));

// Expose store for debugging
if (typeof window !== "undefined") {
  window.store = store;
}

export default function App() {
  return (
    <Provider store={store}>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />

          {/* Dashboard with nested routes */}
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
              <Route path="dashboard-visualization" element={<DashboardVisualization />} />
            </Route>
          </Route>

          {/* Other routes */}
          <Route
            path="/geofencing"
            element={
              <DashboardLayout>
                <GeoFencingMap />
              </DashboardLayout>
            }
          />
          <Route
            path="/data-layers"
            element={
              <DashboardLayout>
                <DataLayersMap />
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
    </Provider>
  );
}
