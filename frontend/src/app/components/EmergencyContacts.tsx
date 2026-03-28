import { Phone, Clock, AlertCircle } from 'lucide-react';

export function EmergencyContacts() {
  const contacts = [
    {
      service: "Emergency Ambulance",
      number: "112",
      description: "National emergency helpline",
      available: "24/7",
      icon: AlertCircle,
      color: "red",
      bgClass: "from-red-50 to-red-100",
      borderClass: "border-red-200",
      textClass: "text-red-900",
      secondaryClass: "text-red-700",
      buttonClass: "bg-green-600 hover:bg-green-700 active:bg-green-800"
    },
    {
      service: "Poison Control Centre",
      number: "1800-222-1222",
      description: "Expert guidance on snake/animal bites",
      available: "24/7",
      icon: AlertCircle,
      color: "amber",
      bgClass: "from-amber-50 to-amber-100",
      borderClass: "border-amber-200",
      textClass: "text-amber-900",
      secondaryClass: "text-amber-700",
      buttonClass: "bg-green-600 hover:bg-green-700 active:bg-green-800"
    },
    {
      service: "Wildlife Emergency",
      number: "108",
      description: "Wildlife emergency response",
      available: "24/7",
      icon: AlertCircle,
      color: "emerald",
      bgClass: "from-emerald-50 to-emerald-100",
      borderClass: "border-emerald-200",
      textClass: "text-emerald-900",
      secondaryClass: "text-emerald-700",
      buttonClass: "bg-green-600 hover:bg-green-700 active:bg-green-800"
    },
    {
      service: "Police Emergency",
      number: "100",
      description: "Police for security and incident reporting",
      available: "24/7",
      icon: AlertCircle,
      color: "blue",
      bgClass: "from-blue-50 to-blue-100",
      borderClass: "border-blue-200",
      textClass: "text-blue-900",
      secondaryClass: "text-blue-700",
      buttonClass: "bg-green-600 hover:bg-green-700 active:bg-green-800"
    },
  ];

  return (
    <main className="max-w-4xl mx-auto px-6 py-12 min-h-screen bg-[#f4f7f6]">
      <div className="mb-8">
        <h1 className="text-4xl font-semibold text-slate-800">Emergency Contacts</h1>
        <p className="text-slate-500 mt-2 text-sm md:text-base">Important numbers to keep handy</p>
      </div>

      <div className="space-y-3">
        {contacts.map((contact, idx) => (
          <div
            key={idx}
            className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-800 mb-2">{contact.service}</h3>
                <p className="text-slate-600 text-sm mb-3">{contact.description}</p>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Clock size={16} />
                  {contact.available}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-3xl font-bold text-slate-800 mb-3">{contact.number}</div>
                <button className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2 rounded-lg transition shadow-sm hover:shadow-md flex items-center gap-2 whitespace-nowrap">
                  <Phone size={18} />
                  Call Now
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-300 rounded-2xl p-6 mt-8">
        <h3 className="text-lg font-semibold text-slate-800 mb-3">💡 Pro Tips</h3>
        <ul className="text-slate-700 space-y-2 text-sm">
          <li>• Save these numbers in your phone contacts</li>
          <li>• Share them with family members and coworkers</li>
          <li>• In rural areas, identify nearest medical facilities beforehand</li>
          <li>• Keep this guide accessible when in wildlife areas</li>
        </ul>
      </div>
    </main>
  );
}
