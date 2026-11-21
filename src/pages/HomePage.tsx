import React from 'react';
import {
  Rocket,
  ShieldCheck,
  TrendingDown,
  Wrench,
  ArrowRight,
  Compass,
  FileCheck2,
  SlidersHorizontal,
} from 'lucide-react';

interface HomePageProps {
  onStartCheck: () => void;
  onNavigateToAbout: () => void;
  onNavigateToValidation: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onStartCheck,
  onNavigateToAbout,
  onNavigateToValidation,
}) => {
  return (
    <div className="space-y-16 py-6 md:py-12">
      {/* Hero Section */}
      <section className="text-center max-w-4xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-semibold tracking-wide uppercase">
          <Rocket className="w-3.5 h-3.5" /> Screening-Level CubeSat Deorbit Evaluation
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Will your CubeSat <span className="text-teal-400">come down in time?</span>
        </h1>

        <p className="text-base md:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Estimate post-mission orbital lifetimes, assess compliance against international space debris mitigation standards (25-year IADC, 5-year FCC/ESA), and size deployable drag fixes in seconds.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <button
            onClick={onStartCheck}
            id="hero-start-check-btn"
            className="px-6 py-3.5 rounded-xl bg-teal-500 hover:bg-teal-400 active:bg-teal-600 text-slate-950 font-bold text-sm shadow-xl shadow-teal-500/20 flex items-center gap-2 transition"
          >
            Start a Check
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={onNavigateToValidation}
            className="px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-sm transition"
          >
            Flight Heritage Data
          </button>
          <button
            onClick={onNavigateToAbout}
            className="px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 font-semibold text-sm transition"
          >
            Read Methodology
          </button>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {/* Card 1 */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition space-y-3 shadow-lg">
          <div className="p-3 w-fit rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
            <TrendingDown className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">Lifetime Range Estimation</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Multi-regime piecewise exponential atmospheric drag simulation. Computes worst-case (solar minimum), baseline (mean cycle), and best-case (solar maximum) re-entry windows up to 100 years.
          </p>
        </div>

        {/* Card 2 */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition space-y-3 shadow-lg">
          <div className="p-3 w-fit rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">Debris Rule Compliance</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Instant compliance screening against the 25-Year IADC guideline, the updated 5-Year FCC rule, and the ESA Zero Debris Charter, with user-configurable custom limits.
          </p>
        </div>

        {/* Card 3 */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition space-y-3 shadow-lg">
          <div className="p-3 w-fit rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Wrench className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">Fix Recommendations</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Automated remediation on non-compliant orbits: calculates maximum allowable insertion altitude and sizes the required drag sail area (+ΔA) to guarantee safe deorbit.
          </p>
        </div>
      </section>

      {/* 3-Step How It Works */}
      <section className="bg-slate-900/50 border border-slate-800/90 rounded-2xl p-8 md:p-12 max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl md:text-3xl font-extrabold text-white">How It Works</h2>
          <p className="text-xs md:text-sm text-slate-400 max-w-xl mx-auto">
            Three simple steps to verify orbital deorbit feasibility during mission concept review.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-teal-500/20 border border-teal-500/40 text-teal-400 font-extrabold text-lg flex items-center justify-center">
              1
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-100 flex items-center justify-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-teal-400" /> Enter Satellite Details
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pick a standard CubeSat preset (1U, 2U, 3U, 6U, 12U) or customize mass, drag area, initial orbit altitude, and drag coefficient.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-teal-500/20 border border-teal-500/40 text-teal-400 font-extrabold text-lg flex items-center justify-center">
              2
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-100 flex items-center justify-center gap-1.5">
                <Compass className="w-4 h-4 text-teal-400" /> Run Decay Simulation
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Client-side orbital decay integration evaluates mean altitude loss over time under varying solar flux levels until re-entry at 120 km.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-teal-500/20 border border-teal-500/40 text-teal-400 font-extrabold text-lg flex items-center justify-center">
              3
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-100 flex items-center justify-center gap-1.5">
                <FileCheck2 className="w-4 h-4 text-teal-400" /> Check Rules & Export
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Review PASS/BORDERLINE/FAIL badges, inspect corrective recommendations, save design options to compare, and download full PDF reports.
              </p>
            </div>
          </div>
        </div>

        <div className="text-center pt-4">
          <button
            onClick={onStartCheck}
            className="px-5 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition"
          >
            Launch Interactive Checker
          </button>
        </div>
      </section>
    </div>
  );
};
export default HomePage;
