import { useLocation } from "react-router-dom";

export function Result() {
  const location = useLocation();
  const { severity, selected_symptoms } = location.state || {};

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Result</h1>

      <div className="bg-white shadow rounded-xl p-6">
        <p className="text-lg mb-2">
          Severity: <span className="font-bold">{severity}</span>
        </p>

        <p className="text-sm text-gray-500 mb-3">Symptoms detected:</p>

        <ul className="list-disc ml-5">
          {selected_symptoms?.map((s: string) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </div>
    </main>
  );
}