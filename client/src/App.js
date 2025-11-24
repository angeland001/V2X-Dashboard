import React from "react";
import keplerGlReducer from "@kepler.gl/reducers";
import { createStore, combineReducers, applyMiddleware } from "redux";
import { taskMiddleware } from "react-palm/tasks";
import { Provider, useDispatch, useSelector } from "react-redux";
import KeplerGl from "@kepler.gl/components";
import { addDataToMap } from "@kepler.gl/actions";
import useSwr from "swr";
import { BrowserRouter as Router, Route, Routes, useNavigate } from "react-router-dom";
import Login from "./auth/Login";
import { useState } from "react";
import { Sidebar, Menu, MenuItem, SubMenu } from 'react-pro-sidebar';

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
  const navigate = useNavigate();
  const theme = useSelector(state => state.keplerGl.chattanooga?.uiState?.theme || 'dark');
  const [activeDataset, setActiveDataset] = useState('collisions');
  const [collapsed, setCollapsed] = useState(false);

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
                speed: 0.5,
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

  

  const sidebarWidth = collapsed ? 80 : 280;

  return (
    <div style={{ position: "absolute", width: "100%", height: "100%", display: "flex" }}>
      <div style={{
        position: "relative",
        height: "100vh",
        width: collapsed ? "80px" : "280px",
        transition: "width 0.3s",
        zIndex: 1000
      }}>
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
            left: 0
          }}
        >
          <Menu
            menuItemStyles={{
              button: {
                backgroundColor: '#1a1a1a',
                color: '#e0e0e0',
                padding: '10px 20px',
                '&:hover': {
                  backgroundColor: '#2a2a2a',
                  color: '#ffffff',
                },
                '&.active': {
                  backgroundColor: '#0070FF',
                  color: '#ffffff',
                },
              },
              subMenuContent: {
                backgroundColor: '#2a2a2a',
              },
              label: {
                fontWeight: 500,
              },
            }}
          >
          <MenuItem
            onClick={() => setCollapsed(!collapsed)}
            style={{
              textAlign: 'center',
              fontWeight: 'bold',
              fontSize: '18px',
              borderBottom: '1px solid #333',
              paddingTop: '20px',
              paddingBottom: '20px',
            }}
          >
            {collapsed ? '☰' : 'V2X Dashboard'}
          </MenuItem>

          <SubMenu label="Data Layers">
            <MenuItem
              onClick={() => setActiveDataset('collisions')}
              className={activeDataset === 'collisions' ? 'active' : ''}
            >
              Traffic Collisions
            </MenuItem>
            <MenuItem
              onClick={() => setActiveDataset('neighborhoods')}
              className={activeDataset === 'neighborhoods' ? 'active' : ''}
            >
              Neighborhoods
            </MenuItem>
          </SubMenu>

          <SubMenu label="Analysis">
            <MenuItem>Heatmaps</MenuItem>
            <MenuItem>Statistics</MenuItem>
            <MenuItem>Timeline</MenuItem>
          </SubMenu>

          <MenuItem>
            Map Settings
          </MenuItem>

          <MenuItem>
            Export Data
          </MenuItem>
        </Menu>

        {/* Logout button pinned to bottom */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          borderTop: '2px solid #333',
          backgroundColor: '#1a1a1a'
        }}>
          <Menu
            menuItemStyles={{
              button: {
                backgroundColor: '#1a1a1a',
                color: '#e0e0e0',
                padding: '15px 20px',
                '&:hover': {
                  backgroundColor: '#c62828',
                  color: '#ffffff',
                },
              },
            }}
          >
            <MenuItem
              onClick={() => navigate('/')}
            >
              {collapsed ? '→' : 'Logout'}
            </MenuItem>
          </Menu>
        </div>
      </Sidebar>
      </div>

      <div style={{ flex: 1, position: "relative", marginLeft: 0 }}>
        <KeplerGl
          id="chattanooga"
          mapboxApiAccessToken={process.env.REACT_APP_MAPBOX_API}
          width={window.innerWidth - sidebarWidth}
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
  const [position, setPosition] = useState({ x: window.innerWidth - 288, y: window.innerHeight - 520 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    if (e.target.tagName === 'BUTTON') return; // Don't drag when clicking buttons
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

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
    <div
      onMouseDown={handleMouseDown}
      style={{
        position: "absolute",
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 1000,
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none'
      }}
    >
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