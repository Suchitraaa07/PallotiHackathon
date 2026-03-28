import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  MapPin, 
  ScanLine, 
  FileText, 
  Shield, 
  Activity,
  Leaf,
  AlertTriangle,
  Home as HomeIcon,
  HeartPulse,
  Menu,
  X
} from 'lucide-react';

const navItems = [
  { to: "/", label: "Home", icon: HomeIcon },
  { to: "/identify", label: "Image Analyzer", icon: ScanLine },
  { to: "/map", label: "Map", icon: MapPin },
  { to: "/report", label: "Report Incident", icon: FileText },
  { to: "/risk-check", label: "Risk Check", icon: Shield },
  { to: "/first-aid", label: "First Aid", icon: HeartPulse },
];

export function Layout() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col" style={{
      background: 'linear-gradient(to bottom, #f8f9f5 0%, #e8f0e5 100%)'
    }}>
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 border-b border-[#4a1f1f] bg-gradient-to-r from-[#5c2222] via-[#4a1c1c] to-[#341414] shadow-lg backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <Link to="/" className="flex min-w-0 items-center gap-3">
              <div className="bg-gradient-to-br from-[#8d4c42] to-[#2f6b45] p-2.5 rounded-xl shadow-lg flex-shrink-0">
                <Leaf className="size-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-lg sm:text-xl tracking-tight text-[#f9ede7]">
                  SylvanGuard
                </h1>
                <p className="hidden sm:block truncate text-xs text-[#e1c7be]">
                  AI Bite Emergency Detection System
                </p>
              </div>
            </Link>
            
            <div className="hidden lg:flex items-center gap-8">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.to;

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-2 transition-colors ${
                      isActive
                        ? 'text-[#f7d8c8]'
                        : 'text-[#ead7d0] hover:text-[#f7d8c8]'
                    }`}
                  >
                    <Icon className="size-4" />
                    <span className="text-sm">{item.label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
              <div className="hidden md:flex items-center gap-2 rounded-full border border-[#9fc5a8]/25 bg-white/10 px-4 py-2">
                <Activity className="size-4 text-[#9fc5a8] animate-pulse" />
                <span className="text-sm text-[#f3e5df]">System Active</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <button
        type="button"
        className="fixed right-4 top-4 z-[80] inline-flex items-center justify-center rounded-2xl border-2 border-[#d4a190] bg-[#fff1ea] p-3 text-[#6b2d2d] shadow-xl transition hover:bg-[#f6ddd3]"
        aria-label="Toggle navigation menu"
        onClick={() => setIsMobileMenuOpen((open) => !open)}
      >
        {isMobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
      </button>

      {isMobileMenuOpen && (
        <>
          <button
            type="button"
            aria-label="Close navigation menu"
            className="fixed inset-0 z-[70] bg-black/25"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="fixed right-0 top-0 z-[90] flex h-screen w-[min(24rem,100vw)] flex-col border-l-2 border-[#4a1f1f] bg-gradient-to-b from-[#6b2d2d] via-[#512020] to-[#341414] p-5 shadow-2xl">
            <div className="mb-4 border-b border-amber-900/15 pb-4 pt-16">
              <div className="flex items-center gap-3">
                <span className="rounded-xl bg-gradient-to-br from-[#7a3a32] to-[#2f6b45] p-2 shadow-sm">
                  <Leaf className="size-4 text-white" />
                </span>
                <div>
                  <p className="font-semibold text-[#f8ece6]">Navigation</p>
                  <p className="text-xs text-[#e1c8bf]">
                    Quick access to emergency tools
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-3">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.to;

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-sm font-medium shadow-sm transition ${
                      isActive
                        ? 'border-[#caa38f] bg-gradient-to-r from-[#f2dfd4] to-[#d9e5d7] text-[#2f6b45]'
                        : 'border-[#8d5a52]/30 bg-[#f7ece8] text-[#5a2d2d] hover:border-[#b77a6e]/50 hover:bg-[#f2dfd8]'
                    }`}
                  >
                    <Icon className={`size-4 ${isActive ? 'text-[#2f6b45]' : 'text-[#7a3a32]'}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              <div className="mt-auto flex items-center gap-2 rounded-2xl border border-[#2f6b45]/25 bg-gradient-to-r from-[#e8efe4] to-[#dce8da] px-4 py-3.5 text-sm text-[#2f6b45] shadow-sm">
                <Activity className="size-4 animate-pulse text-[#2f6b45]" />
                <span>System Active</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Emergency Alert Banner */}
      <div className="bg-gradient-to-r from-[#8f2323] to-[#6a1717] text-[#fff3ed] py-3 px-6 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-3 flex-wrap">
          <AlertTriangle className="size-5" />
          <span className="font-medium">EMERGENCY? Call 108 (Ambulance)</span>
          <span className="opacity-80">|</span>
          <span>Keep victim calm</span>
          <span className="opacity-80">|</span>
          <span>Do NOT apply ice</span>
        </div>
      </div>

      {/* Main Content */}
      <Outlet />

      {/* Footer */}
      <footer className="bg-white/60 backdrop-blur-sm border-t border-green-100/50 py-6 mt-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-gray-600">
              <Leaf className="size-5 text-green-600" />
              <span className="text-sm">Protecting lives from wildlife emergencies</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <a href="#" className="hover:text-green-600 transition-colors">About</a>
              <a href="#" className="hover:text-green-600 transition-colors">Privacy</a>
              <a href="#" className="hover:text-green-600 transition-colors">Terms</a>
              <a href="#" className="hover:text-green-600 transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Decorative Background Elements */}
      <div className="fixed bottom-0 left-0 right-0 pointer-events-none z-0 opacity-20">
        <svg viewBox="0 0 1440 120" className="w-full h-auto">
          <path
            fill="#22c55e"
            d="M0,64L48,69.3C96,75,192,85,288,80C384,75,480,53,576,48C672,43,768,53,864,58.7C960,64,1056,64,1152,58.7C1248,53,1344,43,1392,37.3L1440,32L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z"
          />
        </svg>
      </div>
    </div>
  );
}
