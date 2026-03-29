export function CalmBanner() {
  return (
    <div className="fixed bottom-8 right-8 z-20">
      <style>{`
        @keyframes breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes floatUp {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .breathe-animation {
          animation: breathe 4s ease-in-out infinite;
        }
        .float-animation {
          animation: floatUp 3s ease-in-out infinite;
        }
      `}</style>
      
      <div className="float-animation">
        <div className="breathe-animation bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-300 rounded-full p-6 shadow-lg hover:shadow-2xl transition-shadow duration-300 max-w-xs">
          <div className="flex items-center gap-3">
            <div className="text-3xl">💚</div>
            <div>
              <p className="text-emerald-900 font-bold text-sm">Don't Panic</p>
              <p className="text-emerald-700 text-xs">Help is here</p>
            </div>
          </div>
          
          {/* Gentle breathing glow */}
          <div className="absolute inset-0 rounded-full bg-emerald-300/20 blur-xl -z-10 breathe-animation"></div>
        </div>
      </div>
    </div>
  );
}
