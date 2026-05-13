import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Camera, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '../../../../ui/shadcn/button';
import { Badge } from '../../../../ui/shadcn/badge';
import { Skeleton } from '../../../../ui/shadcn/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../../ui/shadcn/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../../../ui/shadcn/alert-dialog';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function getAuthHeader() {
  const token = localStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const STATUS_COLORS = {
  active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  offline: 'bg-red-500/15 text-red-400 border-red-500/20',
  maintenance: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
};

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${
        STATUS_COLORS[status] || 'bg-neutral-700 text-neutral-300 border-neutral-600'
      }`}
    >
      {status}
    </span>
  );
}

const EMPTY_FORM = {
  intersectionId: '',
  label: '',
  ipAddress: '',
  streamPath: '/axis-cgi/mjpg/video.cgi',
  status: 'active',
};

export function CameraConfig() {
  const [intersections, setIntersections] = useState([]);
  // intersection_id → Camera[]
  const [cameras, setCameras] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Expanded intersection rows
  const [expanded, setExpanded] = useState({});

  const [editingId, setEditingId] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [intRes, camRes] = await Promise.all([
          fetch(`${API_URL}/api/intersections`, { headers: getAuthHeader() }),
          fetch(`${API_URL}/api/cameras`, { headers: getAuthHeader() }),
        ]);

        if (!intRes.ok || !camRes.ok) throw new Error('Failed to fetch data');

        const intersectionsData = await intRes.json();
        const camerasData = await camRes.json();

        setIntersections(intersectionsData);

        // Group cameras by intersection_id (array per key)
        const grouped = {};
        camerasData.forEach((cam) => {
          const key = cam.intersection_id;
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(cam);
        });
        setCameras(grouped);

        // Auto-expand intersections that have cameras
        const autoExpand = {};
        intersectionsData.forEach((i) => {
          if (grouped[i.intersection_id]?.length > 0) autoExpand[i.intersection_id] = true;
        });
        setExpanded(autoExpand);

        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const toggleExpand = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const openAddDialog = (intersection) => {
    const count = cameras[intersection.intersection_id]?.length ?? 0;
    setFormData({
      ...EMPTY_FORM,
      intersectionId: intersection.intersection_id,
      label: count === 0
        ? intersection.name
        : `${intersection.name} — Cam ${count + 1}`,
    });
    setEditingId(null);
    setIsDialogOpen(true);
    // Ensure row is expanded after adding
    setExpanded((prev) => ({ ...prev, [intersection.intersection_id]: true }));
  };

  const openEditDialog = (camera) => {
    setFormData({
      intersectionId: camera.intersection_id,
      label: camera.label,
      ipAddress: camera.ip_address,
      streamPath: camera.stream_path,
      status: camera.status,
    });
    setEditingId(camera.id);
    setIsDialogOpen(true);
  };

  const handleSave = useCallback(async () => {
    try {
      const body = {
        intersection_id: formData.intersectionId,
        label: formData.label,
        ip_address: formData.ipAddress,
        stream_path: formData.streamPath,
        status: formData.status,
      };

      const method = editingId ? 'PUT' : 'POST';
      const url = editingId
        ? `${API_URL}/api/cameras/${editingId}`
        : `${API_URL}/api/cameras`;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save camera');
      }

      const saved = await res.json();
      const intId = saved.intersection_id;

      setCameras((prev) => {
        const list = prev[intId] ? [...prev[intId]] : [];
        if (editingId) {
          const idx = list.findIndex((c) => c.id === editingId);
          if (idx !== -1) list[idx] = saved;
          else list.push(saved);
        } else {
          list.push(saved);
        }
        return { ...prev, [intId]: list };
      });

      setIsDialogOpen(false);
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  }, [formData, editingId]);

  const handleDelete = useCallback(async (camera) => {
    try {
      const res = await fetch(`${API_URL}/api/cameras/${camera.id}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });

      if (!res.ok) throw new Error('Failed to delete camera');

      setCameras((prev) => {
        const list = (prev[camera.intersection_id] || []).filter((c) => c.id !== camera.id);
        return { ...prev, [camera.intersection_id]: list };
      });
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((n) => <Skeleton key={n} className="h-14 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Camera Configuration</h2>
        <p className="text-sm text-muted-foreground">
          Assign Axis IP cameras to intersections. Each intersection supports up to 4 cameras.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-950 text-red-200 rounded text-sm">{error}</div>
      )}

      {/* Intersection list */}
      <div className="space-y-2">
        {intersections.map((intersection) => {
          const intId = intersection.intersection_id;
          const camList = cameras[intId] || [];
          const isOpen = !!expanded[intId];

          return (
            <div
              key={intId}
              className="rounded-lg border border-neutral-700 bg-neutral-800/40 overflow-hidden"
            >
              {/* Intersection row */}
              <div className="flex items-center gap-3 px-3 py-2.5">
                {/* Expand toggle */}
                <button
                  onClick={() => toggleExpand(intId)}
                  className="text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
                >
                  {isOpen
                    ? <ChevronDown className="w-4 h-4" />
                    : <ChevronRight className="w-4 h-4" />}
                </button>

                <Camera className="w-4 h-4 text-neutral-400 flex-shrink-0" />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm text-neutral-100 truncate">
                      {intersection.name}
                    </p>
                    {camList.length > 0 ? (
                      <Badge className="text-[10px] font-mono bg-teal-500/15 text-teal-400 border border-teal-500/20 hover:bg-teal-500/15">
                        {camList.length} {camList.length === 1 ? 'camera' : 'cameras'}
                      </Badge>
                    ) : (
                      <span className="text-[11px] text-neutral-500">No cameras</span>
                    )}
                  </div>
                </div>

                {/* Add camera button — visible when under 4 cameras */}
                {camList.length < 4 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openAddDialog(intersection)}
                    className="h-7 gap-1 text-xs border-neutral-600 hover:border-teal-500/50 hover:text-teal-400 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    Add
                  </Button>
                )}
              </div>

              {/* Expanded camera list */}
              {isOpen && camList.length > 0 && (
                <div className="border-t border-neutral-700/60">
                  {camList.map((camera, idx) => (
                    <div
                      key={camera.id}
                      className={`flex items-center gap-3 px-4 py-2.5 ${
                        idx < camList.length - 1 ? 'border-b border-neutral-700/40' : ''
                      } hover:bg-neutral-700/20 transition-colors`}
                    >
                      {/* Camera index dot */}
                      <span className="w-5 h-5 rounded-full bg-neutral-700 flex items-center justify-center text-[10px] font-mono text-neutral-400 flex-shrink-0">
                        {idx + 1}
                      </span>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-neutral-200 truncate">{camera.label}</p>
                        <p className="text-xs text-neutral-500 font-mono">{camera.ip_address}</p>
                      </div>

                      <StatusBadge status={camera.status} />

                      {/* Edit */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditDialog(camera)}
                        className="h-7 w-7 p-0 text-neutral-400 hover:text-neutral-100"
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>

                      {/* Delete */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-neutral-500 hover:text-red-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Camera</AlertDialogTitle>
                            <AlertDialogDescription>
                              Remove <strong>{camera.label}</strong> ({camera.ip_address}) from{' '}
                              {intersection.name}? This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(camera)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty expanded state */}
              {isOpen && camList.length === 0 && (
                <div className="border-t border-neutral-700/60 px-4 py-3 text-xs text-neutral-500">
                  No cameras assigned. Click <strong>Add</strong> to configure one.
                </div>
              )}
            </div>
          );
        })}

        {intersections.length === 0 && !error && (
          <p className="text-center py-8 text-sm text-muted-foreground">
            No intersections found. Create intersections first.
          </p>
        )}
      </div>

      {/* Add / Edit dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Camera' : 'Add Camera'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-neutral-300">Label</label>
              <input
                type="text"
                placeholder="e.g., MLK & Georgia — Cam 1"
                value={formData.label}
                onChange={(e) => setFormData((p) => ({ ...p, label: e.target.value }))}
                className="w-full mt-1 px-3 py-2 rounded bg-neutral-700 border border-neutral-600 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-teal-500/50"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-300">IP Address</label>
              <input
                type="text"
                placeholder="10.200.1.50"
                value={formData.ipAddress}
                onChange={(e) => setFormData((p) => ({ ...p, ipAddress: e.target.value }))}
                className="w-full mt-1 px-3 py-2 rounded bg-neutral-700 border border-neutral-600 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-teal-500/50 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-300">Stream Path</label>
              <input
                type="text"
                placeholder="/axis-cgi/mjpg/video.cgi"
                value={formData.streamPath}
                onChange={(e) => setFormData((p) => ({ ...p, streamPath: e.target.value }))}
                className="w-full mt-1 px-3 py-2 rounded bg-neutral-700 border border-neutral-600 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-teal-500/50 font-mono"
              />
              <p className="text-[11px] text-neutral-500 mt-1">VAPIX MJPEG endpoint path</p>
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-300">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value }))}
                className="w-full mt-1 px-3 py-2 rounded bg-neutral-700 border border-neutral-600 text-sm text-neutral-100 focus:outline-none focus:border-teal-500/50"
              >
                <option value="active">Active</option>
                <option value="offline">Offline</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.label.trim() || !formData.ipAddress.trim()}
            >
              {editingId ? 'Update' : 'Add'} Camera
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
