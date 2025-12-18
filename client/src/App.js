import React from "react";
import keplerGlReducer from "@kepler.gl/reducers";
import { createStore, combineReducers, applyMiddleware } from "redux";
import { taskMiddleware } from "react-palm/tasks";
import { Provider } from "react-redux";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Login from "./auth/Login";
import DashboardLayout from "./components/DashboardLayout";
import GeoFencingMap from "./components/maps/GeoFencingMap";
import DataLayersMap from "./components/maps/DataLayersMap";

const reducers = combineReducers({
  keplerGl: keplerGlReducer
});

const store = createStore(reducers, {}, applyMiddleware(taskMiddleware));

export default function App() {
  return (
    <Provider store={store}>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/geofencing" element={<DashboardLayout><GeoFencingMap /></DashboardLayout>} />
          <Route path="/data-layers" element={<DashboardLayout><DataLayersMap /></DashboardLayout>} />
        </Routes>
      </Router>
    </Provider>
  );
}

