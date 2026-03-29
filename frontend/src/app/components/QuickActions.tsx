import { Link } from 'react-router-dom';
import {
  ImagePlus,
  Stethoscope,
  TrendingUp,
  MapPin,
  Images,
  Heart,
  AlertTriangle
} from 'lucide-react';

export function QuickActions() {
  const actions = [
    {
      id: 1,
      title: 'Analyze Image',
      description: 'Upload a photo to identify the animal or wound',
      icon: ImagePlus,
      path: '/identify'
    },
    {
      id: 2,
      title: 'Describe Symptoms',
      description: 'Tell us what happened to get immediate guidance',
      icon: Stethoscope,
      path: '/risk-check'
    },
    {
      id: 3,
      title: 'Risk Assessment',
      description: 'Understand the severity and next steps',
      icon: TrendingUp,
      path: '/risk-check'
    },
    {
      id: 4,
      title: 'Find Hospitals',
      description: 'Locate nearest medical facility with emergency care',
      icon: MapPin,
      path: '/hospitals'
    },
    {
      id: 5,
      title: 'Snake Flashcards',
      description: 'View dataset images as review cards for species familiarity',
      icon: Images,
      path: '/flashcards'
    },
    {
      id: 6,
      title: 'First Aid Guide',
      description: 'Step-by-step medical guidance while help arrives',
      icon: Heart,
      path: '/first-aid'
    },
    {
      id: 7,
      title: 'Report Incident',
      description: 'Document the incident for medical records',
      icon: AlertTriangle,
      path: '/report'
    }
  ];

  return (
    <section className="py-20 px-6 bg-gradient-to-b from-emerald-900 via-emerald-800 to-emerald-900 relative" style={{backgroundImage: "url('https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&h=600&fit=crop')", backgroundAttachment: 'fixed', backgroundSize: 'cover', backgroundPosition: 'center'}}>
      {/* Forest overlay */}
      <div className="absolute inset-0 bg-black/40 pointer-events-none"></div>
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            How We Can Help You
          </h2>
          <p className="text-lg text-emerald-100 max-w-2xl mx-auto">
            Quick access to emergency information and guidance tailored to your situation
          </p>
        </div>

        {/* Action Cards Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.id}
                to={action.path}
                className="group relative"
              >
                {/* Card Split Design - Brown & Green */}
                <div className="bg-gradient-to-r from-amber-50 to-emerald-50 border-2 border-gray-200 hover:border-gray-300 rounded-xl p-8 transition-all duration-300 hover:shadow-xl hover:scale-105 cursor-pointer overflow-hidden">
                  
                  {/* Decorative colored bars */}
                  <div className="absolute top-0 left-0 w-1/2 h-1 bg-amber-900"></div>
                  <div className="absolute top-0 right-0 w-1/2 h-1 bg-emerald-600"></div>

                  {/* Icon with split colors */}
                  <div className="mb-4 h-12 flex items-center gap-3">
                    <div className="text-amber-900">
                      <Icon size={32} />
                    </div>
                    <div className="hidden sm:block w-0.5 h-8 bg-gradient-to-b from-amber-900 to-emerald-600"></div>
                    <div className="text-emerald-600">
                      <Icon size={32} />
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-2xl font-bold mb-3 text-slate-900 group-hover:text-emerald-700 transition-colors">
                    {action.title}
                  </h3>

                  {/* Description */}
                  <p className="text-slate-600 mb-6 text-sm leading-relaxed">
                    {action.description}
                  </p>

                  {/* Button with gradient brown to green */}
                  <button className="w-full bg-gradient-to-r from-amber-900 to-emerald-600 hover:from-amber-800 hover:to-emerald-700 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-200 group-hover:shadow-lg">
                    Get Started →
                  </button>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-xl p-8 text-white text-center shadow-lg">
          <h3 className="text-2xl font-bold mb-3">In a Life-Threatening Emergency?</h3>
          <p className="text-emerald-100 mb-6">Call 112 immediately for emergency services</p>
          <div className="flex gap-4 flex-col sm:flex-row justify-center">
            <button className="bg-white text-emerald-700 font-bold py-3 px-8 rounded-lg hover:bg-slate-100 transition-all">
              Call 112 Now
            </button>
            <a href="tel:112" className="bg-white/20 text-white font-bold py-3 px-8 rounded-lg border-2 border-white hover:bg-white/30 transition-all">
              Emergency Contacts
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
