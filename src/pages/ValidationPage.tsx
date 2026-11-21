import React, { useMemo } from 'react';
import validationData from '../data/validation.json';
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
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

interface ValidationPageProps {
  onBack: () => void;
}

export const ValidationPage: React.FC<ValidationPageProps> = ({ onBack }) => {
  // Flatten chart data from the satellites
  const chartData = useMemo(() => {
    // Generate unified time points
    const times = [0, 1, 2, 3, 4, 6, 8, 10, 12, 14, 15.54, 18, 20.2];
    const getAlt = (satIdx: number, t: number) => {
      const pts = validationData[satIdx].trajectoryPoints;
      if (t <= pts[0].tYears) return pts[0].altKm;
      if (t >= pts[pts.length - 1].tYears) return 120;
      for (let i = 0; i < pts.length - 1; i++) {
        if (t >= pts[i].tYears && t <= pts[i + 1].tYears) {
          const ratio = (t - pts[i].tYears) / (pts[i + 1].tYears - pts[i].tYears);
          return Math.round(pts[i].altKm + ratio * (pts[i + 1].altKm - pts[i].altKm));
        }
      }
      return 120;
    };

    return times.map((t) => ({
      tYears: t,
      delfi: getAlt(0, t),
      swisscube: getAlt(1, t),
      cp4: getAlt(2, t),
    }));
  }, []);

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
        <div className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5" />
          Sample placeholder data for verification & calibration
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-100">Model Validation & Flight Heritage</h2>
          <p className="text-xs text-slate-400 mt-1">
            Comparing screening-level piecewise atmospheric engine against historical CubeSat deorbit trajectories.
          </p>
        </div>

        {/* Validation Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 text-slate-400 font-medium border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Satellite Mission</th>
                <th className="py-3 px-3">NORAD ID</th>
                <th className="py-3 px-3">Form Factor</th>
                <th className="py-3 px-3">Launch Date</th>
                <th className="py-3 px-3">Re-entry / Status</th>
                <th className="py-3 px-3">Actual Lifetime</th>
                <th className="py-3 px-3">Model Estimate</th>
                <th className="py-3 px-3">Percent Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {validationData.map((sat) => (
                <tr key={sat.noradId} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4 font-semibold text-slate-200">
                    {sat.name}
                    <p className="text-[10px] text-slate-400 font-normal">{sat.notes}</p>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-400">{sat.noradId}</td>
                  <td className="py-3 px-3 font-mono text-teal-300">{sat.formFactor}</td>
                  <td className="py-3 px-3 text-slate-400">{sat.launchDate}</td>
                  <td className="py-3 px-3 text-slate-300">{sat.reentryDate}</td>
                  <td className="py-3 px-3 font-mono text-white font-medium">
                    {sat.actualLifetimeYears} yr
                  </td>
                  <td className="py-3 px-3 font-mono text-teal-400 font-medium">
                    {sat.estimatedLifetimeYears} yr
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
                        Math.abs(sat.percentError) < 10
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                          : 'bg-amber-950/80 text-amber-400 border border-amber-800'
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      {sat.percentError > 0 ? `+${sat.percentError}%` : `${sat.percentError}%`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Validation Chart */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <h3 className="text-sm font-semibold text-slate-200">Historical Altitude Trajectories</h3>
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
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(val) => `${val} km`} />
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
                <Line
                  type="monotone"
                  dataKey="delfi"
                  name="Delfi-C3 (3U, 630km)"
                  stroke="#2dd4bf"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="swisscube"
                  name="SwissCube-1 (1U, 720km)"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="cp4"
                  name="CP-4 (1U, 480km)"
                  stroke="#a78bfa"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ValidationPage;
