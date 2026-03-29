import { useLocation } from "react-router-dom";

type ResultProps = {
  riskLevel?: string;
  symptoms?: string[];
  explanation?: string;
};

export function Result({ riskLevel, symptoms, explanation }: ResultProps) {
  const location = useLocation();
  const { severity, selected_symptoms, explanation: routedExplanation } =
    location.state || {};
  const resolvedRiskLevel = riskLevel ?? severity;
  const resolvedSymptoms = symptoms ?? selected_symptoms ?? [];
  const resolvedExplanation = explanation ?? routedExplanation;

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Result</h1>

      <div className="bg-white shadow rounded-xl p-6">
        <p className="text-lg mb-2">
          Severity: <span className="font-bold">{resolvedRiskLevel}</span>
        </p>

        {resolvedExplanation ? (
          <p className="text-sm text-slate-600 mb-4">{resolvedExplanation}</p>
        ) : null}

        <p className="text-sm text-gray-500 mb-3">Symptoms detected:</p>

        <ul className="list-disc ml-5">
          {resolvedSymptoms?.map((s: string) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </div>
    </main>
  );
}
