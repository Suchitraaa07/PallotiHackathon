import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L, { type LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";

type Hospital = {
  id: string;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  is_antivenom_candidate: boolean;
  phone?: string;
  address?: string;
};

type SarpamitraRow = {
  id: string | null;
  name: string | null;
  phone: string | number | null;
  areas: string | string[] | null;
  lat: number | string | null;
  lng: number | string | null;
  rating: number | null;
  reviews: number | null;
  verified: boolean | null;
};

type RankedSarpamitra = {
  id: string;
  name: string;
  phone: string;
  areas: string[];
  lat: number;
  lng: number;
  rating: number | null;
  reviews: number | null;
  verified: boolean;
  distance_km: number;
};

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radiusKm = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  return radiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseAreas(rawAreas: string | string[] | null) {
  if (!rawAreas) {
    return [];
  }

  if (Array.isArray(rawAreas)) {
    return rawAreas.map((area) => area.trim()).filter(Boolean);
  }

  return rawAreas
    .split("|")
    .map((area) => area.trim())
    .filter(Boolean);
}

delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const hospitalIcon = L.divIcon({
  className: "",
  html: `<div style="width:30px;height:30px;border-radius:50%;background:#dc2626;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;border:2px solid #fff;box-shadow:0 4px 10px rgba(0,0,0,0.28)">H</div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -26],
});

const userIcon = L.divIcon({
  className: "",
  html: `<div style="width:24px;height:24px;border-radius:50%;background:#16a34a;border:3px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,0.26)"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -10],
});

function MapUpdater({ center, zoom }: { center: LatLngExpression; zoom: number }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);

  return null;
}

export function EmergencyContact() {
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isFetchingHospitals, setIsFetchingHospitals] = useState(false);
  const [hospitalError, setHospitalError] = useState("");
  const [riskLevel, setRiskLevel] = useState<string>("HIGH");
  const [antiVenomHospitals, setAntiVenomHospitals] = useState<Hospital[]>([]);
  const [radiusKm, setRadiusKm] = useState<number>(25);
  const [mapCenter, setMapCenter] = useState<LatLngExpression>([20.5937, 78.9629]);
  const [mapZoom, setMapZoom] = useState<number>(6);

  const [isFetchingSarpamitra, setIsFetchingSarpamitra] = useState(false);
  const [sarpamitraError, setSarpamitraError] = useState("");
  const [nearestSarpamitra, setNearestSarpamitra] = useState<RankedSarpamitra[]>([]);

  useEffect(() => {
    requestUserLocation();
  }, []);

  useEffect(() => {
    if (!userLocation) {
      return;
    }

    fetchNearbyHospitals();
    fetchNearestSarpamitra();
  }, [userLocation, riskLevel, radiusKm]);

  const bestSarpamitra = useMemo(
    () => nearestSarpamitra[0] ?? null,
    [nearestSarpamitra]
  );

  const requestUserLocation = () => {
    if (!navigator.geolocation) {
      setHospitalError("Geolocation is not supported in this browser.");
      return;
    }

    setIsLocating(true);
    setHospitalError("");
    setSarpamitraError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        setUserLocation({
          latitude,
          longitude,
        });
        setMapCenter([latitude, longitude]);
        setMapZoom(13);
        setIsLocating(false);
      },
      () => {
        setHospitalError(
          "Unable to fetch your location. Please allow location access and try again."
        );
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  };

  const fetchNearbyHospitals = async () => {
    if (!userLocation) {
      return;
    }

    setIsFetchingHospitals(true);
    setHospitalError("");

    const query = new URLSearchParams({
      latitude: String(userLocation.latitude),
      longitude: String(userLocation.longitude),
      risk_level: riskLevel,
      limit: "10",
    });

    try {
      const res = await fetch(
        `http://127.0.0.1:8000/api/nearby-hospitals?${query.toString()}`
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || "Failed to fetch nearby hospitals.");
      }

      const antiVenom = (data?.anti_venom_hospitals ?? []) as Hospital[];
      const radiusFiltered = antiVenom.filter(
        (hospital) => Number(hospital.distance_km) <= radiusKm
      );

      setAntiVenomHospitals(radiusFiltered);
    } catch (err) {
      setAntiVenomHospitals([]);
      setHospitalError(
        err instanceof Error ? err.message : "Failed to load nearby hospitals."
      );
    } finally {
      setIsFetchingHospitals(false);
    }
  };

  const fetchNearestSarpamitra = async () => {
    if (!userLocation) {
      return;
    }

    setIsFetchingSarpamitra(true);
    setSarpamitraError("");

    try {
      const response = await fetch("http://127.0.0.1:8000/api/sarpamitra");
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.detail || "Failed to fetch sarpamitra contacts.");
      }

      const rows = (payload?.contacts ?? []) as SarpamitraRow[];
      const ranked = rows
        .map((row, index) => {
          const lat = Number(row.lat);
          const lng = Number(row.lng);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return null;
          }

          return {
            id: String(row.id ?? `sr-${index}`),
            name: String(row.name ?? "Unknown Sarpamitra"),
            phone: String(row.phone ?? ""),
            areas: parseAreas(row.areas),
            lat,
            lng,
            rating: row.rating,
            reviews: row.reviews,
            verified: Boolean(row.verified),
            distance_km: haversine(
              userLocation.latitude,
              userLocation.longitude,
              lat,
              lng
            ),
          } satisfies RankedSarpamitra;
        })
        .filter((item): item is RankedSarpamitra => Boolean(item))
        .sort((a, b) => a.distance_km - b.distance_km)
        .slice(0, 3);

      setNearestSarpamitra(ranked);
    } catch (error) {
      setNearestSarpamitra([]);
      setSarpamitraError(
        error instanceof Error
          ? error.message
          : "Unable to fetch Sarpamitra data from Supabase."
      );
    } finally {
      setIsFetchingSarpamitra(false);
    }
  };

  const getDirectionsUrl = (latitude: number, longitude: number) => {
    if (!userLocation) {
      return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    }

    const origin = `${userLocation.latitude},${userLocation.longitude}`;
    const destination = `${latitude},${longitude}`;
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
  };

  const getWhatsAppUrl = (phone: string, rescuerName: string) => {
    const cleaned = phone.replace(/\D/g, "");
    const message = `Snake bite emergency. Please help urgently. Rescuer: ${rescuerName}.`;
    return `https://wa.me/91${cleaned}?text=${encodeURIComponent(message)}`;
  };

  const estimatedTime = (distanceKm: number) => {
    const minutes = Math.ceil((distanceKm / 40) * 60);
    if (minutes < 1) {
      return "< 1 min";
    }

    return `~${minutes} min`;
  };

  return (
    <main className="w-full min-h-screen bg-gradient-to-b from-green-50 to-slate-50">
      <div className="bg-white border-b border-green-100 px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Nearby Help and Care</h1>
          <p className="text-lg text-slate-600">
            You are not alone. We have found nearby anti-venom hospitals and rescue volunteers.
          </p>
          <p className="text-slate-500 mt-2">Take a deep breath. Help is on the way.</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <div className="bg-white rounded-xl shadow-sm border border-green-100 p-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm font-bold text-slate-700 mb-2">Your Location</p>
              {userLocation ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-slate-700">
                  {userLocation.latitude.toFixed(5)}, {userLocation.longitude.toFixed(5)}
                  <button
                    onClick={requestUserLocation}
                    className="ml-3 text-green-700 font-medium hover:text-green-800"
                  >
                    Update
                  </button>
                </div>
              ) : (
                <button
                  onClick={requestUserLocation}
                  disabled={isLocating}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-3 rounded-lg font-medium"
                >
                  {isLocating ? "Getting location..." : "Enable GPS location"}
                </button>
              )}
            </div>

            <div>
              <p className="text-sm font-bold text-slate-700 mb-2">Risk Level</p>
              <div className="flex gap-2">
                {[
                  { label: "You are safe", level: "LOW" },
                  { label: "Take care", level: "MEDIUM" },
                  { label: "High", level: "HIGH" },
                ].map((item) => (
                  <button
                    key={item.level}
                    onClick={() => setRiskLevel(item.level)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium ${
                      riskLevel === item.level
                        ? "bg-green-600 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-bold text-slate-700 mb-2">Search Radius</p>
              <select
                value={radiusKm}
                onChange={(event) => setRadiusKm(Number(event.target.value))}
                className="w-full border border-slate-300 rounded-lg py-2.5 px-3 text-sm text-slate-700 bg-white"
              >
                <option value={10}>10 km</option>
                <option value={25}>25 km</option>
                <option value={50}>50 km</option>
                <option value={100}>100 km</option>
              </select>
            </div>
          </div>

          {hospitalError ? (
            <p className="mt-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
              {hospitalError}
            </p>
          ) : null}
        </div>

        {isFetchingHospitals ? (
          <div className="bg-white rounded-xl border border-green-100 p-8 text-center text-slate-600">
            Finding nearest hospitals...
          </div>
        ) : null}

        {!isFetchingHospitals && userLocation ? (
          <div className="space-y-6">
            <section className="bg-white rounded-xl border border-green-100 p-4">
              <h2 className="text-xl font-bold text-slate-900 mb-3">
                Anti-Venom Hospital Map
              </h2>
              <div className="rounded-xl overflow-hidden border border-slate-200">
                <MapContainer
                  center={mapCenter}
                  zoom={mapZoom}
                  style={{ height: "420px", width: "100%" }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapUpdater center={mapCenter} zoom={mapZoom} />

                  {userLocation ? (
                    <Marker
                      position={[userLocation.latitude, userLocation.longitude]}
                      icon={userIcon}
                    >
                      <Popup>Your Location</Popup>
                    </Marker>
                  ) : null}

                  {antiVenomHospitals.map((hospital) => (
                    <Marker
                      key={`anti-marker-${hospital.id}`}
                      position={[hospital.latitude, hospital.longitude]}
                      icon={hospitalIcon}
                    >
                      <Popup>
                        <div className="min-w-[180px]">
                          <p className="font-semibold text-slate-900">{hospital.name}</p>
                          <p className="text-xs text-slate-600 mt-1">
                            {hospital.distance_km} km • {estimatedTime(hospital.distance_km)}
                          </p>
                          <a
                            href={getDirectionsUrl(hospital.latitude, hospital.longitude)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-block mt-2 text-xs px-3 py-1.5 rounded-md bg-green-600 text-white"
                          >
                            Get Directions
                          </a>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            </section>

            {antiVenomHospitals.length > 0 ? (
              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-3">
                  Top Nearby Anti-Venom Hospitals ({antiVenomHospitals.length})
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {antiVenomHospitals.map((hospital, idx) => (
                    <article
                      key={`anti-${hospital.id}`}
                      className="bg-green-50 border border-green-200 rounded-xl p-5"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <span className="w-8 h-8 rounded-full bg-green-100 text-green-700 font-bold text-sm flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div>
                          <h3 className="font-semibold text-slate-900">{hospital.name}</h3>
                          <p className="text-sm text-slate-500">
                            {hospital.distance_km} km away • {estimatedTime(hospital.distance_km)}
                          </p>
                          {hospital.city ? (
                            <p className="text-xs text-slate-500 mt-1">{hospital.city}</p>
                          ) : null}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-4">
                        <a
                          href={getDirectionsUrl(hospital.latitude, hospital.longitude)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-center bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2 rounded-lg"
                        >
                          Get Directions
                        </a>

                        {hospital.phone ? (
                          <a
                            href={`tel:${hospital.phone}`}
                            className="text-center bg-green-100 hover:bg-green-200 text-green-900 text-sm font-semibold py-2 rounded-lg"
                          >
                            Call
                          </a>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="text-center bg-slate-100 text-slate-400 text-sm font-semibold py-2 rounded-lg cursor-not-allowed"
                          >
                            Call N/A
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {antiVenomHospitals.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-600">
                No anti-venom hospitals found within {radiusKm} km.
              </div>
            ) : null}
          </div>
        ) : null}

        <section className="bg-white rounded-xl shadow-sm border border-green-100 p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-2xl font-bold text-slate-900">Nearest Sarpamitra Rescue Team</h2>
            <span className="text-sm text-slate-500">Top 3 closest rescuers</span>
          </div>

          {sarpamitraError ? (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              {sarpamitraError}
            </p>
          ) : null}

          {isFetchingSarpamitra ? (
            <div className="text-slate-600">Finding nearest rescuers...</div>
          ) : null}

          {!isFetchingSarpamitra && nearestSarpamitra.length > 0 ? (
            <div className="space-y-4">
              {bestSarpamitra ? (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                  <p className="text-sm font-semibold text-green-800 mb-3">
                    Best Match ({bestSarpamitra.distance_km.toFixed(1)} km)
                  </p>
                  <iframe
                    title="best-sarpamitra-map"
                    className="w-full h-56 rounded-lg border border-green-200"
                    src={`https://maps.google.com/maps?q=${bestSarpamitra.lat},${bestSarpamitra.lng}&z=14&output=embed`}
                    loading="lazy"
                  />
                </div>
              ) : null}

              <div className="grid md:grid-cols-3 gap-4">
                {nearestSarpamitra.map((rescuer, index) => (
                  <article key={rescuer.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-slate-900">Priority {index + 1}</h3>
                      {rescuer.verified ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          Verified
                        </span>
                      ) : null}
                    </div>

                    <p className="text-sm mt-2 font-medium text-slate-800">{rescuer.name}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {rescuer.distance_km.toFixed(1)} km away • {estimatedTime(rescuer.distance_km)}
                    </p>
                    {rescuer.areas.length > 0 ? (
                      <p className="text-xs text-slate-500 mt-1">
                        Areas: {rescuer.areas.slice(0, 3).join(", ")}
                      </p>
                    ) : null}
                    <p className="text-sm text-slate-700 mt-2">{rescuer.phone}</p>

                    <div className="grid grid-cols-3 gap-2 mt-3">
                      <a
                        href={`tel:+91${rescuer.phone.replace(/\D/g, "")}`}
                        className="text-center text-xs font-semibold bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg"
                      >
                        Call
                      </a>
                      <a
                        href={getWhatsAppUrl(rescuer.phone, rescuer.name)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-center text-xs font-semibold bg-green-100 hover:bg-green-200 text-green-800 py-2 rounded-lg"
                      >
                        WhatsApp
                      </a>
                      <a
                        href={getDirectionsUrl(rescuer.lat, rescuer.lng)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-center text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 py-2 rounded-lg"
                      >
                        Directions
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          {!isFetchingSarpamitra && !sarpamitraError && nearestSarpamitra.length === 0 ? (
            <p className="text-slate-600">No rescuer data found near your location.</p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
