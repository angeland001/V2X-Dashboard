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
    <KeplerGl
      id="data-layers"
      mapboxApiAccessToken={process.env.REACT_APP_MAPBOX_API}
      width={window.innerWidth - sidebarWidth}
      height={window.innerHeight}
    />
  );
}

export default DataLayersMap;
