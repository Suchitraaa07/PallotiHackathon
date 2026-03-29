import { useEffect, useState } from "react";
import {
  FileText,
  MapPin,
  Clock,
  User,
  Phone,
  Calendar,
  CheckCircle2,
  Navigation,
  Send,
} from "lucide-react";

type ReportIncidentProps = {
  prefillSymptoms?: string[];
  prefillRiskLevel?: string;
};

export function ReportIncident({
  prefillSymptoms = [],
  prefillRiskLevel = "",
}: ReportIncidentProps = {}) {
  const autoFieldNames = new Set([
    "location",
    "latitude",
    "longitude",
    "incidentDate",
    "incidentTime",
    "weatherCondition",
    "temperature",
    "season",
    "timeOfDay",
  ]);

  const [formData, setFormData] = useState({
    victimName: "",
    victimAge: "",
    victimPhone: "",
    location: "",
    latitude: "",
    longitude: "",
    incidentDate: "",
    incidentTime: "",
    weatherCondition: "",
    temperature: "",
    season: "",
    timeOfDay: "",
    environmentType: "Farmland",
    snakeDescription: "",
    snakeType: "Unknown",
    venomStatus: "Unknown",
    additionalNotes: "",
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState("");
  const [exactLocationText, setExactLocationText] = useState("");
  const weatherApiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;

  const mapWeatherCodeToCondition = (code: number) => {
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
  };

  const getCurrentDateTime = () => {
    const now = new Date();
    const incidentDate = now.toISOString().split("T")[0];
    const incidentTime = now.toTimeString().slice(0, 5);

    return { now, incidentDate, incidentTime };
  };

  useEffect(() => {
    const { incidentDate, incidentTime } = getCurrentDateTime();
    setFormData((prev) => ({
      ...prev,
      incidentDate: prev.incidentDate || incidentDate,
      incidentTime: prev.incidentTime || incidentTime,
      season: prev.season || getSeason(new Date(incidentDate).getMonth() + 1),
    }));
  }, []);

  useEffect(() => {
    if (!prefillSymptoms.length && !prefillRiskLevel) {
      return;
    }

    setFormData((prev) => {
      const existingNotes = prev.additionalNotes?.trim();
      const prefillText = [
        prefillRiskLevel ? `Risk Level: ${prefillRiskLevel}` : "",
        prefillSymptoms.length ? `Symptoms: ${prefillSymptoms.join(", ")}` : "",
      ]
        .filter(Boolean)
        .join(" | ");

      return {
        ...prev,
        additionalNotes: existingNotes
          ? `${existingNotes}\n${prefillText}`
          : prefillText,
      };
    });
  }, [prefillRiskLevel, prefillSymptoms]);

  useEffect(() => {
    if (!formData.incidentDate) {
      return;
    }

    const month = new Date(formData.incidentDate).getMonth() + 1;
    const derivedSeason = getSeason(month);
    if (derivedSeason !== formData.season) {
      setFormData((prev) => ({ ...prev, season: derivedSeason }));
    }
  }, [formData.incidentDate, formData.season]);

  const getSeason = (month: number) => {
    if ([6, 7, 8, 9].includes(month)) return "Monsoon";
    if ([3, 4, 5].includes(month)) return "Summer";
    return "Winter";
  };

  const getTimeOfDay = (date: Date) => {
    const hour = date.getHours();

    if (hour < 6) return "Night";
    if (hour < 12) return "Morning";
    if (hour < 18) return "Afternoon";
    return "Evening";
  };

  const fetchWeather = async (lat: number, lng: number) => {
    if (weatherApiKey) {
      try {
        const openWeatherRes = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${weatherApiKey}&units=metric`
        );

        if (!openWeatherRes.ok) {
          throw new Error("OpenWeather request failed");
        }

        const openWeatherData = await openWeatherRes.json();
        const weather = openWeatherData?.weather?.[0]?.main ?? "";
        const temp = openWeatherData?.main?.temp;

        setFormData((prev) => ({
          ...prev,
          weatherCondition: weather,
          temperature:
            typeof temp === "number" ? temp.toFixed(1) : prev.temperature,
        }));
        setLocationStatus("Location, weather, temperature and season updated.");
        return;
      } catch {
        // Fall through to no-key fallback provider.
      }
    }

    try {
      const fallbackRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code`
      );

      if (!fallbackRes.ok) {
        throw new Error("Open-Meteo request failed");
      }

      const fallbackData = await fallbackRes.json();
      const temp = fallbackData?.current?.temperature_2m;
      const code = fallbackData?.current?.weather_code;
      const weather =
        typeof code === "number" ? mapWeatherCodeToCondition(code) : "";

      setFormData((prev) => ({
        ...prev,
        weatherCondition: weather || prev.weatherCondition,
        temperature:
          typeof temp === "number" ? temp.toFixed(1) : prev.temperature,
      }));
      setLocationStatus("Location, weather, temperature and season updated.");
    } catch {
      setLocationStatus(
        "Location captured, but weather auto-fetch failed. Please enter weather manually."
      );
    }
  };

  const resolveExactLocation = async (lat: number, lng: number) => {
    // Use a detailed reverse-geocoding provider first to get area/street-level text.
    try {
      const nominatimRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );

      if (nominatimRes.ok) {
        const nominatimData = await nominatimRes.json();
        const exactAddress = nominatimData?.display_name;
        if (exactAddress) {
          return exactAddress;
        }
      }
    } catch {
      // Continue to other providers.
    }

    if (weatherApiKey) {
      try {
        const geoRes = await fetch(
          `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lng}&limit=1&appid=${weatherApiKey}`
        );

        if (geoRes.ok) {
          const geoData = await geoRes.json();
          const topResult = geoData?.[0];
          if (topResult) {
            const parts = [topResult.name, topResult.state, topResult.country]
              .filter(Boolean)
              .join(", ");
            if (parts) {
              return parts;
            }
          }
        }
      } catch {
        // Fallback geocoder below.
      }
    }

    try {
      const fallbackRes = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
      );

      if (!fallbackRes.ok) {
        return "";
      }

      const fallbackData = await fallbackRes.json();
      const city = fallbackData?.city || fallbackData?.locality || "";
      const state = fallbackData?.principalSubdivision || "";
      const country = fallbackData?.countryName || "";

      return [city, state, country].filter(Boolean).join(", ");
    } catch {
      return "";
    }
  };

  const handleChange = (e: any) => {
    if (autoFieldNames.has(e.target.name)) {
      return;
    }

    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    const hasAutoValues =
      !!formData.location &&
      !!formData.latitude &&
      !!formData.longitude &&
      !!formData.incidentDate &&
      !!formData.incidentTime &&
      !!formData.weatherCondition &&
      !!formData.temperature &&
      !!formData.season &&
      !!formData.timeOfDay;

    if (!hasAutoValues) {
      setLocationStatus(
        "Please use GPS to auto-fetch current location, weather, temperature, date/time, season, and time of day."
      );
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage("");
    setSubmitError("");

    try {
      const payload = {
        ...formData,
        victimAge: Number(formData.victimAge),
        latitude: formData.latitude ? Number(formData.latitude) : null,
        longitude: formData.longitude ? Number(formData.longitude) : null,
        temperature: formData.temperature ? Number(formData.temperature) : null,
      };

      const res = await fetch("http://127.0.0.1:8000/api/report-incident", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.detail || "Failed to save report to Supabase");
      }

      const responseData = await res.json();

      setIsSubmitted(true);
      setSubmitMessage(responseData?.message || "Report saved successfully");

      setTimeout(() => {
        setIsSubmitted(false);
      }, 3000);
    } catch (err: any) {
      setSubmitError(err?.message || "Could not save report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCurrentLocation = () => {
    const wantsCurrentLocation = window.confirm(
      "Use your current GPS location?"
    );

    if (!wantsCurrentLocation) {
      setLocationStatus("Current location request cancelled.");
      return;
    }

    if (!navigator.geolocation) {
      setLocationStatus("Geolocation is not supported in this browser.");
      return;
    }

    setIsLocating(true);
    setLocationStatus("Fetching GPS location...");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const { now, incidentDate, incidentTime } = getCurrentDateTime();
        const exactLocation = await resolveExactLocation(lat, lng);
        const locationLabel = exactLocation || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

        setFormData((prev) => ({
          ...prev,
          location: locationLabel,
          latitude: lat.toFixed(5),
          longitude: lng.toFixed(5),
          incidentDate,
          incidentTime,
          season: getSeason(now.getMonth() + 1),
          timeOfDay: getTimeOfDay(now),
        }));
        setExactLocationText(locationLabel);

        await fetchWeather(lat, lng);
        setIsLocating(false);
      },
      () => {
        setLocationStatus("Unable to fetch location. Please allow GPS access.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <main className="max-w-6xl mx-auto px-6 py-8 bg-[#f6f3ee] min-h-screen">

      {/* 🚨 ALERT BAR */}
      {/* <div className="bg-red-500 text-white text-center py-2 rounded mb-6 text-sm font-medium">
        🚨 EMERGENCY? Call 108 | This form is NOT for emergency use
      </div> */}

      {isSubmitted ? (
        <div className="bg-white border shadow-md rounded-xl p-10 text-center">
          <CheckCircle2 className="mx-auto text-green-600 mb-3" size={40} />
          <h2 className="text-xl font-semibold mb-2">
            Report Submitted Successfully
          </h2>
          <p className="text-gray-600 text-sm">
            Emergency services have been notified.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">

          <div className="grid md:grid-cols-2 gap-6">

            {/* LEFT SIDE */}
            <div className="space-y-6">

              {/* Victim Info */}
              <div className="bg-white border shadow-md rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <User className="text-blue-600" />
                  <h2 className="font-semibold">Victim Information</h2>
                </div>

                <div className="space-y-4">
                  <input
                    name="victimName"
                    placeholder="Full Name"
                    value={formData.victimName}
                    onChange={handleChange}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  />

                  <input
                    name="victimAge"
                    placeholder="Age"
                    type="number"
                    value={formData.victimAge}
                    onChange={handleChange}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  />

                  <div className="relative">
                    <Phone className="absolute left-3 top-3 text-gray-400" size={16} />
                    <input
                      name="victimPhone"
                      placeholder="Phone Number"
                      value={formData.victimPhone}
                      onChange={handleChange}
                      className="w-full border rounded-lg px-3 py-2 pl-9"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="bg-white border shadow-md rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="text-orange-600" />
                  <h2 className="font-semibold">Location</h2>
                </div>

                <div className="flex gap-2">
                  <input
                    name="location"
                    placeholder="Auto location from GPS"
                    value={formData.location}
                    onChange={handleChange}
                    className="flex-1 border rounded-lg px-3 py-2 bg-gray-50"
                    readOnly
                    required
                  />
                  <button
                    type="button"
                    onClick={getCurrentLocation}
                    className="bg-green-600 text-white px-3 rounded-lg"
                    disabled={isLocating}
                  >
                    {isLocating ? "Locating..." : <Navigation size={16} />}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3">
                  <input
                    name="latitude"
                    value={formData.latitude}
                    onChange={handleChange}
                    placeholder="Latitude"
                    className="border rounded-lg px-3 py-2 bg-gray-50"
                    readOnly
                  />
                  <input
                    name="longitude"
                    value={formData.longitude}
                    onChange={handleChange}
                    placeholder="Longitude"
                    className="border rounded-lg px-3 py-2 bg-gray-50"
                    readOnly
                  />
                </div>
                {locationStatus ? (
                  <p className="text-xs text-gray-600 mt-2">{locationStatus}</p>
                ) : null}
                {exactLocationText ? (
                  <p className="text-xs text-green-700 mt-1">
                    Exact current location: {exactLocationText}
                  </p>
                ) : null}
              </div>

            </div>

            {/* RIGHT SIDE */}
            <div className="space-y-6">

              {/* Date & Time */}
              <div className="bg-white border shadow-md rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="text-purple-600" />
                  <h2 className="font-semibold">Date & Time</h2>
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 text-gray-400" size={16} />
                    <input
                      type="date"
                      name="incidentDate"
                      value={formData.incidentDate}
                      onChange={handleChange}
                      className="w-full border rounded-lg px-3 py-2 pl-9 bg-gray-50"
                      readOnly
                      required
                    />
                  </div>

                  <input
                    type="time"
                    name="incidentTime"
                    value={formData.incidentTime}
                    onChange={handleChange}
                    className="w-full border rounded-lg px-3 py-2 bg-gray-50"
                    readOnly
                    required
                  />
                </div>
              </div>

              {/* Environment & Conditions */}
              <div className="bg-white border shadow-md rounded-xl p-6">
                <h2 className="font-semibold mb-4">Environment & Conditions</h2>

                <div className="space-y-4">
                  <select
                    name="environmentType"
                    value={formData.environmentType}
                    onChange={handleChange}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  >
                    <option>Farmland</option>
                    <option>Forest</option>
                    <option>Urban</option>
                    <option>Water Body</option>
                    <option>Household</option>
                  </select>

                  <input
                    name="weatherCondition"
                    value={formData.weatherCondition}
                    onChange={handleChange}
                    placeholder="Weather Condition (auto)"
                    className="w-full border rounded-lg px-3 py-2 bg-gray-50"
                    readOnly
                  />

                  <input
                    type="number"
                    step="0.1"
                    name="temperature"
                    value={formData.temperature}
                    onChange={handleChange}
                    placeholder="Temperature (°C)"
                    className="w-full border rounded-lg px-3 py-2 bg-gray-50"
                    readOnly
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <input
                      name="season"
                      value={formData.season}
                      readOnly
                      className="border rounded-lg px-3 py-2 bg-gray-50"
                      placeholder="Season (auto)"
                    />
                    <input
                      name="timeOfDay"
                      value={formData.timeOfDay}
                      readOnly
                      className="border rounded-lg px-3 py-2 bg-gray-50"
                      placeholder="Time of Day (auto)"
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Notes */}
          <div className="bg-white border shadow-md rounded-xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <FileText />
              <h2 className="font-semibold">Additional Notes</h2>
            </div>

            <textarea
              name="additionalNotes"
              value={formData.additionalNotes}
              onChange={handleChange}
              rows={4}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Symptoms, first aid, etc..."
            />
          </div>

          {/* SUBMIT */}
          <button
            disabled={isSubmitting}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl flex justify-center items-center gap-2 disabled:opacity-70"
          >
            <Send size={16} />
            {isSubmitting ? "Submitting..." : "Submit Report"}
          </button>

          {submitMessage ? (
            <div className="bg-green-100 border border-green-300 text-green-800 p-3 rounded-lg text-sm">
              {submitMessage}
            </div>
          ) : null}

          {submitError ? (
            <div className="bg-red-100 border border-red-300 text-red-800 p-3 rounded-lg text-sm">
              {submitError}
            </div>
          ) : null}

          {/* Disclaimer */}
          <div className="bg-yellow-100 border border-yellow-300 p-4 rounded-lg text-sm">
            ⚠️ This form is for reporting only. Call <b>108</b> in emergencies.
          </div>

        </form>
      )}
    </main>
  );
}
