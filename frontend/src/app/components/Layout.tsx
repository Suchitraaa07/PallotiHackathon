import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  MapPin, 
  ScanLine, 
  FileText, 
  Shield, 
  Activity,
  Leaf,
  AlertTriangle
} from 'lucide-react';

export function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col" style={{
      background: 'linear-gradient(to bottom, #f8f9f5 0%, #e8f0e5 100%)'
    }}>
      {/* Navigation Bar */}
      <nav className="bg-white/80 backdrop-blur-md shadow-sm border-b border-green-100/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-green-600 to-emerald-700 p-2.5 rounded-xl shadow-lg">
                <Leaf className="size-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl tracking-tight text-gray-800">SylvanGuard</h1>
                <p className="text-xs text-gray-500">AI Bite Emergency Detection System</p>
              </div>
            </Link>
            
            <div className="hidden md:flex items-center gap-8">
              <Link
                to="/map"
                className={`flex items-center gap-2 transition-colors ${
                  location.pathname === '/map'
                    ? 'text-green-700'
                    : 'text-gray-600 hover:text-green-700'
                }`}
              >
                <MapPin className="size-4" />
                <span className="text-sm">Map</span>
              </Link>
              <Link 
                to="/"
                className={`flex items-center gap-2 transition-colors ${
                  location.pathname === '/' 
                    ? 'text-green-700' 
                    : 'text-gray-600 hover:text-green-700'
                }`}
              >
                <ScanLine className="size-4" />
                <span className="text-sm">Image Analyzer</span>
              </Link>
              <Link 
                to="/report"
                className={`flex items-center gap-2 transition-colors ${
                  location.pathname === '/report' 
                    ? 'text-green-700' 
                    : 'text-gray-600 hover:text-green-700'
                }`}
              >
                <FileText className="size-4" />
                <span className="text-sm">Report Incident</span>
              </Link>
              <Link 
                to="/risk-check"
                className={`flex items-center gap-2 transition-colors ${
                  location.pathname === '/risk-check' 
                    ? 'text-green-700' 
                    : 'text-gray-600 hover:text-green-700'
                }`}
              >
                <Shield className="size-4" />
                <span className="text-sm">Risk Check</span>
              </Link>
            </div>

            <div className="flex items-center gap-2 bg-green-50 px-4 py-2 rounded-full border border-green-200">
              <Activity className="size-4 text-green-600 animate-pulse" />
              <span className="text-sm text-green-700">System Active</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Emergency Alert Banner */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white py-3 px-6 shadow-md">
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
