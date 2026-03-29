import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const symptomsList = [
  "Swelling at bite site",
  "Severe pain",
  "Bleeding",
  "Nausea/Vomiting",
  "Difficulty breathing",
  "Numbness/Tingling",
  "Blurred vision",
  "Weakness/Fatigue",
];

type RiskCheckProps = {
  onSubmit?: (symptoms: string[]) => void;
};

export function RiskCheck({ onSubmit }: RiskCheckProps) {
  const navigate = useNavigate();
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<any>(null);

  const extractSymptoms = async (text: string) => {
    const endpoints = [
      "http://127.0.0.1:8000/api/extract-symptoms",
      "http://127.0.0.1:8000/api/extract",
    ];

    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text }),
        });

        if (!res.ok) {
          continue;
        }

        const data = await res.json();
        return Array.isArray(data?.symptoms) ? data.symptoms : [];
      } catch {
        continue;
      }
    }

    throw new Error("Unable to extract symptoms from voice input.");
  };

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onresult = async (event: any) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);

        try {
          const symptoms = await extractSymptoms(text);
          setSelectedSymptoms((prev) =>
            Array.from(new Set([...prev, ...symptoms]))
          );
        } catch (err) {
          console.error("NLP error:", err);
        }
      };

      recognitionRef.current.onend = () => setIsListening(false);
    }

    return () => {
      recognitionRef.current?.abort?.();
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
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
    if (selectedSymptoms.length === 0) {
      return;
    }

    if (onSubmit) {
      onSubmit(selectedSymptoms);
      return;
    }

    try {
      const res = await fetch("http://127.0.0.1:8000/api/severity", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ symptoms: selectedSymptoms }),
      });

      const data = await res.json();

      navigate("/result", { state: data });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <main className="max-w-5xl mx-auto px-6 py-8 bg-[#f6f3ee] min-h-screen">

      {/* 🚨 ALERT */}
      {/* <div className="bg-red-500 text-white text-center py-2 rounded mb-6 text-sm font-medium">
        🚨 EMERGENCY? Call 108 | This tool is for assistance only
      </div> */}

      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">
          Risk Check
        </h1>
        <p className="text-gray-500 text-sm">
          Select symptoms to assess severity
        </p>
      </div>

      {/* VOICE INPUT */}
      <div className="bg-white border shadow-md rounded-xl p-4 mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">Voice Input</p>
          <p className="text-xs text-gray-400">
            Say symptoms like "severe pain, nausea"
          </p>
        </div>

        <button
          onClick={toggleListening}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            isListening
              ? "bg-red-500 text-white"
              : "bg-green-600 text-white"
          }`}
        >
          {isListening ? <MicOff size={16} /> : <Mic size={16} />}
          {isListening ? "Stop" : "Speak"}
        </button>
      </div>

      {/* TRANSCRIPT */}
      {transcript && (
        <div className="text-sm text-gray-600 mb-4">
          Heard: <span className="font-medium">{transcript}</span>
        </div>
      )}

      {/* SYMPTOMS GRID */}
      <div className="grid md:grid-cols-2 gap-4">
        {symptomsList.map((symptom) => (
          <div
            key={symptom}
            onClick={() => toggleSymptom(symptom)}
            className={`cursor-pointer border rounded-xl p-4 flex items-center gap-3 transition ${
              selectedSymptoms.includes(symptom)
                ? "bg-green-100 border-green-500"
                : "bg-white border-gray-300"
            }`}
          >
            <input
              type="checkbox"
              checked={selectedSymptoms.includes(symptom)}
              readOnly
            />
            <span>{symptom}</span>
          </div>
        ))}
      </div>

      {/* BUTTON */}
      <button
        onClick={handleCheckRisk}
        disabled={selectedSymptoms.length === 0}
        className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl flex items-center justify-center gap-2"
      >
        <AlertTriangle size={16} />
        {onSubmit ? "Continue" : "Check Severity"}
      </button>
    </main>
  );
}
