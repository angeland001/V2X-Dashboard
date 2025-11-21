import React from "react";
import keplerGlReducer from "@kepler.gl/reducers";
import { createStore, combineReducers, applyMiddleware } from "redux";
import { taskMiddleware } from "react-palm/tasks";
import { Provider, useDispatch, useSelector } from "react-redux";
import KeplerGl from "@kepler.gl/components";
import { addDataToMap } from "@kepler.gl/actions";
import useSwr from "swr";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Login from "./auth/Login";
import Navigation from "./components/Navigation";
import { useState } from "react";

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
          <Route path="/map" element={<Map />} />
        </Routes>
      </Router>
    </Provider>
  );
}

function Map() {
  const dispatch = useDispatch();
  const theme = useSelector(state => state.keplerGl.chattanooga?.uiState?.theme || 'dark');
  const [activeDataset, setActiveDataset] = useState('collisions');

  // Fetch collisions data
  const { data: collisionsData } = useSwr("chattanooga-collisions", async () => {
    const response = await fetch(
      "https://www.chattadata.org/resource/psep-yh23.json"
    );
    const rawData = await response.json();

    // Transform the data to Kepler.gl format
    const fields = [
      { name: "latitude", type: "real" },
      { name: "longitude", type: "real" },
      { name: "collision_date", type: "timestamp" },
      { name: "road_name", type: "string" },
      { name: "injuries", type: "integer" },
      { name: "fatalities", type: "integer" },
      { name: "crash_type", type: "string" }
    ];

    const rows = rawData.map(record => [
      parseFloat(record.latdecimalnmb),
      parseFloat(record.longdecimalnmb),
      record.collisiondte,
      record.rdwynametxt || "Unknown",
      parseInt(record.nbrinjurednmb) || 0,
      parseInt(record.nbrfatalitiesnmb) || 0,
      record.crshtypecde || "Unknown"
    ]);

    return { fields, rows };
  });

  // Fetch neighborhood boundaries data
  const { data: neighborhoodsData } = useSwr("neighborhood-boundaries", async () => {
    const response = await fetch(
      "https://www.chattadata.org/resource/dxzz-idjy.json"
    );
    const rawData = await response.json();

    // Transform the data to Kepler.gl format
    const fields = [
      { name: "name", type: "string" },
      { name: "description", type: "string" },
      { name: "geometry", type: "geojson" }
    ];

    const rows = rawData.map(record => [
      record.name || "Unknown",
      record.description || "",
      record.boundary
    ]);

    return { fields, rows, rawData };
  });

  const data = activeDataset === 'collisions' ? collisionsData : neighborhoodsData;

  React.useEffect(() => {
    if (data) {
      const datasetConfig = activeDataset === 'collisions'
        ? {
            label: "Chattanooga Traffic Collisions",
            id: "chattanooga-collisions",
            filters: [
              {
                dataId: ["chattanooga-collisions"],
                id: "collision-timeline",
                name: ["collision_date"],
                type: "timeRange",
                enabled: true,
                // Animation window: 'free', 'incremental', or 'point'
                animationWindow: "incremental",
                speed: 1,
                // View type: 'side' (compact), 'enlarged' (large), 'minified' (minimal)
                view: "side",
                // Plot type: 'histogram', 'lineChart'
                plotType: "lineChart",
                // Time format (e.g., 'L', 'L LT', 'L LTS')
                timeFormat: "L LTS",
                // Y-axis configuration (null for default)
                yAxis: null
              }
            ]
          }
        : {
            label: "Neighborhood Association Boundaries",
            id: "neighborhood-boundaries",
            filters: []
          };

      dispatch(
        addDataToMap({
          datasets: {
            info: {
              label: datasetConfig.label,
              id: datasetConfig.id
            },
            data
          },
          option: {
            centerMap: true,
            readOnly: false
          },
          config: {
            mapState: {
              latitude: 35.0456,
              longitude: -85.3097,
              zoom: 11
            },
            visState: {
              filters: datasetConfig.filters,
              animationConfig: {
                isAnimating: false,
                speed: 1,
                // Hide timeline controls (set to true to hide)
                
              }
            }
          }
        })
      );
    }
  }, [dispatch, data, activeDataset]);

  const isDark = theme === 'dark';

  

  return (
    <div style={{ position: "absolute", width: "100%", height: "100%" }}>
      <Navigation />
      <div style={{ position: "absolute", left: "280px", top: 0, width: "calc(100% - 280px)", height: "100%" }}>
        <KeplerGl
          id="chattanooga"
          mapboxApiAccessToken={process.env.REACT_APP_MAPBOX_API}
          width={window.innerWidth - 280}
          height={window.innerHeight}
        />
        <InfoBoxToggle
          data={data}
          isDark={isDark}
          activeDataset={activeDataset}
          setActiveDataset={setActiveDataset}
        />
      </div>
    </div>
  );
}

function InfoBoxToggle({ data, isDark, activeDataset, setActiveDataset }) {
  const [open, setOpen] = useState(true);

  const infoBoxStyle = {
    background: isDark ? "#2a2a2a" : "#f5f5f5",
    padding: "15px",
    borderRadius: "10px",
    boxShadow: isDark
      ? "0 0 10px rgba(255,255,255,0.1)"
      : "0 0 10px rgba(0,0,0,0.1)",
    width: "260px",
  };

  const textStyle = {
    margin: "5px 0",
    color: isDark ? "#E8E8E8" : "#1F1F1F",
    fontSize: "14px",
  };

  const mutedTextStyle = {
    margin: "5px 0",
    color: isDark ? "#C7C7C7" : "#555",
    fontSize: "12px",
  };

  const buttonStyle = {
    padding: "8px 14px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    background: isDark ? "#444" : "#ddd",
    color: isDark ? "#E8E8E8" : "#1F1F1F",
    marginBottom: "10px",
    marginRight: "10px",
    fontFamily: "'Poppins', sans-serif",
    fontSize: "13px",
    fontWeight: "500",
    transition: "all 0.2s ease",
    boxShadow: isDark
      ? "0 2px 8px rgba(0, 0, 0, 0.6)"
      : "0 2px 8px rgba(0, 0, 0, 0.15)",
  };

  const activeButtonStyle = {
    ...buttonStyle,
    background: isDark ? "#5a5a5a" : "#bbb",
    fontWeight: "600",
  };

  const isCollisions = activeDataset === 'collisions';

  return (
    <div style={{
      position: "absolute",
      bottom: "260px",

      right: "8px",
      zIndex: 1000
    }}>
      {/* Button Group */}
      <div style={{ display: "flex", marginBottom: "15px" }}>
        <button
          onClick={() => setActiveDataset('collisions')}
          style={isCollisions ? activeButtonStyle : buttonStyle}
        >
          Traffic Collisions
        </button>
        <button
          onClick={() => setActiveDataset('neighborhoods')}
          style={!isCollisions ? activeButtonStyle : buttonStyle}
        >
          Neighborhoods
        </button>
      </div>

      {/* Toggle Info Box Button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          ...buttonStyle,
          marginRight: "0px",
          width: "100%",
        }}
      >
        {open ? "Hide Info" : "Show Info"}
      </button>

      {/* Info Box */}
      {open && (
        <div style={infoBoxStyle}>
          <h3
            style={{
              margin: "0 0 10px 0",
              fontSize: "16px",
              color: isDark ? "#E8E8E8" : "#1F1F1F",
            }}
          >
            {isCollisions
              ? "Chattanooga Traffic Collisions"
              : "Neighborhood Association Boundaries"}
          </h3>

          <p style={textStyle}>
            <strong>Total Records:</strong> {data?.rows?.length || 0}
          </p>

          <p style={textStyle}>
            <strong>Source:</strong> Chattanooga Open Data
          </p>

          <p style={mutedTextStyle}>
            {isCollisions
              ? "Data includes collision location, date, injuries, and fatalities"
              : "Data includes neighborhood boundaries and association information"}
          </p>
        </div>
      )}
    </div>
  );
}