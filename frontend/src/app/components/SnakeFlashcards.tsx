import { useEffect, useState } from "react";
import { Database, Mic, RefreshCw, Search } from "lucide-react";

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

const API_BASE = "http://127.0.0.1:8000";
const PAGE_SIZE = 24;
const VOICE_TIMEOUT_MS = 9000;

function buildLocalImageUrl(imagePath?: string) {
  if (!imagePath) {
    return "";
  }
  return `${API_BASE}/${encodeURI(imagePath.replace(/\\/g, "/").replace(/^\/+/, ""))}`;
}

function toVoiceErrorMessage(errorType: string) {
  if (errorType === "not-allowed" || errorType === "service-not-allowed") {
    return "Microphone access was blocked. Allow mic permission for localhost and retry.";
  }
  if (errorType === "no-speech") {
    return "No speech detected. Speak clearly and try again.";
  }
  if (errorType === "audio-capture") {
    return "No microphone was found. Check your mic device and retry.";
  }
  if (errorType === "network") {
    return "Voice recognition network error. Check internet and retry.";
  }
  if (errorType === "aborted") {
    return "Voice capture was interrupted. Please retry.";
  }
  return "Voice recognition failed. Type the query or retry voice input.";
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
  const [mode, setMode] = useState<"browse" | "similar">("browse");
  const [sourceFile, setSourceFile] = useState("");
  const [total, setTotal] = useState(0);

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

  const startVoiceSearch = async () => {
    const SpeechRecognitionConstructor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionConstructor) {
      setVoiceStatus("Voice input is not supported in this browser.");
      return;
    }

    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      }
    } catch {
      setVoiceStatus(
        "Microphone permission denied. Allow mic access in browser settings for localhost."
      );
      return;
    }

    const recognition = new SpeechRecognitionConstructor();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setListening(true);
    setVoiceStatus("Listening...");
    let hasResult = false;
    let hasError = false;
    const timeoutId = window.setTimeout(() => {
      recognition.stop();
    }, VOICE_TIMEOUT_MS);

    recognition.onresult = async (event: any) => {
      hasResult = true;
      const transcript = String(event?.results?.[0]?.[0]?.transcript ?? "").trim();
      if (!transcript) {
        setVoiceStatus("Could not capture speech. Please try again.");
        return;
      }
      setSearchValue(transcript);
      setVoiceStatus(`Captured: "${transcript}"`);
      await loadSimilarCards(transcript);
    };

    recognition.onerror = (event: any) => {
      hasError = true;
      setVoiceStatus(toVoiceErrorMessage(String(event?.error ?? "")));
    };

    recognition.onnomatch = () => {
      hasError = true;
      setVoiceStatus("Could not understand speech. Try again with simpler words.");
    };

    recognition.onend = () => {
      window.clearTimeout(timeoutId);
      if (!hasResult && !hasError) {
        setVoiceStatus("No speech captured. Click Speak Query and try again.");
      }
      setListening(false);
    };

    recognition.start();
  };

  useEffect(() => {
    loadCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
              onClick={startVoiceSearch}
              disabled={listening}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#7a4f43] bg-[#f3e3dc] px-4 text-sm font-semibold text-[#5f2e2e] transition hover:bg-[#ead3ca] disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Mic className="size-4" />
              {listening ? "Listening..." : "Speak Query"}
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
              className="overflow-hidden rounded-2xl border border-[#d8c6bc] bg-white shadow-sm"
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
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
