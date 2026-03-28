import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

export type HeatmapPoint = {
  id?: string;
  latitude: number;
  longitude: number;
  created_at?: string | null;
  isLatest?: boolean;
  venom_status?: string | null;
  venomStatus?: string | null;
};

type HeatmapLayerProps = {
  data: HeatmapPoint[];
};

export default function HeatmapLayer({ data }: HeatmapLayerProps) {
  const map = useMap();

  useEffect(() => {
    if (!map || !data.length) {
      return;
    }

    const points: [number, number, number][] = data.map((d) => {
      const venom = d.venom_status ?? d.venomStatus ?? "Unknown";
      const intensity = venom === "Venomous" ? 1 : 0.5;
      return [d.latitude, d.longitude, intensity];
    });

    const heatLayer = (L as any).heatLayer(points, {
      radius: 25,
      blur: 15,
      minOpacity: 0.4,
    });

    heatLayer.addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [data, map]);

  return null;
}
