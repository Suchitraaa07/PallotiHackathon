import { CalmBanner } from "./CalmBanner";
import { EmergencyContacts } from "./EmergencyContacts";
import { FirstAidGuide } from "./FirstAidGuide";
import { Hero } from "./Hero";
import { QuickActions } from "./QuickActions";

export function Home() {
  return (
    <main
      className="relative min-h-screen"
      style={{
        backgroundImage:
          "url('https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&h=600&fit=crop')",
        backgroundAttachment: "fixed",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-white/50" />

      <div className="relative z-10">
        <Hero />
        <QuickActions />
        <FirstAidGuide />
        <EmergencyContacts />
        <CalmBanner />

        <section className="border-t border-slate-200 bg-white px-6 py-16">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="mb-8 text-3xl font-bold text-slate-900 md:text-4xl">
              Why SylvanGuard?
            </h2>

            <div className="grid gap-8 md:grid-cols-3">
              <div className="p-6">
                <div className="mb-3 text-4xl">AI</div>
                <h3 className="mb-2 text-lg font-bold text-emerald-700">
                  Guided Detection
                </h3>
                <p className="text-sm text-slate-600">
                  Two-stage screening reduces false positives and makes the
                  analysis more trustworthy.
                </p>
              </div>

              <div className="p-6">
                <div className="mb-3 text-4xl">24/7</div>
                <h3 className="mb-2 text-lg font-bold text-emerald-700">
                  Emergency Support
                </h3>
                <p className="text-sm text-slate-600">
                  First aid, reporting, emergency contacts, and hospital access
                  are all available in one place.
                </p>
              </div>

              <div className="p-6">
                <div className="mb-3 text-4xl">MAP</div>
                <h3 className="mb-2 text-lg font-bold text-emerald-700">
                  Local Risk Awareness
                </h3>
                <p className="text-sm text-slate-600">
                  Condition-based hotspot visualization helps teams spot nearby
                  risk zones quickly.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-amber-200 bg-amber-50 px-6 py-12">
          <div className="mx-auto max-w-4xl">
            <div className="flex gap-4">
              <div className="flex-shrink-0 text-2xl">!</div>
              <div>
                <h3 className="mb-2 font-bold text-amber-900">
                  Medical Disclaimer
                </h3>
                <p className="text-sm text-amber-800">
                  This app provides general guidance only and is not a
                  substitute for professional medical care. In
                  life-threatening emergencies, call 108 or your local
                  emergency number immediately.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
