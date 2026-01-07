import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/shadcn/button"
import { Badge } from "@/components/ui/shadcn/badge"
import { useNavigate } from "react-router-dom"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Empty,
  EmptyIcon,
  EmptyTitle,
  EmptyDescription,
  EmptyAction,
} from "@/components/ui/shadcn/empty"
import { MapPin } from "lucide-react"

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001"
const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_API

export function GeofenceZones() {
  const navigate = useNavigate()
  const [geofences, setGeofences] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedGeofence, setSelectedGeofence] = useState(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [expandedCoordinates, setExpandedCoordinates] = useState(null)

  useEffect(() => {
    fetchGeofences()
  }, [])

  const fetchGeofences = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/api/geofences`)

      if (!response.ok) {
        throw new Error('Failed to fetch geofences')
      }

      const data = await response.json()

      // Extract features from GeoJSON FeatureCollection
      if (data.type === 'FeatureCollection' && data.features) {
        setGeofences(data.features)
      } else {
        setGeofences([])
      }
    } catch (err) {
      console.error('Error fetching geofences:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNew = () => {
    navigate('/geofencing')
  }

  const handleDeleteClick = (geofence) => {
    setSelectedGeofence(geofence)
    setDeleteDialogOpen(true)
  }

  const handleRenameClick = (geofence) => {
    setSelectedGeofence(geofence)
    setNewName(geofence.properties.name)
    setRenameDialogOpen(true)
  }

  const deleteGeofence = async (geofenceId) => {
    try {
      const response = await fetch(`${API_URL}/api/geofences/${geofenceId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete geofence")
      }

      console.log("✅ Geofence deleted successfully")

      // Refresh the list
      await fetchGeofences()
    } catch (err) {
      console.error("❌ Error deleting geofence:", err)
      setError(`Failed to delete: ${err.message}`)
    }
  }

  const renameGeofence = async (geofenceId, newName) => {
    try {
      const response = await fetch(`${API_URL}/api/geofences/${geofenceId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newName }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to rename geofence")
      }

      console.log("✅ Geofence renamed successfully")

      // Refresh the list
      await fetchGeofences()
    } catch (err) {
      console.error("❌ Error renaming geofence:", err)
      setError(`Failed to rename: ${err.message}`)
    }
  }

  const handleConfirmDelete = () => {
    if (selectedGeofence) {
      deleteGeofence(selectedGeofence.id)
    }
    setDeleteDialogOpen(false)
    setSelectedGeofence(null)
  }

  const handleCancelDelete = () => {
    setSelectedGeofence(null)
    setDeleteDialogOpen(false)
  }

  const handleConfirmRename = () => {
    if (selectedGeofence && newName.trim()) {
      renameGeofence(selectedGeofence.id, newName.trim())
    }
    setRenameDialogOpen(false)
    setSelectedGeofence(null)
    setNewName("")
  }

  const handleCancelRename = () => {
    setSelectedGeofence(null)
    setNewName("")
    setRenameDialogOpen(false)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-500 border-green-500/20'
      case 'inactive':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
      case 'archived':
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
      default:
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
    }
  }

  const getTypeLabel = (type) => {
    const labels = {
      zone: 'Zone',
      corridor: 'Corridor',
      intersection: 'Intersection',
      alert_area: 'Alert Area'
    }
    return labels[type] || type
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getCoordinateCount = (geometry) => {
    if (geometry?.type === 'Polygon' && geometry.coordinates?.[0]) {
      return geometry.coordinates[0].length - 1 // Subtract 1 because first and last are the same
    }
    return 0
  }

  const toggleCoordinates = (featureId) => {
    setExpandedCoordinates(expandedCoordinates === featureId ? null : featureId)
  }

  const getGeofenceSnapshotUrl = (geometry) => {
    if (!MAPBOX_TOKEN || !geometry || geometry.type !== 'Polygon') {
      console.warn('Missing token or invalid geometry for snapshot')
      return null
    }

    try {
      // Get polygon coordinates
      const coordinates = geometry.coordinates[0]
      if (!coordinates || coordinates.length === 0) {
        return null
      }

      // Calculate bounding box
      let minLng = Infinity, maxLng = -Infinity
      let minLat = Infinity, maxLat = -Infinity

      coordinates.forEach(([lng, lat]) => {
        if (lng < minLng) minLng = lng
        if (lng > maxLng) maxLng = lng
        if (lat < minLat) minLat = lat
        if (lat > maxLat) maxLat = lat
      })

      // Calculate center point
      const centerLng = (minLng + maxLng) / 2
      const centerLat = (minLat + maxLat) / 2

      // Calculate zoom level based on bounding box size
      const lngDiff = maxLng - minLng
      const latDiff = maxLat - minLat
      const maxDiff = Math.max(lngDiff, latDiff)

      let zoom = 13
      if (maxDiff > 0.1) zoom = 9
      else if (maxDiff > 0.05) zoom = 11
      else if (maxDiff > 0.01) zoom = 13
      else if (maxDiff > 0.005) zoom = 14
      else zoom = 14

      // Create GeoJSON for overlay
      const geojson = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [coordinates]
          },
          properties: {
            stroke: '#3b82f6',
            'stroke-width': 2,
            'stroke-opacity': 1,
            fill: '#3b82f6',
            'fill-opacity': 0.3
          }
        }]
      }

      // Create overlay path for Mapbox Static API
      const overlayPath = `geojson(${encodeURIComponent(JSON.stringify(geojson))})`

      // Construct URL: /styles/v1/{style}/{overlay}/{lon},{lat},{zoom},{bearing},{pitch}/{width}x{height}{@2x}
      const url = `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${overlayPath}/${centerLng},${centerLat},${zoom},0,0/400x200@2x?access_token=${MAPBOX_TOKEN}&attribution=false&logo=false`

      console.log('Generated snapshot URL:', url.substring(0, 100) + '...')
      console.log('Center:', centerLng, centerLat, 'Zoom:', zoom)
      return url
    } catch (err) {
      console.error('Error generating snapshot URL:', err)
      return null
    }
  }

  return (
    <div className="space-y-6 min-h-full pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Geofence Zones</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage geographic boundaries for location-based monitoring
          </p>
        </div>
        <Button onClick={handleCreateNew}>Create New Zone</Button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading geofences...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-center">
          <p className="text-red-500 font-semibold mb-2">Error Loading Geofences</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={fetchGeofences} className="mt-4" variant="outline">
            Retry
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && geofences.length === 0 && (
        <Empty className="bg-black border-neutral-800">
          <EmptyIcon className="bg-neutral-900">
            <MapPin className="h-6 w-6 text-muted-foreground" />
          </EmptyIcon>
          <EmptyTitle className="text-white">No geofences found</EmptyTitle>
          <EmptyDescription>
            Get started by creating your first geofence zone to monitor geographic boundaries.
          </EmptyDescription>
          <EmptyAction>
            <Button onClick={handleCreateNew}>Create Your First Zone</Button>
          </EmptyAction>
        </Empty>
      )}

      {/* Geofence Grid */}
      {!loading && !error && geofences.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {geofences.map((feature) => {
            const props = feature.properties
            const coordinateCount = getCoordinateCount(feature.geometry)
            const coordinates = props.metadata?.coordinates || feature.geometry?.coordinates
            const snapshotUrl = getGeofenceSnapshotUrl(feature.geometry)
            const isExpanded = expandedCoordinates === feature.id

            return (
              <div
                key={feature.id}
                className="bg-black border border-neutral-800 shadow-[0_4px_6px_rgba(255,255,255,0.3)] rounded-lg overflow-hidden hover:border-primary/50 transition-colors"
              >
                {/* Snapshot Image */}
                {snapshotUrl && (
                  <div className="w-full h-48 bg-neutral-900 relative overflow-hidden">
                    <img
                      src={snapshotUrl}
                      alt={`Map preview of ${props.name}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none'
                        e.target.parentElement.innerHTML = '<div class="flex items-center justify-center h-full text-muted-foreground text-sm">Map preview unavailable</div>'
                      }}
                    />
                  </div>
                )}

                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-lg text-white">{props.name}</h3>
                    <Badge className={getStatusColor(props.status)}>
                      {props.status}
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground mb-4">
                    {props.description || 'No description'}
                  </p>

                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <span className="font-medium text-white">{getTypeLabel(props.geofence_type)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Coordinates:</span>
                      <span className="font-medium text-white">{coordinateCount} points</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created by:</span>
                      <span className="font-medium text-white">
                        {props.created_by_first_name
                          ? `${props.created_by_first_name} ${props.created_by_last_name || ''}`
                          : props.created_by_username || 'Unknown'}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 mb-3">
                    <Button
                      onClick={() => handleRenameClick(feature)}
                      variant="outline"
                      size="sm"
                      className="flex-1 bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700"
                    >
                      Rename
                    </Button>
                    <Button
                      onClick={() => handleDeleteClick(feature)}
                      variant="outline"
                      size="sm"
                      className="flex-1 bg-red-600/10 text-red-500 border-red-500/20 hover:bg-red-600/20"
                    >
                      Delete
                    </Button>
                  </div>

                  {/* Show coordinate preview if available */}
                  {coordinates && coordinates[0] && (
                    <div className="mt-2">
                      <button
                        onClick={() => toggleCoordinates(feature.id)}
                        className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                      >
                        {isExpanded ? '▼' : '▶'} View Coordinates
                      </button>
                      {isExpanded && (
                        <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto text-white">
                          {JSON.stringify(coordinates, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
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
              Enter a new name for "{selectedGeofence?.properties?.name}"
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter new name"
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newName.trim()) {
                  handleConfirmRename()
                }
              }}
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
              Are you sure you want to delete "{selectedGeofence?.properties?.name}"? This
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
    </div>
  )
}

export default GeofenceZones
