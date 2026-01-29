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
} from "@/components/ui/shadcn/alert-dialog"
import {
  Empty,
  EmptyIcon,
  EmptyTitle,
  EmptyDescription,
  EmptyAction,
} from "@/components/ui/shadcn/empty"
import { MapPin, Trash2, FileJson, Layers } from "lucide-react"
import IntersectionPreviewMap from "@/components/maps/IntersectionPreviewMap"

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001"

export function GeofenceZones() {
  const navigate = useNavigate()
  const [intersections, setIntersections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [mapDataView, setMapDataView] = useState(null)

  useEffect(() => {
    fetchIntersections()
  }, [])

  const fetchIntersections = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_URL}/api/intersections`)
      if (!res.ok) throw new Error("Failed to fetch intersections")
      const data = await res.json()
      // For each intersection, also fetch lane/crosswalk counts
      const enriched = await Promise.all(
        data.map(async (int) => {
          const [lanesRes, cwRes] = await Promise.all([
            fetch(`${API_URL}/api/lanes?intersection_id=${int.id}`),
            fetch(`${API_URL}/api/crosswalks?intersection_id=${int.id}`),
          ])
          const lanes = await lanesRes.json()
          const crosswalks = await cwRes.json()
          return { ...int, lanes, crosswalks, laneCount: lanes.length, crosswalkCount: crosswalks.length }
        })
      )
      setIntersections(enriched)
    } catch (err) {
      console.error("Error fetching intersections:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const deleteIntersection = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/intersections/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      setDeleteTarget(null)
      await fetchIntersections()
    } catch (err) {
      console.error("Error deleting:", err)
      setError(err.message)
    }
  }

  const viewMapData = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/intersections/${id}/mapdata`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      const data = await res.json()
      setMapDataView(data)
    } catch (err) {
      setError(err.message)
      setTimeout(() => setError(null), 3000)
    }
  }

  return (
    <div className="space-y-6 min-h-full pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Intersections</h1>
          <p className="text-muted-foreground mt-2">
            V2X MAP data collection - manage intersections, lanes, and crosswalks
          </p>
        </div>
        <Button onClick={() => navigate("/geofencing")}>Open Map Editor</Button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Loading intersections...</p>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-center">
          <p className="text-red-500 font-semibold mb-2">Error</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={fetchIntersections} className="mt-4" variant="outline">
            Retry
          </Button>
        </div>
      )}

      {!loading && !error && intersections.length === 0 && (
        <Empty className="bg-black border-neutral-800">
          <EmptyIcon className="bg-neutral-900">
            <MapPin className="h-6 w-6 text-muted-foreground" />
          </EmptyIcon>
          <EmptyTitle className="text-white">No intersections configured</EmptyTitle>
          <EmptyDescription>
            Open the map editor to create your first intersection with lanes and crosswalks.
          </EmptyDescription>
          <EmptyAction>
            <Button onClick={() => navigate("/geofencing")}>Open Map Editor</Button>
          </EmptyAction>
        </Empty>
      )}

      {!loading && !error && intersections.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {intersections.map((int) => {
            const coords = int.ref_point?.coordinates
            return (
              <div
                key={int.id}
                className="bg-black border border-neutral-800 rounded-lg overflow-hidden hover:border-primary/50 transition-colors"
              >
                {coords && (
                  <IntersectionPreviewMap
                    center={[coords[0], coords[1]]}
                    lanes={int.lanes || []}
                    crosswalks={int.crosswalks || []}
                    className="w-full h-48"
                  />
                )}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-lg text-white">{int.name}</h3>
                    <Badge
                      className={
                        int.status === "confirmed"
                          ? "bg-green-500/10 text-green-500 border-green-500/20"
                          : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                      }
                    >
                      {int.status}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Intersection ID:</span>
                      <span className="font-medium text-white">{int.intersection_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Revision:</span>
                      <span className="font-medium text-white">{int.msg_issue_revision}</span>
                    </div>
                    {coords && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Ref Point:</span>
                        <span className="font-medium text-white text-xs">
                          {coords[1].toFixed(5)}, {coords[0].toFixed(5)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Lanes:</span>
                      <span className="font-medium text-white">{int.laneCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Crosswalks:</span>
                      <span className="font-medium text-white">{int.crosswalkCount}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => navigate("/geofencing")}
                      variant="outline"
                      size="sm"
                      className="flex-1 bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700"
                    >
                      <Layers className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                    {int.status === "confirmed" && (
                      <Button
                        onClick={() => viewMapData(int.id)}
                        variant="outline"
                        size="sm"
                        className="bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700"
                      >
                        <FileJson className="h-3.5 w-3.5 mr-1" />
                        JSON
                      </Button>
                    )}
                    <Button
                      onClick={() => setDeleteTarget(int)}
                      variant="outline"
                      size="sm"
                      className="bg-red-600/10 text-red-500 border-red-500/20 hover:bg-red-600/20"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="dark bg-zinc-900 border-zinc-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Intersection?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              This will permanently delete "{deleteTarget?.name}" and all its lanes and crosswalks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteIntersection(deleteTarget.id)}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* MapData Viewer Dialog */}
      <AlertDialog open={!!mapDataView} onOpenChange={() => setMapDataView(null)}>
        <AlertDialogContent className="dark bg-zinc-900 border-zinc-800 text-white max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">MapData JSON Export</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Revision {mapDataView?.revision} - Exported {mapDataView?.exported_at ? new Date(mapDataView.exported_at).toLocaleString() : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <pre className="text-xs text-zinc-300 bg-zinc-800 rounded p-3 overflow-auto max-h-96 whitespace-pre-wrap">
            {mapDataView ? JSON.stringify(mapDataView.map_data_json, null, 2) : ""}
          </pre>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700">
              Close
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(mapDataView?.map_data_json, null, 2))
              }}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              Copy JSON
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default GeofenceZones
