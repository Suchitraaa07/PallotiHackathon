import { useState } from "react";
import {
  AlertTriangle,
  Camera,
  Upload,
  CheckCircle2,
  ScanLine,
  TrendingUp,
  Shield,
  Zap,
} from "lucide-react";

export type AnalysisResult = {
  species: string;
  confidence: number;
  risk_level: string;
  recommended_action: string;
  detection_source?: string;
  decision_stage?: "detection" | "classification";
  model_outputs?: {
    snake_detector?: {
      is_snake?: boolean;
      confidence?: number;
      label?: string;
      source?: string;
    };
    species_classifier?: {
      species?: string;
      confidence?: number;
      margin?: number;
      entropy?: number;
      accepted?: boolean;
      available?: boolean;
    };
    wound_classifier?: {
      available?: boolean;
      label?: string;
      confidence?: number;
    };
  };
};

type ImageAnalyzerProps = {
  onResult?: (prediction: AnalysisResult) => void;
};

export function ImageAnalyzer({ onResult }: ImageAnalyzerProps = {}) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isAnalyzed, setIsAnalyzed] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState("unknown");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [notice, setNotice] = useState("");

  const resetAnalysisState = () => {
    setIsAnalyzed(false);
    setAnalysis(null);
    setError("");
    setNotice("");
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
    setNotice("");

    const formData = new FormData();
    formData.append("file", uploadedFile);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/analyze-image", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Image analysis failed.");

      setAnalysis(data);
      onResult?.(data);
      setSelectedRisk(data.risk_level.toLowerCase());
      setIsAnalyzed(true);
      if (data.species === "Not a snake") {
        if (data.decision_stage === "detection") {
          setNotice("The first-stage detector filtered this image before classification.");
        } else {
          setNotice("Classification uncertainty was high, so this was treated as not-a-snake.");
        }
      } else if (data.species === "Unclear snake image") {
        setNotice("A snake-like shape was detected, but the classifier was not confident enough.");
      }
    } catch (err) {
      setAnalysis(null);
      setIsAnalyzed(false);
      setError(err instanceof Error ? err.message : "Image analysis failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const confidenceValue = analysis ? Math.min(Math.max(analysis.confidence, 0), 100) : 0;

  const getRiskConfig = (level?: string) => {
    switch (level) {
      case "HIGH": return { bg: "bg-[#fef2f2]", text: "text-[#991b1b]", dot: "bg-[#ef4444]", label: "High Risk" };
      case "MEDIUM": return { bg: "bg-[#fffbeb]", text: "text-[#92400e]", dot: "bg-[#f59e0b]", label: "Medium Risk" };
      case "LOW": return { bg: "bg-[#f0fdf4]", text: "text-[#166534]", dot: "bg-[#22c55e]", label: "Low Risk" };
      default: return { bg: "bg-[#f8f7f4]", text: "text-[#57534e]", dot: "bg-[#a8a29e]", label: "Unknown" };
    }
  };

  const getResultConfig = () => {
    if (!analysis) return null;
    if (analysis.species === "Not a snake") return {
      icon: <Camera size={18} className="text-[#0369a1]" />,
      border: "border-[#bae6fd]",
      bg: "bg-[#f0f9ff]",
      iconBg: "bg-[#e0f2fe]",
      title: "No snake detected",
      summary: "The first-stage detector filtered this image out before venom classification.",
    };
    if (analysis.species === "Unclear snake image") return {
      icon: <AlertTriangle size={18} className="text-[#b45309]" />,
      border: "border-[#fde68a]",
      bg: "bg-[#fffbeb]",
      iconBg: "bg-[#fef3c7]",
      title: "Snake image unclear",
      summary: "A snake-like shape was detected, but a clearer view is needed to classify it.",
    };
    return {
      icon: <CheckCircle2 size={18} className="text-[#166534]" />,
      border: "border-[#bbf7d0]",
      bg: "bg-[#f0fdf4]",
      iconBg: "bg-[#dcfce7]",
      title: "Snake identified",
      summary: "The image passed both detection and classification stages successfully.",
    };
  };

  const riskConfig = getRiskConfig(analysis?.risk_level);
  const resultConfig = getResultConfig();
  const snakeModelLabel =
    analysis?.model_outputs?.snake_detector?.label ?? analysis?.species ?? "N/A";
  const snakeModelConfidence =
    analysis?.model_outputs?.snake_detector?.confidence ?? analysis?.confidence ?? 0;
  const woundModelLabel = analysis?.model_outputs?.wound_classifier?.label ?? "N/A";
  const woundModelConfidence = analysis?.model_outputs?.wound_classifier?.confidence ?? 0;

  const riskLevels = [
    { key: "low", label: "Low", color: "text-[#166534]", activeBg: "bg-[#dcfce7]", activeBorder: "border-[#86efac]" },
    { key: "medium", label: "Med", color: "text-[#92400e]", activeBg: "bg-[#fef3c7]", activeBorder: "border-[#fcd34d]" },
    { key: "high", label: "High", color: "text-[#991b1b]", activeBg: "bg-[#fee2e2]", activeBorder: "border-[#fca5a5]" },
    { key: "unknown", label: "N/A", color: "text-[#57534e]", activeBg: "bg-[#f5f5f4]", activeBorder: "border-[#d6d3d1]" },
  ];

  return (
    <div className="min-h-screen bg-[#f4f1ea] font-sans">
      {/* Header */}
      <div className="bg-[#1a2e1a] text-white px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#2d4a2d] flex items-center justify-center">
              <Shield size={18} className="text-[#86efac]" />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight">SnakeGuard</h1>
              <p className="text-xs text-[#a3b8a3]">Two-stage venom detection system</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#6b8c6b]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" />
            Model active
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-5 gap-6">

          {/* Left panel — Upload */}
          <div className="lg:col-span-2 space-y-4">

            {/* Upload card */}
            <div className="bg-white rounded-2xl border border-[#e5e0d5] overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-[#f0ebe0] flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-[#f0fdf4] flex items-center justify-center">
                  <Upload size={14} className="text-[#166534]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1c1917]">Upload image</p>
                  <p className="text-xs text-[#a8a29e]">PNG, JPG, WEBP · max 10 MB</p>
                </div>
              </div>

              <div className="p-5">
                <label
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className="relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#d5cfc4] bg-[#faf8f4] hover:border-[#3b6d11] hover:bg-[#f4f9f0] transition-all cursor-pointer py-10 group"
                >
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <div className="w-10 h-10 rounded-full bg-[#f0ebe0] group-hover:bg-[#dcfce7] flex items-center justify-center transition-colors">
                    <Upload size={18} className="text-[#78716c] group-hover:text-[#166534] transition-colors" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-[#44403c]">Drop image here</p>
                    <p className="text-xs text-[#a8a29e] mt-0.5">or click to browse files</p>
                  </div>
                </label>

                {uploadedFile && (
                  <div className="mt-4 flex items-center gap-3 rounded-xl bg-[#f8f7f4] border border-[#e8e3d8] p-3">
                    <div className="relative flex-shrink-0">
                      <img src={previewUrl} alt="preview" className="w-14 h-14 object-cover rounded-lg border border-[#e5e0d5]" />
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#22c55e] flex items-center justify-center">
                        <CheckCircle2 size={10} className="text-white" />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#1c1917] truncate">{uploadedFile.name}</p>
                      <p className="text-xs text-[#a8a29e] mt-0.5">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB · Ready to analyze</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Analyze button card */}
            <div className="bg-[#1a2e1a] rounded-2xl p-5 shadow-sm">
              <button
                onClick={handleAnalyze}
                disabled={isLoading || !uploadedFile}
                className="w-full flex items-center justify-center gap-2.5 bg-[#2d5a2d] hover:bg-[#3b6d3b] disabled:bg-[#243824] disabled:opacity-50 text-white text-sm font-semibold py-3.5 rounded-xl transition-all active:scale-[0.98]"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Analyzing image…
                  </>
                ) : (
                  <>
                    <Zap size={16} className="text-[#86efac]" />
                    Run Analysis
                  </>
                )}
              </button>
              <p className="text-center text-xs text-[#6b8c6b] mt-3">Two-stage detection · ~3 seconds</p>

              {error && (
                <div className="mt-3 rounded-lg bg-[#450a0a] border border-[#7f1d1d] px-3 py-2.5 text-xs text-[#fca5a5] text-center">
                  {error}
                </div>
              )}
              {notice && (
                <div className="mt-3 rounded-lg bg-[#422006] border border-[#78350f] px-3 py-2.5 text-xs text-[#fde68a] text-center">
                  {notice}
                </div>
              )}
            </div>

            {/* Pipeline info */}
            <div className="bg-white rounded-2xl border border-[#e5e0d5] p-5 shadow-sm">
              <p className="text-xs font-semibold text-[#78716c] uppercase tracking-wider mb-3">Detection Pipeline</p>
              <div className="space-y-2.5">
                {[
                  { step: "01", label: "Detection gate", desc: "Filters non-snake images" },
                  { step: "02", label: "Venom classifier", desc: "Species & risk assessment" },
                ].map((s) => (
                  <div key={s.step} className="flex items-start gap-3">
                    <span className="text-xs font-mono font-bold text-[#a8a29e] mt-0.5">{s.step}</span>
                    <div>
                      <p className="text-xs font-semibold text-[#1c1917]">{s.label}</p>
                      <p className="text-xs text-[#a8a29e]">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right panel — Results */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl border border-[#e5e0d5] overflow-hidden shadow-sm h-full">
              <div className="px-5 py-4 border-b border-[#f0ebe0] flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-[#f0fdf4] flex items-center justify-center">
                  <ScanLine size={14} className="text-[#166534]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1c1917]">Analysis result</p>
                  <p className="text-xs text-[#a8a29e]">Detection gate runs before venom classification</p>
                </div>
              </div>

              {!isAnalyzed || !analysis ? (
                <div className="flex flex-col items-center justify-center py-24 text-center px-6">
                  <div className="w-16 h-16 rounded-2xl bg-[#f4f1ea] border border-[#e5e0d5] flex items-center justify-center mb-4">
                    <ScanLine size={28} className="text-[#c7bfb0]" />
                  </div>
                  <p className="text-sm font-medium text-[#78716c]">No analysis yet</p>
                  <p className="text-xs text-[#c7bfb0] mt-1">Upload an image and run the detector to see results here</p>
                </div>
              ) : (
                <div className="p-5 space-y-4">

                  {/* Result status banner */}
                  {resultConfig && (
                    <div className={`flex items-start gap-3 rounded-xl border p-4 ${resultConfig.bg} ${resultConfig.border}`}>
                      <div className={`w-8 h-8 rounded-lg ${resultConfig.iconBg} flex items-center justify-center flex-shrink-0`}>
                        {resultConfig.icon}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#1c1917]">{resultConfig.title}</p>
                        <p className="text-xs text-[#57534e] mt-0.5">{resultConfig.summary}</p>
                      </div>
                    </div>
                  )}

                  {/* Snake + wound model output */}
                  <div className="rounded-xl border border-[#e5e0d5] bg-[#faf8f4] p-4">
                    <p className="text-xs font-semibold text-[#a8a29e] uppercase tracking-wider mb-1">
                      Model Outputs
                    </p>
                    <p className="text-xl font-bold text-[#1c1917]">
                      Snake: {snakeModelLabel}
                    </p>
                    <p className="text-xs text-[#78716c] mt-1 mb-2">
                      Confidence: {snakeModelConfidence.toFixed(2)}%
                    </p>
                    <p className="text-sm text-[#44403c]">
                      Wound: {woundModelLabel}
                    </p>
                    <p className="text-xs text-[#78716c] mt-1">
                      Confidence: {woundModelConfidence.toFixed(2)}%
                    </p>
                    {analysis.detection_source && (
                      <p className="text-xs text-[#a8a29e] mt-1.5 flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-[#a8a29e] inline-block" />
                        Source: {analysis.detection_source}
                      </p>
                    )}
                  </div>

                  {/* 2-col row: Confidence + Risk */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Confidence */}
                    <div className="rounded-xl border border-[#e5e0d5] p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-[#a8a29e] uppercase tracking-wider">Confidence</p>
                        <span className="flex items-center gap-1 text-sm font-bold text-[#166534]">
                          <TrendingUp size={13} />
                          {confidenceValue.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-[#f0ebe0] overflow-hidden">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-[#3b6d11] to-[#86efac] transition-all duration-700"
                          style={{ width: `${confidenceValue}%` }}
                        />
                      </div>
                      <p className="text-xs text-[#a8a29e] mt-2">
                        {confidenceValue >= 80 ? "High confidence" : confidenceValue >= 50 ? "Moderate confidence" : "Low confidence"}
                      </p>
                    </div>

                    {/* Risk level */}
                    <div className={`rounded-xl border p-4 ${riskConfig.bg} border-[#e5e0d5]`}>
                      <p className="text-xs font-semibold text-[#a8a29e] uppercase tracking-wider mb-3">Risk level</p>
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${riskConfig.dot}`} />
                        <span className={`text-lg font-bold ${riskConfig.text}`}>{riskConfig.label}</span>
                      </div>
                      <p className={`text-xs mt-2 ${riskConfig.text} opacity-70`}>{analysis.risk_level} severity</p>
                    </div>
                  </div>

                  {/* Recommended action */}
                  <div className="rounded-xl border border-[#fca5a5] bg-[#fef2f2] p-4">
                    <p className="text-xs font-semibold text-[#a8a29e] uppercase tracking-wider mb-1">Recommended action</p>
                    <p className="text-sm font-semibold text-[#991b1b]">{analysis.recommended_action}</p>
                  </div>

                  {/* Risk filter */}
                  <div>
                    <p className="text-xs font-semibold text-[#a8a29e] uppercase tracking-wider mb-2">Override risk filter</p>
                    <div className="grid grid-cols-4 gap-2">
                      {riskLevels.map((r) => (
                        <button
                          key={r.key}
                          onClick={() => setSelectedRisk(r.key)}
                          className={`py-2 rounded-lg border text-xs font-semibold transition-all ${
                            selectedRisk === r.key
                              ? `${r.activeBg} ${r.activeBorder} ${r.color}`
                              : "bg-[#faf8f4] border-[#e5e0d5] text-[#78716c] hover:border-[#c7bfb0]"
                          }`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
