import { useEffect, useState } from "react";
import {
  Upload,
  CheckCircle2,
  ScanLine,
  TrendingUp,
  MapPin,
  Navigation,
  ExternalLink,
} from "lucide-react";

type AnalysisResult = {
  species: string;
  confidence: number;
  risk_level: string;
  recommended_action: string;
};

type Hospital = {
  id: string;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  is_antivenom_candidate: boolean;
};

export function ImageAnalyzer() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isAnalyzed, setIsAnalyzed] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState("unknown");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isFetchingHospitals, setIsFetchingHospitals] = useState(false);
  const [hospitalError, setHospitalError] = useState("");
  const [antiVenomHospitals, setAntiVenomHospitals] = useState<Hospital[]>([]);
  const [generalHospitals, setGeneralHospitals] = useState<Hospital[]>([]);

  const resetAnalysisState = () => {
    setIsAnalyzed(false);
    setAnalysis(null);
    setError("");
    setHospitalError("");
    setAntiVenomHospitals([]);
    setGeneralHospitals([]);
  };

  useEffect(() => {
    if (!analysis || !userLocation) {
      return;
    }

    const fetchNearbyHospitals = async () => {
      setIsFetchingHospitals(true);
      setHospitalError("");

      const query = new URLSearchParams({
        latitude: String(userLocation.latitude),
        longitude: String(userLocation.longitude),
        risk_level: analysis.risk_level,
        limit: "5",
      });

      try {
        const res = await fetch(
          `http://127.0.0.1:8000/api/nearby-hospitals?${query.toString()}`
        );
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.detail || "Failed to fetch nearby hospitals.");
        }

        setAntiVenomHospitals(data?.anti_venom_hospitals ?? []);
        setGeneralHospitals(data?.general_hospitals ?? []);
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

    fetchNearbyHospitals();
  }, [analysis, userLocation]);

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
        setHospitalError("Unable to fetch your location. Please allow location access.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  };

  const getDirectionsUrl = (hospital: Hospital) => {
    if (!userLocation) {
      return "#";
    }

    const origin = `${userLocation.latitude},${userLocation.longitude}`;
    const destination = `${hospital.latitude},${hospital.longitude}`;
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      resetAnalysisState();
    }
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      setUploadedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      resetAnalysisState();
    }
  };

  const handleAnalyze = async () => {
    if (!uploadedFile) {
      setError("Please upload an image first.");
      return;
    }

    setIsLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", uploadedFile);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/analyze-image", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Image analysis failed.");
      }

      setAnalysis(data);
      setSelectedRisk(data.risk_level.toLowerCase());
      setIsAnalyzed(true);
    } catch (err) {
      setAnalysis(null);
      setIsAnalyzed(false);
      setError(err instanceof Error ? err.message : "Image analysis failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const confidenceWidth = analysis
    ? `${Math.min(Math.max(analysis.confidence, 0), 100)}%`
    : "0%";

  const riskBadgeClass =
    analysis?.risk_level === "HIGH"
      ? "bg-red-500 text-white"
      : analysis?.risk_level === "MEDIUM"
        ? "bg-amber-500 text-white"
        : analysis?.risk_level === "LOW"
          ? "bg-green-600 text-white"
          : "bg-gray-500 text-white";

  return (
    <main className="max-w-7xl mx-auto w-full px-6 py-8 bg-[#f6f3ee] min-h-screen">
      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white shadow-md border border-gray-200 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <Upload className="text-green-600" />
              <div>
                <h2 className="text-lg font-semibold">Upload Bite Image</h2>
                <p className="text-sm text-gray-500">
                  Upload a clear photo of the bite area
                </p>
              </div>
            </div>

            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:border-green-500 transition cursor-pointer relative"
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />

              <Upload className="mx-auto mb-3 text-gray-400" />
              <p className="text-gray-600">Drop image here or click to upload</p>
              <p className="text-xs text-gray-400">PNG, JPG, WEBP up to 10MB</p>
            </div>

            {uploadedFile && (
              <div className="mt-4 border rounded-lg p-3 flex gap-3 items-center">
                <img
                  src={previewUrl}
                  alt="preview"
                  className="w-16 h-16 object-cover rounded"
                />
                <div className="flex-1 text-sm">
                  <p>{uploadedFile.name}</p>
                  <p className="text-gray-500">
                    {(uploadedFile.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
                <CheckCircle2 className="text-green-600" />
              </div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={isLoading}
              className="w-full mt-4 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-3 rounded-xl"
            >
              {isLoading ? "Analyzing..." : "Analyze Image"}
            </button>

            <p className="text-xs text-gray-500 mt-2 text-center">
              Analysis takes around 3 seconds
            </p>

            {error && (
              <p className="text-sm text-red-600 mt-3 text-center">{error}</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="bg-white shadow-md border border-gray-200 rounded-2xl p-6 h-full">
            <div className="flex items-center gap-3 mb-6">
              <ScanLine className="text-green-600" />
              <div>
                <h2 className="text-lg font-semibold">Analysis Result</h2>
                <p className="text-sm text-gray-500">
                  AI has analyzed the image
                </p>
              </div>
            </div>

            {!isAnalyzed || !analysis ? (
              <div className="text-center py-20 text-gray-400">
                Upload image to see results
              </div>
            ) : (
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-gray-500">Species Detected</p>
                  <p className="font-semibold text-lg">{analysis.species}</p>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Confidence Level</span>
                    <span className="text-green-600 font-medium flex items-center gap-1">
                      <TrendingUp size={14} /> {analysis.confidence.toFixed(2)}%
                    </span>
                  </div>
                  <div className="bg-gray-200 h-2 rounded">
                    <div
                      className="bg-green-600 h-2 rounded"
                      style={{ width: confidenceWidth }}
                    />
                  </div>
                </div>

                <div className="border rounded-lg p-4 flex justify-between items-center">
                  <span className="text-sm">Risk Level</span>
                  <span className={`px-3 py-1 rounded-full text-xs ${riskBadgeClass}`}>
                    {analysis.risk_level}
                  </span>
                </div>

                <div className="border rounded-lg p-4">
                  <p className="text-sm text-gray-500">Recommended Action</p>
                  <p className="text-red-600 font-semibold">
                    {analysis.recommended_action}
                  </p>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-2">
                  {["low", "medium", "high", "unknown"].map((level) => (
                    <button
                      key={level}
                      onClick={() => setSelectedRisk(level)}
                      className={`py-2 rounded-lg border text-sm ${
                        selectedRisk === level
                          ? "bg-red-100 border-red-500 text-red-600"
                          : "bg-white border-gray-300 text-gray-600"
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex flex-wrap gap-2 items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Nearby Hospitals</p>
                      <p className="text-sm text-gray-700">
                        Use your GPS location to find nearest anti-venom and general hospitals.
                      </p>
                    </div>
                    <button
                      onClick={requestUserLocation}
                      disabled={isLocating}
                      className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-3 py-2 rounded-lg text-sm"
                    >
                      <Navigation size={16} />
                      {isLocating ? "Locating..." : "Use My Location"}
                    </button>
                  </div>

                  {userLocation ? (
                    <p className="text-xs text-gray-500 mt-2">
                      Current location: {userLocation.latitude.toFixed(5)}, {userLocation.longitude.toFixed(5)}
                    </p>
                  ) : null}

                  {hospitalError ? (
                    <p className="text-sm text-red-600 mt-3">{hospitalError}</p>
                  ) : null}

                  {isFetchingHospitals ? (
                    <p className="text-sm text-gray-600 mt-3">Finding nearby hospitals...</p>
                  ) : null}

                  {!isFetchingHospitals && (antiVenomHospitals.length > 0 || generalHospitals.length > 0) ? (
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="border rounded-lg p-3 bg-red-50">
                        <h3 className="font-semibold text-red-700 mb-2">Top Anti-Venom Hospitals</h3>
                        <div className="space-y-2">
                          {antiVenomHospitals.map((hospital) => (
                            <div key={`anti-${hospital.id}`} className="rounded-md border border-red-200 bg-white p-2">
                              <p className="font-medium text-sm">{hospital.name}</p>
                              <p className="text-xs text-gray-600">{hospital.city || "City not available"}</p>
                              <p className="text-xs text-gray-600">{hospital.distance_km} km away</p>
                              <a
                                href={getDirectionsUrl(hospital)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-blue-700 mt-1"
                              >
                                <MapPin size={14} /> Directions <ExternalLink size={12} />
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="border rounded-lg p-3 bg-emerald-50">
                        <h3 className="font-semibold text-emerald-700 mb-2">Top General Hospitals</h3>
                        <div className="space-y-2">
                          {generalHospitals.map((hospital) => (
                            <div key={`general-${hospital.id}`} className="rounded-md border border-emerald-200 bg-white p-2">
                              <p className="font-medium text-sm">{hospital.name}</p>
                              <p className="text-xs text-gray-600">{hospital.city || "City not available"}</p>
                              <p className="text-xs text-gray-600">{hospital.distance_km} km away</p>
                              <a
                                href={getDirectionsUrl(hospital)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-blue-700 mt-1"
                              >
                                <MapPin size={14} /> Directions <ExternalLink size={12} />
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
