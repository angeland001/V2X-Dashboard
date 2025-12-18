import React from "react";
import { useDispatch } from "react-redux";
import KeplerGl from "@kepler.gl/components";
import { addDataToMap } from "@kepler.gl/actions";
import { useEffect } from "react";

/**
 * GeoFencing Map - For creating and managing geofences
 * Use this map to draw boundaries, set up alerts, and monitor geographic regions
 */
function GeoFencingMap({ sidebarWidth = 280 }) {
  const dispatch = useDispatch();
  try {
    useEffect(() => {
      // Fetch data from PostGIS
      fetch("http://localhost:3001/api/spatial/data")
        .then((res) => res.json())
        .then((data) => {
          dispatch(
            addDataToMap({
              datasets: {
                info: {
                  label: "PostGIS Data",
                  id: "postgis-data",
                },
                data, // Already in Kepler.gl format
              },
              option: {
                centerMap: true,
              },
              config: {
                mapState: {
                  latitude: 35.0456,
                  longitude: -85.3097,
                  zoom: 11,
                },
              },
            })
          );
        });
    }, [dispatch]);
  } catch (error) {
    console.error("Error fetching data from PostGIS:", error);
  }

  return (
    <KeplerGl
      id="geofencing"
      mapboxApiAccessToken={process.env.REACT_APP_MAPBOX_API}
      width={window.innerWidth - sidebarWidth}
      height={window.innerHeight}
    />
  );
}

export default GeoFencingMap;
