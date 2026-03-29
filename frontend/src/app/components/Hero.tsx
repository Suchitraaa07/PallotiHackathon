import { ArrowRight, Stethoscope } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Hero() {
  // Using a placeholder image URL - replace with your actual image path
  const backgroundImageUrl = 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&h=600&fit=crop';
  
  return (
    <section 
      className="relative w-full h-screen overflow-hidden flex items-center justify-center bg-cover bg-center"
      style={{
        backgroundImage: `url('${backgroundImageUrl}')`,
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-emerald-900/60"></div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <div className="mb-6 flex justify-center">
          <Stethoscope className="w-16 h-16 text-emerald-300 drop-shadow-lg" />
        </div>

        <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight drop-shadow-lg">
          Emergency Help When You Need It Most
        </h1>

        <p className="text-xl md:text-2xl text-emerald-100 mb-10 drop-shadow-md">
          Stay Calm. Get Guidance. Take Action.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/emergency"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-8 rounded-lg flex items-center justify-center gap-2 shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-105"
          >
            <span>Start Emergency Check</span>
            <ArrowRight size={20} />
          </Link>

          <Link
            to="/contacts"
            className="bg-white/10 hover:bg-white/20 text-white font-bold py-4 px-8 rounded-lg border-2 border-white/30 transition-all duration-300 backdrop-blur-sm"
          >
            View Emergency Contacts
          </Link>

          <Link
            to="/risk-check"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-8 rounded-lg flex items-center justify-center gap-2 shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-105"
          >
            <span>Risk Assessment</span>
            <ArrowRight size={20} />
          </Link>
        </div>

        {/* Trust Badge */}
        <div className="mt-16 pt-8 border-t border-white/20">
          <p className="text-emerald-100 text-sm font-semibold tracking-wide">
            ✓ Trusted Emergency Guidance • 24/7 Available • Medical-Grade Information
          </p>
        </div>
      </div>

      {/* Animated Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10">
        <div className="flex flex-col items-center gap-3 animate-pulse">
          <p className="text-white/60 text-sm font-semibold">Learn More</p>
          <svg
            className="w-6 h-6 text-white/60 animate-bounce"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
          </svg>
        </div>
      </div>
    </section>
  );
}
