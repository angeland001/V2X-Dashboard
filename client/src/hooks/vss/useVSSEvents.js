import { useState, useEffect, useCallback } from "react";
import {
    fetchCameras,
    fetchLatestEvents,
    fetchEventSummary,
    fetchDailyEvents,
} from "../../services/vss/vss";

const POLL_INTERVAL_MS = 60_000;

export function useVSSEvents() {
    const [cameras, setCameras]               = useState([]);
    const [selectedCamera, setSelectedCamera] = useState(null);
    const [events, setEvents]                 = useState([]);
    const [summary, setSummary]               = useState(null);
    const [dailyData, setDailyData]           = useState([]);
    const [scope, setScope]                   = useState("today");
    const [days, setDays]                     = useState(30);
    const [loading, setLoading]               = useState(false);
    const [error, setError]                   = useState(null);

    useEffect(() => {
        fetchCameras()
            .then(setCameras)
            .catch((err) => setError(err.message));
    }, []);

    const loadData = useCallback(async () => {
        if (!selectedCamera) return;
        setLoading(true);
        setError(null);
        try {
            const [evtData, sumData, dailyRes] = await Promise.all([
                fetchLatestEvents(selectedCamera),
                fetchEventSummary(selectedCamera, scope),
                fetchDailyEvents(selectedCamera, days),
            ]);
            setEvents(evtData);
            setSummary(sumData);
            setDailyData(dailyRes.data || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [selectedCamera, scope, days]);

    useEffect(() => {
        if (!selectedCamera) return;
        loadData();
        const interval = setInterval(loadData, POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [selectedCamera, loadData]);

    return {
        cameras,
        selectedCamera,
        setSelectedCamera,
        events,
        summary,
        dailyData,
        scope,
        setScope,
        days,
        setDays,
        loading,
        error,
        refresh: loadData,
    };
}
