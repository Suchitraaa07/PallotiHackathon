"use client";

import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
  MapPin,
  AlertCircle,
  Activity,
  Pill,
  Bell,
  TrendingUp,
  Edit2,
  LogOut,
  Zap,
} from "lucide-react";
import {
  getCurrentUserWithProfile,
  signOutUser,
} from "../../auth/authService";
import { supabase } from "../../../lib/supabaseClient";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import HeatmapLayer from "../HeatmapLayer";

interface Incident {
  id: string;
  name: string;
  age: number;
  phone: string;
  location: string;
  latitude: number;
  longitude: number;
  incident_time: string;
  environment: string;
  weather_condition?: string;
  temperature?: number;
  season?: string;
  time_of_day?: string;
  notes?: string;
}

interface CaseRequestRow {
  id: string;
  incident_id: string;
  hospital_id: string;
  status: string;
  created_at: string | null;
}

interface AntivenomInventory {
  polyvalent: number;
  cobra: number;
  viper: number;
  krait: number;
}

interface IncidentRow {
  id: string;
  name: string | null;
  age: number | null;
  phone: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  incident_time: string | null;
  environment: string | null;
  weather_condition: string | null;
  temperature: number | null;
  season: string | null;
  time_of_day: string | null;
  notes: string | null;
}

function toIncident(row: IncidentRow): Incident | null {
  if (typeof row.latitude !== "number" || typeof row.longitude !== "number") {
    return null;
  }

  return {
    id: row.id,
    name: row.name ?? "Unknown",
    age: typeof row.age === "number" ? row.age : 0,
    phone: row.phone ?? "",
    location: row.location ?? "Unknown location",
    latitude: row.latitude,
    longitude: row.longitude,
    incident_time: row.incident_time ?? new Date().toISOString(),
    environment: row.environment ?? "",
    weather_condition: row.weather_condition ?? undefined,
    temperature: row.temperature ?? undefined,
    season: row.season ?? undefined,
    time_of_day: row.time_of_day ?? undefined,
    notes: row.notes ?? undefined,
  };
}

export function HospitalPortalPage() {
  const navigate = useNavigate();

  // States
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [totalIncidentCount, setTotalIncidentCount] = useState<number>(0);
  const [antivenom, setAntivenom] = useState<AntivenomInventory>({
    polyvalent: 5,
    cobra: 3,
    viper: 2,
    krait: 1,
  });
  const [editingInventory, setEditingInventory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hospitalName, setHospitalName] = useState<string>("");
  const [hospitalId, setHospitalId] = useState<string>("");
  const [caseRequests, setCaseRequests] = useState<CaseRequestRow[]>([]);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Get user location for distance calculations
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      });
    }
  }, []);

  // Resolve hospital identity + fetch incidents from Supabase.
  useEffect(() => {
    let isMounted = true;

    const initDashboard = async () => {
      try {
        if (!supabase) {
          throw new Error("Supabase client not configured.");
        }

        const { user, profile } = await getCurrentUserWithProfile();
        if (!user || !profile || profile.role !== "hospital") {
          navigate("/login", { replace: true });
          return;
        }

        // Set hospital name from profile
        setHospitalName(profile.name || "Hospital");
        setHospitalId(profile.id);

        if (!isMounted) {
          return;
        }

        // Fetch incidents from reports table for map display
        const reportsRes = await supabase
          .from("reports")
          .select(
            "id,name,age,phone,location,latitude,longitude,incident_time,environment,weather_condition,temperature,season,time_of_day,notes"
          )
          .not("latitude", "is", null)
          .not("longitude", "is", null)
          .order("incident_time", { ascending: false })
          .limit(100);

        if (reportsRes.error) {
          throw new Error(reportsRes.error.message);
        }

        const normalizedIncidents = (reportsRes.data ?? [])
          .map((row) => toIncident(row as IncidentRow))
          .filter((item): item is Incident => item !== null);

        if (!isMounted) {
          return;
        }

        setIncidents(normalizedIncidents);

        // Fetch total count of all incidents from reports table
        const countRes = await supabase
          .from("reports")
          .select("id", { count: "exact", head: true });

        if (!countRes.error && countRes.count !== null) {
          if (!isMounted) {
            return;
          }
          setTotalIncidentCount(countRes.count);
        }

        // Fetch existing case requests for this hospital (accepted/pending)
        const caseReqRes = await supabase
          .from("case_requests")
          .select("id,incident_id,hospital_id,status,created_at")
          .eq("hospital_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(100);

        if (caseReqRes.error) {
          throw new Error(caseReqRes.error.message);
        }

        setCaseRequests(caseReqRes.data ?? []);
      } catch (error) {
        console.error("Error loading hospital dashboard:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void initDashboard();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  // Real-time subscription for new incidents.
  useEffect(() => {
    if (!supabase) {
      return;
    }

    const incidentsChannel = (supabase as any)
      .channel("hospital-incidents-live")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "reports",
        },
        (payload: { new: IncidentRow }) => {
          const normalized = toIncident(payload.new);
          if (!normalized) {
            return;
          }
          setIncidents((prev) => [normalized, ...prev].slice(0, 150));
        }
      )
      .subscribe();

    return () => {
      void incidentsChannel.unsubscribe();
    };
  }, []);

  // Real-time subscription for case request inserts/updates for this hospital.
  useEffect(() => {
    if (!supabase || !hospitalId) {
      return;
    }

    const requestsChannel = (supabase as any)
      .channel("hospital-case-requests")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "case_requests",
          filter: `hospital_id=eq.${hospitalId}`,
        },
        (payload: { new: CaseRequestRow }) => {
          setCaseRequests((prev) => {
            const existingIndex = prev.findIndex((r) => r.id === payload.new.id);
            if (existingIndex >= 0) {
              const next = [...prev];
              next[existingIndex] = payload.new;
              return next;
            }
            return [payload.new, ...prev].slice(0, 150);
          });
        }
      )
      .subscribe();

    return () => {
      void requestsChannel.unsubscribe();
    };
  }, [hospitalId]);

  const mapCenter = useMemo<[number, number]>(() => {
    if (userLocation) {
      return [userLocation.lat, userLocation.lng];
    }
    if (incidents[0]) {
      return [incidents[0].latitude, incidents[0].longitude];
    }
    return [20.5937, 78.9629];
  }, [incidents, userLocation]);

  const incidentHeatPoints = useMemo(
    () =>
      incidents.map((incident) => ({
        latitude: incident.latitude,
        longitude: incident.longitude,
        intensity: 0.85,
      })),
    [incidents]
  );

  const handleLogout = async () => {
    await signOutUser();
    navigate("/login", { replace: true });
  };

  const acceptCase = async (incidentId: string) => {
    if (!supabase || !hospitalId) {
      return;
    }

    const alreadyAccepted = caseRequests.some(
      (req) =>
        req.incident_id === incidentId &&
        req.hospital_id === hospitalId &&
        req.status === "accepted"
    );

    if (alreadyAccepted) {
      return;
    }

    const { error, data } = await supabase
      .from("case_requests")
      .upsert(
        {
          incident_id: incidentId,
          hospital_id: hospitalId,
          status: "accepted",
        },
        { onConflict: "incident_id,hospital_id" }
      )
      .select("id,incident_id,hospital_id,status,created_at")
      .single();

    if (error) {
      console.error("Failed to accept case:", error.message);
      return;
    }

    setCaseRequests((prev) => {
      const existingIndex = prev.findIndex((r) => r.id === data.id);
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = data;
        return next;
      }
      return [data, ...prev];
    });
  };

  const calculateDistance = (
    lat: number,
    lng: number
  ): { distance: number; time: number } | null => {
    if (!userLocation) return null;

    const toRad = (angle: number) => (angle * Math.PI) / 180;
    const R = 6371; // Earth's radius in km

    const dLat = toRad(lat - userLocation.lat);
    const dLng = toRad(lng - userLocation.lng);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(userLocation.lat)) *
        Math.cos(toRad(lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    // Estimate 35 km/h average
    const time = Math.round((distance / 35) * 60);

    return { distance, time };
  };

  // Calculate analytics
  const todayIncidents = incidents.filter(
    (i) =>
      new Date(i.incident_time).toDateString() === new Date().toDateString()
  );

  const totalIncidents = totalIncidentCount > 0 ? totalIncidentCount : incidents.length;
  const pendingRequests = caseRequests.filter((r) => r.status === "pending");
  const acceptedRequests = caseRequests.filter((r) => r.status === "accepted");

  // Generate smart recommendations
  const generateRecommendations = () => {
    if (incidents.length === 0) return [];

    const recs: { icon: string; title: string; action: string }[] = [];

    // 1. Peak hours analysis
    const hourCounts: Record<number, number> = {};
    incidents.forEach((inc) => {
      const hour = new Date(inc.incident_time).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    const peakHour = Object.entries(hourCounts).sort(([, a], [, b]) => b - a)[0];
    if (peakHour) {
      const hour = parseInt(peakHour[0]);
      recs.push({
        icon: "⏰",
        title: `Peak Hours: ${hour}-${hour + 1}:00`,
        action: "Schedule extra staff during evening shifts (6-9 PM is highest)",
      });
    }

    // 2. Environment analysis
    const environments: Record<string, number> = {};
    incidents.forEach((inc) => {
      if (inc.environment) {
        environments[inc.environment] = (environments[inc.environment] || 0) + 1;
      }
    });
    const topEnv = Object.entries(environments).sort(([, a], [, b]) => b - a)[0];
    if (topEnv) {
      recs.push({
        icon: "🌳",
        title: `Most incidents in ${topEnv[0]}`,
        action: `${topEnv[1]} cases - Educate on prevention in ${topEnv[0]} areas`,
      });
    }

    // 3. Location analysis
    const locations: Record<string, number> = {};
    incidents.forEach((inc) => {
      if (inc.location) {
        locations[inc.location] = (locations[inc.location] || 0) + 1;
      }
    });
    const topLoc = Object.entries(locations).sort(([, a], [, b]) => b - a)[0];
    if (topLoc && topLoc[1] >= 2) {
      recs.push({
        icon: "📍",
        title: `Hotspot: ${topLoc[0]}`,
        action: `${topLoc[1]} incidents - Deploy resources & awareness programs`,
      });
    }

    // 4. Age demographics
    const ages = incidents
      .map((i) => i.age)
      .filter((a): a is number => typeof a === "number" && a > 0);
    if (ages.length > 0) {
      const avgAge = Math.round(ages.reduce((a, b) => a + b) / ages.length);
      const hasChildren = incidents.some((i) => i.age < 12);
      if (hasChildren) {
        recs.push({
          icon: "👶",
          title: `Child cases detected (avg age: ${avgAge}y)`,
          action: "High-risk group - Prepare pediatric antivenom & dosing protocols",
        });
      }
    }

    // 5. Temperature/Season pattern
    const temps = incidents
      .map((i) => i.temperature)
      .filter((t): t is number => typeof t === "number" && t > 0);
    if (temps.length > 0) {
      const avgTemp = Math.round(temps.reduce((a, b) => a + b) / temps.length);
      recs.push({
        icon: "🌡️",
        title: `Average temperature: ${avgTemp}°C`,
        action:
          avgTemp > 30
            ? "High heat increases snake activity - Increase surveillance"
            : "Cooler weather - Monitor for seasonal species migration",
      });
    }

    // 6. Incident frequency trend
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const weekIncidents = incidents.filter(
      (i) => new Date(i.incident_time).getTime() > weekAgo
    );
    if (weekIncidents.length > todayIncidents.length * 5) {
      recs.push({
        icon: "📈",
        title: "Case load increasing",
        action: `${weekIncidents.length} cases this week - Ensure antivenom stock & staff readiness`,
      });
    }

    // 7. Antivenom stock check
    if (!recs.some((r) => r.title.includes("antivenom"))) {
      const lowStocks = Object.entries(antivenom).filter(([, qty]) => qty < 3);
      if (lowStocks.length > 0) {
        recs.push({
          icon: "💉",
          title: `Low antivenom stock: ${lowStocks.map(([type]) => type).join(", ")}`,
          action: "Reorder immediately - Low stocks can delay life-saving treatment",
        });
      }
    }

    return recs.slice(0, 4); // Return top 4 recommendations
  };

  const recommendations = useMemo(() => generateRecommendations(), [incidents, antivenom]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6f3ee] flex items-center justify-center">
        <div className="text-slate-600">Loading dashboard...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f3ee] px-4 py-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              🏥 Hospital War Room
            </h1>
            <p className="text-slate-600 mt-2">
              Real-time snakebite incident management & response coordination
            </p>
            {hospitalName && (
              <p className="text-lg font-semibold text-blue-600 mt-2">
                📍 {hospitalName}
              </p>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-sm"
          >
            <LogOut size={16} /> Logout
          </button>
        </header>

        {/* Quick Stats */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Total Incidents</p>
                <p className="text-2xl font-bold text-slate-900">
                  {totalIncidents}
                </p>
              </div>
              <AlertCircle className="text-red-500" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Today's Cases</p>
                <p className="text-2xl font-bold text-slate-900">
                  {todayIncidents.length}
                </p>
              </div>
              <Activity className="text-orange-500" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">This Week</p>
                <p className="text-2xl font-bold text-slate-900">
                  {incidents.filter(
                    (i) =>
                      new Date(i.incident_time).getTime() >
                      Date.now() - 7 * 24 * 60 * 60 * 1000
                  ).length}
                </p>
              </div>
              <TrendingUp className="text-green-500" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">This Month</p>
                <p className="text-2xl font-bold text-slate-900">
                  {incidents.filter(
                    (i) =>
                      new Date(i.incident_time).getTime() >
                      Date.now() - 30 * 24 * 60 * 60 * 1000
                  ).length}
                </p>
              </div>
              <Bell className="text-blue-500" size={32} />
            </div>
          </div>
        </section>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Incidents Map & Alerts */}
          <div className="lg:col-span-2 space-y-6">
            {/* 🔴 A. Live Incident Map */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="text-red-500" size={20} />
                <h2 className="text-xl font-bold text-slate-900">
                  Live Incident Map
                </h2>
              </div>
              <div className="rounded-xl h-80 border border-slate-300 overflow-hidden">
                <MapContainer
                  center={mapCenter}
                  zoom={11}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  <HeatmapLayer
                    data={incidentHeatPoints}
                    radius={26}
                    blur={18}
                    minOpacity={0.35}
                  />

                  {incidents.slice(0, 60).map((incident) => (
                    <CircleMarker
                      key={incident.id}
                      center={[incident.latitude, incident.longitude]}
                      radius={6}
                      pathOptions={{
                        color: "#dc2626",
                        fillColor: "#f97316",
                        fillOpacity: 0.85,
                      }}
                    >
                      <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                        {incident.name} • {incident.location}
                      </Tooltip>
                    </CircleMarker>
                  ))}
                </MapContainer>
              </div>
            </section>

            {/* 🚨 B. Live Alerts Feed */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <Bell className="text-orange-500" size={20} />
                <h2 className="text-xl font-bold text-slate-900">
                  Live Alerts Feed
                </h2>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {incidents.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <p>No incidents yet</p>
                    <p className="text-xs">Waiting for real-time reports...</p>
                  </div>
                ) : (
                  incidents.slice(0, 6).map((incident) => {
                    const distInfo = calculateDistance(
                      incident.latitude,
                      incident.longitude
                    );
                    const timeAgo = Math.floor(
                      (Date.now() - new Date(incident.incident_time).getTime()) /
                        60000
                    ); // minutes

                    return (
                      <div
                        key={incident.id}
                        className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-semibold text-slate-900">
                              🚨 {incident.name}, {incident.age}y
                            </p>
                            <p className="text-sm text-slate-600 mt-1">
                              📍 {incident.location}
                            </p>
                            {distInfo && (
                              <p className="text-xs text-slate-500 mt-1">
                                {distInfo.distance.toFixed(1)} km away •{" "}
                                {distInfo.time} min
                              </p>
                            )}
                            <p className="text-xs text-slate-500">
                              ⏱️ {timeAgo} min ago
                            </p>
                            <p className="text-xs mt-1 text-slate-600">
                              📞 {incident.phone}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>

          {/* Right Panel */}
          <div className="space-y-6">
            {/* 🎯 Smart Recommendations Panel */}
            <section className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Zap size={20} className="text-blue-600" /> Smart Recommendations
              </h2>
              <div className="space-y-3">
                {recommendations.length === 0 ? (
                  <p className="text-sm text-slate-600">No incidents to analyze yet</p>
                ) : (
                  recommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      className="bg-white rounded-lg p-3 border border-blue-100 hover:shadow-md transition"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-lg">{rec.icon}</span>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900 text-sm">
                            {rec.title}
                          </p>
                          <p className="text-xs text-slate-600 mt-1">{rec.action}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* 💉 E. Anti-Venom Inventory */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Pill size={20} /> Inventory
                </h2>
                <button
                  onClick={() => setEditingInventory(!editingInventory)}
                  className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                >
                  <Edit2 size={14} /> {editingInventory ? "Done" : "Edit"}
                </button>
              </div>

              <div className="space-y-2">
                {Object.entries(antivenom).map(([type, qty]) => (
                  <div
                    key={type}
                    className="flex items-center justify-between p-2 bg-slate-50 rounded"
                  >
                    <span className="text-sm font-medium text-slate-700 capitalize">
                      {type}
                    </span>
                    {editingInventory ? (
                      <input
                        type="number"
                        min="0"
                        value={qty}
                        onChange={(e) =>
                          setAntivenom((prev) => ({
                            ...prev,
                            [type]: parseInt(e.target.value) || 0,
                          }))
                        }
                        className="w-16 px-2 py-1 border border-slate-300 rounded text-sm"
                      />
                    ) : (
                      <span
                        className={`font-bold text-sm ${
                          qty > 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {qty > 0 ? "✅" : "❌"} {qty}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* 📊 G. Analytics Panel */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <TrendingUp size={20} /> Analytics
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Incidents</span>
                  <span className="font-bold text-slate-900">
                    {totalIncidents}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Today</span>
                  <span className="font-bold text-slate-900">{todayIncidents.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">This Week</span>
                  <span className="font-bold text-slate-900">
                    {incidents.filter(
                      (i) =>
                        new Date(i.incident_time).getTime() >
                        Date.now() - 7 * 24 * 60 * 60 * 1000
                    ).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">This Month</span>
                  <span className="font-bold text-slate-900">
                    {incidents.filter(
                      (i) =>
                        new Date(i.incident_time).getTime() >
                        Date.now() - 30 * 24 * 60 * 60 * 1000
                    ).length}
                  </span>
                </div>
                <div className="flex justify-between mt-4 pt-4 border-t">
                  <span className="text-slate-600">Peak Hour Today</span>
                  <span className="font-bold text-slate-900">6-9 PM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Case Requests (Pending)</span>
                  <span className="font-bold text-amber-600">
                    {pendingRequests.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Case Requests (Accepted)</span>
                  <span className="font-bold text-emerald-700">
                    {acceptedRequests.length}
                  </span>
                </div>
              </div>
            </section>

            {/* 📦 H. Auto Recommendations */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 bg-gradient-to-br from-blue-50 to-blue-100">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Zap size={20} className="text-blue-600" /> Smart
                Recommendations
              </h2>
              <div className="space-y-2 text-sm bg-white rounded p-3">
                <p className="text-slate-700">
                  ⚠️ <span className="font-semibold">Cobra cases rising</span>
                </p>
                <p className="text-xs text-slate-600">
                  👉 Increase cobra antivenom stock to 5 units
                </p>
                <p className="text-slate-700 mt-2">
                  📈{" "}
                  <span className="font-semibold">
                    20% more incidents this week
                  </span>
                </p>
                <p className="text-xs text-slate-600">
                  👉 Ensure adequate staff on evening shifts
                </p>
              </div>
            </section>
          </div>
        </div>

        {/* � Incident Summary & Details */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">
            📋 Incident Summary
          </h2>

          <div className="space-y-4">
            <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-lg p-4 border border-red-200">
              <h3 className="font-semibold text-slate-900 mb-3">
                🚨 Latest Incidents (Full Details)
              </h3>
              {incidents.length === 0 ? (
                <p className="text-sm text-slate-600">No incidents reported yet</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {incidents.slice(0, 10).map((incident) => {
                    const request = caseRequests.find(
                      (r) =>
                        r.incident_id === incident.id &&
                        (!hospitalId || r.hospital_id === hospitalId)
                    );
                    const timeAgo = Math.floor(
                      (Date.now() - new Date(incident.incident_time).getTime()) /
                        60000
                    );
                    const incidentDate = new Date(incident.incident_time).toLocaleString();
                    return (
                      <div
                        key={incident.id}
                        className="bg-white p-4 rounded border border-slate-200 hover:shadow-md transition"
                      >
                        {/* Basic Info */}
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-slate-900">
                              👤 {incident.name} • {incident.age} years old
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              📞 {incident.phone || "N/A"}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-medium">
                              {timeAgo}m ago
                            </span>
                            <button
                              onClick={() => acceptCase(incident.id)}
                              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded disabled:opacity-60"
                              disabled={request?.status === "accepted"}
                            >
                              {request?.status === "accepted" ? "Accepted ✅" : "Accept case"}
                            </button>
                          </div>
                        </div>

                        {/* Location & Environment */}
                        <div className="grid grid-cols-2 gap-2 text-xs mt-3 py-2 border-t border-slate-200">
                          <div>
                            <p className="text-slate-500">📍 Location</p>
                            <p className="font-medium text-slate-900">
                              {incident.location}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500">🏞️ Environment</p>
                            <p className="font-medium text-slate-900">
                              {incident.environment || "N/A"}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500">🕐 Time of Day</p>
                            <p className="font-medium text-slate-900">
                              {incident.time_of_day || "N/A"}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500">📅 Season</p>
                            <p className="font-medium text-slate-900">
                              {incident.season || "N/A"}
                            </p>
                          </div>
                        </div>

                        {/* Weather Data */}
                        {(incident.weather_condition || incident.temperature) && (
                          <div className="grid grid-cols-2 gap-2 text-xs py-2 border-t border-slate-200">
                            <div>
                              <p className="text-slate-500">☀️ Weather</p>
                              <p className="font-medium text-slate-900">
                                {incident.weather_condition || "N/A"}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-500">🌡️ Temperature</p>
                              <p className="font-medium text-slate-900">
                                {incident.temperature ? `${incident.temperature}°C` : "N/A"}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Notes */}
                        {incident.notes && (
                          <div className="text-xs py-2 border-t border-slate-200 mt-2">
                            <p className="text-slate-500">📝 Notes</p>
                            <p className="text-slate-700 italic">{incident.notes}</p>
                          </div>
                        )}

                        {/* Timestamp */}
                        <div className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-200">
                          ⏱️ {incidentDate}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-slate-600">Avg Age</p>
                <p className="text-lg font-bold text-slate-900">
                  {incidents.length > 0
                    ? Math.round(
                        incidents
                          .map((i) => i.age)
                          .reduce((a, b) => a + (b || 0), 0) / incidents.length
                      )
                    : 0}{" "}
                  y
                </p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-xs text-slate-600">Most Common Environment</p>
                <p className="text-sm font-bold text-slate-900">
                  {incidents.length > 0
                    ? Object.entries(
                        incidents.reduce(
                          (acc, i) => ({
                            ...acc,
                            [i.environment || "Unknown"]:
                              (acc[i.environment || "Unknown"] || 0) + 1,
                          }),
                          {} as Record<string, number>
                        )
                      ).sort(([, a], [, b]) => b - a)[0]?.[0] || "N/A"
                    : "N/A"}
                </p>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-xs text-slate-600">Peak Time</p>
                <p className="text-sm font-bold text-slate-900">
                  {incidents.length > 0
                    ? (() => {
                        const hours: Record<string, number> = {};
                        incidents.forEach((i) => {
                          const h = new Date(i.incident_time).getHours();
                          hours[h] = (hours[h] || 0) + 1;
                        });
                        const peak = Object.entries(hours).sort(([, a], [, b]) => b - a)[0];
                        return peak ? `${peak[0]}:00` : "N/A";
                      })()
                    : "N/A"}
                </p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <p className="text-xs text-slate-600">Contacts Collected</p>
                <p className="text-lg font-bold text-slate-900">
                  {incidents.filter((i) => i.phone).length}/{incidents.length}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
