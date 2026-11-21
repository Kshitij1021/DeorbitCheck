import React, { useState, useEffect } from 'react';
import HomePage from './pages/HomePage';
import CheckerPage from './pages/CheckerPage';
import ComparePage from './pages/ComparePage';
import ValidationPage from './pages/ValidationPage';
import AboutPage from './pages/AboutPage';
import { Rocket, Menu, X } from 'lucide-react';

export const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname;
      if (p.includes('/check')) return '/check';
      if (p.includes('/compare')) return '/compare';
      if (p.includes('/validation')) return '/validation';
      if (p.includes('/about')) return '/about';
    }
    return '/home';
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [activeDesignForCompare, setActiveDesignForCompare] = useState<{
    name?: string;
    altitudeKm: number;
    massKg: number;
    areaM2: number;
    cd: number;
  } | undefined>(undefined);

  useEffect(() => {
    const handlePopState = () => {
      const p = window.location.pathname;
      if (p.includes('/check')) setCurrentPath('/check');
      else if (p.includes('/compare')) setCurrentPath('/compare');
      else if (p.includes('/validation')) setCurrentPath('/validation');
      else if (p.includes('/about')) setCurrentPath('/about');
      else setCurrentPath('/home');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    setMobileMenuOpen(false);
    window.scrollTo(0, 0);
  };

  const navLinks = [
    { label: 'Home', path: '/home', id: 'nav-home' },
    { label: 'Checker', path: '/check', id: 'nav-check' },
    { label: 'Compare', path: '/compare', id: 'nav-compare' },
    { label: 'Validation', path: '/validation', id: 'nav-validation' },
    { label: 'About', path: '/about', id: 'nav-about' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3.5 flex items-center justify-between">
          {/* Brand */}
          <div
            onClick={() => navigate('/home')}
            className="flex items-center gap-2 cursor-pointer font-extrabold text-lg tracking-tight text-white group"
          >
            <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 group-hover:border-teal-500/40 transition">
              <Rocket className="w-5 h-5" />
            </div>
            <span>
              Deorbit<span className="text-teal-400">Check</span>
            </span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1.5 text-xs font-medium">
            {navLinks.map((item) => (
              <button
                key={item.path}
                id={item.id}
                onClick={() => navigate(item.path)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  currentPath === item.path
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Mobile menu toggle */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-900 border border-slate-800"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-slate-800 bg-slate-900/95 px-4 py-3 space-y-1">
            {navLinks.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                  currentPath === item.path
                    ? 'bg-teal-500/20 text-teal-300 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Pages Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 py-6">
        {currentPath === '/home' && (
          <HomePage
            onStartCheck={() => navigate('/check')}
            onNavigateToAbout={() => navigate('/about')}
            onNavigateToValidation={() => navigate('/validation')}
          />
        )}
        {currentPath === '/check' && (
          <CheckerPage
            onNavigateToCompare={(design) => {
              if (design) setActiveDesignForCompare(design);
              navigate('/compare');
            }}
            onNavigateToValidation={() => navigate('/validation')}
          />
        )}
        {currentPath === '/compare' && (
          <ComparePage
            onBack={() => navigate('/check')}
            currentDesign={activeDesignForCompare}
          />
        )}
        {currentPath === '/validation' && (
          <ValidationPage onBack={() => navigate('/check')} />
        )}
        {currentPath === '/about' && <AboutPage />}
      </main>

      {/* Footer with mandatory disclaimer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 px-4 md:px-8 text-center text-xs text-slate-500 space-y-3">
        <div className="flex flex-wrap items-center justify-center gap-4 text-slate-400 text-xs">
          <button onClick={() => navigate('/home')} className="hover:text-teal-400 transition">
            Home
          </button>
          <span>•</span>
          <button onClick={() => navigate('/check')} className="hover:text-teal-400 transition">
            Lifetime Checker
          </button>
          <span>•</span>
          <button onClick={() => navigate('/compare')} className="hover:text-teal-400 transition">
            Design Trade Study
          </button>
          <span>•</span>
          <button onClick={() => navigate('/validation')} className="hover:text-teal-400 transition">
            Flight Heritage Validation
          </button>
          <span>•</span>
          <button onClick={() => navigate('/about')} className="hover:text-teal-400 transition">
            Physics & Methodology
          </button>
        </div>
        <p className="max-w-3xl mx-auto text-[11px] text-slate-400 leading-relaxed">
          Screening-level estimate for early design. Not an official certification. Verify rule thresholds against the official sources.
        </p>
        <p className="text-[10px] text-slate-600">
          DeorbitCheck — Built for CubeSat orbital debris mitigation compliance.
        </p>
      </footer>
    </div>
  );
};

export default App;
