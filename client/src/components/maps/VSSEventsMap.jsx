/**
 * VSSEventsMap — Live map overlay of NVIDIA VSS-detected events.
 *
 * Uses Google Maps API via @vis.gl/react-google-maps.
 * TODO: Install the library:  npm install @vis.gl/react-google-maps
 * TODO: Set REACT_APP_GOOGLE_MAPS_API_KEY in client/.env
 *
 * This component is part of the Google Maps migration
 * (branch: andres/GoogleMapsMigration). Do NOT use Mapbox here.
 */

import React, { useState, useEffect, useRef, useCallback } from "react"
import { APIProvider, Map, AdvancedMarker, InfoWindow } from "@vis.gl/react-google-maps"
import { fetchCameras, fetchEventsGeoJSON } from "@/services/vss/vss"

// TODO: confirm center coordinates match your deployment area
const DEFAULT_CENTER = { lat: 38.9, lng: -77.03 }
const DEFAULT_ZOOM   = 14

// TODO: map your real event_type values to colors
const EVENT_TYPE_COLORS = {
    default:         "#6366f1",
    // "tripwire_cross": "#ef4444",
    // "roi_entry":     "#f97316",
    // "roi_exit":      "#22c55e",
    // "anomaly":       "#a855f7",
}

function markerColor(eventType) {
    return EVENT_TYPE_COLORS[eventType] ?? EVENT_TYPE_COLORS.default
}

export default function VSSEventsMap() {
    const [cameras, setCameras]               = useState([])
    const [selectedCamera, setSelectedCamera] = useState("all")
    const [features, setFeatures]             = useState([])
    const [refreshRate, setRefreshRate]       = useState(10_000)
    const [status, setStatus]                 = useState("Waiting…")
    const [selectedFeature, setSelectedFeature] = useState(null)
    const intervalRef = useRef(null)

    useEffect(() => {
        fetchCameras()
            .then(setCameras)
            .catch((err) => setStatus(`Camera load error: ${err.message}`))
    }, [])

    const loadEvents = useCallback(async () => {
        const camera = selectedCamera === "all" ? cameras[0]?.id : selectedCamera
        if (!camera) return

        try {
            const geojson = await fetchEventsGeoJSON(camera)
            setFeatures(geojson.features || [])
            setStatus(`${geojson.features?.length ?? 0} events · updated ${new Date().toLocaleTimeString()}`)
        } catch (err) {
            setStatus(`Error: ${err.message}`)
        }
    }, [selectedCamera, cameras])

    useEffect(() => {
        if (intervalRef.current) clearInterval(intervalRef.current)
        loadEvents()
        intervalRef.current = setInterval(loadEvents, refreshRate)
        return () => clearInterval(intervalRef.current)
    }, [loadEvents, refreshRate])

    const googleMapsApiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || ""

    return (
        <div className="flex flex-col h-screen bg-background">
            {/* Toolbar */}
            <div className="flex items-center gap-4 px-4 py-3 border-b border-border bg-card">
                <h1 className="text-sm font-semibold text-foreground">VSS Live Map</h1>

                <select
                    className="rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground"
                    value={selectedCamera}
                    onChange={(e) => setSelectedCamera(e.target.value)}
                >
                    <option value="all">All cameras</option>
                    {cameras.map((c) => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                </select>

                <div className="flex items-center gap-2 ml-auto">
                    <span className="text-xs text-muted-foreground">Refresh</span>
                    <input
                        type="range"
                        min={2000}
                        max={30_000}
                        step={1000}
                        value={refreshRate}
                        onChange={(e) => setRefreshRate(Number(e.target.value))}
                        className="w-24"
                    />
                    <span className="text-xs text-muted-foreground">{refreshRate / 1000}s</span>
                </div>

                <span className="text-xs text-muted-foreground">{status}</span>
            </div>

            {/* Map */}
            {/* TODO: replace with your actual Google Maps API key env var name if different */}
            <APIProvider apiKey={googleMapsApiKey}>
                <Map
                    defaultCenter={DEFAULT_CENTER}
                    defaultZoom={DEFAULT_ZOOM}
                    mapId="vss-events-map"
                    className="flex-1"
                >
                    {features.map((feature) => {
                        const [lng, lat] = feature.geometry.coordinates
                        const props      = feature.properties
                        return (
                            <AdvancedMarker
                                key={props.id}
                                position={{ lat, lng }}
                                onClick={() => setSelectedFeature(feature)}
                            >
                                {/* Colored circle dot per event type */}
                                <div
                                    style={{
                                        width: 14,
                                        height: 14,
                                        borderRadius: "50%",
                                        background: markerColor(props.event_type),
                                        border: "2px solid white",
                                        boxShadow: "0 0 4px rgba(0,0,0,0.5)",
                                    }}
                                />
                            </AdvancedMarker>
                        )
                    })}

                    {selectedFeature && (
                        <InfoWindow
                            position={{
                                lat: selectedFeature.geometry.coordinates[1],
                                lng: selectedFeature.geometry.coordinates[0],
                            }}
                            onCloseClick={() => setSelectedFeature(null)}
                        >
                            <div className="text-xs space-y-1 max-w-xs">
                                <p className="font-semibold">{selectedFeature.properties.event_type}</p>
                                <p className="text-gray-500">{new Date(selectedFeature.properties.timestamp).toLocaleString()}</p>
                                {selectedFeature.properties.description && (
                                    <p>{selectedFeature.properties.description}</p>
                                )}
                                {selectedFeature.properties.confidence != null && (
                                    <p>Confidence: {(selectedFeature.properties.confidence * 100).toFixed(1)}%</p>
                                )}
                            </div>
                        </InfoWindow>
                    )}
                </Map>
            </APIProvider>
        </div>
    )
}
