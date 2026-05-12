import { useState, useEffect, useCallback } from "react";
import {
  fetchControllerAdapters,
  createControllerAdapter,
  updateControllerAdapter,
  deleteControllerAdapter,
  probeControllerAdapter,
} from "../../services/controllers";

/**
 * Hook that manages the full list of controller adapters.
 * Provides CRUD helpers and computed status summary counts.
 */
export function useControllerAdapters() {
  const [adapters, setAdapters]   = useState([]);
  const [loading,  setLoading]    = useState(true);
  const [error,    setError]      = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchControllerAdapters();
      setAdapters(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addAdapter = useCallback(async (payload) => {
    const created = await createControllerAdapter(payload);
    setAdapters((prev) => [...prev, created]);
    return created;
  }, []);

  const editAdapter = useCallback(async (id, payload) => {
    const updated = await updateControllerAdapter(id, payload);
    setAdapters((prev) => prev.map((a) => (a.id === id ? updated : a)));
    return updated;
  }, []);

  const removeAdapter = useCallback(async (id) => {
    await deleteControllerAdapter(id);
    setAdapters((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const probe = useCallback(async (id) => {
    const updated = await probeControllerAdapter(id);
    setAdapters((prev) => prev.map((a) => (a.id === id ? updated : a)));
    return updated;
  }, []);

  const statusCounts = adapters.reduce(
    (acc, a) => {
      const s = a.connectionStatus ?? "offline";
      acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    },
    { active: 0, offline: 0, maintenance: 0 },
  );

  return {
    adapters,
    loading,
    error,
    refresh: load,
    addAdapter,
    editAdapter,
    removeAdapter,
    probe,
    statusCounts,
  };
}
