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
import { MapPin, Trash2, FileJson, Layers, Upload, Eye } from "lucide-react"
import { Input } from "@/components/ui/shadcn/input"
import IntersectionPreviewMap from "@/components/maps/IntersectionPreviewMap"

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001"

export function GeofenceZones() {
  const navigate = useNavigate()
  const [intersections, setIntersections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [mapDataView, setMapDataView] = useState(null)
  const [importOpen, setImportOpen] = useState(false)
  const [importJson, setImportJson] = useState("")
  const [importName, setImportName] = useState("")
  const [importPreview, setImportPreview] = useState(null)
  const [importing, setImporting] = useState(false)

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

  const previewImport = async () => {
    try {
      const res = await fetch(`${API_URL}/api/intersections/import/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapData: importJson }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setImportPreview(data)
    } catch (err) {
      setError(err.message)
      setTimeout(() => setError(null), 3000)
    }
  }

  const doImport = async () => {
    try {
      setImporting(true)
      const res = await fetch(`${API_URL}/api/intersections/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapData: importJson, name: importName || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setImportOpen(false)
      setImportJson("")
      setImportName("")
      setImportPreview(null)
      await fetchIntersections()
    } catch (err) {
      setError(err.message)
      setTimeout(() => setError(null), 3000)
    } finally {
      setImporting(false)
    }
  }

  const resetImport = () => {
    setImportOpen(false)
    setImportJson("")
    setImportName("")
    setImportPreview(null)
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import MAP
          </Button>
          <Button onClick={() => navigate("/geofencing")}>Open Map Editor</Button>
        </div>
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

      {/* Import MAP Dialog */}
      <AlertDialog open={importOpen} onOpenChange={resetImport}>
        <AlertDialogContent className="dark bg-zinc-900 border-zinc-800 text-white max-w-3xl max-h-[90vh] overflow-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Import MAP Message</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Paste a SAE J2735 MAP message JSON to import an intersection with lanes.
              Delta coordinates will be automatically converted to WGS-84.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="import-name" className="text-sm text-zinc-300">
                Intersection Name (optional)
              </label>
              <Input
                id="import-name"
                value={importName}
                onChange={(e) => setImportName(e.target.value)}
                placeholder="e.g., MLK / Central Ave"
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="import-json" className="text-sm text-zinc-300">
                MAP Message JSON
              </label>
              <textarea
                id="import-json"
                value={importJson}
                onChange={(e) => {
                  setImportJson(e.target.value)
                  setImportPreview(null)
                }}
                placeholder='{"messageId": 18, "value": ["MapData", {...}]}'
                className="w-full bg-zinc-800 border border-zinc-700 text-white font-mono text-xs min-h-[200px] rounded-md p-3 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {importPreview && (
              <div className="bg-zinc-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-green-400">
                  <Eye className="h-4 w-4" />
                  <span className="font-semibold">Preview</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-zinc-400">Reference Point:</span>
                    <p className="text-white font-mono">
                      {importPreview.refPoint?.lat?.toFixed(7)}, {importPreview.refPoint?.lon?.toFixed(7)}
                    </p>
                  </div>
                  <div>
                    <span className="text-zinc-400">Intersection ID:</span>
                    <p className="text-white">
                      {importPreview.intersectionId?.region || 0}:{importPreview.intersectionId?.id || 0}
                    </p>
                  </div>
                </div>
                <div className="text-sm">
                  <span className="text-zinc-400">Lanes to import:</span>
                  <span className="text-white ml-2">
                    {importPreview.summary?.totalLanes} total
                    ({importPreview.summary?.vehicleLanes} vehicle, {importPreview.summary?.crosswalks} crosswalk)
                  </span>
                </div>
                {importPreview.lanes?.length > 0 && (
                  <div className="text-xs max-h-32 overflow-auto bg-zinc-900 rounded p-2">
                    <table className="w-full">
                      <thead>
                        <tr className="text-zinc-400 border-b border-zinc-700">
                          <th className="text-left py-1">Lane</th>
                          <th className="text-left py-1">Type</th>
                          <th className="text-left py-1">Start</th>
                          <th className="text-left py-1">End</th>
                        </tr>
                      </thead>
                      <tbody className="text-zinc-300 font-mono">
                        {importPreview.lanes.slice(0, 10).map((lane) => (
                          <tr key={lane.laneID} className="border-b border-zinc-800">
                            <td className="py-1">{lane.laneID}</td>
                            <td className="py-1">{lane.laneType}</td>
                            <td className="py-1">
                              {lane.startPoint?.[1]?.toFixed(5)}, {lane.startPoint?.[0]?.toFixed(5)}
                            </td>
                            <td className="py-1">
                              {lane.endPoint?.[1]?.toFixed(5)}, {lane.endPoint?.[0]?.toFixed(5)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {importPreview.lanes?.length > 10 && (
                      <p className="text-zinc-500 mt-1">...and {importPreview.lanes.length - 10} more lanes</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <AlertDialogFooter className="flex gap-2">
            <AlertDialogCancel className="bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700">
              Cancel
            </AlertDialogCancel>
            <Button
              onClick={previewImport}
              variant="outline"
              disabled={!importJson.trim()}
              className="bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700"
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button
              onClick={doImport}
              disabled={!importJson.trim() || importing}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {importing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default GeofenceZones
