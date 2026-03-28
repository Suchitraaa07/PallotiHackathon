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
  intensity?: number;
};

export type PredictionHeatPoint = {
  lat?: number;
  lng?: number;
  intensity?: number;
};

type HeatmapLayerProps = {
  data: Array<HeatmapPoint | PredictionHeatPoint>;
  radius?: number;
  blur?: number;
  minOpacity?: number;
  gradient?: Record<number, string>;
};

export default function HeatmapLayer({
  data,
  radius = 25,
  blur = 15,
  minOpacity = 0.4,
  gradient,
}: HeatmapLayerProps) {
  const map = useMap();

  useEffect(() => {
    if (!map || !data.length) {
      return;
    }

    const points = data
      .map((d): [number, number, number] | null => {
      const latitude =
        "lat" in d ? d.lat : "latitude" in d ? d.latitude : undefined;
      const longitude =
        "lng" in d ? d.lng : "longitude" in d ? d.longitude : undefined;
      if (typeof latitude !== "number" || typeof longitude !== "number") {
        return null;
      }
      const venom =
        "venom_status" in d
          ? d.venom_status ?? d.venomStatus ?? "Unknown"
          : "Unknown";
      const intensity =
        typeof d.intensity === "number"
          ? d.intensity
          : venom === "Venomous"
            ? 1
            : 0.5;
      return [latitude, longitude, intensity];
    })
      .filter((point): point is [number, number, number] => point !== null)
      .filter((point) => point[2] > 0);

    const heatLayer = (L as any).heatLayer(points, {
      radius,
      blur,
      minOpacity,
      gradient,
    });

    heatLayer.addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [blur, data, gradient, map, minOpacity, radius]);

  return null;
}
