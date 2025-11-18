import React from "react";
import keplerGlReducer from "kepler.gl/reducers";
import { createStore, combineReducers, applyMiddleware } from "redux";
import { taskMiddleware } from "react-palm/tasks";
import { Provider, useDispatch, useSelector } from "react-redux";
import KeplerGl from "kepler.gl";
import { addDataToMap } from "kepler.gl/actions";
import useSwr from "swr";

const reducers = combineReducers({
  keplerGl: keplerGlReducer
});

const store = createStore(reducers, {}, applyMiddleware(taskMiddleware));

export default function App() {
  return (
    <Provider store={store}>
      
      <Map />
    </Provider>
  );
}

function Map() {
  const dispatch = useDispatch();
  const theme = useSelector(state => state.keplerGl.chattanooga?.uiState?.theme || 'dark');
  const { data } = useSwr("chattanooga-collisions", async () => {
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
      record.collisiondatetxt,
      record.rdwynametxt || "Unknown",
      parseInt(record.nbrinjurednmb) || 0,
      parseInt(record.nbrfatalitiesnmb) || 0,
      record.crshtypecde || "Unknown"
    ]);

    return { fields, rows };
  });

  React.useEffect(() => {
    if (data) {
      dispatch(
        addDataToMap({
          datasets: {
            info: {
              label: "Chattanooga Traffic Collisions",
              id: "chattanooga-collisions"
            },
            data
          },
          option: {
            centerMap: false,
            readOnly: false
          },
          config: {
            mapState: {
              latitude: 35.0456,
              longitude: -85.3097,
              zoom: 11
            }
          }
        })
      );
    }
  }, [dispatch, data]);

  const isDark = theme === 'dark';

  const infoBoxStyle = {
    position: "absolute",
    bottom: '20px',
    right: '20px',
    backgroundColor: isDark ? 'rgba(41, 41, 48, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    color: isDark ? '#E8E8E8' : '#1F1F1F',
    padding: '15px',
    borderRadius: '8px',
    boxShadow: isDark
      ? '0 2px 8px rgba(0, 0, 0, 0.6)'
      : '0 2px 8px rgba(0, 0, 0, 0.15)',
    border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
    maxWidth: '300px',
    zIndex: 1000
  };

  const textStyle = {
    margin: '5px 0',
    fontSize: '14px',
    color: isDark ? '#E8E8E8' : '#1F1F1F'
  };

  const mutedTextStyle = {
    margin: '5px 0',
    fontSize: '12px',
    color: isDark ? '#A0A0A0' : '#666'
  };

  return (
    <div style={{ position: "absolute", width: "100%", height: "100%" }}>
      <KeplerGl
        id="chattanooga"
        mapboxApiAccessToken={process.env.REACT_APP_MAPBOX_API}
        width={window.innerWidth}
        height={window.innerHeight}
      />
      <div style={infoBoxStyle}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: isDark ? '#E8E8E8' : '#1F1F1F' }}>
          Chattanooga Traffic Collisions
        </h3>
        <p style={textStyle}>
          <strong>Total Records:</strong> {data?.rows?.length || 0}
        </p>
        <p style={textStyle}>
          <strong>Source:</strong> Chattanooga Open Data
        </p>
        <p style={mutedTextStyle}>
          Data includes collision location, date, injuries, and fatalities
        </p>
      </div>
    </div>
  );
}
