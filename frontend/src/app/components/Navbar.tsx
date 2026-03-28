import { Link, useLocation } from 'react-router-dom';
import { Leaf, MapPin, ImagePlus, AlertTriangle, TrendingUp } from 'lucide-react';

export function Navbar() {
  const location = useLocation();

  const navLinks = [
    { path: '/hospitals', label: 'Map', icon: MapPin },
    { path: '/identify', label: 'Image Analyzer', icon: ImagePlus },
    { path: '/report', label: 'Report Incident', icon: AlertTriangle },
    { path: '/risk-check', label: 'Risk Check', icon: TrendingUp },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-transparent backdrop-blur-none border-b border-white/20 shadow-none">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
        <div className="flex items-center justify-between gap-8">
          
          {/* LEFT SIDE - Logo & Branding */}
          <Link to="/" className="flex items-center gap-3 min-w-fit hover:opacity-80 transition-opacity">
            <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg border border-white/30">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white drop-shadow-lg">SylvanGuard</h1>
              <p className="text-xs text-white/80 drop-shadow">AI Bite Emergency Detection</p>
            </div>
          </Link>

          {/* CENTER - Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 drop-shadow
                    ${active
                      ? 'bg-emerald-500/40 text-white backdrop-blur-sm border border-emerald-300/50 font-semibold'
                      : 'text-white/90 hover:text-white hover:bg-white/10 backdrop-blur-sm'
                    }
                  `}
                >
                  <Icon size={18} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>

          {/* RIGHT SIDE - Status Badge */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-emerald-500/40 text-white px-4 py-2 rounded-full font-semibold text-sm backdrop-blur-sm border border-emerald-300/50 drop-shadow">
              <span className="inline-block w-2 h-2 bg-white rounded-full animate-pulse"></span>
              System Active
            </div>

            {/* Mobile Menu Button */}
            <button className="md:hidden p-2 hover:bg-white/20 backdrop-blur-sm rounded-lg transition-colors drop-shadow">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M4 6h16M4 12h16M4 18h16"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
