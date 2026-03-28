import { useState } from "react";
import {
  Upload,
  CheckCircle2,
  ScanLine,
  TrendingUp,
} from "lucide-react";

type AnalysisResult = {
  species: string;
  confidence: number;
  risk_level: string;
  recommended_action: string;
};

export function ImageAnalyzer() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isAnalyzed, setIsAnalyzed] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState("unknown");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  const resetAnalysisState = () => {
    setIsAnalyzed(false);
    setAnalysis(null);
    setError("");
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
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
