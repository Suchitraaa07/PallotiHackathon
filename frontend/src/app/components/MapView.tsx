import { useEffect } from "react";
import {
  Circle,
  CircleMarker,
  MapContainer,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import HeatmapLayer from "./HeatmapLayer";
import type {
  CurrentConditions,
  HotspotRegion,
  PredictionPoint,
  StoredReport,
} from "./MapSection";

type MapViewProps = {
  data: StoredReport[];
  hotspots?: HotspotRegion[];
  predictionPoints?: PredictionPoint[];
  currentConditions?: CurrentConditions | null;
  fullPage?: boolean;
};

function FocusHotspot({
  data,
  hotspots,
  currentConditions,
}: {
  data: StoredReport[];
  hotspots: HotspotRegion[];
  currentConditions: CurrentConditions | null;
}) {
  const map = useMap();

  useEffect(() => {
    const primaryHotspot = hotspots[0];
    if (primaryHotspot) {
      map.flyTo([primaryHotspot.latitude, primaryHotspot.longitude], 12, {
        duration: 1.1,
      });
      return;
    }

    if (currentConditions) {
      map.flyTo([currentConditions.latitude, currentConditions.longitude], 11, {
        duration: 1.1,
      });
      return;
    }

    const latestPoint = data.find((point) => point.isLatest) ?? data[0];
    if (!latestPoint) {
      return;
    }

    map.flyTo([latestPoint.latitude, latestPoint.longitude], 10, {
      duration: 1.1,
    });
  }, [currentConditions, data, hotspots, map]);

  return null;
}

export default function MapView({
  data,
  hotspots = [],
  predictionPoints = [],
  currentConditions = null,
  fullPage = false,
}: MapViewProps) {
  const latestPoint = data.find((point) => point.isLatest) ?? data[0];
  const defaultCenter: [number, number] = hotspots[0]
    ? [hotspots[0].latitude, hotspots[0].longitude]
    : currentConditions
      ? [currentConditions.latitude, currentConditions.longitude]
      : [20.5937, 78.9629];

  return (
    <MapContainer
      center={defaultCenter}
      zoom={hotspots.length > 0 ? 12 : currentConditions ? 11 : 5}
      style={{ height: "100%", width: "100%" }}
      className={fullPage ? "" : "rounded-xl"}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FocusHotspot
        data={data}
        hotspots={hotspots}
        currentConditions={currentConditions}
      />

      <HeatmapLayer
        data={predictionPoints}
        radius={28}
        blur={22}
        minOpacity={0.3}
        gradient={{
          0.15: "#bfdbfe",
          0.4: "#60a5fa",
          0.7: "#2563eb",
          1: "#1d4ed8",
        }}
      />

      {latestPoint && (
        <CircleMarker
          center={[latestPoint.latitude, latestPoint.longitude]}
          radius={14}
          pathOptions={{
            color: "#dc2626",
            fillColor: "#f87171",
            fillOpacity: 0.35,
          }}
        >
          <Tooltip direction="top" offset={[0, -10]} opacity={1}>
            Latest incident report
          </Tooltip>
        </CircleMarker>
      )}

      {hotspots.map((hotspot) => (
        <Circle
          key={hotspot.id}
          center={[hotspot.latitude, hotspot.longitude]}
          radius={Math.min(420, Math.max(120, hotspot.reportCount * 70))}
          pathOptions={{
            color: "#2563eb",
            fillColor: "#60a5fa",
            fillOpacity: 0.08,
            weight: 1,
            dashArray: "4 6",
          }}
        >
          <Tooltip direction="top" offset={[0, -10]} opacity={1}>
            {`${hotspot.reportCount} nearby prediction matches | ${Math.round(
              hotspot.averageMatch * 100
            )}% confidence`}
          </Tooltip>
        </Circle>
      ))}
    </MapContainer>
  );
}
