import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import KeplerGl from "@kepler.gl/components";
import { addDataToMap, wrapTo } from "@kepler.gl/actions";
import { processGeojson } from "@kepler.gl/processors";
import AutoSizer from "react-virtualized/dist/commonjs/AutoSizer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_API;
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

// Chattanooga, TN coordinates
const CHATTANOOGA_CENTER = {
  latitude: 35.0456,
  longitude: -85.3097,
  zoom: 13,
};

// Emerald Green color for all geofences
const GEOFENCE_COLOR = [46, 204, 113];

/**
 * GeoFencing Map - For creating and managing geofences
 * Loads geofences from PostGIS database and displays them on Kepler.gl
 */
function GeoFencingMap() {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedGeofence, setSelectedGeofence] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [contextMenu, setContextMenu] = useState(null);
  const loadedRef = useRef(false);
  const savingRef = useRef(false);
  const savedFeaturesRef = useRef(new Set());

  // Get Kepler.gl state to monitor editor and interactions
  const keplerGl = useSelector((state) => state.keplerGl?.geofencing);

  /**
   * Load geofences from database and add to map
   */
  const loadGeofences = async (shouldCenterMap = false) => {
    try {
      console.log("📡 Fetching geofences from:", `${API_URL}/api/geofences`);
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/geofences`);

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const geojson = await response.json();
      console.log("✅ Received geofences:", geojson);

      if (!geojson || geojson.type !== "FeatureCollection") {
        throw new Error("Invalid GeoJSON format received");
      }

      const featureCount = geojson.features?.length || 0;

      console.log(`📍 Loading ${featureCount} geofences to map...`);

      // Process GeoJSON using Kepler.gl's processor
      const processedData = processGeojson(geojson);
      console.log("🔄 Processed data:", processedData);

      // Wrap action with instance ID to scope it to this Kepler.gl instance
      dispatch(
        wrapTo(
          "geofencing",
          addDataToMap({
            datasets: {
              info: {
                label: "Geofences",
                id: "geofences",
              },
              data: processedData,
            },
            options: {
              centerMap: shouldCenterMap,
              readOnly: false,
            },
            config: {
              version: "v1",
              config: {
                visState: {
                  layers: [
                    {
                      id: "geofences-layer",
                      type: "geojson",
                      config: {
                        dataId: "geofences",
                        label: "Geofences",
                        color: GEOFENCE_COLOR,
                        columns: {
                          geojson: "_geojson",
                        },
                        isVisible: true,
                        visConfig: {
                          // Base opacity - you can change these values
                          opacity: 0.6,        // Fill opacity (0-1)
                          strokeOpacity: 0.9,  // Border opacity (0-1)
                          thickness: 2.5,      // Border thickness in pixels
                          strokeColor: GEOFENCE_COLOR,
                          stroked: true,
                          filled: true,
                          enable3d: false,
                          wireframe: false,
                        },
                      },
                    },
                  ],
                },
                mapState: {
                  latitude: CHATTANOOGA_CENTER.latitude,
                  longitude: CHATTANOOGA_CENTER.longitude,
                  zoom: CHATTANOOGA_CENTER.zoom,
                },
              },
            },
          })
        )
      );

      loadedRef.current = true;
      console.log(`✓ Successfully loaded ${featureCount} geofences`);

      setLoading(false);
    } catch (err) {
      console.error("❌ Error loading geofences:", err);

      let errorMessage = err.message;
      if (err.message.includes("Failed to fetch")) {
        errorMessage = `Cannot connect to backend at ${API_URL}. Make sure the server is running.`;
      }

      setError(errorMessage);
      setLoading(false);
    }
  };

  /**
   * Save a drawn polygon to the database
   */
  const saveGeofence = async (feature) => {
    if (savingRef.current) {
      console.log("⏸️ Save already in progress, skipping...");
      return;
    }

    const featureKey = JSON.stringify(feature.geometry.coordinates);

    if (savedFeaturesRef.current.has(featureKey)) {
      console.log("⏭️ Feature already saved, skipping...");
      return;
    }

    try {
      savingRef.current = true;
      savedFeaturesRef.current.add(featureKey);

      console.log("💾 Saving geofence to database...", feature);

      const geofenceData = {
        name: `Geofence ${Date.now()}`,
        description: "Created via Kepler.gl",
        geofence_type: "zone",
        geometry: feature.geometry,
        metadata: {
          created_by: "kepler_gl",
          isClosed: true,
          coordinates: feature.geometry.coordinates,
        },
      };

      const response = await fetch(`${API_URL}/api/geofences`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(geofenceData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save geofence");
      }

      const savedGeofence = await response.json();
      console.log("✅ Geofence saved successfully:", savedGeofence);

      // Reload the page to show the new geofence
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err) {
      console.error("❌ Error saving geofence:", err);
      setError(`Failed to save: ${err.message}`);
      // Remove from saved set on failure
      savedFeaturesRef.current.delete(featureKey);
      savingRef.current = false;
    }
  };

  /**
   * Delete a geofence from the database
   */
  const deleteGeofence = async (geofenceId) => {
    try {
      console.log(`🗑️ Deleting geofence ID: ${geofenceId}`);

      const response = await fetch(`${API_URL}/api/geofences/${geofenceId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete geofence");
      }

      const result = await response.json();
      console.log("✅ Geofence deleted successfully:", result);

      // Reload the page to update the map
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err) {
      console.error("❌ Error deleting geofence:", err);
      setError(`Failed to delete: ${err.message}`);
    }
  };

  /**
   * Rename a geofence in the database
   */
  const renameGeofence = async (geofenceId, newName) => {
    try {
      console.log(`✏️ Renaming geofence ID: ${geofenceId} to "${newName}"`);

      const response = await fetch(`${API_URL}/api/geofences/${geofenceId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newName }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to rename geofence");
      }

      const result = await response.json();
      console.log("✅ Geofence renamed successfully:", result);

      // Reload the page to update the map
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err) {
      console.error("❌ Error renaming geofence:", err);
      setError(`Failed to rename: ${err.message}`);
    }
  };

  /**
   * Handle right-click on geofence
   */
  const handleContextMenu = (e) => {
    // Check if we clicked on a geofence by checking Kepler state
    const clicked = keplerGl?.visState?.clicked;
    if (clicked?.object?.properties?.id) {
      e.preventDefault();
      const geofence = {
        id: clicked.object.properties.id,
        name: clicked.object.properties.name,
      };
      console.log("🎯 Right-clicked geofence:", geofence);
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        geofence,
      });
    }
  };

  /**
   * Close context menu
   */
  const closeContextMenu = () => {
    setContextMenu(null);
  };

  /**
   * Handle delete from context menu
   */
  const handleDeleteClick = () => {
    if (contextMenu?.geofence) {
      setSelectedGeofence(contextMenu.geofence);
      setDeleteDialogOpen(true);
      closeContextMenu();
    }
  };

  /**
   * Handle rename from context menu
   */
  const handleRenameClick = () => {
    if (contextMenu?.geofence) {
      setSelectedGeofence(contextMenu.geofence);
      setNewName(contextMenu.geofence.name);
      setRenameDialogOpen(true);
      closeContextMenu();
    }
  };

  /**
   * Confirm deletion
   */
  const handleConfirmDelete = () => {
    if (selectedGeofence) {
      deleteGeofence(selectedGeofence.id);
    }
    setDeleteDialogOpen(false);
  };

  /**
   * Cancel deletion
   */
  const handleCancelDelete = () => {
    setSelectedGeofence(null);
    setDeleteDialogOpen(false);
  };

  /**
   * Confirm rename
   */
  const handleConfirmRename = () => {
    if (selectedGeofence && newName.trim()) {
      renameGeofence(selectedGeofence.id, newName.trim());
    }
    setRenameDialogOpen(false);
  };

  /**
   * Cancel rename
   */
  const handleCancelRename = () => {
    setSelectedGeofence(null);
    setNewName("");
    setRenameDialogOpen(false);
  };

  // Hide scrollbars
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  // Close context menu on any click
  useEffect(() => {
    const handleClick = () => closeContextMenu();
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  // Load geofences on mount (center map on first load)
  useEffect(() => {
    loadGeofences(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Monitor Kepler.gl editor for drawn polygons
  useEffect(() => {
    if (!keplerGl?.visState?.editor) return;

    const editor = keplerGl.visState.editor;
    const features = editor.features || [];

    // Check for completed polygons
    const polygons = features.filter(
      (f) => f.geometry?.type === "Polygon" && f.geometry.coordinates
    );

    if (polygons.length > 0) {
      // Get the most recently added polygon
      const latestPolygon = polygons[polygons.length - 1];
      const featureKey = JSON.stringify(latestPolygon.geometry.coordinates);

      // Only save if we haven't saved this exact polygon before
      if (!savedFeaturesRef.current.has(featureKey)) {
        console.log("🆕 New polygon detected in editor");
        saveGeofence(latestPolygon);
      }
    }
  }, [keplerGl?.visState?.editor?.features]);

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        overflow: "hidden",
        position: "relative",
      }}
      onContextMenu={handleContextMenu}
    >
      {/* Error Message */}
      {error && (
        <div
          style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            zIndex: 1000,
            background: "rgba(220, 53, 69, 0.95)",
            padding: "12px 16px",
            borderRadius: "8px",
            color: "white",
            maxWidth: "300px",
            fontSize: "13px",
            border: "1px solid rgba(255, 255, 255, 0.2)",
          }}
        >
          {error}
          <button
            onClick={() => setError(null)}
            style={{
              marginLeft: "10px",
              background: "white",
              color: "#dc3545",
              border: "none",
              padding: "4px 8px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "11px",
              fontWeight: "600",
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          style={{
            position: "fixed",
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 10000,
            background: "rgba(20, 20, 20, 0.95)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            borderRadius: "6px",
            padding: "4px",
            minWidth: "160px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(10px)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleRenameClick}
            style={{
              width: "100%",
              padding: "8px 12px",
              background: "transparent",
              border: "none",
              color: "#3b82f6",
              textAlign: "left",
              cursor: "pointer",
              borderRadius: "4px",
              fontSize: "13px",
              fontWeight: "500",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => e.target.style.background = "rgba(59, 130, 246, 0.1)"}
            onMouseLeave={(e) => e.target.style.background = "transparent"}
          >
            <span>✏️</span>
            Rename
          </button>
          <button
            onClick={handleDeleteClick}
            style={{
              width: "100%",
              padding: "8px 12px",
              background: "transparent",
              border: "none",
              color: "#ef4444",
              textAlign: "left",
              cursor: "pointer",
              borderRadius: "4px",
              fontSize: "13px",
              fontWeight: "500",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => e.target.style.background = "rgba(239, 68, 68, 0.1)"}
            onMouseLeave={(e) => e.target.style.background = "transparent"}
          >
            <span>🗑️</span>
            Delete
          </button>
        </div>
      )}

      {/* Rename Dialog */}
      <AlertDialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <AlertDialogContent className="dark bg-zinc-900 border-zinc-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white text-lg">
              Rename Geofence
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Enter a new name for "{selectedGeofence?.name}"
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleConfirmRename();
                }
              }}
              placeholder="Geofence name"
              autoFocus
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "#27272a",
                border: "1px solid #3f3f46",
                borderRadius: "6px",
                color: "white",
                fontSize: "14px",
                outline: "none",
              }}
              onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
              onBlur={(e) => e.target.style.borderColor = "#3f3f46"}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={handleCancelRename}
              className="bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRename}
              className="bg-blue-600 text-white hover:bg-blue-700"
              disabled={!newName.trim()}
            >
              Rename
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="dark bg-zinc-900 border-zinc-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white text-lg">
              Delete Geofence?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Are you sure you want to delete "{selectedGeofence?.name}"? This
              action cannot be undone and will permanently remove the geofence
              from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={handleCancelDelete}
              className="bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Kepler.gl Map */}
      <AutoSizer>
        {({ height, width }) => (
          <KeplerGl
            id="geofencing"
            mapboxApiAccessToken={MAPBOX_TOKEN}
            width={width}
            height={height}
          />
        )}
      </AutoSizer>
    </div>
  );
}

export default GeoFencingMap;
