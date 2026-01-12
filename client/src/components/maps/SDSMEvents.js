import React, { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import KeplerGl from "@kepler.gl/components";
import { addDataToMap, wrapTo } from "@kepler.gl/actions";
import { processGeojson } from "@kepler.gl/processors";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Label } from "../ui/label";
import { Slider } from "../ui/slider";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

// Intersection definitions
const INTERSECTIONS = [
  {
    id: "MLK_Georgia",
    name: "MLK & Georgia",
    center: [-85.3078627, 35.0455964],
  },
  {
    id: "MLK_Lindsay",
    name: "MLK & Lindsay",
    center: [-85.3078627, 35.0455964],
  },
];

function SDSMEventsMap() {
  const dispatch = useDispatch();
  const containerRef = useRef(null);
  const refreshIntervalRef = useRef(null);
  const updateCountRef = useRef(0);

  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  const [statusMessage, setStatusMessage] = useState("Loading SDSM events...");
  const [loading, setLoading] = useState(true);
  const [refreshRate, setRefreshRate] = useState(100); // 0.1 seconds default
  const [selectedIntersection, setSelectedIntersection] = useState("all");
  const [eventCount, setEventCount] = useState(0);

  // Hide scrollbars for this page
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = "auto");
  }, []);

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

  // Initialize base map once
  useEffect(() => {
    dispatch(
      wrapTo(
        "sdsm-events",
        addDataToMap({
          datasets: {
            info: { label: "Empty", id: "sdsm-events-init" },
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
              zoom: 16,
              pitch: 45,
              bearing: 0,
            },
            mapStyle: { styleType: "dark" },
          },
        })
      )
    );
  }, [dispatch]);

  // Fetch SDSM data
  const fetchSDSMData = async () => {
    try {
      console.log("Fetching data for intersection:", selectedIntersection);
      updateCountRef.current += 1;
      const currentUpdate = updateCountRef.current;

      let data;

      if (selectedIntersection === "all") {
        // Fetch from all intersections
        const promises = INTERSECTIONS.map(async (intersection) => {
          try {
            const response = await fetch(
              `${API_URL}/api/sdsm/latest/${intersection.id}`
            );
            if (!response.ok) return null;
            return await response.json();
          } catch (error) {
            console.error(`Error fetching ${intersection.id}:`, error);
            return null;
          }
        });

        const results = await Promise.all(promises);
        const validResults = results.filter((r) => r !== null);

        // Combine all objects from all intersections
        const allObjects = validResults.flatMap((result) =>
          result.objects.map((obj) => ({
            ...obj,
            intersectionID: result.intersectionID,
            intersection: result.intersection,
            timestamp: result.timestamp,
          }))
        );

        data = { objects: allObjects };
      } else {
        // Fetch from single intersection
        const response = await fetch(
          `${API_URL}/api/sdsm/latest/${selectedIntersection}`
        );
        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }
        data = await response.json();
      }

      if (!data.objects || data.objects.length === 0) {
        setStatusMessage("No active objects detected");
        setEventCount(0);
        return;
      }

      setEventCount(data.objects.length);

      // Convert to GeoJSON
      const featureCollection = {
        type: "FeatureCollection",
        features: data.objects.map((obj) => {
          const [latitude, longitude] = obj.location.coordinates;

          // Normalize type to lowercase for consistent color mapping
          const normalizedType = obj.type.toLowerCase();

          return {
            type: "Feature",
            properties: {
              objectID: obj.objectID,
              type: normalizedType,
              originalType: obj.type,
              timestamp: obj.timestamp,
              heading: obj.heading,
              speed: obj.speed,
              size_width: obj.size?.width || null,
              size_length: obj.size?.length || null,
              intersection: obj.intersection || data.intersection,
              intersectionID: obj.intersectionID || data.intersectionID,
              updateCount: currentUpdate,
            },
            geometry: {
              type: "Point",
              coordinates: [longitude, latitude],
            },
          };
        }),
      };

      const processed = processGeojson(featureCollection);

      // Use a unique dataset ID for each update to force Kepler to recognize the change
      const datasetId = `sdsm-events-${Date.now()}`;

      // Update map with new data - fully reconfigure each time to ensure updates
      dispatch(
        wrapTo(
          "sdsm-events",
          addDataToMap({
            datasets: {
              info: {
                label: "SDSM Real-Time Events",
                id: datasetId,
              },
              data: processed,
            },
            options: {
              centerMap: false,
              readOnly: false,
              keepExistingConfig: false, // Force reconfiguration to ensure updates
            },
            config: {
              visState: {
                layers: [
                  {
                    id: "sdsm-point-layer",
                    type: "point",
                    config: {
                      dataId: datasetId,
                      label: "SDSM Events",
                      columns: {
                        lat: "latitude",
                        lng: "longitude",
                        altitude: null,
                      },
                      isVisible: true,
                      visConfig: {
                        radius: 0.01,
                        fixedRadius: false,
                        opacity: 0.9,
                        outline: true,
                        thickness: 2,
                        strokeColor: [255, 255, 255],
                        colorRange: {
                          name: "Custom",
                          type: "custom",
                          category: "Custom",
                          colors: ["#00FF00", "#FF0000"], // green for vehicle, red for vru
                        },
                        radiusRange: [8, 25],
                        filled: true,
                        colorDomain: ["vehicle", "vru"],
                      },
                      hidden: false,
                      textLabel: [
                        {
                          field: null,
                          color: [255, 255, 255],
                          size: 18,
                          offset: [0, 0],
                          anchor: "start",
                          alignment: "center",
                        },
                      ],
                    },
                    visualChannels: {
                      colorField: {
                        name: "type",
                        type: "string",
                      },
                      colorScale: "ordinal",
                      sizeField: {
                        name: "speed",
                        type: "integer",
                      },
                      sizeScale: "linear",
                    },
                  },
                ],
                interactionConfig: {
                  tooltip: {
                    fieldsToShow: {
                      [datasetId]: [
                        { name: "objectID", format: null },
                        { name: "type", format: null },
                        { name: "originalType", format: null },
                        { name: "intersection", format: null },
                        { name: "speed", format: null },
                        { name: "heading", format: null },
                        { name: "timestamp", format: null },
                      ],
                    },
                    enabled: true,
                  },
                },
              },
            },
          })
        )
      );

      setStatusMessage("");
      setLoading(false);
    } catch (error) {
      console.error("Error fetching SDSM data:", error);
      setStatusMessage(`Error: ${error.message}`);
      setLoading(false);
      setEventCount(0);
    }
  };

  // Auto-refresh effect - always enabled
  useEffect(() => {
    fetchSDSMData(); // Initial fetch

    refreshIntervalRef.current = setInterval(() => {
      fetchSDSMData();
    }, refreshRate);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [refreshRate, selectedIntersection]);

  // Control panel - memoized to prevent unnecessary re-renders
  const ControlPanel = React.useMemo(() => (
    <Card
      className="absolute top-5 right-5 z-[1000] min-w-[300px] bg-black/85 text-white border-gray-700"
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">SDSM Events</CardTitle>
        <CardDescription className="text-gray-400 text-xs">
          Real-time vehicle and VRU tracking
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status */}
        <div className="rounded-md bg-white/10 p-3 space-y-1 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Active Objects:</span>
            <span className="font-bold text-green-500">{eventCount}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Refresh Rate:</span>
            <span className="font-bold">{refreshRate / 1000}s</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Updates:</span>
            <span className="font-bold text-blue-400">{updateCountRef.current}</span>
          </div>
        </div>

        {/* Intersection selector */}
        <div className="space-y-2">
          <Label htmlFor="intersection" className="text-xs text-gray-300">
            Intersection
          </Label>
          <select
            id="intersection"
            value={selectedIntersection}
            onChange={(e) => {
              console.log("Dropdown changed to:", e.target.value);
              setSelectedIntersection(e.target.value);
            }}
            className="flex h-9 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-black shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="all" className="bg-white text-black">All Intersections</option>
            {INTERSECTIONS.map((int) => (
              <option key={int.id} value={int.id} className="bg-white text-black">
                {int.name}
              </option>
            ))}
          </select>
        </div>

        {/* Refresh rate control */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="refresh-rate" className="text-xs text-gray-300">
              Refresh Rate
            </Label>
            <span className="text-xs font-medium">{refreshRate / 1000}s</span>
          </div>
          <Slider
            id="refresh-rate"
            min={100}
            max={10000}
            step={500}
            value={[refreshRate]}
            onValueChange={(value) => setRefreshRate(value[0])}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] text-gray-500">
            <span>0.1s</span>
            <span>10s</span>
          </div>
        </div>

        {/* Status message */}
        {statusMessage && (
          <div className="rounded-md bg-orange-500/20 p-3 text-xs text-orange-200">
            {statusMessage}
          </div>
        )}

        {/* Legend */}
        <div className="pt-4 border-t border-white/20 space-y-3">
          <div className="text-xs font-semibold">Legend:</div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white" />
            <span className="text-xs text-gray-300">Vehicle</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white" />
            <span className="text-xs text-gray-300">VRU (Pedestrian)</span>
          </div>
          <div className="text-[10px] text-gray-500 mt-2">
            * Size indicates speed
          </div>
        </div>
      </CardContent>
    </Card>
  ), [selectedIntersection, refreshRate, eventCount, statusMessage]);

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
      {ControlPanel}

      <KeplerGl
        id="sdsm-events"
        mapboxApiAccessToken={process.env.REACT_APP_MAPBOX_API}
        width={dimensions.width}
        height={dimensions.height}
      />
    </div>
  );
}

export default SDSMEventsMap;
