import React from "react";
import keplerGlReducer from "@kepler.gl/reducers";
import { createStore, combineReducers, applyMiddleware } from "redux";
import { taskMiddleware } from "react-palm/tasks";
import { Provider } from "react-redux";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Login from "./auth/Login";
import DashboardLayout from "./components/navigation/SidebarNav";
import GeoFencingMap from "./components/maps/GeoFencingMap";
import DataLayersMap from "./components/maps/DataLayersMap";
import Dashboard from "./components/dashboard/dashboard";
import HomeView from "./components/dashboard/pages/HomeView";
import GeofenceZones from "./components/dashboard/pages/GeofenceZones";
import AnalyticsTraffic from "./components/dashboard/pages/AnalyticsTraffic";

const reducers = combineReducers({
  keplerGl: keplerGlReducer,
});

const store = createStore(reducers, {}, applyMiddleware(taskMiddleware));

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
            <Route path="analytics/traffic" element={<AnalyticsTraffic />} />
            {/* Add more routes as needed */}
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
        </Routes>
      </Router>
    </Provider>
  );
}
