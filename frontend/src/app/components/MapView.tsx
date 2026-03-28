import { useEffect } from "react";
import { CircleMarker, TileLayer, useMap, MapContainer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import HeatmapLayer, { type HeatmapPoint } from "./HeatmapLayer";

type MapViewProps = {
  data: HeatmapPoint[];
  fullPage?: boolean;
};

function FocusLatestReport({ data }: { data: HeatmapPoint[] }) {
  const map = useMap();

  useEffect(() => {
    const latestPoint = data.find((point) => point.isLatest) ?? data[0];
    if (!latestPoint) {
      return;
    }

    map.flyTo([latestPoint.latitude, latestPoint.longitude], 10, {
      duration: 1.25,
    });
  }, [data, map]);

  return null;
}

export default function MapView({ data, fullPage = false }: MapViewProps) {
  const latestPoint = data.find((point) => point.isLatest) ?? data[0];

  return (
    <MapContainer
      center={[20.5937, 78.9629]}
      zoom={5}
      style={{ height: "100%", width: "100%" }}
      className={fullPage ? "" : "rounded-xl"}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FocusLatestReport data={data} />
      <HeatmapLayer data={data} />
      {latestPoint ? (
        <CircleMarker
          center={[latestPoint.latitude, latestPoint.longitude]}
          radius={14}
          pathOptions={{ color: "#dc2626", fillColor: "#f87171", fillOpacity: 0.4 }}
        />
      ) : null}
    </MapContainer>
  );
}
