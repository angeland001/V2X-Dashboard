import React from "react";
import { useDispatch } from "react-redux";
import KeplerGl from "@kepler.gl/components";
import { addDataToMap, wrapTo } from "@kepler.gl/actions";
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
    // Use wrapTo to scope actions to this specific Kepler.gl instance
    dispatch(
      wrapTo(
        "data-layers",
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
              pitch: 50,
              bearing: 0,
            },
          mapStyle: {
            styleType: "dark",
            topLayerGroups: {},
            visibleLayerGroups: {
              label: true,
              road: true,
              border: false,
              building: false,
              water: true,
              land: true,
              "3d building": false,
            },
            threeDBuildingColor: [
              194.6103322548211, 191.81688250953655, 185.2988331038727,
            ],
            mapStyles: {
              satellite: {
                id: "satellite",
                label: "Satellite",
                url: "mapbox://styles/mapbox/satellite-v9",
                icon:
                  "https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/-122.3997,37.7907,11.0,0,0/400x300?access_token=" +
                  process.env.REACT_APP_MAPBOX_API,
                layerGroups: [],
              },
              "satellite-streets": {
                id: "satellite-streets",
                label: "Satellite Streets",
                url: "mapbox://styles/mapbox/satellite-streets-v12",
                icon:
                  "https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/-122.3997,37.7907,11.0,0,0/400x300?access_token=" +
                  process.env.REACT_APP_MAPBOX_API,
                layerGroups: [],
              },
              dark: {
                id: "dark",
                label: "Dark",
                url: "mapbox://styles/mapbox/dark-v11",
                icon:
                  "https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/-122.3997,37.7907,11.0,0,0/400x300?access_token=" +
                  process.env.REACT_APP_MAPBOX_API,
                layerGroups: [],
              },
              streets: {
                id: "streets",
                label: "Streets",
                url: "mapbox://styles/mapbox/streets-v12",
                icon:
                  "https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/-122.3997,37.7907,11.0,0,0/400x300?access_token=" +
                  process.env.REACT_APP_MAPBOX_API,
                layerGroups: [],
              },
              light: {
                id: "light",
                label: "Light",
                url: "mapbox://styles/mapbox/light-v11",
                icon:
                  "https://api.mapbox.com/styles/v1/mapbox/light-v11/static/-122.3997,37.7907,11.0,0,0/400x300?access_token=" +
                  process.env.REACT_APP_MAPBOX_API,
                layerGroups: [],
              },
            },
          },
          uiState: {
            currentModal: null,
            activeSidePanel: null,
          },
        },
      })
        )
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
