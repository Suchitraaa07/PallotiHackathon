import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, AlertTriangle, CheckSquare, Square, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";

const symptomsList = [
  { label: "Swelling at bite site", severity: "moderate" },
  { label: "Severe pain", severity: "high" },
  { label: "Bleeding", severity: "high" },
  { label: "Nausea / Vomiting", severity: "moderate" },
  { label: "Difficulty breathing", severity: "critical" },
  { label: "Numbness / Tingling", severity: "moderate" },
  { label: "Blurred vision", severity: "high" },
  { label: "Weakness / Fatigue", severity: "moderate" },
];

const severityDot: Record<string, string> = {
  moderate: "bg-[#f59e0b]",
  high: "bg-[#ef4444]",
  critical: "bg-[#7f1d1d]",
};

type RiskCheckProps = {
  onSubmit?: (symptoms: string[]) => void;
};

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

export function RiskCheck({ onSubmit }: RiskCheckProps = {}) {
  const navigate = useNavigate();
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const recognitionRef = useRef<InstanceType<SpeechRecognitionCtor> | null>(null);

  useEffect(() => {
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
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onresult = async (event) => {
      const text = String(event.results?.[0]?.[0]?.transcript ?? "").trim();
      if (!text) {
        setVoiceError("No speech captured. Please try again.");
        return;
      }
      setTranscript(text);
      setVoiceError("");
      try {
        const res = await fetch("http://127.0.0.1:8000/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        const data = await res.json();
        setSelectedSymptoms((prev) => Array.from(new Set([...prev, ...(data?.symptoms ?? [])])));
      } catch (err) {
        console.error("NLP error:", err);
      }
    };

    recognition.onerror = (event) => {
      setVoiceError(`Voice recognition failed (${event.error || "unknown"}).`);
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);

    return () => {
      const current = recognitionRef.current;
      if (current) {
        try {
          current.stop();
        } catch {
          // no-op
        }
      }
      recognitionRef.current = null;
    };
  }, []);

  const toggleListening = () => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      setVoiceError("Voice recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
      return;
    }

    setVoiceError("");
    try {
      recognition.start();
      setIsListening(true);
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : "Could not start microphone.");
    }
  };

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom]
    );
  };

  const handleCheckRisk = async () => {
    if (onSubmit) {
      onSubmit(selectedSymptoms);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/severity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptoms: selectedSymptoms }),
      });
      const data = await res.json();
      navigate("/result", { state: data });
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const selected = selectedSymptoms.length;

  return (
    <div className="min-h-screen bg-[#f4f1ea] font-sans">
      <div className="bg-[#1a2e1a] px-6 py-5 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2d4a2d]">
              <Activity size={18} className="text-[#86efac]" />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight">Risk Check</h1>
              <p className="text-xs text-[#a3b8a3]">Symptom severity assessment</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-[#7f1d1d] bg-[#450a0a] px-3 py-1.5">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ef4444]" />
            <span className="text-xs font-semibold text-[#fca5a5]">Emergency? Call 108</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-5 px-6 py-8">
        <div className="overflow-hidden rounded-2xl border border-[#e5e0d5] bg-white shadow-sm">
          <div className="flex items-center gap-2.5 border-b border-[#f0ebe0] px-5 py-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#f0fdf4]">
              <Mic size={14} className="text-[#166534]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1c1917]">Voice input</p>
              <p className="text-xs text-[#a8a29e]">Say symptoms aloud to auto-select them</p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="min-w-0 flex-1">
              {transcript ? (
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-xs text-[#a8a29e]">Heard:</span>
                  <span className="truncate text-sm font-medium text-[#1c1917]">{transcript}</span>
                </div>
              ) : (
                <p className="text-sm italic text-[#c7bfb0]">
                  {isListening ? "Listening... speak now" : 'e.g. "severe pain and nausea"'}
                </p>
              )}
            </div>

            <button
              onClick={toggleListening}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all active:scale-[0.98] ${
                isListening
                  ? "border border-[#fca5a5] bg-[#fef2f2] text-[#991b1b]"
                  : "bg-[#1a2e1a] text-white hover:bg-[#2d4a2d]"
              }`}
            >
              {isListening ? <MicOff size={15} /> : <Mic size={15} />}
              {isListening ? "Stop Listening" : "Speak Now"}
            </button>
          </div>

          {voiceError ? <div className="px-5 pb-3 text-xs font-medium text-[#b91c1c]">{voiceError}</div> : null}

          {isListening && (
            <div className="px-5 pb-4">
              <div className="h-1 overflow-hidden rounded-full bg-[#f0ebe0]">
                <div className="h-1 w-full animate-pulse rounded-full bg-[#ef4444]" />
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[#1c1917]">Select symptoms</p>
              <p className="text-xs text-[#a8a29e]">Tap all that apply after the snakebite</p>
            </div>
            {selected > 0 && (
              <div className="flex items-center gap-1.5 rounded-lg border border-[#86efac] bg-[#dcfce7] px-3 py-1">
                <span className="text-xs font-bold text-[#166534]">{selected}</span>
                <span className="text-xs text-[#166534]">selected</span>
              </div>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {symptomsList.map(({ label, severity }) => {
              const isSelected = selectedSymptoms.includes(label);
              return (
                <button
                  key={label}
                  onClick={() => toggleSymptom(label)}
                  className={`flex w-full items-center gap-3.5 rounded-xl border px-4 py-3.5 text-left transition-all active:scale-[0.99] ${
                    isSelected
                      ? "border-[#86efac] bg-[#f0fdf4]"
                      : "border-[#e5e0d5] bg-white hover:border-[#c7bfb0]"
                  }`}
                >
                  <div className={`h-2 w-2 shrink-0 rounded-full ${severityDot[severity]}`} />
                  <span className={`flex-1 text-sm font-medium ${isSelected ? "text-[#166534]" : "text-[#1c1917]"}`}>
                    {label}
                  </span>
                  <div className={`shrink-0 transition-colors ${isSelected ? "text-[#166534]" : "text-[#d6d3d1]"}`}>
                    {isSelected ? <CheckSquare size={17} /> : <Square size={17} />}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center gap-4 px-1">
            {[
              { label: "Moderate", color: "bg-[#f59e0b]" },
              { label: "High", color: "bg-[#ef4444]" },
              { label: "Critical", color: "bg-[#7f1d1d]" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-1.5">
                <div className={`h-2 w-2 rounded-full ${s.color}`} />
                <span className="text-xs text-[#a8a29e]">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-[#1a2e1a] p-5 shadow-sm">
          <button
            onClick={handleCheckRisk}
            disabled={selected === 0 || isLoading}
            className="w-full rounded-xl bg-[#2d5a2d] py-3.5 text-sm font-semibold text-white transition-all active:scale-[0.98] hover:bg-[#3b6d3b] disabled:bg-[#243824] disabled:opacity-50"
          >
            {isLoading ? (
              <span className="inline-flex items-center gap-2.5">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Assessing severity...
              </span>
            ) : (
              <span className="inline-flex items-center gap-2.5">
                <AlertTriangle size={16} className="text-[#fde68a]" />
                Check Severity
              </span>
            )}
          </button>
          <p className="mt-3 text-center text-xs text-[#6b8c6b]">
            {selected === 0
              ? "Select at least one symptom to continue"
              : `${selected} symptom${selected > 1 ? "s" : ""} selected · Ready to assess`}
          </p>
        </div>
      </div>
    </div>
  );
}
