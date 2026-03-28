import { useEffect, useState } from "react";
import MapView from "./MapView";
import { type HeatmapPoint } from "./HeatmapLayer";

export type StoredReport = HeatmapPoint & {
  environment?: string | null;
  weather_condition?: string | null;
  temperature?: number | null;
  season?: string | null;
  time_of_day?: string | null;
  matchScore?: number;
};

export type HotspotRegion = {
  id: string;
  latitude: number;
  longitude: number;
  reportCount: number;
  averageMatch: number;
};

export type CurrentConditions = {
  latitude: number;
  longitude: number;
  temperature: number;
  weatherCondition: string;
  season: string;
  timeOfDay: string;
};

export type PredictionPoint = {
  lat: number;
  lng: number;
  intensity: number;
};

const WEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
const REPORT_MATCH_THRESHOLD = 0.62;
const HOTSPOT_CLUSTER_RADIUS_KM = 1.1;
const PREDICTION_SPREAD_MIN = 0.001;
const PREDICTION_SPREAD_MAX = 0.005;

function mapWeatherCodeToCondition(code: number) {
  if (code === 0) return "Clear";
  if ([1, 2, 3].includes(code)) return "Clouds";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 80, 81, 82].includes(code)) {
    return "Rain";
  }
  if ([66, 67].includes(code)) return "Freezing Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return "Unknown";
}

function getSeason(month: number) {
  if ([6, 7, 8, 9].includes(month)) return "Monsoon";
  if ([3, 4, 5].includes(month)) return "Summer";
  return "Winter";
}

function getTimeOfDay(date: Date) {
  const hour = date.getHours();

  if (hour < 6) return "Night";
  if (hour < 12) return "Morning";
  if (hour < 18) return "Afternoon";
  return "Evening";
}

function getDistanceInKm(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number
) {
  const earthRadiusKm = 6371;
  const latDelta = ((latitude2 - latitude1) * Math.PI) / 180;
  const lngDelta = ((longitude2 - longitude1) * Math.PI) / 180;
  const startLat = (latitude1 * Math.PI) / 180;
  const endLat = (latitude2 * Math.PI) / 180;

  const haversineValue =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(lngDelta / 2) ** 2;

  return (
    earthRadiusKm *
    2 *
    Math.atan2(Math.sqrt(haversineValue), Math.sqrt(1 - haversineValue))
  );
}

function scoreReportMatch(
  report: StoredReport,
  currentConditions: CurrentConditions
) {
  const reportTemperature =
    typeof report.temperature === "number" ? report.temperature : null;
  const temperatureScore =
    reportTemperature === null
      ? 0
      : Math.max(
          0,
          1 -
            Math.min(
              Math.abs(reportTemperature - currentConditions.temperature),
              15
            ) /
              15
        );

  const weatherScore =
    (report.weather_condition ?? "").toLowerCase() ===
    currentConditions.weatherCondition.toLowerCase()
      ? 1
      : 0;
  const seasonScore =
    (report.season ?? "").toLowerCase() ===
    currentConditions.season.toLowerCase()
      ? 1
      : 0;
  const timeScore =
    (report.time_of_day ?? "").toLowerCase() ===
    currentConditions.timeOfDay.toLowerCase()
      ? 1
      : 0;

  return Number(
    (
      temperatureScore * 0.45 +
      weatherScore * 0.25 +
      seasonScore * 0.15 +
      timeScore * 0.15
    ).toFixed(3)
  );
}

function clusterHotspots(points: StoredReport[]) {
  const clusters: HotspotRegion[] = [];

  points.forEach((point) => {
    const cluster = clusters.find(
      (currentCluster) =>
        getDistanceInKm(
          currentCluster.latitude,
          currentCluster.longitude,
          point.latitude,
          point.longitude
        ) <= HOTSPOT_CLUSTER_RADIUS_KM
    );

    if (!cluster) {
      clusters.push({
        id: String(point.id ?? `${point.latitude}-${point.longitude}`),
        latitude: point.latitude,
        longitude: point.longitude,
        reportCount: 1,
        averageMatch: point.matchScore ?? 0,
      });
      return;
    }

    const nextCount = cluster.reportCount + 1;
    cluster.latitude =
      (cluster.latitude * cluster.reportCount + point.latitude) / nextCount;
    cluster.longitude =
      (cluster.longitude * cluster.reportCount + point.longitude) / nextCount;
    cluster.averageMatch = Number(
      (
        (cluster.averageMatch * cluster.reportCount + (point.matchScore ?? 0)) /
        nextCount
      ).toFixed(3)
    );
    cluster.reportCount = nextCount;
  });

  return clusters.sort((left, right) => right.averageMatch - left.averageMatch);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function generatePredictionPoints(
  latitude: number,
  longitude: number,
  baseIntensity = 1
) {
  const ringOffsets = [0.001, 0.0022, 0.0035, 0.0048];
  const predictionPoints: PredictionPoint[] = [
    {
      lat: latitude,
      lng: longitude,
      intensity: clamp(baseIntensity, 0.7, 1),
    },
  ];

  ringOffsets.forEach((ringDistance, ringIndex) => {
    const pointsInRing = 6 + ringIndex * 2;

    for (let index = 0; index < pointsInRing; index += 1) {
      const angle =
        (Math.PI * 2 * index) / pointsInRing + (Math.random() - 0.5) * 0.35;
      const randomizedDistance = clamp(
        ringDistance + (Math.random() - 0.5) * 0.0008,
        PREDICTION_SPREAD_MIN,
        PREDICTION_SPREAD_MAX
      );
      const latOffset = Math.cos(angle) * randomizedDistance;
      const lngOffset =
        (Math.sin(angle) * randomizedDistance) /
        Math.max(Math.cos((latitude * Math.PI) / 180), 0.35);
      const distanceRatio =
        (randomizedDistance - PREDICTION_SPREAD_MIN) /
        (PREDICTION_SPREAD_MAX - PREDICTION_SPREAD_MIN);
      const distanceIntensity = 1 - distanceRatio * 0.75;
      const randomFactor = 0.9 + Math.random() * 0.18;

      predictionPoints.push({
        lat: latitude + latOffset,
        lng: longitude + lngOffset,
        intensity: Number(
          clamp(baseIntensity * distanceIntensity * randomFactor, 0.18, 0.95).toFixed(3)
        ),
      });
    }
  });

  return predictionPoints;
}

async function fetchCurrentConditions(
  latitude: number,
  longitude: number
): Promise<CurrentConditions> {
  const now = new Date();

  if (WEATHER_API_KEY) {
    const openWeatherResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${WEATHER_API_KEY}&units=metric`
    );

    if (openWeatherResponse.ok) {
      const openWeatherData = await openWeatherResponse.json();
      const temperature = Number(openWeatherData?.main?.temp);

      if (!Number.isNaN(temperature)) {
        return {
          latitude,
          longitude,
          temperature,
          weatherCondition: openWeatherData?.weather?.[0]?.main ?? "Unknown",
          season: getSeason(now.getMonth() + 1),
          timeOfDay: getTimeOfDay(now),
        };
      }
    }
  }

  const fallbackResponse = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`
  );

  if (!fallbackResponse.ok) {
    throw new Error("Weather lookup failed");
  }

  const fallbackData = await fallbackResponse.json();
  const temperature = Number(fallbackData?.current?.temperature_2m);
  if (Number.isNaN(temperature)) {
    throw new Error("Temperature unavailable");
  }

  return {
    latitude,
    longitude,
    temperature,
    weatherCondition:
      typeof fallbackData?.current?.weather_code === "number"
        ? mapWeatherCodeToCondition(fallbackData.current.weather_code)
        : "Unknown",
    season: getSeason(now.getMonth() + 1),
    timeOfDay: getTimeOfDay(now),
  };
}

export function MapSection() {
  const [reports, setReports] = useState<StoredReport[]>([]);
  const [hotspots, setHotspots] = useState<HotspotRegion[]>([]);
  const [predictionPoints, setPredictionPoints] = useState<PredictionPoint[]>([]);
  const [heatmapError, setHeatmapError] = useState("");
  const [loading, setLoading] = useState(true);
  const [locationStatus, setLocationStatus] = useState(
    "Fetching current conditions..."
  );
  const [currentConditions, setCurrentConditions] =
    useState<CurrentConditions | null>(null);

  useEffect(() => {
    const resolveLocationAndConditions = async () => {
      if (!navigator.geolocation) {
        setLocationStatus("Geolocation is not supported in this browser.");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const conditions = await fetchCurrentConditions(
              position.coords.latitude,
              position.coords.longitude
            );
            setCurrentConditions(conditions);
            setLocationStatus("Current weather and temperature loaded.");
          } catch {
            setLocationStatus(
              "Location found, but current weather could not be loaded."
            );
          }
        },
        () => {
          setLocationStatus(
            "Allow location access to compare live conditions with past reports."
          );
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    };

    resolveLocationAndConditions();
  }, []);

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        setHeatmapError("");
        setLoading(true);

        const response = await fetch("http://127.0.0.1:8000/api/reports");
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.detail || "Failed to fetch reports");
        }

        const validReports: StoredReport[] = (payload?.reports ?? [])
          .filter(
            (report: StoredReport) =>
              report.latitude !== null &&
              report.longitude !== null &&
              !Number.isNaN(Number(report.latitude)) &&
              !Number.isNaN(Number(report.longitude))
          )
          .sort(
            (left: StoredReport, right: StoredReport) =>
              new Date(right.created_at ?? "").getTime() -
              new Date(left.created_at ?? "").getTime()
          )
          .map((report: StoredReport, index: number) => ({
            id: report.id,
            created_at: report.created_at ?? null,
            latitude: Number(report.latitude),
            longitude: Number(report.longitude),
            intensity: 1,
            isLatest: index === 0,
            environment: report.environment ?? null,
            weather_condition: report.weather_condition ?? null,
            temperature:
              report.temperature === null || report.temperature === undefined
                ? null
                : Number(report.temperature),
            season: report.season ?? null,
            time_of_day: report.time_of_day ?? null,
            matchScore: 0,
          }));

        setReports(validReports);
      } catch (error: any) {
        console.error("Fetch error:", error);
        setReports([]);
        setHotspots([]);
        setPredictionPoints([]);
        setHeatmapError(error?.message || "Failed to load hotspot data");
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, []);

  useEffect(() => {
    if (!currentConditions) {
      setHotspots([]);
      setPredictionPoints([]);
      return;
    }

    setReports((previousReports) => {
      const scoredReports = previousReports.map((report) => ({
        ...report,
        matchScore: scoreReportMatch(report, currentConditions),
      }));

      const matchedReports = scoredReports.filter(
        (report) => (report.matchScore ?? 0) >= REPORT_MATCH_THRESHOLD
      );
      setHotspots(clusterHotspots(matchedReports));

      const predictionOrigin =
        matchedReports[0] ??
        scoredReports.find((report) => report.isLatest) ??
        scoredReports[0];

      if (predictionOrigin) {
        const baseIntensity = clamp(predictionOrigin.matchScore ?? 0.72, 0.55, 0.95);
        setPredictionPoints(
          generatePredictionPoints(
            predictionOrigin.latitude,
            predictionOrigin.longitude,
            baseIntensity
          )
        );
      } else {
        setPredictionPoints([]);
      }

      return scoredReports;
    });
  }, [currentConditions, reports.length]);

  return (
    <main className="w-full bg-[#f6f3ee] px-6 py-6">
      <div className="mb-4 rounded-xl border bg-white p-4 shadow-md">
        <h1 className="mb-2 text-2xl font-semibold">
          Condition-Matched Hotspot Map
        </h1>
        <p className="text-sm text-gray-500">
          Regions light up only where stored incident conditions are similar to
          the current weather and temperature.
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Incidents loaded: {reports.length}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Matching hotspot regions: {hotspots.length}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Prediction points: {predictionPoints.length}
        </p>
        <p className="mt-2 text-xs text-gray-600">{locationStatus}</p>
        {currentConditions && (
          <p className="mt-1 text-xs text-gray-700">
            Current context: {currentConditions.temperature.toFixed(1)} C,{" "}
            {currentConditions.weatherCondition}, {currentConditions.season},{" "}
            {currentConditions.timeOfDay}
          </p>
        )}
      </div>

      {heatmapError && (
        <div className="mb-3 rounded-lg border border-red-300 bg-red-100 p-3 text-sm text-red-700">
          {heatmapError}
        </div>
      )}

      {loading && (
        <div className="mb-3 text-sm text-gray-500">Loading hotspot data...</div>
      )}

      {!loading && !heatmapError && (
        <div className="h-[calc(100vh-240px)] min-h-[520px] w-full overflow-hidden rounded-xl border shadow-md">
          <MapView
            data={reports}
            hotspots={hotspots}
            predictionPoints={predictionPoints}
            currentConditions={currentConditions}
            fullPage
          />
        </div>
      )}

      {!loading && reports.length === 0 && !heatmapError && (
        <div className="mt-3 text-sm text-gray-600">
          No incidents yet. Submit reports to build report-based hotspots.
        </div>
      )}
    </main>
  );
}
