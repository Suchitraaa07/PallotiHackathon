import { MapPin, Phone, Clock, AlertCircle } from 'lucide-react';

export function Hospitals() {
  const hospitals = [
    {
      name: "City General Hospital",
      address: "MG Road, Bangalore",
      distance: "2.3 km",
      time: "8 min",
      antiVenom: true,
      phone: "+91-XXXX-XXXX-XX"
    },
    {
      name: "District Animal Bite Centre",
      address: "Jayanagar, Bangalore",
      distance: "4.1 km",
      time: "14 min",
      antiVenom: true,
      phone: "+91-XXXX-XXXX-XX"
    },
    {
      name: "Forest Range Medical Post",
      address: "Bannerghatta Road",
      distance: "6.7 km",
      time: "22 min",
      antiVenom: false,
      phone: "+91-XXXX-XXXX-XX"
    },
  ];

  return (
    <main className="max-w-4xl mx-auto px-6 py-12 min-h-screen bg-[#f4f7f6]">
      <div className="mb-8">
        <h1 className="text-4xl font-semibold text-slate-800">Find Hospitals</h1>
        <p className="text-slate-500 mt-2 text-sm md:text-base">Hospitals with anti-venom stock and emergency care near you</p>
      </div>

      <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-4 mb-8 flex items-center gap-3">
        <AlertCircle className="text-emerald-700" size={20} />
        <button className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-lg transition shadow-sm hover:shadow-md">
          Near Me
        </button>
        <span className="text-emerald-800 text-sm">Enable location to find nearest hospitals</span>
      </div>

      <div className="space-y-3">
        {hospitals.map((hospital, idx) => (
          <div
            key={idx}
            className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-800">{hospital.name}</h3>
                <div className="flex flex-col gap-2 mt-3 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-emerald-600 flex-shrink-0" />
                    {hospital.address}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-slate-500 flex-shrink-0" />
                    {hospital.distance} • {hospital.time}
                  </div>
                </div>
              </div>
              {hospital.antiVenom && (
                <div className="bg-emerald-100 border border-emerald-300 rounded-lg px-3 py-1 flex-shrink-0">
                  <span className="text-xs font-semibold text-emerald-700">ANTI-VENOM</span>
                </div>
              )}
            </div>
            <button className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-lg transition shadow-sm hover:shadow-md">
              <Phone size={16} />
              Call Hospital
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
