import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  runScenarios,
  findMaxPassingAltitude,
  findRequiredArea,
  ScenarioResults,
  SimulationParams,
} from '../lib/engine';
import { CUBESAT_PRESETS } from '../data/presets';
import rulesData from '../config/rules.json';
import { generatePDFReport } from '../lib/pdfReport';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  Info,
  RotateCcw,
  Play,
  Rocket,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ShieldAlert,
  Sliders,
  TrendingDown,
  Share2,
  Download,
  BookmarkPlus,
  Layers,
  Check,
} from 'lucide-react';

interface RuleConfig {
  id: string;
  name: string;
  limitYears: number;
  sourceUrl: string;
  note: string;
}

const RULES: RuleConfig[] = rulesData as RuleConfig[];

interface CheckerPageProps {
  onNavigateToCompare?: (design?: {
    name?: string;
    altitudeKm: number;
    massKg: number;
    areaM2: number;
    cd: number;
  }) => void;
  onNavigateToValidation?: () => void;
}

export const CheckerPage: React.FC<CheckerPageProps> = ({
  onNavigateToCompare,
  onNavigateToValidation,
}) => {
  // Read query params if present
  const getInitialParam = (key: string, fallback: any, parser: (val: string) => any = (v) => v) => {
    if (typeof window === 'undefined') return fallback;
    const urlParams = new URLSearchParams(window.location.search);
    const val = urlParams.get(key);
    if (val !== null) {
      try {
        return parser(val);
      } catch {
        return fallback;
      }
    }
    return fallback;
  };

  // Form State
  const [missionName, setMissionName] = useState<string>(() =>
    getInitialParam('name', '')
  );
  const [altitudeKm, setAltitudeKm] = useState<number>(() =>
    getInitialParam('alt', 500, Number)
  );
  const [inclinationDeg, setInclinationDeg] = useState<number>(() =>
    getInitialParam('inc', 51.6, Number)
  );
  const [preset, setPreset] = useState<string>(() =>
    getInitialParam('preset', '3u')
  );
  const [massKg, setMassKg] = useState<number>(() =>
    getInitialParam('mass', 4.0, Number)
  );
  const [areaM2, setAreaM2] = useState<number>(() =>
    getInitialParam('area', 0.03, Number)
  );
  const [cd, setCd] = useState<number>(() =>
    getInitialParam('cd', 2.2, Number)
  );
  const [launchYear, setLaunchYear] = useState<number>(() =>
    getInitialParam('year', new Date().getFullYear(), Number)
  );

  // Rule selection state
  const [selectedRules, setSelectedRules] = useState<Record<string, boolean>>(() => ({
    'iadc-25': getInitialParam('iadc', 'true') === 'true',
    'fcc-5': getInitialParam('fcc', 'true') === 'true',
    custom: getInitialParam('custom', 'false') === 'true',
  }));
  const [customRuleYears, setCustomRuleYears] = useState<number>(() =>
    getInitialParam('customYears', 10, Number)
  );

  // UI feedback states
  const [copiedLink, setCopiedLink] = useState(false);
  const [savedOptionFeedback, setSavedOptionFeedback] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Computation Results
  const [results, setResults] = useState<{
    scenarios: ScenarioResults;
    params: SimulationParams;
  } | null>(() => {
    const p = {
      altitudeKm: getInitialParam('alt', 500, Number),
      massKg: getInitialParam('mass', 4.0, Number),
      areaM2: getInitialParam('area', 0.03, Number),
      cd: getInitialParam('cd', 2.2, Number),
    };
    return { scenarios: runScenarios(p), params: p };
  });

  // Debounced live update for "What-If" sliders
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      if (massKg > 0 && areaM2 > 0 && cd > 0 && altitudeKm >= 200 && altitudeKm <= 1200) {
        const p: SimulationParams = {
          altitudeKm: Number(altitudeKm),
          massKg: Number(massKg),
          areaM2: Number(areaM2),
          cd: Number(cd),
        };
        setResults({ scenarios: runScenarios(p), params: p });
      }
    }, 150);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [altitudeKm, massKg, areaM2, cd]);

  // Handle Preset Change
  const handlePresetChange = (presetId: string) => {
    setPreset(presetId);
    if (presetId !== 'custom') {
      const match = CUBESAT_PRESETS.find((p) => p.id === presetId);
      if (match) {
        setMassKg(match.massKg);
        setAreaM2(match.areaM2);
        setCd(match.cd);
      }
    }
  };

  // Validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (altitudeKm < 200 || altitudeKm > 1200) {
      newErrors.altitudeKm = 'Altitude must be between 200 and 1200 km.';
    }
    if (massKg <= 0) {
      newErrors.massKg = 'Mass must be greater than 0 kg.';
    }
    if (areaM2 <= 0) {
      newErrors.areaM2 = 'Drag area must be greater than 0 m².';
    }
    if (cd <= 0 || cd > 5) {
      newErrors.cd = 'Drag coefficient Cd typically ranges between 1.0 and 4.0.';
    }
    if (selectedRules.custom && (customRuleYears <= 0 || customRuleYears > 100)) {
      newErrors.customRuleYears = 'Custom rule limit must be between 1 and 100 years.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Run calculation manually
  const handleCalculate = () => {
    if (!validate()) return;
    const p: SimulationParams = {
      altitudeKm: Number(altitudeKm),
      massKg: Number(massKg),
      areaM2: Number(areaM2),
      cd: Number(cd),
    };
    setResults({
      scenarios: runScenarios(p),
      params: p,
    });
  };

  // Reset to default
  const handleReset = () => {
    setMissionName('');
    setAltitudeKm(500);
    setInclinationDeg(51.6);
    setPreset('3u');
    setMassKg(4.0);
    setAreaM2(0.03);
    setCd(2.2);
    setLaunchYear(new Date().getFullYear());
    setSelectedRules({ 'iadc-25': true, 'fcc-5': true, custom: false });
    setCustomRuleYears(10);
    setErrors({});
    const p = { altitudeKm: 500, massKg: 4.0, areaM2: 0.03, cd: 2.2 };
    setResults({ scenarios: runScenarios(p), params: p });
    window.history.replaceState({}, '', window.location.pathname);
  };

  // Demos
  const loadDemo = (alt: number) => {
    setMissionName(`Demo ${alt}km 3U`);
    setAltitudeKm(alt);
    setInclinationDeg(51.6);
    setPreset('3u');
    setMassKg(4.0);
    setAreaM2(0.03);
    setCd(2.2);
    setSelectedRules({ 'iadc-25': true, 'fcc-5': true, custom: false });
    setErrors({});
    const p = { altitudeKm: alt, massKg: 4.0, areaM2: 0.03, cd: 2.2 };
    setResults({ scenarios: runScenarios(p), params: p });
  };

  // Copy shareable link
  const handleCopyLink = () => {
    const params = new URLSearchParams({
      name: missionName,
      alt: altitudeKm.toString(),
      inc: inclinationDeg.toString(),
      preset,
      mass: massKg.toString(),
      area: areaM2.toString(),
      cd: cd.toString(),
      year: launchYear.toString(),
      iadc: (selectedRules['iadc-25'] ?? true).toString(),
      fcc: (selectedRules['fcc-5'] ?? true).toString(),
      custom: (selectedRules.custom ?? false).toString(),
      customYears: customRuleYears.toString(),
    });
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
    window.history.replaceState({}, '', `?${params.toString()}`);
  };

  // Save current design to localStorage for /compare
  const handleSaveDesign = () => {
    try {
      const stored = localStorage.getItem('deorbit_compare_designs');
      const list = stored ? JSON.parse(stored) : [];
      if (list.length >= 3) {
        alert('You already have 3 designs saved. Go to Compare to remove one.');
        return;
      }
      const p: SimulationParams = {
        altitudeKm: Number(altitudeKm),
        massKg: Number(massKg),
        areaM2: Number(areaM2),
        cd: Number(cd),
      };
      const newDesign = {
        id: 'design-' + Date.now(),
        name: missionName || `Design ${altitudeKm}km (${massKg}kg)`,
        altitudeKm,
        massKg,
        areaM2,
        cd,
        results: runScenarios(p),
        savedAt: new Date().toLocaleTimeString(),
      };
      list.push(newDesign);
      localStorage.setItem('deorbit_compare_designs', JSON.stringify(list));
      setSavedOptionFeedback(true);
      setTimeout(() => setSavedOptionFeedback(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  // Active rules list
  const activeRules = useMemo(() => {
    const list: { id: string; name: string; limitYears: number; sourceUrl?: string; note: string }[] = [];
    RULES.forEach((r) => {
      if (selectedRules[r.id]) {
        list.push(r);
      }
    });
    if (selectedRules.custom) {
      list.push({
        id: 'custom',
        name: `Custom (${customRuleYears}-Year)`,
        limitYears: customRuleYears,
        note: 'User-specified debris mitigation threshold.',
      });
    }
    return list;
  }, [selectedRules, customRuleYears]);

  const minLimitYears = useMemo(() => {
    if (activeRules.length === 0) return null;
    return Math.min(...activeRules.map((r) => r.limitYears));
  }, [activeRules]);

  const verdict = useMemo<'PASS' | 'BORDERLINE' | 'FAIL' | 'NONE'>(() => {
    if (!results || minLimitYears === null) return 'NONE';
    const lowLifetime = results.scenarios.low.lifetimeYears;
    const medLifetime = results.scenarios.medium.lifetimeYears;

    if (lowLifetime <= minLimitYears) {
      return 'PASS';
    } else if (medLifetime <= minLimitYears) {
      return 'BORDERLINE';
    } else {
      return 'FAIL';
    }
  }, [results, minLimitYears]);

  // Recommendations for FAIL or BORDERLINE
  const recommendations = useMemo(() => {
    if (!results || (verdict !== 'FAIL' && verdict !== 'BORDERLINE') || minLimitYears === null) {
      return null;
    }
    const maxPassingAlt = findMaxPassingAltitude(
      { massKg: results.params.massKg, areaM2: results.params.areaM2, cd: results.params.cd },
      minLimitYears,
      1.0
    );
    const requiredArea = findRequiredArea(results.params, minLimitYears, 1.0);
    const extraAreaNeeded = Math.max(0, Number((requiredArea - results.params.areaM2).toFixed(4)));

    return {
      maxPassingAlt,
      requiredArea,
      extraAreaNeeded,
      minLimitYears,
    };
  }, [results, verdict, minLimitYears]);

  // Export PDF Report
  const handleDownloadPDF = async () => {
    if (!results) return;
    setIsExportingPDF(true);
    try {
      await generatePDFReport({
        missionName,
        altitudeKm,
        inclinationDeg,
        massKg,
        areaM2,
        cd,
        ballisticTerm: (cd * areaM2) / massKg,
        launchYear,
        lifetimes: {
          low: results.scenarios.low.lifetimeYears,
          medium: results.scenarios.medium.lifetimeYears,
          high: results.scenarios.high.lifetimeYears,
        },
        verdict: verdict === 'NONE' ? 'NOT COMPUTED' : verdict,
        rules: activeRules.map((r) => {
          const lowYr = results.scenarios.low.lifetimeYears;
          const medYr = results.scenarios.medium.lifetimeYears;
          const status = lowYr <= r.limitYears ? 'Pass' : medYr <= r.limitYears ? 'Borderline' : 'Fail';
          return { name: r.name, limitYears: r.limitYears, status };
        }),
        recommendations,
        chartElementId: 'decay-trajectory-chart-container',
      });
    } catch (err) {
      console.error(err);
      alert('Could not export PDF. Please check console.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  const formatLifetime = (years: number) => {
    if (years >= 100) return 'More than 100 years';
    if (years < 1) {
      const months = Math.round(years * 12 * 10) / 10;
      return `${months} months (${years.toFixed(2)} yr)`;
    }
    return `${years.toFixed(2)} years`;
  };

  // Recharts sampled points
  const chartData = useMemo(() => {
    if (!results) return [];
    const lowPts = results.scenarios.low.trajectory;
    const medPts = results.scenarios.medium.trajectory;
    const highPts = results.scenarios.high.trajectory;

    const timeSet = new Set<number>();
    [...lowPts, ...medPts, ...highPts].forEach((pt) => timeSet.add(pt.tYears));
    const sortedTimes = Array.from(timeSet).sort((a, b) => a - b);

    const getAltAt = (pts: { tYears: number; altKm: number }[], t: number) => {
      if (t <= pts[0].tYears) return pts[0].altKm;
      if (t >= pts[pts.length - 1].tYears) return pts[pts.length - 1].altKm;
      for (let i = 0; i < pts.length - 1; i++) {
        if (t >= pts[i].tYears && t <= pts[i + 1].tYears) {
          const ratio = (t - pts[i].tYears) / (pts[i + 1].tYears - pts[i].tYears);
          return Number((pts[i].altKm + ratio * (pts[i + 1].altKm - pts[i].altKm)).toFixed(1));
        }
      }
      return 120;
    };

    const maxDisplayPoints = 100;
    const step = Math.max(1, Math.floor(sortedTimes.length / maxDisplayPoints));
    const sampledTimes = sortedTimes.filter((_, idx) => idx % step === 0 || idx === sortedTimes.length - 1);

    return sampledTimes.map((t) => ({
      tYears: t,
      low: getAltAt(lowPts, t),
      medium: getAltAt(medPts, t),
      high: getAltAt(highPts, t),
    }));
  }, [results]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 flex flex-col justify-between">
      <div className="max-w-7xl mx-auto w-full space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-800 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-500/10 text-teal-400 rounded-lg border border-teal-500/20">
                <Rocket className="w-6 h-6" />
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                Deorbit<span className="text-teal-400">Check</span>
              </h1>
            </div>
            <p className="text-slate-400 text-sm mt-1">
              CubeSat screening-level orbital lifetime estimator & debris mitigation compliance checker
            </p>
          </div>

          {/* Demos, Share, PDF, Compare Navigation */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => loadDemo(400)}
              id="demo-400-btn"
              className="px-3 py-1.5 rounded-md bg-teal-950/80 hover:bg-teal-900 border border-teal-600/40 text-teal-300 text-xs font-medium transition flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Demo: 400 km 3U
            </button>
            <button
              onClick={() => loadDemo(700)}
              id="demo-700-btn"
              className="px-3 py-1.5 rounded-md bg-rose-950/80 hover:bg-rose-900 border border-rose-600/40 text-rose-300 text-xs font-medium transition flex items-center gap-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Demo: 700 km 3U
            </button>
            <button
              onClick={handleCopyLink}
              id="copy-link-btn"
              className="px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium transition flex items-center gap-1.5"
              title="Copy link with input parameters"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-teal-400" />
                  <span className="text-teal-400 font-semibold">Link Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  Share Link
                </>
              )}
            </button>
            <button
              onClick={handleDownloadPDF}
              id="download-pdf-btn"
              disabled={isExportingPDF}
              className="px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              {isExportingPDF ? 'Generating...' : 'Download PDF'}
            </button>
            <button
              onClick={handleReset}
              className="px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-medium transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>
        </header>

        {/* Sub-navigation bar for Compare & Validation */}
        <div className="flex items-center justify-between bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Tools:</span>
            <button
              onClick={handleSaveDesign}
              id="save-design-btn"
              className="px-3 py-1 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-300 font-medium flex items-center gap-1.5 transition"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              {savedOptionFeedback ? 'Saved to Compare!' : 'Save as Design Option'}
            </button>
            {onNavigateToCompare && (
              <button
                onClick={() =>
                  onNavigateToCompare({
                    name: missionName,
                    altitudeKm,
                    massKg,
                    areaM2,
                    cd,
                  })
                }
                id="nav-compare-btn"
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium flex items-center gap-1.5 transition"
              >
                <Layers className="w-3.5 h-3.5" />
                Go to /compare Page
              </button>
            )}
          </div>
          {onNavigateToValidation && (
            <button
              onClick={onNavigateToValidation}
              id="nav-validation-btn"
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium flex items-center gap-1.5 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              /validation Heritage Page
            </button>
          )}
        </div>

        {/* Grid Layout: Left Input Panel, Right Results */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* INPUT FORM (4 cols) */}
          <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-teal-400 font-semibold text-sm">
                <Sliders className="w-4 h-4" />
                Mission Parameters
              </div>
              <span className="text-[10px] text-teal-400/80 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/20">
                Live 150ms Debounced
              </span>
            </div>

            <div className="space-y-4">
              {/* Mission Name */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Mission Name <span className="text-slate-500">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. MyCubeSat-1"
                  value={missionName}
                  onChange={(e) => setMissionName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-teal-500 transition"
                />
              </div>

              {/* What-If Live Altitude Slider */}
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-teal-300 flex items-center gap-1">
                    What-If Altitude (km)
                    <span title="Live drag slider: adjust circular orbit from 200 to 1200 km">
                      <Info className="w-3.5 h-3.5 text-slate-500 cursor-help" />
                    </span>
                  </label>
                  <span className="text-xs font-mono font-bold text-teal-400">{altitudeKm} km</span>
                </div>
                <input
                  type="range"
                  min="200"
                  max="1200"
                  step="5"
                  value={altitudeKm}
                  id="altitude-slider"
                  onChange={(e) => setAltitudeKm(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>200 km</span>
                  <span>500 km</span>
                  <span>1200 km</span>
                </div>
                {errors.altitudeKm && <p className="text-xs text-rose-400">{errors.altitudeKm}</p>}
              </div>

              {/* What-If Live Drag Area Slider */}
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-teal-300 flex items-center gap-1">
                    What-If Drag Area (m²)
                    <span title="Live drag area slider from 0.005 m² up to 2.0 m² (simulates drag sails)">
                      <Info className="w-3.5 h-3.5 text-slate-500 cursor-help" />
                    </span>
                  </label>
                  <span className="text-xs font-mono font-bold text-teal-400">{areaM2} m²</span>
                </div>
                <input
                  type="range"
                  min="0.005"
                  max="2.0"
                  step="0.005"
                  value={areaM2}
                  id="drag-area-slider"
                  onChange={(e) => {
                    setAreaM2(Number(e.target.value));
                    setPreset('custom');
                  }}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>0.005 m²</span>
                  <span>0.5 m²</span>
                  <span>2.0 m²</span>
                </div>
                {errors.areaM2 && <p className="text-xs text-rose-400">{errors.areaM2}</p>}
              </div>

              {/* Form Factor Preset */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  CubeSat Form Factor
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {CUBESAT_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handlePresetChange(p.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition text-center ${
                        preset === p.id
                          ? 'bg-teal-500/20 border-teal-500 text-teal-300'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handlePresetChange('custom')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition text-center ${
                      preset === 'custom'
                        ? 'bg-teal-500/20 border-teal-500 text-teal-300'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    Custom
                  </button>
                </div>
              </div>

              {/* Mass, Inclination, Launch Year */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1 mb-1">
                    Mass (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={massKg}
                    onChange={(e) => {
                      setMassKg(Number(e.target.value));
                      setPreset('custom');
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                  {errors.massKg && <p className="text-xs text-rose-400 mt-1">{errors.massKg}</p>}
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1 mb-1">
                    Cd (2.2 default)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="5.0"
                    value={cd}
                    onChange={(e) => {
                      setCd(Number(e.target.value));
                      setPreset('custom');
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                  {errors.cd && <p className="text-xs text-rose-400 mt-1">{errors.cd}</p>}
                </div>
              </div>

              {/* Inclination & Ballistic Term */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1 mb-1">
                    Inclination (deg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={inclinationDeg}
                    onChange={(e) => setInclinationDeg(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 flex flex-col justify-center">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">Ballistic B</span>
                  <span className="text-xs font-mono text-teal-400 font-semibold mt-0.5">
                    {massKg > 0 ? ((cd * areaM2) / massKg).toFixed(5) : 0} m²/kg
                  </span>
                </div>
              </div>

              {/* Rules selection */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <label className="block text-xs font-medium text-slate-300">Target Debris Rules</label>
                {RULES.map((r) => (
                  <label
                    key={r.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-950/50 border border-slate-800/80 hover:border-slate-700 cursor-pointer text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedRules[r.id] ?? false}
                        onChange={(e) =>
                          setSelectedRules({ ...selectedRules, [r.id]: e.target.checked })
                        }
                        className="rounded bg-slate-800 border-slate-700 text-teal-500 focus:ring-teal-500 accent-teal-400"
                      />
                      <span className="text-slate-200">{r.name}</span>
                    </div>
                    <span className="text-slate-400 font-mono">{r.limitYears} yr</span>
                  </label>
                ))}

                <div className="p-2 rounded-lg bg-slate-950/50 border border-slate-800/80 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedRules.custom ?? false}
                        onChange={(e) =>
                          setSelectedRules({ ...selectedRules, custom: e.target.checked })
                        }
                        className="rounded bg-slate-800 border-slate-700 text-teal-500 focus:ring-teal-500 accent-teal-400"
                      />
                      <span className="text-slate-200">Custom Limit</span>
                    </label>
                    {selectedRules.custom && (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={customRuleYears}
                          onChange={(e) => setCustomRuleYears(Number(e.target.value))}
                          className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-right text-slate-100 font-mono focus:border-teal-400"
                        />
                        <span className="text-slate-400">yr</span>
                      </div>
                    )}
                  </div>
                  {errors.customRuleYears && (
                    <p className="text-xs text-rose-400">{errors.customRuleYears}</p>
                  )}
                </div>
              </div>

              {/* Calculate Button */}
              <button
                type="button"
                onClick={handleCalculate}
                className="w-full py-2.5 px-4 bg-teal-500 hover:bg-teal-400 active:bg-teal-600 text-slate-950 font-semibold rounded-lg shadow-lg shadow-teal-500/20 transition flex items-center justify-center gap-2 text-sm"
              >
                <Play className="w-4 h-4 fill-current" />
                Calculate Deorbit Lifetime
              </button>
            </div>
          </div>

          {/* RESULTS DISPLAY (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Verdict Banner */}
            {verdict !== 'NONE' && (
              <div
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg ${
                  verdict === 'PASS'
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : verdict === 'BORDERLINE'
                    ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  {verdict === 'PASS' && <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0" />}
                  {verdict === 'BORDERLINE' && <AlertTriangle className="w-7 h-7 text-amber-400 shrink-0" />}
                  {verdict === 'FAIL' && <XCircle className="w-7 h-7 text-rose-400 shrink-0" />}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold tracking-wide">
                        {verdict === 'PASS' && 'COMPLIANT (PASS)'}
                        {verdict === 'BORDERLINE' && 'BORDERLINE COMPLIANCE'}
                        {verdict === 'FAIL' && 'NON-COMPLIANT (FAIL)'}
                      </span>
                      {missionName && (
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-900/60 border border-current text-slate-300">
                          {missionName}
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-1 text-slate-300">
                      {verdict === 'PASS' &&
                        `Satellite reliably deorbits within ${minLimitYears} years even under conservative low solar activity.`}
                      {verdict === 'BORDERLINE' &&
                        `Complies under baseline medium solar conditions, but exceeds the ${minLimitYears}-year rule if launched into low solar activity.`}
                      {verdict === 'FAIL' &&
                        `Lifetime exceeds the ${minLimitYears}-year requirement across standard baseline and worst-case solar conditions.`}
                    </p>
                  </div>
                </div>

                <div className="text-right sm:border-l sm:border-slate-800/80 sm:pl-4">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400">Baseline Lifetime</div>
                  <div className="text-xl font-bold font-mono text-white">
                    {results ? formatLifetime(results.scenarios.medium.lifetimeYears) : '--'}
                  </div>
                </div>
              </div>
            )}

            {/* Scenario Cards */}
            {results && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span className="font-semibold text-slate-300">Low Solar Activity</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400">
                      0.4x Density
                    </span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-rose-300">
                    {formatLifetime(results.scenarios.low.lifetimeYears)}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">
                    Solar minimum: thinner upper atmosphere yields maximum deorbit duration.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-teal-500/30 hover:border-teal-500/50 transition relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-12 h-12 bg-teal-500/5 rounded-bl-full pointer-events-none" />
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span className="font-semibold text-teal-300">Medium Solar Activity</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-teal-950 border border-teal-800 text-teal-300">
                      1.0x Baseline
                    </span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-teal-400">
                    {formatLifetime(results.scenarios.medium.lifetimeYears)}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">
                    Standard solar cycle average baseline for mission planning.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span className="font-semibold text-slate-300">High Solar Activity</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400">
                      3.0x Density
                    </span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-emerald-300">
                    {formatLifetime(results.scenarios.high.lifetimeYears)}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">
                    Solar maximum: expanded atmosphere accelerates aerodynamic decay.
                  </p>
                </div>
              </div>
            )}

            {/* Altitude vs Time Chart */}
            <div
              id="decay-trajectory-chart-container"
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-teal-400" />
                  <h3 className="text-sm font-semibold text-slate-200">Orbital Altitude Decay Trajectory</h3>
                </div>
                <div className="text-xs text-slate-400">Stop boundary: 120 km (Re-entry)</div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey="tYears"
                      stroke="#64748b"
                      fontSize={11}
                      tickFormatter={(val) => `${val} yr`}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      domain={[100, Math.ceil((results?.params.altitudeKm ?? 600) / 100) * 100]}
                      tickFormatter={(val) => `${val} km`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#090d16',
                        borderColor: '#334155',
                        borderRadius: '0.5rem',
                        fontSize: '12px',
                        color: '#f8fafc',
                      }}
                      formatter={(val: any) => [`${val} km`, '']}
                      labelFormatter={(label) => `Time: ${label} years`}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                      iconType="plainline"
                    />

                    <ReferenceLine
                      y={120}
                      stroke="#f43f5e"
                      strokeDasharray="4 4"
                      label={{ value: '120 km Re-entry', fill: '#f43f5e', fontSize: 10, position: 'insideBottomRight' }}
                    />

                    {activeRules.map((rule) => (
                      <ReferenceLine
                        key={rule.id}
                        x={rule.limitYears}
                        stroke="#e2e8f0"
                        strokeDasharray="3 3"
                        strokeOpacity={0.6}
                        label={{
                          value: `${rule.name} (${rule.limitYears}y)`,
                          fill: '#94a3b8',
                          fontSize: 10,
                          position: 'top',
                        }}
                      />
                    ))}

                    <Line
                      type="monotone"
                      dataKey="low"
                      name="Low Solar (0.4x)"
                      stroke="#f87171"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="medium"
                      name="Medium Solar (1.0x)"
                      stroke="#2dd4bf"
                      strokeWidth={2.5}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="high"
                      name="High Solar (3.0x)"
                      stroke="#34d399"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Compliance Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
              <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-teal-400" />
                  <h3 className="text-sm font-semibold text-slate-200">Debris Mitigation Compliance Matrix</h3>
                </div>
                <span className="text-[11px] text-slate-400">
                  Applicable rule depends on launch country and licensing authority.
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 font-medium border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-4">Mitigation Rule</th>
                      <th className="py-2.5 px-3">Limit</th>
                      <th className="py-2.5 px-3">Worst-Case (Low)</th>
                      <th className="py-2.5 px-3">Baseline (Med)</th>
                      <th className="py-2.5 px-3">Best-Case (High)</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {activeRules.map((rule) => {
                      if (!results) return null;
                      const lowYr = results.scenarios.low.lifetimeYears;
                      const medYr = results.scenarios.medium.lifetimeYears;
                      const isPass = lowYr <= rule.limitYears;
                      const isBorder = !isPass && medYr <= rule.limitYears;

                      return (
                        <tr key={rule.id} className="hover:bg-slate-800/30 transition">
                          <td className="py-3 px-4 font-medium text-slate-200">
                            {rule.name}
                            <p className="text-[10px] text-slate-500 mt-0.5">{rule.note}</p>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-300">{rule.limitYears} yr</td>
                          <td className="py-3 px-3 font-mono text-rose-300">
                            {formatLifetime(results.scenarios.low.lifetimeYears)}
                          </td>
                          <td className="py-3 px-3 font-mono text-teal-300">
                            {formatLifetime(results.scenarios.medium.lifetimeYears)}
                          </td>
                          <td className="py-3 px-3 font-mono text-emerald-300">
                            {formatLifetime(results.scenarios.high.lifetimeYears)}
                          </td>
                          <td className="py-3 px-3">
                            {isPass ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
                                Pass
                              </span>
                            ) : isBorder ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950 text-amber-400 border border-amber-800">
                                Borderline
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-950 text-rose-400 border border-rose-800">
                                Fail
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            {rule.sourceUrl ? (
                              <a
                                href={rule.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-teal-400 hover:text-teal-300 hover:underline"
                              >
                                Link <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="text-slate-600">--</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recommendation Card on FAIL / BORDERLINE */}
            {recommendations && (
              <div className="p-5 rounded-xl bg-slate-900 border border-amber-500/30 shadow-lg space-y-4">
                <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  Recommended Mitigation Strategies
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-[11px] text-slate-400 uppercase font-medium">Option A: Injection Altitude Cap</span>
                    <div className="text-lg font-bold text-teal-300 font-mono">
                      ≤ {recommendations.maxPassingAlt} km
                    </div>
                    <p className="text-xs text-slate-400">
                      Lower initial circular altitude to at most {recommendations.maxPassingAlt} km to decay within {recommendations.minLimitYears} years naturally.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-[11px] text-slate-400 uppercase font-medium">Option B: Deployable Drag Sail</span>
                    <div className="text-lg font-bold text-teal-300 font-mono">
                      +{recommendations.extraAreaNeeded} m² sail
                    </div>
                    <p className="text-xs text-slate-400">
                      Increase total drag area to {recommendations.requiredArea} m² (requiring +{recommendations.extraAreaNeeded} m² deployable sail).
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                  Because passive atmospheric drag drops off exponentially with altitude, retaining a {results?.params.altitudeKm} km insertion requires either adopting an active/passive deployable aerodynamic brake (such as a drag sail or tether) to boost the ballistic coefficient or negotiating a lower deployment altitude with the launch provider to ensure deorbit compliance within the {recommendations.minLimitYears}-year limit.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Disclaimer Banner */}
        <footer className="mt-8 p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
          <p className="text-xs text-slate-400">
            Screening-level estimate for early design. Not an official certification. Verify rule thresholds against the official sources.
          </p>
        </footer>
      </div>
    </div>
  );
};
export default CheckerPage;
