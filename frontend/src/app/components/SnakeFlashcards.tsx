import { useEffect, useRef, useState } from "react";
import { Database, Mic, MicOff, RefreshCw, Search, X } from "lucide-react";

type SpeechRecognitionCtor = new () => {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type Flashcard = {
  id: string;
  species: string;
  category: string;
  description: string;
  filename: string;
  image_url: string;
  image_path?: string;
  similarity_score?: number;
};

type FlashcardResponse = {
  source: string;
  total: number;
  count: number;
  items: Flashcard[];
  warning?: string;
};

type SpeciesAdvice = {
  species: string;
  venom_type: string;
  danger_level: string;
  prevention: string[];
  first_aid: string[];
};

const API_BASE = "http://127.0.0.1:8000";
const PAGE_SIZE = 24;

function buildLocalImageUrl(imagePath?: string) {
  if (!imagePath) {
    return "";
  }
  return `${API_BASE}/${encodeURI(imagePath.replace(/\\/g, "/").replace(/^\/+/, ""))}`;
}

export function SnakeFlashcards() {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [categoryValue, setCategoryValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [voiceStatus, setVoiceStatus] = useState("");
  const [listening, setListening] = useState(false);
  const [preparingMic, setPreparingMic] = useState(false);
  const [mode, setMode] = useState<"browse" | "similar">("browse");
  const [sourceFile, setSourceFile] = useState("");
  const [total, setTotal] = useState(0);
  const [selectedCard, setSelectedCard] = useState<Flashcard | null>(null);
  const [advice, setAdvice] = useState<SpeciesAdvice | null>(null);
  const [adviceLoading, setAdviceLoading] = useState(false);
  const [adviceError, setAdviceError] = useState("");
  const recognitionRef = useRef<InstanceType<SpeechRecognitionCtor> | null>(null);

  const loadSpeciesAdvice = async (card: Flashcard) => {
    setSelectedCard(card);
    setAdvice(null);
    setAdviceError("");
    setAdviceLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/snake-flashcards/advice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ species: card.species }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.detail || "Failed to load species advice.");
      }
      setAdvice(payload as SpeciesAdvice);
    } catch (err) {
      setAdviceError(err instanceof Error ? err.message : "Failed to load species advice.");
    } finally {
      setAdviceLoading(false);
    }
  };

  const loadCards = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: "0",
      });

      if (searchValue.trim()) {
        params.set("q", searchValue.trim());
      }
      if (categoryValue.trim()) {
        params.set("category", categoryValue.trim());
      }

      const response = await fetch(
        `${API_BASE}/api/snake-flashcards?${params.toString()}`
      );
      const payload: FlashcardResponse = await response.json();

      if (!response.ok) {
        throw new Error((payload as any)?.detail || "Unable to fetch flashcards.");
      }

      setCards(payload.items ?? []);
      setSourceFile(payload.source ?? "");
      setTotal(payload.total ?? 0);
      setWarning(payload.warning ?? "");
      setMode("browse");
    } catch (err) {
      setCards([]);
      setError(err instanceof Error ? err.message : "Unable to fetch flashcards.");
    } finally {
      setLoading(false);
    }
  };

  const loadSimilarCards = async (queryText?: string) => {
    const query = (queryText ?? searchValue).trim();
    if (!query) {
      setWarning("Say or type a description first.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setWarning("");

      const params = new URLSearchParams({
        q: query,
        k: "4",
      });
      const response = await fetch(
        `${API_BASE}/api/snake-flashcards/similar?${params.toString()}`
      );
      const payload: FlashcardResponse = await response.json();

      if (!response.ok) {
        throw new Error((payload as any)?.detail || "Unable to fetch similar cards.");
      }

      setCards(payload.items ?? []);
      setSourceFile(payload.source ?? "");
      setTotal(payload.count ?? 0);
      setWarning(payload.warning ?? "");
      setMode("similar");
    } catch (err) {
      setCards([]);
      setError(err instanceof Error ? err.message : "Unable to fetch similar cards.");
    } finally {
      setLoading(false);
    }
  };

  const cleanupRecognition = () => {
    const current = recognitionRef.current;
    if (current) {
      current.onresult = null;
      current.onerror = null;
      current.onend = null;
      recognitionRef.current = null;
    }
  };

  const startVoiceSearch = async () => {
    setVoiceStatus("Listening...");
    setPreparingMic(true);

    const SpeechRecognition =
      (window as Window & { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor })
        .SpeechRecognition ||
      (window as Window & { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor })
        .webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceStatus("Voice recognition is not supported in this browser.");
      setPreparingMic(false);
      return;
    }

    cleanupRecognition();
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = async (event) => {
      const transcript = String(event.results?.[0]?.[0]?.transcript ?? "").trim();
      if (!transcript) {
        setVoiceStatus("No voice captured. Please try again.");
        return;
      }
      setSearchValue(transcript);
      setVoiceStatus(`Captured: "${transcript}"`);
      await loadSimilarCards(transcript);
    };

    recognition.onerror = (event) => {
      setVoiceStatus(`Voice recognition failed (${event.error}).`);
      setListening(false);
      cleanupRecognition();
    };

    recognition.onend = () => {
      setListening(false);
      setPreparingMic(false);
      if (!voiceStatus) {
        setVoiceStatus("Voice recognition ended.");
      }
      cleanupRecognition();
    };

    try {
      recognition.start();
    } catch (err) {
      setVoiceStatus(
        err instanceof Error ? err.message : "Could not start voice recognition."
      );
      setListening(false);
      setPreparingMic(false);
      cleanupRecognition();
      return;
    }

    setListening(true);
    setPreparingMic(false);
  };

  const stopVoiceSearch = async () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    setVoiceStatus("Stopping...");
    try {
      recognition.stop();
    } catch {
      // ignore stop race condition
    }
  };

  useEffect(() => {
    loadCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      cleanupRecognition();
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#f6f3ee] px-6 py-8">
      <section className="mx-auto max-w-7xl">
        <div className="rounded-2xl border border-[#dac7bd] bg-white p-5 shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-[#4b2424]">
                Snake Image Flashcards
              </h1>
              <p className="mt-1 text-sm text-[#6f4d46]">
                Browse training metadata and images from your backend dataset.
              </p>
            </div>

            <button
              type="button"
              onClick={loadCards}
              className="inline-flex items-center gap-2 rounded-xl border border-[#8f5b4e] bg-[#6f2e2e] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#572424]"
            >
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_220px_auto]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8b6a62]" />
              <input
                type="text"
                placeholder="Search by species, category, or filename..."
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                className="h-11 w-full rounded-xl border border-[#cdb5ab] bg-[#fffaf7] pl-9 pr-3 text-sm outline-none ring-0 transition focus:border-[#8f5b4e]"
              />
            </label>

            <input
              type="text"
              placeholder="Category"
              value={categoryValue}
              onChange={(event) => setCategoryValue(event.target.value)}
              className="h-11 rounded-xl border border-[#cdb5ab] bg-[#fffaf7] px-3 text-sm outline-none ring-0 transition focus:border-[#8f5b4e]"
            />

            <button
              type="button"
              onClick={loadCards}
              className="h-11 rounded-xl border border-[#8f5b4e] bg-[#f8ece6] px-5 text-sm font-semibold text-[#6f2e2e] transition hover:bg-[#f1dfd6]"
            >
              Browse
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => loadSimilarCards()}
              className="h-10 rounded-xl border border-[#8f5b4e] bg-[#6f2e2e] px-4 text-sm font-semibold text-white transition hover:bg-[#572424]"
            >
              Top 4 Similar
            </button>

            <button
              type="button"
              onClick={listening ? stopVoiceSearch : startVoiceSearch}
              disabled={preparingMic}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#7a4f43] bg-[#f3e3dc] px-4 text-sm font-semibold text-[#5f2e2e] transition hover:bg-[#ead3ca] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
              {preparingMic ? "Starting..." : listening ? "Stop Listening" : "Speak Query"}
            </button>
          </div>

          {voiceStatus && (
            <p className="mt-2 text-xs text-[#6f4d46]">{voiceStatus}</p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[#6f4d46]">
            <span className="inline-flex items-center gap-1 rounded-full border border-[#d9c8bf] bg-[#faf4f1] px-3 py-1.5">
              <Database className="size-3.5" />
              Source: {sourceFile || "N/A"}
            </span>
            <span className="rounded-full border border-[#d9c8bf] bg-[#faf4f1] px-3 py-1.5">
              {mode === "similar" ? "Similar set size" : "Total matched"}: {total}
            </span>
            <span className="rounded-full border border-[#d9c8bf] bg-[#faf4f1] px-3 py-1.5">
              Showing: {cards.length}
            </span>
            <span className="rounded-full border border-[#d9c8bf] bg-[#faf4f1] px-3 py-1.5">
              Mode: {mode === "similar" ? "Top-4 similarity" : "Browse"}
            </span>
          </div>

          {warning && (
            <div className="mt-4 rounded-lg border border-amber-300 bg-amber-100 p-3 text-sm text-amber-900">
              {warning}
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-lg border border-red-300 bg-red-100 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {loading && (
          <p className="mt-4 text-sm text-[#6f4d46]">Loading flashcards...</p>
        )}

        {!loading && !error && cards.length === 0 && (
          <p className="mt-4 text-sm text-[#6f4d46]">
            No cards found. Try a different search or category.
          </p>
        )}

        <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <article
              key={card.id}
              className="overflow-hidden rounded-2xl border border-[#d8c6bc] bg-white shadow-sm transition hover:shadow-md"
            >
              <div className="aspect-[4/3] w-full bg-[#f3e9e3]">
                <img
                  src={card.image_url}
                  alt={card.species}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  onError={(event) => {
                    const fallbackUrl = buildLocalImageUrl(card.image_path);
                    const target = event.currentTarget;
                    if (fallbackUrl && target.src !== fallbackUrl) {
                      target.src = fallbackUrl;
                      return;
                    }
                    target.style.opacity = "0.35";
                  }}
                />
              </div>

              <div className="space-y-2 p-4">
                <h2 className="line-clamp-1 text-lg font-semibold text-[#4b2424]">
                  {card.species}
                </h2>
                <p className="text-xs font-medium uppercase tracking-wide text-[#7c4a3f]">
                  {card.category}
                </p>
                <p className="line-clamp-3 text-sm text-[#5c4a46]">
                  {card.description}
                </p>
                <p className="line-clamp-1 text-xs text-[#8b6a62]">
                  {card.filename}
                </p>
                {typeof card.similarity_score === "number" && (
                  <p className="text-xs font-medium text-[#6f2e2e]">
                    Similarity: {(card.similarity_score * 100).toFixed(1)}%
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => loadSpeciesAdvice(card)}
                  className="mt-2 w-full rounded-lg border border-[#8f5b4e] bg-[#f8ece6] px-3 py-2 text-xs font-semibold text-[#6f2e2e] transition hover:bg-[#f1dfd6]"
                >
                  Open Safety Details
                </button>
              </div>
            </article>
          ))}
        </div>

        {selectedCard && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <button
              type="button"
              className="flex-1 bg-black/35"
              onClick={() => {
                setSelectedCard(null);
                setAdvice(null);
                setAdviceError("");
              }}
              aria-label="Close details panel"
            />
            <aside className="h-full w-full max-w-md overflow-y-auto border-l border-[#d8c6bc] bg-white p-5 shadow-2xl">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-[#4b2424]">
                    {selectedCard.species || "Unknown species"}
                  </h2>
                  <p className="text-xs text-[#7b5b55]">
                    Groq safety guidance
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-lg border border-[#d8c6bc] p-2 text-[#7b5b55]"
                  onClick={() => {
                    setSelectedCard(null);
                    setAdvice(null);
                    setAdviceError("");
                  }}
                  aria-label="Close details panel"
                >
                  <X className="size-4" />
                </button>
              </div>

              {adviceLoading && (
                <p className="text-sm text-[#6f4d46]">Loading Gemini response...</p>
              )}

              {adviceError && (
                <div className="rounded-lg border border-red-300 bg-red-100 p-3 text-sm text-red-700">
                  {adviceError}
                </div>
              )}

              {!adviceLoading && !adviceError && advice && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-[#d8c6bc] bg-[#faf4f1] p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#8b6a62]">
                      Venom Type
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#4b2424]">
                      {advice.venom_type}
                    </p>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-[#8b6a62]">
                      Danger Level
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#4b2424]">
                      {advice.danger_level}
                    </p>
                  </div>

                  <div className="rounded-lg border border-[#d8c6bc] p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#8b6a62]">
                      Preventive Measures
                    </p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#5c4a46]">
                      {advice.prevention.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-lg border border-[#d8c6bc] p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#8b6a62]">
                      First Aid
                    </p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#5c4a46]">
                      {advice.first_aid.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                    This is system-generated information. In case of snake bite, seek immediate medical help.
                  </div>
                </div>
              )}
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}
