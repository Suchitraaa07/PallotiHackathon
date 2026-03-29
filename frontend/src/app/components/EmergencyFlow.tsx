"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Loader2,
  Map,
  MapPinned,
  Mic,
  MicOff,
  Phone,
  ShieldPlus,
  ScanLine,
  Stethoscope,
  Building2,
  FileText,
} from "lucide-react";
import { Hospitals } from "./Hospitals";
import { ImageAnalyzer } from "./ImageAnalyzer";
import { MapSection } from "./MapSection";
import { ReportIncident } from "./ReportIncident";
import { Result } from "./Result";
import { RiskCheck } from "./RiskCheck";
import { EmergencyContact } from "./EmergencyContact";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

type InputType = "voice" | "manual" | "image" | null;

type RiskResult = {
  riskLevel: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  symptoms: string[];
  explanation: string;
  recommendations?: string[];
  raw?: unknown;
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api";

export function EmergencyFlow() {
  const [step, setStep] = useState(0);
  const [inputType, setInputType] = useState<InputType>(null);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [riskResult, setRiskResult] = useState<RiskResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = "en-US";

    recognitionRef.current.onstart = () => setIsListening(true);
    recognitionRef.current.onend = () => setIsListening(false);
    recognitionRef.current.onerror = (event: any) => {
      setError(`Microphone error: ${event?.error || "Speech recognition failed."}`);
      setIsListening(false);
      setLoading(false);
    };

    return () => {
      recognitionRef.current?.abort?.();
    };
  }, []);

  useEffect(() => {
    if (step !== 2 || symptoms.length === 0) {
      return;
    }

    let cancelled = false;

    const assessRisk = async () => {
      setLoading(true);
      setError("");

      try {
        const payload = await postJsonWithFallback(
          ["severity", "risk-assessment"],
          { symptoms }
        );

        if (cancelled) {
          return;
        }

        setRiskResult(normalizeRiskResult(payload, symptoms));
        setStep(3);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Risk assessment failed."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void assessRisk();

    return () => {
      cancelled = true;
    };
  }, [step, symptoms]);

  const riskLevel = riskResult?.riskLevel ?? "UNKNOWN";
  const canUseMic = Boolean(recognitionRef.current);

  const progressLabel = useMemo(() => {
    if (step === 0) return "Choose input";
    if (step === 1) return "Collect details";
    if (step === 2) return "Assessing risk";
    return "Action plan";
  }, [step]);

  useEffect(() => {
    if (step < 3 || !riskResult) {
      return;
    }

    setActiveTab("overview");
  }, [riskResult, step]);

  const resetFlow = () => {
    recognitionRef.current?.abort?.();
    setStep(0);
    setInputType(null);
    setSymptoms([]);
    setRiskResult(null);
    setLoading(false);
    setError("");
    setVoiceTranscript("");
    setIsListening(false);
    setActiveTab("overview");
  };

  const selectInputType = (nextInputType: Exclude<InputType, null>) => {
    setError("");
    setInputType(nextInputType);
    setStep(1);
    setSymptoms([]);
    setRiskResult(null);
    setVoiceTranscript("");
  };

  const handleManualSubmit = (nextSymptoms: string[]) => {
    setSymptoms(nextSymptoms);
    setStep(2);
  };

  const handleImageResult = (prediction: {
    species?: string;
    risk_level?: string;
    recommended_action?: string;
  }) => {
    const derivedSymptoms = convertPredictionToSymptoms(prediction);
    setSymptoms(derivedSymptoms);
    setError("");
    setStep(2);
  };

  const handleVoiceToggle = () => {
    if (!recognitionRef.current) {
      setError("This browser does not support microphone-based speech recognition.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      return;
    }

    setLoading(false);
    setError("");

    recognitionRef.current.onresult = async (event: any) => {
      const transcript = event?.results?.[0]?.[0]?.transcript ?? "";
      setVoiceTranscript(transcript);
      setLoading(true);

      try {
        const payload = await postJsonWithFallback(
          ["extract-symptoms", "extract"],
          { text: transcript }
        );

        const extractedSymptoms = extractSymptomsFromPayload(payload);
        if (extractedSymptoms.length === 0) {
          throw new Error("No symptoms were detected from the voice input.");
        }

        setSymptoms(extractedSymptoms);
        setStep(2);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to process voice input."
        );
      } finally {
        setLoading(false);
      }
    };

    recognitionRef.current.start();
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(143,35,35,0.12),_transparent_32%),linear-gradient(to_bottom,_#f8f6f1,_#eef3ea)]">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 rounded-[28px] border border-[#d8c6bc] bg-gradient-to-r from-[#fff8f3] via-[#fffdf9] to-[#f3f8f0] p-6 shadow-[0_18px_45px_rgba(74,28,28,0.10)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#3f1d1d]">
                Emergency Response Flow
              </h1>
              <p className="mt-1 text-sm text-[#725c54]">
                One-page incident workflow from input to guidance, hospitals,
                and reporting.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-full border border-[#d8c6bc] bg-[#fff5ef] px-4 py-2 text-sm font-medium text-[#6b2d2d]">
                {progressLabel}
              </div>
              {(step > 0 || symptoms.length > 0 || riskResult) && (
                <button
                  type="button"
                  onClick={resetFlow}
                  className="rounded-xl border border-[#d8c6bc] bg-white px-4 py-2 text-sm font-medium text-[#6b2d2d] transition hover:bg-[#fff7f2]"
                >
                  Start over
                </button>
              )}
            </div>
          </div>
        </div>

        {error ? (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            <AlertCircle className="mt-0.5 shrink-0" size={18} />
            <p className="text-sm">{error}</p>
          </div>
        ) : null}

        <div className="space-y-6 transition-all duration-300">
          {step === 0 ? (
            <section className="rounded-[28px] border border-[#d8c6bc] bg-white/95 p-6 shadow-[0_12px_35px_rgba(74,28,28,0.08)]">
              <h2 className="text-2xl font-semibold text-[#3f1d1d]">
                Step 0: Choose input method
              </h2>
              <p className="mt-2 text-sm text-[#725c54]">
                Pick the fastest way to describe the incident.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <button
                  type="button"
                  onClick={() => selectInputType("voice")}
                  className="rounded-[24px] border border-[#d8c6bc] bg-gradient-to-br from-white to-[#f7faf6] p-6 text-left transition hover:-translate-y-0.5 hover:border-[#7b5d55] hover:shadow-lg"
                >
                  <Mic className="mb-4 text-blue-600" size={28} />
                  <h3 className="text-lg font-semibold text-[#3f1d1d]">
                    Voice Input
                  </h3>
                  <p className="mt-2 text-sm text-[#725c54]">
                    Speak symptoms and let the mic extract them automatically.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => selectInputType("manual")}
                  className="rounded-[24px] border border-[#d8c6bc] bg-gradient-to-br from-white to-[#f7faf6] p-6 text-left transition hover:-translate-y-0.5 hover:border-[#7b5d55] hover:shadow-lg"
                >
                  <Stethoscope className="mb-4 text-emerald-600" size={28} />
                  <h3 className="text-lg font-semibold text-[#3f1d1d]">
                    Manual Symptoms
                  </h3>
                  <p className="mt-2 text-sm text-[#725c54]">
                    Use the existing symptom checklist and continue to assessment.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => selectInputType("image")}
                  className="rounded-[24px] border border-[#d8c6bc] bg-gradient-to-br from-white to-[#f7faf6] p-6 text-left transition hover:-translate-y-0.5 hover:border-[#7b5d55] hover:shadow-lg"
                >
                  <ScanLine className="mb-4 text-amber-600" size={28} />
                  <h3 className="text-lg font-semibold text-[#3f1d1d]">
                    Image Upload
                  </h3>
                  <p className="mt-2 text-sm text-[#725c54]">
                    Upload an image, infer symptoms from the prediction, and keep going.
                  </p>
                </button>
              </div>
            </section>
          ) : null}

          {step === 1 && inputType === "voice" ? (
            <section className="rounded-[28px] border border-[#d8c6bc] bg-white p-6 shadow-[0_12px_35px_rgba(74,28,28,0.08)]">
              <h2 className="text-2xl font-semibold text-[#3f1d1d]">
                Step 1: Voice input
              </h2>
              <p className="mt-2 text-sm text-[#725c54]">
                Use the microphone and describe the bite, symptoms, and what the
                patient is feeling.
              </p>

              <div className="mt-6 flex flex-col items-center gap-4 text-center">
                <button
                  type="button"
                  onClick={handleVoiceToggle}
                  disabled={!canUseMic || loading}
                  className={`rounded-full p-6 text-white transition ${
                    isListening
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-[#6b2d2d] hover:bg-[#5a2525]"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {isListening ? <MicOff size={40} /> : <Mic size={40} />}
                </button>

                <div>
                  <p className="text-sm font-medium text-slate-700">
                    {!canUseMic
                      ? "Mic is not supported in this browser."
                      : isListening
                        ? "Listening now..."
                        : "Tap the mic to start speaking."}
                  </p>
                  {voiceTranscript ? (
                    <p className="mt-3 rounded-xl bg-[#f8f2ed] px-4 py-3 text-sm text-[#725c54]">
                      Heard: {voiceTranscript}
                    </p>
                  ) : null}
                </div>
              </div>
            </section>
          ) : null}

          {step === 1 && inputType === "manual" ? (
            <section className="transition-all duration-300">
              <RiskCheck onSubmit={handleManualSubmit} />
            </section>
          ) : null}

          {step === 1 && inputType === "image" ? (
            <section className="transition-all duration-300">
              <ImageAnalyzer onResult={handleImageResult} />
            </section>
          ) : null}

          {step === 2 ? (
            <section className="rounded-[28px] border border-[#d8c6bc] bg-white p-8 shadow-[0_12px_35px_rgba(74,28,28,0.08)]">
              <div className="flex flex-col items-center justify-center gap-4 text-center">
                <Loader2 className="animate-spin text-[#6b2d2d]" size={36} />
                <div>
                  <h2 className="text-2xl font-semibold text-[#3f1d1d]">
                    Step 2: Risk assessment
                  </h2>
                  <p className="mt-2 text-sm text-[#725c54]">
                    Assessing the collected symptoms and preparing the next actions.
                  </p>
                </div>
              </div>
            </section>
          ) : null}

          {step >= 3 && riskResult ? (
            <section className="rounded-[30px] border border-[#d8c6bc] bg-gradient-to-br from-[#fffaf6] via-white to-[#f1f6ee] p-4 shadow-[0_18px_55px_rgba(74,28,28,0.12)] md:p-6">
              <div className="mb-6 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
                <div className="rounded-[24px] border border-[#e4d6cf] bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8b665a]">
                        Assessment Complete
                      </p>
                      <h2 className="mt-2 text-3xl font-bold text-[#3f1d1d]">
                        {riskResult.riskLevel} Risk Response
                      </h2>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#725c54]">
                        {riskResult.explanation}
                      </p>
                    </div>

                    <div
                      className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
                        riskLevel === "HIGH"
                          ? "border-red-200 bg-red-50 text-red-700"
                          : riskLevel === "MEDIUM"
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : "border-emerald-200 bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      Active Risk: {riskLevel}
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {riskResult.symptoms.map((symptom) => (
                      <span
                        key={symptom}
                        className="rounded-full border border-[#d9e5d7] bg-[#eef5ea] px-3 py-1.5 text-xs font-medium text-[#2f6b45]"
                      >
                        {symptom}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-[24px] border border-[#d7e3d4] bg-gradient-to-br from-[#eef6ea] to-[#f7fbf4] p-5 shadow-sm">
                  <h3 className="text-lg font-semibold text-[#2f4f36]">
                    Immediate Actions
                  </h3>
                  <p className="mt-2 text-sm text-[#55715c]">
                    Use the tabs below to move between map, hospitals, contacts,
                    and reporting without scrolling through one long page.
                  </p>

                  <div className="mt-4 space-y-3">
                    {riskLevel === "HIGH" ? (
                      <a
                        href="tel:108"
                        className="flex items-center justify-center gap-2 rounded-2xl bg-[#8f2323] px-4 py-3 text-center font-semibold text-white transition hover:bg-[#741b1b]"
                      >
                        <Phone size={18} />
                        Call 108 now
                      </a>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => setActiveTab("contacts")}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#c9dabc] bg-white px-4 py-3 text-sm font-semibold text-[#2f6b45] transition hover:bg-[#f5faf1]"
                    >
                      <ShieldPlus size={18} />
                      View emergency contacts
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab("hospitals")}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#e2d4cc] bg-[#fff7f1] px-4 py-3 text-sm font-semibold text-[#6b2d2d] transition hover:bg-[#fff0e6]"
                    >
                      <Building2 size={18} />
                      View nearby hospitals
                    </button>
                  </div>
                </div>
              </div>

              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="gap-5"
              >
                <TabsList className="h-auto w-full flex-wrap justify-start gap-2 rounded-[24px] border border-[#d8c6bc] bg-[#f8eee7] p-2">
                  <TabsTrigger
                    value="overview"
                    className="min-w-[9rem] flex-none rounded-2xl px-4 py-2.5 data-[state=active]:border-[#d8c6bc] data-[state=active]:bg-white data-[state=active]:text-[#6b2d2d]"
                  >
                    <AlertTriangle size={16} />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger
                    value="map"
                    className="min-w-[9rem] flex-none rounded-2xl px-4 py-2.5 data-[state=active]:border-[#d8c6bc] data-[state=active]:bg-white data-[state=active]:text-[#6b2d2d]"
                  >
                    <Map size={16} />
                    Live Map
                  </TabsTrigger>
                  <TabsTrigger
                    value="contacts"
                    className="min-w-[9rem] flex-none rounded-2xl px-4 py-2.5 data-[state=active]:border-[#d8c6bc] data-[state=active]:bg-white data-[state=active]:text-[#6b2d2d]"
                  >
                    <ShieldPlus size={16} />
                    Contacts
                  </TabsTrigger>
                  <TabsTrigger
                    value="hospitals"
                    className="min-w-[9rem] flex-none rounded-2xl px-4 py-2.5 data-[state=active]:border-[#d8c6bc] data-[state=active]:bg-white data-[state=active]:text-[#6b2d2d]"
                  >
                    <Building2 size={16} />
                    Hospitals
                  </TabsTrigger>
                  <TabsTrigger
                    value="report"
                    className="min-w-[9rem] flex-none rounded-2xl px-4 py-2.5 data-[state=active]:border-[#d8c6bc] data-[state=active]:bg-white data-[state=active]:text-[#6b2d2d]"
                  >
                    <FileText size={16} />
                    Report
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-0">
                  <div className="rounded-[24px] border border-[#e4d6cf] bg-white p-4 shadow-sm">
                    <Result
                      riskLevel={riskResult.riskLevel}
                      symptoms={riskResult.symptoms}
                      explanation={riskResult.explanation}
                    />

                    <div className="mt-4 rounded-[20px] border border-[#d7e3d4] bg-[#f2f8ef] p-5">
                      <div className="flex items-start gap-3">
                        <MapPinned className="mt-0.5 text-[#2f6b45]" size={18} />
                        <div>
                          <h3 className="text-lg font-semibold text-[#2f4f36]">
                            Response Path
                          </h3>
                          <p className="mt-1 text-sm text-[#55715c]">
                            Move through the tabs to review the live risk map,
                            location-aware emergency contacts, nearby hospitals,
                            and the prefilled incident report.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="map" className="mt-0">
                  <div className="overflow-hidden rounded-[24px] border border-[#e4d6cf] bg-white shadow-sm">
                    <MapSection />
                  </div>
                </TabsContent>

                <TabsContent value="contacts" className="mt-0">
                  <div className="overflow-hidden rounded-[24px] border border-[#e4d6cf] bg-white shadow-sm">
                    <EmergencyContact />
                  </div>
                </TabsContent>

                <TabsContent value="hospitals" className="mt-0">
                  <div className="overflow-hidden rounded-[24px] border border-[#e4d6cf] bg-white shadow-sm">
                    <Hospitals />
                  </div>
                </TabsContent>

                <TabsContent value="report" className="mt-0">
                  <div className="overflow-hidden rounded-[24px] border border-[#e4d6cf] bg-white shadow-sm">
                    <ReportIncident
                      initialSymptoms={riskResult.symptoms}
                      initialRiskLevel={riskResult.riskLevel}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}

async function postJsonWithFallback(
  endpoints: string[],
  body: Record<string, unknown>
) {
  let lastError: Error | null = null;

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(`${API_BASE_URL}/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.detail || `Request failed for ${endpoint}.`);
      }

      return await res.json();
    } catch (err) {
      lastError =
        err instanceof Error ? err : new Error(`Request failed for ${endpoint}.`);
    }
  }

  throw lastError ?? new Error("Request failed.");
}

function extractSymptomsFromPayload(payload: any): string[] {
  const rawSymptoms = payload?.symptoms;
  if (!Array.isArray(rawSymptoms)) {
    return [];
  }

  return rawSymptoms
    .map((item) => String(item).trim())
    .filter(Boolean);
}

function normalizeRiskResult(payload: any, detectedSymptoms: string[]): RiskResult {
  const rawSeverity = String(
    payload?.risk_level ?? payload?.riskLevel ?? payload?.severity ?? "UNKNOWN"
  ).toUpperCase();

  let riskLevel: RiskResult["riskLevel"] = "UNKNOWN";
  if (rawSeverity.includes("HIGH")) {
    riskLevel = "HIGH";
  } else if (rawSeverity.includes("MEDIUM")) {
    riskLevel = "MEDIUM";
  } else if (rawSeverity.includes("LOW")) {
    riskLevel = "LOW";
  }

  const explanation =
    String(payload?.explanation || "").trim() ||
    buildExplanation(riskLevel, detectedSymptoms);

  const recommendations = Array.isArray(payload?.recommendations)
    ? payload.recommendations.map((item: unknown) => String(item))
    : [];

  return {
    riskLevel,
    symptoms: detectedSymptoms,
    explanation,
    recommendations,
    raw: payload,
  };
}

function buildExplanation(
  riskLevel: RiskResult["riskLevel"],
  detectedSymptoms: string[]
) {
  const joinedSymptoms = detectedSymptoms.join(", ");

  if (riskLevel === "HIGH") {
    return joinedSymptoms
      ? `High-risk presentation detected from: ${joinedSymptoms}. Immediate emergency support and hospital care are recommended.`
      : "High-risk presentation detected. Immediate emergency support and hospital care are recommended.";
  }

  if (riskLevel === "MEDIUM") {
    return joinedSymptoms
      ? `Moderate-risk presentation detected from: ${joinedSymptoms}. Begin first aid and arrange hospital evaluation soon.`
      : "Moderate-risk presentation detected. Begin first aid and arrange hospital evaluation soon.";
  }

  if (riskLevel === "LOW") {
    return joinedSymptoms
      ? `Lower-risk presentation detected from: ${joinedSymptoms}. Continue first aid and monitor for worsening symptoms.`
      : "Lower-risk presentation detected. Continue first aid and monitor for worsening symptoms.";
  }

  return joinedSymptoms
    ? `The collected symptoms were: ${joinedSymptoms}. Review the result carefully and seek help if symptoms escalate.`
    : "Review the result carefully and seek help if symptoms escalate.";
}

function convertPredictionToSymptoms(prediction: {
  species?: string;
  risk_level?: string;
  recommended_action?: string;
}) {
  const mappedByRisk: Record<string, string[]> = {
    HIGH: ["Severe pain", "Swelling at bite site", "Bleeding"],
    MEDIUM: ["Severe pain", "Swelling at bite site"],
    LOW: ["Pain", "Localized swelling"],
  };

  const normalizedRisk = String(prediction?.risk_level || "UNKNOWN").toUpperCase();
  const mapped = mappedByRisk[normalizedRisk] ?? [];
  const species = prediction?.species?.trim();
  const recommendation = prediction?.recommended_action?.trim();

  return Array.from(
    new Set(
      [
        ...mapped,
        species && species !== "Not a snake" ? `${species} detected` : "",
        recommendation || "",
      ].filter(Boolean)
    )
  );
}
