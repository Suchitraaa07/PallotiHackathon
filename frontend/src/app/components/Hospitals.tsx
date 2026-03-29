import { useEffect, useState } from "react";
import { AlertCircle, Clock, MapPin, Navigation, Phone } from "lucide-react";

type Hospital = {
  id: string;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  is_antivenom_candidate: boolean;
  phone?: string;
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api";

export function Hospitals() {
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [riskLevel, setRiskLevel] = useState("HIGH");
  const [radiusKm, setRadiusKm] = useState(25);
  const [isLocating, setIsLocating] = useState(false);
  const [isFetchingHospitals, setIsFetchingHospitals] = useState(false);
  const [hospitalError, setHospitalError] = useState("");
  const [antiVenomHospitals, setAntiVenomHospitals] = useState<Hospital[]>([]);
  const [generalHospitals, setGeneralHospitals] = useState<Hospital[]>([]);

  useEffect(() => {
    requestUserLocation();
  }, []);

  useEffect(() => {
    if (!userLocation) {
      return;
    }

    void fetchNearbyHospitals();
  }, [userLocation, riskLevel, radiusKm]);

  const requestUserLocation = () => {
    if (!navigator.geolocation) {
      setHospitalError("Geolocation is not supported in this browser.");
      return;
    }

    setIsLocating(true);
    setHospitalError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
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
        `${API_BASE_URL}/nearby-hospitals?${query.toString()}`
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.detail || "Failed to fetch nearby hospitals.");
      }

      const antiVenom = ((data?.anti_venom_hospitals ?? []) as Hospital[]).filter(
        (hospital) => Number(hospital.distance_km) <= radiusKm
      );
      const general = ((data?.general_hospitals ?? []) as Hospital[]).filter(
        (hospital) => Number(hospital.distance_km) <= radiusKm
      );

      setAntiVenomHospitals(antiVenom);
      setGeneralHospitals(general);
    } catch (err) {
      setAntiVenomHospitals([]);
      setGeneralHospitals([]);
      setHospitalError(
        err instanceof Error ? err.message : "Failed to load nearby hospitals."
      );
    } finally {
      setIsFetchingHospitals(false);
    }
  };

  const getDirectionsUrl = (hospital: Hospital) => {
    if (!userLocation) {
      return `https://www.google.com/maps/dir/?api=1&destination=${hospital.latitude},${hospital.longitude}`;
    }

    const origin = `${userLocation.latitude},${userLocation.longitude}`;
    const destination = `${hospital.latitude},${hospital.longitude}`;
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
  };

  const estimatedTime = (distanceKm: number) => {
    const minutes = Math.ceil((distanceKm / 40) * 60);
    return minutes < 1 ? "< 1 min" : `~${minutes} min`;
  };

  const renderHospitalCard = (hospital: Hospital, highlightAntiVenom: boolean) => (
    <div
      key={hospital.id}
      className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-800">{hospital.name}</h3>
          <div className="flex flex-col gap-2 mt-3 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <MapPin
                size={16}
                className="text-emerald-600 flex-shrink-0"
              />
              {hospital.city || "City not available"}
            </div>
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-slate-500 flex-shrink-0" />
              {hospital.distance_km} km • {estimatedTime(hospital.distance_km)}
            </div>
          </div>
        </div>

        {(highlightAntiVenom || hospital.is_antivenom_candidate) && (
          <div className="bg-emerald-100 border border-emerald-300 rounded-lg px-3 py-1 flex-shrink-0">
            <span className="text-xs font-semibold text-emerald-700">
              ANTI-VENOM
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <a
          href={getDirectionsUrl(hospital)}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-lg transition shadow-sm hover:shadow-md"
        >
          <Navigation size={16} />
          Directions
        </a>

        {hospital.phone ? (
          <a
            href={`tel:${hospital.phone}`}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold px-4 py-2 rounded-lg transition"
          >
            <Phone size={16} />
            Call Hospital
          </a>
        ) : null}
      </div>
    </div>
  );

  return (
    <main className="max-w-4xl mx-auto px-6 py-12 min-h-screen bg-[#f4f7f6]">
      <div className="mb-8">
        <h1 className="text-4xl font-semibold text-slate-800">
          Find Hospitals
        </h1>
        <p className="text-slate-500 mt-2 text-sm md:text-base">
          Nearby hospitals are fetched from the live backend using your current
          location.
        </p>
      </div>

      <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-4 mb-8 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <AlertCircle className="text-emerald-700" size={20} />
          <button
            type="button"
            onClick={requestUserLocation}
            disabled={isLocating}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold px-4 py-2 rounded-lg transition shadow-sm hover:shadow-md"
          >
            {isLocating ? "Locating..." : "Near Me"}
          </button>
          <span className="text-emerald-800 text-sm">
            {userLocation
              ? `${userLocation.latitude.toFixed(5)}, ${userLocation.longitude.toFixed(5)}`
              : "Enable location to find nearest hospitals"}
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">Risk Level</p>
            <div className="flex gap-2">
              {["LOW", "MEDIUM", "HIGH"].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setRiskLevel(level)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                    riskLevel === level
                      ? "bg-emerald-600 text-white"
                      : "bg-white text-slate-700 border border-slate-200"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">
              Search Radius
            </p>
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
          <p className="text-sm text-amber-700">{hospitalError}</p>
        ) : null}
      </div>

      {isFetchingHospitals ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-600">
          Finding nearest hospitals...
        </div>
      ) : null}

      {!isFetchingHospitals && (
        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">
              Anti-Venom Hospitals
            </h2>
            <div className="space-y-3">
              {antiVenomHospitals.length > 0 ? (
                antiVenomHospitals.map((hospital) =>
                  renderHospitalCard(hospital, true)
                )
              ) : (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 text-slate-600">
                  No anti-venom hospitals found within {radiusKm} km.
                </div>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">
              General Hospitals
            </h2>
            <div className="space-y-3">
              {generalHospitals.length > 0 ? (
                generalHospitals.map((hospital) =>
                  renderHospitalCard(hospital, false)
                )
              ) : (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 text-slate-600">
                  No general hospitals found within {radiusKm} km.
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
