import React, { useState, useMemo } from 'react';
import { runScenarios, SimulationParams, ScenarioResults } from '../lib/engine';
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
import { Trash2, PlusCircle, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';

export interface SavedDesign {
  id: string;
  name: string;
  altitudeKm: number;
  massKg: number;
  areaM2: number;
  cd: number;
  results: ScenarioResults;
  savedAt: string;
}

interface ComparePageProps {
  onBack: () => void;
  currentDesign?: {
    name?: string;
    altitudeKm: number;
    massKg: number;
    areaM2: number;
    cd: number;
  };
}

export const ComparePage: React.FC<ComparePageProps> = ({ onBack, currentDesign }) => {
  const [designs, setDesigns] = useState<SavedDesign[]>(() => {
    try {
      const stored = localStorage.getItem('deorbit_compare_designs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const saveToStorage = (list: SavedDesign[]) => {
    setDesigns(list);
    try {
      localStorage.setItem('deorbit_compare_designs', JSON.stringify(list));
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemove = (id: string) => {
    const updated = designs.filter((d) => d.id !== id);
    saveToStorage(updated);
  };

  const handleAddCurrent = () => {
    if (!currentDesign) return;
    if (designs.length >= 3) {
      alert('You can compare up to 3 designs. Please remove one first.');
      return;
    }
    const p: SimulationParams = {
      altitudeKm: currentDesign.altitudeKm,
      massKg: currentDesign.massKg,
      areaM2: currentDesign.areaM2,
      cd: currentDesign.cd,
    };
    const sc = runScenarios(p);
    const newDesign: SavedDesign = {
      id: 'design-' + Date.now(),
      name: currentDesign.name || `Design ${currentDesign.altitudeKm}km (${currentDesign.massKg}kg)`,
      altitudeKm: currentDesign.altitudeKm,
      massKg: currentDesign.massKg,
      areaM2: currentDesign.areaM2,
      cd: currentDesign.cd,
      results: sc,
      savedAt: new Date().toLocaleTimeString(),
    };
    saveToStorage([...designs, newDesign]);
  };

  // Build combined chart points
  const chartData = useMemo(() => {
    if (designs.length === 0) return [];
    const timeSet = new Set<number>();
    designs.forEach((d) => {
      d.results.medium.trajectory.forEach((pt) => timeSet.add(pt.tYears));
    });
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

    const maxPts = 80;
    const step = Math.max(1, Math.floor(sortedTimes.length / maxPts));
    const sampledTimes = sortedTimes.filter((_, idx) => idx % step === 0 || idx === sortedTimes.length - 1);

    return sampledTimes.map((t) => {
      const row: any = { tYears: t };
      designs.forEach((d, idx) => {
        row[`design_${idx}`] = getAltAt(d.results.medium.trajectory, t);
      });
      return row;
    });
  }, [designs]);

  const colors = ['#2dd4bf', '#38bdf8', '#f59e0b'];

  const formatLifetime = (years: number) => {
    if (years >= 100) return '>100 years';
    if (years < 1) return `${Math.round(years * 12)} mos`;
    return `${years.toFixed(1)} yr`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 flex items-center gap-1.5 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Checker
        </button>
        {currentDesign && designs.length < 3 && (
          <button
            onClick={handleAddCurrent}
            className="px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition"
          >
            <PlusCircle className="w-4 h-4" />
            Save Current Design ({designs.length}/3)
          </button>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-100">Trade Study: Compare Design Options</h2>
            <p className="text-xs text-slate-400">
              Side-by-side comparison of up to 3 candidate mission architectures.
            </p>
          </div>
          <span className="text-xs text-teal-400 font-mono font-medium">
            {designs.length} of 3 slots used
          </span>
        </div>

        {designs.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <p className="text-sm text-slate-400">No designs saved for comparison yet.</p>
            {currentDesign && (
              <button
                onClick={handleAddCurrent}
                className="px-4 py-2 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 text-xs font-semibold"
              >
                Save Current Active Design
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/70 text-slate-400 font-medium border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Design Option</th>
                    <th className="py-3 px-3">Altitude</th>
                    <th className="py-3 px-3">Mass</th>
                    <th className="py-3 px-3">Drag Area</th>
                    <th className="py-3 px-3">Ballistic B</th>
                    <th className="py-3 px-3">Medium Lifetime</th>
                    <th className="py-3 px-3">25-Yr IADC</th>
                    <th className="py-3 px-3">5-Yr FCC</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {designs.map((d, idx) => {
                    const medLt = d.results.medium.lifetimeYears;
                    const pass25 = medLt <= 25;
                    const pass5 = medLt <= 5;
                    return (
                      <tr key={d.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-semibold text-slate-200 flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: colors[idx] }}
                          />
                          {d.name}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-300">{d.altitudeKm} km</td>
                        <td className="py-3 px-3 font-mono text-slate-300">{d.massKg} kg</td>
                        <td className="py-3 px-3 font-mono text-slate-300">{d.areaM2} m²</td>
                        <td className="py-3 px-3 font-mono text-teal-400">
                          {((d.cd * d.areaM2) / d.massKg).toFixed(4)}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-white">
                          {formatLifetime(medLt)}
                        </td>
                        <td className="py-3 px-3">
                          {pass25 ? (
                            <span className="text-emerald-400 inline-flex items-center gap-1 font-semibold text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Pass
                            </span>
                          ) : (
                            <span className="text-rose-400 inline-flex items-center gap-1 font-semibold text-[11px]">
                              <XCircle className="w-3.5 h-3.5" /> Fail
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {pass5 ? (
                            <span className="text-emerald-400 inline-flex items-center gap-1 font-semibold text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Pass
                            </span>
                          ) : (
                            <span className="text-rose-400 inline-flex items-center gap-1 font-semibold text-[11px]">
                              <XCircle className="w-3.5 h-3.5" /> Fail
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleRemove(d.id)}
                            className="p-1 text-slate-500 hover:text-rose-400 transition"
                            title="Remove design"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Overlaid Chart */}
            <div className="mt-6 pt-6 border-t border-slate-800 space-y-3">
              <h3 className="text-sm font-semibold text-slate-200">
                Overlaid Medium Baseline Trajectories
              </h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey="tYears"
                      stroke="#64748b"
                      fontSize={11}
                      tickFormatter={(val) => `${val}y`}
                    />
                    <YAxis stroke="#64748b" fontSize={11} tickFormatter={(val) => `${val}km`} />
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
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <ReferenceLine
                      y={120}
                      stroke="#f43f5e"
                      strokeDasharray="4 4"
                      label={{ value: '120 km Re-entry', fill: '#f43f5e', fontSize: 10 }}
                    />
                    {designs.map((d, idx) => (
                      <Line
                        key={d.id}
                        type="monotone"
                        dataKey={`design_${idx}`}
                        name={d.name}
                        stroke={colors[idx]}
                        strokeWidth={2.5}
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
export default ComparePage;
