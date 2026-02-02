import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/shadcn/button"
import { Badge } from "@/components/ui/shadcn/badge"
import { Input } from "@/components/ui/shadcn/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/shadcn/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/shadcn/table"
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
import { Pencil, Trash2, Search, ArrowRight } from "lucide-react"

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001"

const LANE_TYPES = ["Vehicle", "Crosswalk", "Bike", "Sidewalk", "Parking"]

const LANE_TYPE_COLORS = {
  Vehicle: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Crosswalk: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  Bike: "bg-green-500/10 text-green-400 border-green-500/20",
  Sidewalk: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  Parking: "bg-purple-500/10 text-purple-400 border-purple-500/20",
}

export default function LanesPage() {
  const [lanes, setLanes] = useState([])
  const [intersections, setIntersections] = useState([])
  const [connections, setConnections] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterIntersection, setFilterIntersection] = useState("")
  const [filterType, setFilterType] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [editLane, setEditLane] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteConnTarget, setDeleteConnTarget] = useState(null)
  const [newConn, setNewConn] = useState(null) // { intersection_id, from_lane_id, to_lane_id, signal_group }

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [lanesRes, intRes, connRes] = await Promise.all([
        fetch(`${API_URL}/api/lanes`),
        fetch(`${API_URL}/api/intersections`),
        fetch(`${API_URL}/api/lane-connections`),
      ])
      setLanes(await lanesRes.json())
      setIntersections(await intRes.json())
      setConnections(await connRes.json())
    } catch (err) {
      console.error("Error loading data:", err)
    } finally {
      setLoading(false)
    }
  }

  const updateLane = async () => {
    if (!editLane) return
    try {
      const res = await fetch(`${API_URL}/api/lanes/${editLane.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lane_type: editLane.lane_type,
          phase: editLane.phase != null && editLane.phase !== "" ? parseInt(editLane.phase) : null,
          name: editLane.name || null,
        }),
      })
      if (!res.ok) throw new Error("Failed to update")
      setEditLane(null)
      await loadData()
    } catch (err) {
      console.error("Error updating lane:", err)
    }
  }

  const deleteLane = async (id) => {
    try {
      await fetch(`${API_URL}/api/lanes/${id}`, { method: "DELETE" })
      setDeleteTarget(null)
      await loadData()
    } catch (err) {
      console.error("Error deleting lane:", err)
    }
  }

  const createConnection = async () => {
    if (!newConn?.from_lane_id || !newConn?.to_lane_id) return
    try {
      const res = await fetch(`${API_URL}/api/lane-connections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_lane_id: parseInt(newConn.from_lane_id),
          to_lane_id: parseInt(newConn.to_lane_id),
          signal_group: newConn.signal_group ? parseInt(newConn.signal_group) : null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      setNewConn(null)
      await loadData()
    } catch (err) {
      console.error("Error creating connection:", err)
    }
  }

  const deleteConnection = async (id) => {
    try {
      await fetch(`${API_URL}/api/lane-connections/${id}`, { method: "DELETE" })
      setDeleteConnTarget(null)
      await loadData()
    } catch (err) {
      console.error("Error deleting connection:", err)
    }
  }

  // Lanes available for the selected intersection in the new-connection form
  const lanesForConnIntersection = newConn?.intersection_id
    ? lanes.filter((l) => String(l.intersection_id) === String(newConn.intersection_id))
    : []

  const filteredConnections = connections.filter((c) => {
    if (filterIntersection) {
      const fromLane = lanes.find((l) => l.id === c.from_lane_id)
      if (!fromLane || String(fromLane.intersection_id) !== filterIntersection) return false
    }
    return true
  })

  const filtered = lanes.filter((l) => {
    if (filterIntersection && String(l.intersection_id) !== filterIntersection) return false
    if (filterType && l.lane_type !== filterType) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      if (
        !(l.name || "").toLowerCase().includes(q) &&
        !(l.intersection_name || "").toLowerCase().includes(q) &&
        !String(l.id).includes(q)
      )
        return false
    }
    return true
  })

  return (
    <div className="space-y-6 min-h-full pb-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Lanes</h1>
        <p className="text-muted-foreground mt-2">
          View and edit lane configurations across all intersections
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search lanes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-zinc-900 border-zinc-700 text-white"
          />
        </div>
        <Select value={filterIntersection} onValueChange={(v) => setFilterIntersection(v === "all" ? "" : v)}>
          <SelectTrigger className="w-48 bg-zinc-900 border-zinc-700 text-white">
            <SelectValue placeholder="All intersections" />
          </SelectTrigger>
          <SelectContent className="dark bg-zinc-800 border-zinc-600">
            <SelectItem value="all" className="text-white">All intersections</SelectItem>
            {intersections.map((i) => (
              <SelectItem key={i.id} value={String(i.id)} className="text-white">
                {i.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={(v) => setFilterType(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40 bg-zinc-900 border-zinc-700 text-white">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent className="dark bg-zinc-800 border-zinc-600">
            <SelectItem value="all" className="text-white">All types</SelectItem>
            {LANE_TYPES.map((t) => (
              <SelectItem key={t} value={t} className="text-white">{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground" />
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-800 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="text-zinc-400">ID</TableHead>
                <TableHead className="text-zinc-400">Name</TableHead>
                <TableHead className="text-zinc-400">Intersection</TableHead>
                <TableHead className="text-zinc-400">Type</TableHead>
                <TableHead className="text-zinc-400">Phase</TableHead>
                <TableHead className="text-zinc-400">Points</TableHead>
                <TableHead className="text-zinc-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow className="border-zinc-800">
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No lanes found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((lane) => (
                  <TableRow key={lane.id} className="border-zinc-800 hover:bg-zinc-900/50">
                    <TableCell className="text-white font-mono text-xs">{lane.id}</TableCell>
                    <TableCell className="text-white">{lane.name || "-"}</TableCell>
                    <TableCell className="text-zinc-300">{lane.intersection_name}</TableCell>
                    <TableCell>
                      <Badge className={LANE_TYPE_COLORS[lane.lane_type] || ""}>
                        {lane.lane_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white">{lane.phase ?? "-"}</TableCell>
                    <TableCell className="text-zinc-400 text-xs">
                      {lane.geometry?.coordinates?.length || 0}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-zinc-400 hover:text-white"
                          onClick={() =>
                            setEditLane({
                              id: lane.id,
                              name: lane.name || "",
                              lane_type: lane.lane_type,
                              phase: lane.phase != null ? String(lane.phase) : "",
                            })
                          }
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-red-400 hover:text-red-300"
                          onClick={() => setDeleteTarget(lane)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {filtered.length} lane{filtered.length !== 1 ? "s" : ""} shown
      </p>

      {/* ── Lane Connections ────────────────────────────────────── */}
      <div className="pt-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Lane Connections</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Ingress-to-egress lane connections for SAE J2735 connectsTo
            </p>
          </div>
          <Button
            size="sm"
            className="bg-orange-600 hover:bg-orange-700 text-white"
            onClick={() => setNewConn({ intersection_id: filterIntersection || "", from_lane_id: "", to_lane_id: "", signal_group: "" })}
          >
            + New Connection
          </Button>
        </div>

        <div className="rounded-lg border border-zinc-800 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="text-zinc-400">ID</TableHead>
                <TableHead className="text-zinc-400">From Lane</TableHead>
                <TableHead className="text-zinc-400"></TableHead>
                <TableHead className="text-zinc-400">To Lane</TableHead>
                <TableHead className="text-zinc-400">Signal Group</TableHead>
                <TableHead className="text-zinc-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredConnections.length === 0 ? (
                <TableRow className="border-zinc-800">
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No connections found
                  </TableCell>
                </TableRow>
              ) : (
                filteredConnections.map((conn) => (
                  <TableRow key={conn.id} className="border-zinc-800 hover:bg-zinc-900/50">
                    <TableCell className="text-white font-mono text-xs">{conn.id}</TableCell>
                    <TableCell className="text-white text-sm">
                      <span className="font-mono text-xs text-zinc-400">#{conn.from_lane_id}</span>{" "}
                      {conn.from_lane_name || `Lane ${conn.from_lane_number || conn.from_lane_id}`}
                    </TableCell>
                    <TableCell>
                      <ArrowRight className="h-4 w-4 text-orange-400" />
                    </TableCell>
                    <TableCell className="text-white text-sm">
                      <span className="font-mono text-xs text-zinc-400">#{conn.to_lane_id}</span>{" "}
                      {conn.to_lane_name || `Lane ${conn.to_lane_number || conn.to_lane_id}`}
                    </TableCell>
                    <TableCell className="text-white">{conn.signal_group ?? "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-red-400 hover:text-red-300"
                        onClick={() => setDeleteConnTarget(conn)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {filteredConnections.length} connection{filteredConnections.length !== 1 ? "s" : ""} shown
        </p>
      </div>

      {/* New Connection Dialog */}
      <AlertDialog open={!!newConn} onOpenChange={() => setNewConn(null)}>
        <AlertDialogContent className="dark bg-zinc-900 border-zinc-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">New Lane Connection</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Select the from (ingress) and to (egress) lanes to connect.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {newConn && (
            <div className="space-y-3 py-2">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Intersection</label>
                <Select
                  value={newConn.intersection_id ? String(newConn.intersection_id) : ""}
                  onValueChange={(v) => setNewConn({ ...newConn, intersection_id: v, from_lane_id: "", to_lane_id: "" })}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-600 text-white">
                    <SelectValue placeholder="Select intersection..." />
                  </SelectTrigger>
                  <SelectContent className="dark bg-zinc-800 border-zinc-600">
                    {intersections.map((i) => (
                      <SelectItem key={i.id} value={String(i.id)} className="text-white">
                        {i.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">From Lane (ingress)</label>
                <Select
                  value={newConn.from_lane_id ? String(newConn.from_lane_id) : ""}
                  onValueChange={(v) => setNewConn({ ...newConn, from_lane_id: v })}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-600 text-white">
                    <SelectValue placeholder="Select lane..." />
                  </SelectTrigger>
                  <SelectContent className="dark bg-zinc-800 border-zinc-600">
                    {lanesForConnIntersection.map((l) => (
                      <SelectItem key={l.id} value={String(l.id)} className="text-white">
                        #{l.id} {l.name || l.lane_type} {l.lane_number ? `(#${l.lane_number})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">To Lane (egress)</label>
                <Select
                  value={newConn.to_lane_id ? String(newConn.to_lane_id) : ""}
                  onValueChange={(v) => setNewConn({ ...newConn, to_lane_id: v })}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-600 text-white">
                    <SelectValue placeholder="Select lane..." />
                  </SelectTrigger>
                  <SelectContent className="dark bg-zinc-800 border-zinc-600">
                    {lanesForConnIntersection
                      .filter((l) => String(l.id) !== String(newConn.from_lane_id))
                      .map((l) => (
                        <SelectItem key={l.id} value={String(l.id)} className="text-white">
                          #{l.id} {l.name || l.lane_type} {l.lane_number ? `(#${l.lane_number})` : ""}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Signal Group (optional)</label>
                <Input
                  type="number"
                  value={newConn.signal_group}
                  onChange={(e) => setNewConn({ ...newConn, signal_group: e.target.value })}
                  placeholder="e.g. 2"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={createConnection}
              className="bg-orange-600 text-white hover:bg-orange-700"
              disabled={!newConn?.from_lane_id || !newConn?.to_lane_id}
            >
              Create
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Connection Dialog */}
      <AlertDialog open={!!deleteConnTarget} onOpenChange={() => setDeleteConnTarget(null)}>
        <AlertDialogContent className="dark bg-zinc-900 border-zinc-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Connection?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              This will remove the connection from lane #{deleteConnTarget?.from_lane_id} to lane #{deleteConnTarget?.to_lane_id}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConnTarget && deleteConnection(deleteConnTarget.id)}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <AlertDialog open={!!editLane} onOpenChange={() => setEditLane(null)}>
        <AlertDialogContent className="dark bg-zinc-900 border-zinc-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Edit Lane #{editLane?.id}</AlertDialogTitle>
          </AlertDialogHeader>
          {editLane && (
            <div className="space-y-3 py-2">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Name</label>
                <Input
                  value={editLane.name}
                  onChange={(e) => setEditLane({ ...editLane, name: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Lane Type</label>
                <Select
                  value={editLane.lane_type}
                  onValueChange={(v) => setEditLane({ ...editLane, lane_type: v })}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dark bg-zinc-800 border-zinc-600">
                    {LANE_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="text-white">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Phase</label>
                <Input
                  type="number"
                  value={editLane.phase}
                  onChange={(e) => setEditLane({ ...editLane, phase: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={updateLane} className="bg-blue-600 text-white hover:bg-blue-700">
              Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="dark bg-zinc-900 border-zinc-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Lane?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              This will permanently delete lane #{deleteTarget?.id} ({deleteTarget?.name || deleteTarget?.lane_type}).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteLane(deleteTarget.id)}
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
