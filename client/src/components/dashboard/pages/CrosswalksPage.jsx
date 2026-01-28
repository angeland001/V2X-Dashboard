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
import { Pencil, Trash2, Search } from "lucide-react"

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001"

const APPROACH_TYPES = ["Ingress", "Egress", "Both", "None"]

const APPROACH_COLORS = {
  Ingress: "bg-green-500/10 text-green-400 border-green-500/20",
  Egress: "bg-red-500/10 text-red-400 border-red-500/20",
  Both: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  None: "bg-gray-500/10 text-gray-400 border-gray-500/20",
}

export default function CrosswalksPage() {
  const [crosswalks, setCrosswalks] = useState([])
  const [intersections, setIntersections] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterIntersection, setFilterIntersection] = useState("")
  const [filterType, setFilterType] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [editCw, setEditCw] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [cwRes, intRes] = await Promise.all([
        fetch(`${API_URL}/api/crosswalks`),
        fetch(`${API_URL}/api/intersections`),
      ])
      setCrosswalks(await cwRes.json())
      setIntersections(await intRes.json())
    } catch (err) {
      console.error("Error loading data:", err)
    } finally {
      setLoading(false)
    }
  }

  const updateCrosswalk = async () => {
    if (!editCw) return
    try {
      const res = await fetch(`${API_URL}/api/crosswalks/${editCw.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approach_type: editCw.approach_type,
          approach_id: editCw.approach_id ? parseInt(editCw.approach_id) : null,
          name: editCw.name || null,
        }),
      })
      if (!res.ok) throw new Error("Failed to update")
      setEditCw(null)
      await loadData()
    } catch (err) {
      console.error("Error updating crosswalk:", err)
    }
  }

  const deleteCrosswalk = async (id) => {
    try {
      await fetch(`${API_URL}/api/crosswalks/${id}`, { method: "DELETE" })
      setDeleteTarget(null)
      await loadData()
    } catch (err) {
      console.error("Error deleting crosswalk:", err)
    }
  }

  const filtered = crosswalks.filter((c) => {
    if (filterIntersection && String(c.intersection_id) !== filterIntersection) return false
    if (filterType && c.approach_type !== filterType) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      if (
        !(c.name || "").toLowerCase().includes(q) &&
        !(c.intersection_name || "").toLowerCase().includes(q) &&
        !String(c.id).includes(q)
      )
        return false
    }
    return true
  })

  return (
    <div className="space-y-6 min-h-full pb-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Crosswalks</h1>
        <p className="text-muted-foreground mt-2">
          View and edit crosswalk configurations across all intersections
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search crosswalks..."
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
            <SelectValue placeholder="All approaches" />
          </SelectTrigger>
          <SelectContent className="dark bg-zinc-800 border-zinc-600">
            <SelectItem value="all" className="text-white">All approaches</SelectItem>
            {APPROACH_TYPES.map((t) => (
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
                <TableHead className="text-zinc-400">Approach Type</TableHead>
                <TableHead className="text-zinc-400">Approach ID</TableHead>
                <TableHead className="text-zinc-400">Vertices</TableHead>
                <TableHead className="text-zinc-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow className="border-zinc-800">
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No crosswalks found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((cw) => (
                  <TableRow key={cw.id} className="border-zinc-800 hover:bg-zinc-900/50">
                    <TableCell className="text-white font-mono text-xs">{cw.id}</TableCell>
                    <TableCell className="text-white">{cw.name || "-"}</TableCell>
                    <TableCell className="text-zinc-300">{cw.intersection_name}</TableCell>
                    <TableCell>
                      <Badge className={APPROACH_COLORS[cw.approach_type] || ""}>
                        {cw.approach_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white">{cw.approach_id ?? "-"}</TableCell>
                    <TableCell className="text-zinc-400 text-xs">
                      {cw.geometry?.coordinates?.[0]?.length || 0}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-zinc-400 hover:text-white"
                          onClick={() =>
                            setEditCw({
                              id: cw.id,
                              name: cw.name || "",
                              approach_type: cw.approach_type,
                              approach_id: cw.approach_id != null ? String(cw.approach_id) : "",
                            })
                          }
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-red-400 hover:text-red-300"
                          onClick={() => setDeleteTarget(cw)}
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
        {filtered.length} crosswalk{filtered.length !== 1 ? "s" : ""} shown
      </p>

      {/* Edit Dialog */}
      <AlertDialog open={!!editCw} onOpenChange={() => setEditCw(null)}>
        <AlertDialogContent className="dark bg-zinc-900 border-zinc-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Edit Crosswalk #{editCw?.id}</AlertDialogTitle>
          </AlertDialogHeader>
          {editCw && (
            <div className="space-y-3 py-2">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Name</label>
                <Input
                  value={editCw.name}
                  onChange={(e) => setEditCw({ ...editCw, name: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Approach Type</label>
                <Select
                  value={editCw.approach_type}
                  onValueChange={(v) => setEditCw({ ...editCw, approach_type: v })}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dark bg-zinc-800 border-zinc-600">
                    {APPROACH_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="text-white">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Approach ID</label>
                <Select
                  value={editCw.approach_id}
                  onValueChange={(v) => setEditCw({ ...editCw, approach_id: v })}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-600 text-white">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent className="dark bg-zinc-800 border-zinc-600">
                    {Array.from({ length: 16 }, (_, i) => i + 1).map((n) => (
                      <SelectItem key={n} value={String(n)} className="text-white">{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={updateCrosswalk} className="bg-blue-600 text-white hover:bg-blue-700">
              Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="dark bg-zinc-900 border-zinc-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Crosswalk?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              This will permanently delete crosswalk #{deleteTarget?.id}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteCrosswalk(deleteTarget.id)}
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
