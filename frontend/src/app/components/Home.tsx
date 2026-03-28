import { Hero } from './Hero';
import { QuickActions } from './QuickActions';
import { Navbar } from './Navbar';

export function Home() {
  return (
    <main className="min-h-screen relative" style={{backgroundImage: "url('https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&h=600&fit=crop')", backgroundAttachment: 'fixed', backgroundSize: 'cover', backgroundPosition: 'center'}}>
      {/* Navbar */}
      <Navbar />
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-white/50 pointer-events-none"></div>
      
      {/* Content - relative to overlay */}
      <div className="relative z-10">
        <Hero />
        
        {/* Quick Actions Section */}
        <QuickActions />

      {/* Trust & Safety Section */}
      <section className="py-16 px-6 bg-white border-t border-slate-200">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-8">
            Why SylvanGuard?
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6">
              <div className="text-4xl mb-3">✓</div>
              <h3 className="font-bold text-lg text-emerald-700 mb-2">Medically Accurate</h3>
              <p className="text-slate-600 text-sm">
                All information verified by medical professionals
              </p>
            </div>
            
            <div className="p-6">
              <div className="text-4xl mb-3">⚡</div>
              <h3 className="font-bold text-lg text-emerald-700 mb-2">Instant Guidance</h3>
              <p className="text-slate-600 text-sm">
                Get help immediately when seconds matter
              </p>
            </div>
            
            <div className="p-6">
              <div className="text-4xl mb-3">🔒</div>
              <h3 className="font-bold text-lg text-emerald-700 mb-2">Your Privacy</h3>
              <p className="text-slate-600 text-sm">
                Data is encrypted and never stored longer than needed
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="py-12 px-6 bg-amber-50 border-t border-amber-200">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-4">
            <div className="text-2xl flex-shrink-0">⚠️</div>
            <div>
              <h3 className="font-bold text-amber-900 mb-2">Medical Disclaimer</h3>
              <p className="text-amber-800 text-sm">
                This app provides general information only and is NOT a substitute for professional medical advice. 
                In life-threatening emergencies, always call 112 or your local emergency number immediately.
              </p>
            </div>
          </div>
        </div>
      </section>
      </div>
    </main>
  );
}
