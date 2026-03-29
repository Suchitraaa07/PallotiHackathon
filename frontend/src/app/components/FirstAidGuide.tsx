import { Heart, Droplets, AlertTriangle } from 'lucide-react';

export function FirstAidGuide() {
  const steps = [
    {
      title: "Remain Calm",
      description: "Keep the victim calm. Panic increases heart rate and helps venom spread faster.",
      icon: Heart
    },
    {
      title: "Remove Constrictors",
      description: "Remove watches, bracelets, and tight clothing from the affected limb.",
      icon: Droplets
    },
    {
      title: "Immobilize the Limb",
      description: "Keep the bitten area as still as possible. Use a sling or splint if available.",
      icon: AlertTriangle
    },
    {
      title: "Position Victim",
      description: "Lay the victim down with the bite below heart level.",
      icon: Heart
    },
    {
      title: "Do NOT Apply Ice",
      description: "Ice can cause tissue damage. Do NOT use tourniquets, cut the bite, or suck venom.",
      icon: AlertTriangle
    },
    {
      title: "Seek Immediate Help",
      description: "Call emergency services immediately. Get to a hospital with anti-venom ASAP.",
      icon: Heart
    }
  ];

  return (
    <main className="max-w-4xl mx-auto px-6 py-12 min-h-screen bg-[#f4f7f6]">
      <div className="mb-8">
        <h1 className="text-4xl font-semibold text-slate-800">First Aid Guide</h1>
        <p className="text-slate-500 mt-2 text-sm md:text-base">Quick guidance for wildlife bite incidents</p>
      </div>

      <div className="space-y-3">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="bg-emerald-100 p-3 rounded-lg flex-shrink-0">
                  <Icon className="text-emerald-700" size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">
                    {idx + 1}. {step.title}
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{step.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-red-50 border border-red-300 rounded-2xl p-6 mt-8">
        <h3 className="text-lg font-semibold text-red-900 mb-2">⚠️ Critical: DO NOT</h3>
        <ul className="text-red-800 space-y-2 text-sm">
          <li>• Apply ice or heat</li>
          <li>• Use tourniquets</li>
          <li>• Cut or attempt to suck venom</li>
          <li>• Apply traditional remedies</li>
          <li>• Delay seeking medical help</li>
        </ul>
      </div>
    </main>
  );
}
