import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Mic,
  MicOff,
  Loader2,
  Phone,
  Sparkles,
  ListChecks,
  ShieldAlert,
  MapPinned,
  FilePlus2,
} from "lucide-react";
import { ImageAnalyzer, type AnalysisResult } from "./ImageAnalyzer";
import { RiskCheck } from "./RiskCheck";
import { Result } from "./Result";
import { FirstAidGuide } from "./FirstAidGuide";
import { MapSection } from "./MapSection";
import { ReportIncident } from "./ReportIncident";
import { Hospitals } from "./Hospitals";

type InputType = "voice" | "manual" | "image" | null;

type RiskResult = {
  riskLevel: string;
  explanation: string;
  precautions: string[];
};

type SymptomApiResponse = {
  symptoms?: string[];
};
type TabKey = "input" | "result" | "actions" | "report";
type SpeechRecognitionCtor = new () => {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function normalizeRiskLevel(level: string | undefined) {
  const normalized = String(level ?? "").trim().toLowerCase();
  if (normalized.includes("high")) return "HIGH";
  if (normalized.includes("medium")) return "MEDIUM";
  if (normalized.includes("low")) return "LOW";
  return "UNKNOWN";
}

async function postJsonWithFallback<T>(
  primaryUrl: string,
  fallbackUrl: string,
  payload: unknown
) {
  const requestOptions: RequestInit = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  };

  const primaryResponse = await fetch(primaryUrl, requestOptions);
  if (primaryResponse.status !== 404) {
    const data = (await primaryResponse.json()) as T;
    return { response: primaryResponse, data };
  }

  const fallbackResponse = await fetch(fallbackUrl, requestOptions);
  const fallbackData = (await fallbackResponse.json()) as T;
  return { response: fallbackResponse, data: fallbackData };
}

function convertPredictionToSymptoms(prediction: AnalysisResult) {
  const species = (prediction.species || "").toLowerCase();
  const woundLabel =
    prediction.model_outputs?.wound_classifier?.label?.toLowerCase() || "";
  const symptoms = new Set<string>();

  if (species.includes("venomous")) {
    symptoms.add("Severe pain");
    symptoms.add("Swelling at bite site");
    symptoms.add("Nausea / Vomiting");
  } else if (species.includes("non venomous")) {
    symptoms.add("Severe pain");
    symptoms.add("Swelling at bite site");
  } else {
    symptoms.add("Weakness / Fatigue");
  }

  if (woundLabel.includes("wound")) {
    symptoms.add("Bleeding");
  }

  return Array.from(symptoms);
}

export function EmergencyFlow() {
  const [step, setStep] = useState(0);
  const [inputType, setInputType] = useState<InputType>(null);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [riskResult, setRiskResult] = useState<RiskResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("input");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const [voiceStatus, setVoiceStatus] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<InstanceType<SpeechRecognitionCtor> | null>(null);

  const riskLevel = riskResult?.riskLevel ?? "UNKNOWN";

  const canShowMap = useMemo(
    () => riskLevel === "HIGH" || riskLevel === "MEDIUM",
    [riskLevel]
  );

  useEffect(() => {
    if (step !== 2 || symptoms.length === 0) return;

    const runRiskAssessment = async () => {
      setLoading(true);
      try {
        const { response, data } = await postJsonWithFallback<any>(
          "http://127.0.0.1:8000/api/risk-assessment",
          "http://127.0.0.1:8000/api/severity",
          { symptoms }
        );
        if (!response.ok) {
          throw new Error(data?.detail || "Risk assessment failed.");
        }

        const level = normalizeRiskLevel(data?.risk_level ?? data?.severity);
        const explanation =
          data?.explanation ||
          data?.recommended_action ||
          (level === "HIGH"
            ? "Immediate action required based on selected symptoms."
            : level === "MEDIUM"
              ? "Monitor closely and seek care soon."
              : "Continue observation and follow first-aid guidance.");
        const precautions: string[] = Array.isArray(data?.precautions)
          ? data.precautions.filter((item: unknown) => typeof item === "string")
          : [];

        setRiskResult({ riskLevel: level, explanation, precautions });
        setStep(3);
        setActiveTab("result");
      } catch {
        setRiskResult({
          riskLevel: "UNKNOWN",
          explanation: "Could not complete risk assessment. Continue with first aid.",
          precautions: [
            "Keep the patient calm and movement minimal.",
            "Avoid cutting, sucking, or icing the bite site.",
            "Seek medical care as soon as possible.",
          ],
        });
        setStep(3);
        setActiveTab("result");
      } finally {
        setLoading(false);
      }
    };

    runRiskAssessment();
  }, [step, symptoms]);

  const extractSymptomsFromText = async (transcript: string) => {
    setLoading(true);
    try {
      const { response, data } = await postJsonWithFallback<SymptomApiResponse>(
        "http://127.0.0.1:8000/api/extract",
        "http://127.0.0.1:8000/api/extract-symptoms",
        { text: transcript }
      );
      if (!response.ok) {
        throw new Error("Symptom extraction failed.");
      }

      const extractedSymptoms = (data?.symptoms ?? []).filter(Boolean);
      if (extractedSymptoms.length === 0) {
        throw new Error("Voice captured but no known symptoms were extracted.");
      }
      setSymptoms(extractedSymptoms);
      setStep(2);
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : "Voice input failed.");
    } finally {
      setLoading(false);
    }
  };

  const cleanupRecognition = () => {
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognitionRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      cleanupRecognition();
    };
  }, []);

  const startVoiceInput = () => {
    setVoiceError("");
    setVoiceStatus("Listening...");
    setVoiceTranscript("");

    const SpeechRecognition =
      (window as Window & {
        SpeechRecognition?: SpeechRecognitionCtor;
        webkitSpeechRecognition?: SpeechRecognitionCtor;
      }).SpeechRecognition ||
      (window as Window & {
        SpeechRecognition?: SpeechRecognitionCtor;
        webkitSpeechRecognition?: SpeechRecognitionCtor;
      }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceError("Voice recognition is not supported in this browser.");
      return;
    }

    cleanupRecognition();
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = String(event.results?.[0]?.[0]?.transcript ?? "").trim();
      if (!transcript) {
        setVoiceError("No voice captured. Please retry.");
        return;
      }
      setVoiceTranscript(transcript);
      setVoiceStatus(`Captured: "${transcript}"`);
      void extractSymptomsFromText(transcript);
    };

    recognition.onerror = (event) => {
      setVoiceError(`Voice recognition failed (${event.error || "unknown"}).`);
      setIsListening(false);
      cleanupRecognition();
    };

    recognition.onend = () => {
      setIsListening(false);
      cleanupRecognition();
    };

    try {
      recognition.start();
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : "Could not start microphone.");
      return;
    }

    setIsListening(true);
  };

  const stopVoiceInput = () => {
    if (!isListening) return;
    setIsListening(false);
    setVoiceStatus("Stopping...");
    const recognition = recognitionRef.current;
    if (recognition) {
      try {
        recognition.stop();
      } catch {
        // no-op
      }
    }
  };

  const onManualSubmit = (submittedSymptoms: string[]) => {
    setSymptoms(submittedSymptoms);
    setStep(2);
  };

  const onImageResult = (prediction: AnalysisResult) => {
    const mappedSymptoms = convertPredictionToSymptoms(prediction);
    setSymptoms(mappedSymptoms);
    setStep(2);
  };

  const tabs: Array<{ key: TabKey; label: string; icon: ReactNode; enabled: boolean }> = [
    { key: "input", label: "Input", icon: <ListChecks className="size-4" />, enabled: true },
    {
      key: "result",
      label: "Result",
      icon: <ShieldAlert className="size-4" />,
      enabled: step >= 3,
    },
    {
      key: "actions",
      label: "Actions",
      icon: <MapPinned className="size-4" />,
      enabled: step >= 3,
    },
    {
      key: "report",
      label: "Optional Report",
      icon: <FilePlus2 className="size-4" />,
      enabled: step >= 3,
    },
  ];

  return (
    <main className="min-h-screen bg-[#f6f3ee] px-6 py-6">
      <div className="mx-auto max-w-6xl space-y-5 transition-all duration-300">
        <section className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-emerald-700" />
            <h1 className="text-2xl font-semibold">Emergency Workflow</h1>
          </div>
          <p className="text-sm text-gray-600">
            Quick tabs for panic mode: get risk first, actions next, report only if needed.
          </p>
        </section>

        <section className="rounded-xl border bg-white p-2 shadow-sm">
          <div className="grid gap-2 md:grid-cols-4">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => tab.enabled && setActiveTab(tab.key)}
                disabled={!tab.enabled}
                className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  activeTab === tab.key
                    ? "bg-emerald-700 text-white"
                    : tab.enabled
                      ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                      : "bg-gray-100 text-gray-400"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        {activeTab === "input" && (
          <section className="space-y-4 transition-all duration-300">
            {step === 0 && (
              <section className="grid gap-3 md:grid-cols-3">
                <button
                  className="rounded-xl border bg-white p-6 text-left shadow-sm hover:border-green-400"
                  onClick={() => {
                    setInputType("voice");
                    setStep(1);
                  }}
                >
                  <p className="font-semibold">Voice Input</p>
                  <p className="text-sm text-gray-600">Fastest option in panic mode.</p>
                </button>
                <button
                  className="rounded-xl border bg-white p-6 text-left shadow-sm hover:border-green-400"
                  onClick={() => {
                    setInputType("manual");
                    setStep(1);
                  }}
                >
                  <p className="font-semibold">Manual Symptoms</p>
                  <p className="text-sm text-gray-600">Use symptom checklist.</p>
                </button>
                <button
                  className="rounded-xl border bg-white p-6 text-left shadow-sm hover:border-green-400"
                  onClick={() => {
                    setInputType("image");
                    setStep(1);
                  }}
                >
                  <p className="font-semibold">Image Upload</p>
                  <p className="text-sm text-gray-600">Use camera image analysis.</p>
                </button>
              </section>
            )}

            {step === 1 && inputType === "voice" && (
              <section className="rounded-xl border bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    className="inline-flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm text-white"
                    onClick={startVoiceInput}
                    disabled={loading || isListening}
                  >
                    <Mic className="size-4" />
                    {isListening ? "Listening..." : "Speak Now"}
                  </button>
                  <button
                    className="inline-flex items-center gap-2 rounded-lg bg-gray-700 px-4 py-2 text-sm text-white"
                    onClick={stopVoiceInput}
                    disabled={!isListening}
                  >
                    <MicOff className="size-4" />
                    Stop
                  </button>
                  {loading ? (
                    <span className="inline-flex items-center gap-2 text-sm text-emerald-700">
                      <Loader2 className="size-4 animate-spin" />
                      Processing...
                    </span>
                  ) : null}
                </div>
                {voiceStatus ? <p className="mt-3 text-sm text-gray-700">{voiceStatus}</p> : null}
                {voiceTranscript ? (
                  <p className="mt-2 text-sm text-gray-700">Heard: {voiceTranscript}</p>
                ) : null}
                {voiceError ? <p className="mt-2 text-sm text-red-600">{voiceError}</p> : null}
              </section>
            )}

            {step === 1 && inputType === "manual" && <RiskCheck onSubmit={onManualSubmit} />}
            {step === 1 && inputType === "image" && <ImageAnalyzer onResult={onImageResult} />}
            {step === 2 && (
              <section className="rounded-xl border bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2">
                  <Loader2 className="size-5 animate-spin text-green-700" />
                  <p className="text-sm font-medium">Running risk assessment...</p>
                </div>
              </section>
            )}
          </section>
        )}

        {activeTab === "result" && step >= 3 && riskResult && (
          <section className="space-y-4 transition-all duration-300">
            <Result
              riskLevel={riskResult.riskLevel}
              symptoms={symptoms}
              explanation={riskResult.explanation}
            />
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm text-white"
                onClick={() => setActiveTab("actions")}
              >
                Open Action Tab
              </button>
              <button
                className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-white"
                onClick={() => setActiveTab("report")}
              >
                Optional Report Tab
              </button>
            </div>
          </section>
        )}

        {activeTab === "actions" && step >= 3 && riskResult && (
          <section className="space-y-4 transition-all duration-300">
            <section className="rounded-xl border bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold">Action Panel</h2>
              {riskLevel === "HIGH" && (
                <a
                  href="tel:108"
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-sm text-white"
                >
                  <Phone className="size-4" />
                  Call 108 Now
                </a>
              )}
              {riskResult.precautions.length > 0 && (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-700">
                  {riskResult.precautions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
            <FirstAidGuide />
            {canShowMap ? (
              <>
                <MapSection />
                <Hospitals />
              </>
            ) : null}
          </section>
        )}

        {activeTab === "report" && step >= 3 && riskResult && (
          <section className="space-y-4 transition-all duration-300">
            <section className="rounded-xl border bg-white p-4 shadow-sm">
              <p className="text-sm text-gray-700">
                Report is optional. In panic mode, skip this and focus on Action tab first.
              </p>
            </section>
            <ReportIncident
              prefillSymptoms={symptoms}
              prefillRiskLevel={riskResult.riskLevel}
            />
          </section>
        )}
      </div>
    </main>
  );
}
