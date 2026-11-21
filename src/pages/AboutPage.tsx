import React from 'react';
import {
  BookOpen,
  ExternalLink,
  ShieldAlert,
  Layers,
  Sun,
  CircleDot,
  AlertTriangle,
} from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-12 py-4 md:py-8">
      {/* Title */}
      <div className="space-y-2 border-b border-slate-800 pb-6">
        <div className="flex items-center gap-2 text-teal-400 text-xs font-semibold uppercase tracking-wider">
          <BookOpen className="w-4 h-4" /> Technical Documentation & Physics Model
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-white">
          About DeorbitCheck
        </h1>
        <p className="text-sm text-slate-400">
          Screening-level orbital lifetime estimator and debris compliance checker designed for CubeSat engineers and student teams.
        </p>
      </div>

      {/* Physics Methodology */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Layers className="w-5 h-5 text-teal-400" /> 1. Ballistic Term & Drag Dynamics
        </h2>
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 text-xs md:text-sm text-slate-300 leading-relaxed">
          <p>
            The vehicle's aerodynamic interaction with the rarefied neutral thermosphere is characterized by the ballistic term <span className="font-mono text-teal-300 font-semibold">B</span> (inverse of ballistic coefficient):
          </p>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-teal-400 text-center text-sm md:text-base">
            B = (Cd · A) / m &nbsp;&nbsp;[m² / kg]
          </div>
          <ul className="list-disc pl-5 space-y-1 text-slate-400">
            <li><strong className="text-slate-200">Cd:</strong> Aerodynamic drag coefficient (nominally 2.2 in free-molecular flow for typical convex spacecraft geometries).</li>
            <li><strong className="text-slate-200">A:</strong> Cross-sectional projected drag area in m² perpendicular to velocity vector (tumbling or ram-aligned).</li>
            <li><strong className="text-slate-200">m:</strong> Total spacecraft on-orbit mass in kg.</li>
          </ul>
        </div>
      </section>

      {/* Atmosphere Model */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Layers className="w-5 h-5 text-teal-400" /> 2. Piecewise Exponential Atmosphere
        </h2>
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 text-xs md:text-sm text-slate-300 leading-relaxed">
          <p>
            Atmospheric density <span className="font-mono text-teal-300">ρ(h)</span> is computed using a 28-layer piecewise exponential model spanning sea level to 1000 km altitude:
          </p>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-teal-400 text-center text-sm md:text-base">
            ρ(h) = multiplier · ρ₀ · exp[-(h - baseAlt) / H]
          </div>
          <p className="text-slate-400">
            where <span className="font-mono text-slate-200">ρ₀</span> is the reference base density and <span className="font-mono text-slate-200">H</span> is the local density scale height for the highest base altitude satisfying <span className="font-mono text-slate-200">baseAlt ≤ h</span>.
          </p>
        </div>
      </section>

      {/* Solar Activity Scenarios */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Sun className="w-5 h-5 text-teal-400" /> 3. Solar Cycle Scenarios
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <span className="font-bold text-rose-300">Low Solar Activity (0.4x)</span>
            <p className="text-slate-400 leading-relaxed">
              Solar minimum conditions with cooled thermosphere and reduced density. This represents the worst-case scenario with longest orbital dwell times.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900 border border-teal-500/30 space-y-2">
            <span className="font-bold text-teal-300">Medium Solar Activity (1.0x)</span>
            <p className="text-slate-400 leading-relaxed">
              Mean 11-year solar cycle baseline reference density used for primary mission compliance determinations.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <span className="font-bold text-emerald-300">High Solar Activity (3.0x)</span>
            <p className="text-slate-400 leading-relaxed">
              Solar maximum conditions where extreme EUV irradiance inflates the thermosphere, driving peak drag and rapid orbital decay.
            </p>
          </div>
        </div>
      </section>

      {/* Numerical Integration Assumptions */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <CircleDot className="w-5 h-5 text-teal-400" /> 4. Decay Equations & Re-entry Threshold
        </h2>
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 text-xs md:text-sm text-slate-300 leading-relaxed">
          <p>
            Assuming circular orbits (<span className="font-mono text-teal-300">e ≈ 0</span>), the rate of change of semi-major axis is given by:
          </p>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-teal-400 text-center text-sm md:text-base">
            da/dt = -√(μ · a) · ρ · B
          </div>
          <p className="text-slate-400">
            where <span className="font-mono text-slate-200">μ = 3.986004418 × 10¹⁴ m³/s²</span> is Earth's gravitational parameter.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-400">
            <li><strong className="text-slate-200">Adaptive Step:</strong> 1-day (86,400s) time steps above 200 km, stepping down to 10 minutes (600s) below 200 km.</li>
            <li><strong className="text-slate-200">120 km Re-entry Boundary:</strong> At 120 km, atmospheric density and aerodynamic heating induce rapid terminal breakdown within orbits, marking effective deorbit.</li>
            <li><strong className="text-slate-200">100-Year Cap:</strong> Simulations beyond 100 years terminate and are classified as long-term orbital debris.</li>
          </ul>
        </div>
      </section>

      {/* Limitations */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-400" /> 5. Known Assumptions & Limitations
        </h2>
        <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 text-xs md:text-sm text-slate-300 space-y-2">
          <p>
            DeorbitCheck is engineered specifically as a fast, pure client-side <strong>screening-level tool</strong> for early mission trade studies. Be aware of the following physical simplifications:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
            <li><strong>Near-Circular Assumption:</strong> Orbit is assumed quasi-circular. Highly eccentric orbits (e.g. GTO, Molniya) require osculating perigee drag integration (such as NASA DAS or ESA DRAMA).</li>
            <li><strong>Third-Body & Gravitational Perturbations:</strong> Earth oblateness ($J_2$, $J_3$), lunisolar third-body gravity, and solar radiation pressure (SRP) are not propagated.</li>
            <li><strong>Static Scale Heights:</strong> Atmospheric composition and temperature are approximated through discrete piecewise exponential tables rather than dynamic empirical models (NRLMSISE-00 / JB2008).</li>
            <li><strong>Constant Drag Area:</strong> Assumes a constant tumble-averaged or stabilized cross-section throughout orbital life.</li>
          </ul>
        </div>
      </section>

      {/* Official Guidelines & References */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-teal-400" /> 6. Official Regulatory Sources & Links
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <a
            href="https://www.iadc-home.org"
            target="_blank"
            rel="noreferrer"
            className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-teal-500 transition block space-y-1"
          >
            <div className="flex items-center justify-between font-bold text-slate-100">
              <span>IADC Space Debris Mitigation Guidelines</span>
              <ExternalLink className="w-3.5 h-3.5 text-teal-400" />
            </div>
            <p className="text-slate-400">
              Inter-Agency Space Debris Coordination Committee (IADC) 25-year post-mission guideline.
            </p>
          </a>

          <a
            href="https://www.fcc.gov/document/fcc-adopts-new-5-year-rule-deorbiting-satellites"
            target="_blank"
            rel="noreferrer"
            className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-teal-500 transition block space-y-1"
          >
            <div className="flex items-center justify-between font-bold text-slate-100">
              <span>FCC 5-Year Deorbit Rule (FCC 22-74)</span>
              <ExternalLink className="w-3.5 h-3.5 text-teal-400" />
            </div>
            <p className="text-slate-400">
              Federal Communications Commission updated rule requiring deorbit within 5 years after mission termination.
            </p>
          </a>

          <a
            href="https://www.esa.int/Space_Safety/Space_Debris/Zero_Debris_Charter"
            target="_blank"
            rel="noreferrer"
            className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-teal-500 transition block space-y-1"
          >
            <div className="flex items-center justify-between font-bold text-slate-100">
              <span>ESA Zero Debris Charter</span>
              <ExternalLink className="w-3.5 h-3.5 text-teal-400" />
            </div>
            <p className="text-slate-400">
              European Space Agency target to achieve zero debris generation in low Earth orbit by 2030.
            </p>
          </a>

          <a
            href="https://orbitaldebris.jsc.nasa.gov/mitigation/"
            target="_blank"
            rel="noreferrer"
            className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-teal-500 transition block space-y-1"
          >
            <div className="flex items-center justify-between font-bold text-slate-100">
              <span>NASA Orbital Debris Program Office</span>
              <ExternalLink className="w-3.5 h-3.5 text-teal-400" />
            </div>
            <p className="text-slate-400">
              NASA Debris Assessment Software (DAS) standards and US Government Orbital Debris Mitigation Standard Practices (ODMSP).
            </p>
          </a>
        </div>
      </section>
    </div>
  );
};
export default AboutPage;
