import { useEffect, useState } from "react";
import MapView from "./MapView";
import { type HeatmapPoint } from "./HeatmapLayer";

export function MapSection() {
  const [heatmapData, setHeatmapData] = useState<HeatmapPoint[]>([]);
  const [heatmapError, setHeatmapError] = useState("");

  useEffect(() => {
    const fetchHeatmapData = async () => {
      try {
        setHeatmapError("");
        const res = await fetch("http://127.0.0.1:8000/api/reports");
        const payload = await res.json();

        if (!res.ok) {
          throw new Error(payload?.detail || "Failed to fetch reports");
        }

        const data = payload?.reports ?? [];

        console.log("Fetched reports:", data);

        const validPoints: HeatmapPoint[] = data
          .map(
            (
              item: {
                id?: string;
                created_at?: string | null;
                latitude: unknown;
                longitude: unknown;
              },
              index: number
            ) => ({
              id: item.id,
              created_at: item.created_at ?? null,
              isLatest: index === 0,
              latitude: Number(item.latitude),
              longitude: Number(item.longitude),
            })
          )
          .filter(
            (item) =>
              Number.isFinite(item.latitude) && Number.isFinite(item.longitude)
          );

        setHeatmapData(validPoints);

        if (!validPoints.length) {
          setHeatmapError(
            "No incidents found in reports table with valid latitude/longitude."
          );
        }
      } catch (err: any) {
        console.error("Fetch error:", err);
        setHeatmapData([]);
        setHeatmapError(err?.message || "Failed to load heatmap data");
        return;
      }
    };

    fetchHeatmapData();
  }, []);

  return (
    <main className="w-full bg-[#f6f3ee] px-6 py-6">
      <div className="bg-white border shadow-md rounded-xl p-4 mb-4">
        <h1 className="text-2xl font-semibold mb-2">Risk Heatmap Map</h1>
        <p className="text-sm text-gray-500">
          Hotspots are generated from saved incident reports.
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Incidents loaded: {heatmapData.length}
        </p>
      </div>

      {heatmapError ? (
        <div className="bg-red-100 border border-red-300 text-red-700 rounded-lg p-3 text-sm">
          Failed to load heatmap data: {heatmapError}
        </div>
      ) : (
        <div className="w-full rounded-xl overflow-hidden border shadow-md h-[calc(100vh-240px)] min-h-[520px]">
          <MapView data={heatmapData} fullPage />
        </div>
      )}

      {heatmapData.length === 0 && !heatmapError ? (
        <div className="mt-3 text-sm text-gray-600">
          No incidents found in Supabase yet. Submit reports to populate the heatmap.
        </div>
      ) : null}
    </main>
  );
}
