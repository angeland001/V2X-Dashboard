import React from "react";
import { useDispatch } from "react-redux";
import KeplerGl from "@kepler.gl/components";
import { addDataToMap } from "@kepler.gl/actions";

/**
 * Data Layers Map - For visualizing various data layers
 * Display and toggle different data sources and overlays
 */
function DataLayersMap({ sidebarWidth = 280 }) {
  const dispatch = useDispatch();

  // Hide scrollbars for this page
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  React.useEffect(() => {
    // Initialize Data Layers map centered on Chattanooga
    dispatch(
      addDataToMap({
        datasets: {
          info: {
            label: "Data Layers",
            id: "data-layers"
          },
          data: {
            fields: [],
            rows: []
          }
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
            layers: []
          },
          uiState: {
            currentModal: null,
            activeSidePanel: null
          }
        }
      })
    );
  }, [dispatch]);

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      overflow: 'hidden',
      position: 'fixed',
      top: 0,
      left: sidebarWidth,
      right: 0,
      bottom: 0
    }}>
      <KeplerGl
        id="data-layers"
        mapboxApiAccessToken={process.env.REACT_APP_MAPBOX_API}
        width={window.innerWidth - sidebarWidth}
        height={window.innerHeight}
      />
    </div>
  );
}

export default DataLayersMap;
