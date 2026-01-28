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
import HomeView from "./components/dashboard/pages/HomeView";
import GeofenceZones from "./components/dashboard/pages/GeofenceZones";
import LanesPage from "./components/dashboard/pages/LanesPage";
import CrosswalksPage from "./components/dashboard/pages/CrosswalksPage";
import AnalyticsTraffic from "./components/dashboard/pages/AnalyticsTraffic";
import Settings from "./components/dashboard/pages/Settings";

const reducers = combineReducers({
  keplerGl: keplerGlReducer,
});

const store = createStore(reducers, {}, applyMiddleware(taskMiddleware));

// Expose store for debugging
if (typeof window !== 'undefined') {
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
            <Route path="analytics/traffic" element={<AnalyticsTraffic />} />
            <Route path="/dashboard/settings/data" element={<Settings/>} />
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
        </Routes>
      </Router>
    </Provider>
  );
}
