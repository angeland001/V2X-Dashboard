import React from "react";
import { useDispatch } from "react-redux";
import KeplerGl from "@kepler.gl/components";
import { addDataToMap } from "@kepler.gl/actions";
import { useEffect, useState, useRef } from "react";

/**
 * Data Layers Map - For visualizing various data layers
 * Display and toggle different data sources and overlays
 */
function DataLayersMap() {
  const dispatch = useDispatch();
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  // Hide scrollbars for this page
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  // Update dimensions based on container size
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setDimensions({
          width: clientWidth,
          height: clientHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  useEffect(() => {
    // Initialize Data Layers map centered on Chattanooga
    dispatch(
      addDataToMap({
        datasets: {
          info: {
            label: "Data Layers",
            id: "data-layers",
          },
          data: {
            fields: [],
            rows: [],
          },
        },
        option: {
          centerMap: true,
          readOnly: false,
        },
        config: {
          mapState: {
            latitude: 35.0456,
            longitude: -85.3097,
            zoom: 11,
          },

          uiState: {
            currentModal: null,
            activeSidePanel: null,
          },
        },
      })
    );
  }, [dispatch]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100vh",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <KeplerGl
        id="data-layers"
        mapboxApiAccessToken={process.env.REACT_APP_MAPBOX_API}
        width={dimensions.width}
        height={dimensions.height}
      />
    </div>
  );
}

export default DataLayersMap;
