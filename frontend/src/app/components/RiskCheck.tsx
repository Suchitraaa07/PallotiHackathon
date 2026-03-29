import { useState, useEffect } from "react";
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

export function RiskCheck({ onSubmit }: RiskCheckProps = {}) {
  const navigate = useNavigate();
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  let recognition: any = null;

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = "en-US";

      recognition.onresult = async (event: any) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        try {
          const res = await fetch("http://127.0.0.1:8000/api/extract", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
          });
          const data = await res.json();
          setSelectedSymptoms((prev) =>
            Array.from(new Set([...prev, ...data.symptoms]))
          );
        } catch (err) {
          console.error("NLP error:", err);
        }
      };

      recognition.onend = () => setIsListening(false);
    }
  }, []);

  const toggleListening = () => {
    if (!recognition) return;
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
    }
  };

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptom)
        ? prev.filter((s) => s !== symptom)
        : [...prev, symptom]
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

      {/* Header */}
      <div className="bg-[#1a2e1a] text-white px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#2d4a2d] flex items-center justify-center">
              <Activity size={18} className="text-[#86efac]" />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight">Risk Check</h1>
              <p className="text-xs text-[#a3b8a3]">Symptom severity assessment</p>
            </div>
          </div>
          {/* Emergency badge */}
          <div className="flex items-center gap-2 bg-[#450a0a] border border-[#7f1d1d] rounded-lg px-3 py-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#ef4444] animate-pulse" />
            <span className="text-xs font-semibold text-[#fca5a5]">Emergency? Call 108</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-5">

        {/* Voice input card */}
        <div className="bg-white rounded-2xl border border-[#e5e0d5] overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-[#f0ebe0] flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-[#f0fdf4] flex items-center justify-center">
              <Mic size={14} className="text-[#166534]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1c1917]">Voice input</p>
              <p className="text-xs text-[#a8a29e]">Say symptoms aloud to auto-select them</p>
            </div>
          </div>

          <div className="px-5 py-4 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              {transcript ? (
                <div className="flex items-start gap-2">
                  <span className="text-xs text-[#a8a29e] flex-shrink-0 mt-0.5">Heard:</span>
                  <span className="text-sm font-medium text-[#1c1917] truncate">{transcript}</span>
                </div>
              ) : (
                <p className="text-sm text-[#c7bfb0] italic">
                  {isListening ? "Listening… speak now" : 'e.g. "severe pain and nausea"'}
                </p>
              )}
            </div>

            <button
              onClick={toggleListening}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] flex-shrink-0 ${
                isListening
                  ? "bg-[#fef2f2] border border-[#fca5a5] text-[#991b1b]"
                  : "bg-[#1a2e1a] text-white hover:bg-[#2d4a2d]"
              }`}
            >
              {isListening ? <MicOff size={15} /> : <Mic size={15} />}
              {isListening ? "Stop" : "Speak"}
            </button>
          </div>

          {isListening && (
            <div className="px-5 pb-4">
              <div className="h-1 rounded-full bg-[#f0ebe0] overflow-hidden">
                <div className="h-1 bg-[#ef4444] rounded-full animate-pulse w-full" />
              </div>
            </div>
          )}
        </div>

        {/* Symptoms section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-[#1c1917]">Select symptoms</p>
              <p className="text-xs text-[#a8a29e]">Tap all that apply after the snakebite</p>
            </div>
            {selected > 0 && (
              <div className="flex items-center gap-1.5 bg-[#dcfce7] border border-[#86efac] rounded-lg px-3 py-1">
                <span className="text-xs font-bold text-[#166534]">{selected}</span>
                <span className="text-xs text-[#166534]">selected</span>
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            {symptomsList.map(({ label, severity }) => {
              const isSelected = selectedSymptoms.includes(label);
              return (
                <button
                  key={label}
                  onClick={() => toggleSymptom(label)}
                  className={`w-full text-left flex items-center gap-3.5 rounded-xl border px-4 py-3.5 transition-all active:scale-[0.99] ${
                    isSelected
                      ? "bg-[#f0fdf4] border-[#86efac]"
                      : "bg-white border-[#e5e0d5] hover:border-[#c7bfb0]"
                  }`}
                >
                  {/* Severity dot */}
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${severityDot[severity]}`} />

                  {/* Label */}
                  <span className={`flex-1 text-sm font-medium ${isSelected ? "text-[#166534]" : "text-[#1c1917]"}`}>
                    {label}
                  </span>

                  {/* Checkbox icon */}
                  <div className={`flex-shrink-0 transition-colors ${isSelected ? "text-[#166534]" : "text-[#d6d3d1]"}`}>
                    {isSelected ? <CheckSquare size={17} /> : <Square size={17} />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Severity legend */}
          <div className="flex items-center gap-4 mt-3 px-1">
            {[
              { label: "Moderate", color: "bg-[#f59e0b]" },
              { label: "High", color: "bg-[#ef4444]" },
              { label: "Critical", color: "bg-[#7f1d1d]" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${s.color}`} />
                <span className="text-xs text-[#a8a29e]">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Check severity button */}
        <div className="bg-[#1a2e1a] rounded-2xl p-5 shadow-sm">
          <button
            onClick={handleCheckRisk}
            disabled={selected === 0 || isLoading}
            className="w-full flex items-center justify-center gap-2.5 bg-[#2d5a2d] hover:bg-[#3b6d3b] disabled:bg-[#243824] disabled:opacity-50 text-white text-sm font-semibold py-3.5 rounded-xl transition-all active:scale-[0.98]"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Assessing severity…
              </>
            ) : (
              <>
                <AlertTriangle size={16} className="text-[#fde68a]" />
                Check Severity
              </>
            )}
          </button>
          <p className="text-center text-xs text-[#6b8c6b] mt-3">
            {selected === 0
              ? "Select at least one symptom to continue"
              : `${selected} symptom${selected > 1 ? "s" : ""} selected · Ready to assess`}
          </p>
        </div>

      </div>
    </div>
  );
}
