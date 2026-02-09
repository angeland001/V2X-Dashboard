import React, { useRef, useState, useEffect } from "react"
import { useDispatch } from "react-redux"
import KeplerGL from "@kepler.gl/components"
import { addDataToMap, wrapTo } from "@kepler.gl/actions"

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

export function AnalyticsTraffic() {
  const dispatch = useDispatch();
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  // Update dimensions based on container size
  useEffect(() => {
    const updateDimensions = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      setDimensions({ width: clientWidth, height: clientHeight });
    };
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Initialize base map centered on Chattanooga
  useEffect(() => {
    dispatch(
      wrapTo(
        "traffic_flow_patterns",
        addDataToMap({
          datasets: {
            info: { label: "Empty", id: "traffic_flow_patterns" },
            data: { fields: [], rows: [] },
          },
          options: {
            centerMap: true,
            readOnly: false,
            keepExistingConfig: false,
          },
          config: {
            mapState: {
              latitude: 35.0456,
              longitude: -85.3097,
              zoom: 12,
              pitch: 0,
              bearing: 0,
            },
            mapStyle: { styleType: "dark" },
          },
        })
      )
    );
  }, [dispatch]);

  return (
    <div className="space-y-6 min-h-full pb-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Traffic Patterns</h1>
        <p className="text-muted-foreground mt-2">
          Visualize traffic flow patterns and congestion hotspots
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-card bg-zinc-950 border border-border rounded-lg p-6">
          <h3 className="font-semibold mb-4 text-white">Peak Traffic Hours</h3>
          {/* Adjust h-[500px] / w-full to whatever size you want — the map will follow */}
          <div ref={containerRef} className="h-[500px] w-full rounded overflow-hidden">
            <KeplerGL
              id="traffic_flow_patterns"
              mapboxApiAccessToken={process.env.REACT_APP_MAPBOX_API}
              width={dimensions.width}
              height={dimensions.height}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default AnalyticsTraffic
