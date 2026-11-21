import { SOLAR_SCENARIOS } from '../config/scenarios';

export interface SimulationParams {
  altitudeKm: number;
  massKg: number;
  areaM2: number;
  cd: number;
}

export interface TrajectoryPoint {
  tYears: number;
  altKm: number;
}

export interface SimulationResult {
  lifetimeYears: number;
  trajectory: TrajectoryPoint[];
  reentered: boolean;
}

export interface ScenarioResults {
  low: SimulationResult;
  medium: SimulationResult;
  high: SimulationResult;
  bTerm: number;
}

// Earth physical constants
const R_EARTH_KM = 6378.137;
const MU = 3.986004418e14; // m^3 / s^2
const SECONDS_PER_DAY = 86400.0;
const DAYS_PER_YEAR = 365.25;
const SECONDS_PER_YEAR = DAYS_PER_YEAR * SECONDS_PER_DAY;

// Piecewise exponential atmosphere table: [baseAltKm, rho0 kg/m^3, scaleHeightKm]
export const ATMOSPHERE_TABLE: readonly [number, number, number][] = [
  [0, 1.225, 7.249],
  [25, 3.899e-2, 6.349],
  [30, 1.774e-2, 6.682],
  [40, 3.972e-3, 7.554],
  [50, 1.057e-3, 8.382],
  [60, 3.206e-4, 7.714],
  [70, 8.770e-5, 6.549],
  [80, 1.905e-5, 5.799],
  [90, 3.396e-6, 5.382],
  [100, 5.297e-7, 5.877],
  [110, 9.661e-8, 7.263],
  [120, 2.438e-8, 9.473],
  [130, 8.484e-9, 12.636],
  [140, 3.845e-9, 16.149],
  [150, 2.070e-9, 22.523],
  [180, 5.464e-10, 29.740],
  [200, 2.789e-10, 37.105],
  [250, 7.248e-11, 45.546],
  [300, 2.418e-11, 53.628],
  [350, 9.518e-12, 53.298],
  [400, 3.725e-12, 58.515],
  [450, 1.585e-12, 60.828],
  [500, 6.967e-13, 63.822],
  [600, 1.454e-13, 71.835],
  [700, 3.614e-14, 88.667],
  [800, 1.170e-14, 124.64],
  [900, 5.245e-15, 181.05],
  [1000, 3.019e-15, 268.0],
];

/**
 * Calculates the ballistic term B = Cd * A / m (m^2 / kg)
 */
export function calculateBallisticTerm(cd: number, areaM2: number, massKg: number): number {
  if (massKg <= 0) return 0;
  return (cd * areaM2) / massKg;
}

/**
 * Calculates atmospheric density at altitude h (km) using piecewise exponential model
 */
export function getAtmosphericDensity(altitudeKm: number, multiplier = 1.0): number {
  if (altitudeKm < 0) altitudeKm = 0;

  // Use the last row with baseAltKm <= altitudeKm
  let baseAlt = ATMOSPHERE_TABLE[0][0];
  let rho0 = ATMOSPHERE_TABLE[0][1];
  let scaleHeight = ATMOSPHERE_TABLE[0][2];

  for (let i = ATMOSPHERE_TABLE.length - 1; i >= 0; i--) {
    if (altitudeKm >= ATMOSPHERE_TABLE[i][0]) {
      baseAlt = ATMOSPHERE_TABLE[i][0];
      rho0 = ATMOSPHERE_TABLE[i][1];
      scaleHeight = ATMOSPHERE_TABLE[i][2];
      break;
    }
  }

  const deltaH = altitudeKm - baseAlt;
  return multiplier * rho0 * Math.exp(-deltaH / scaleHeight);
}

/**
 * Simulates circular-orbit decay under atmospheric drag.
 * da/dt = -sqrt(mu * a) * rho * B
 * 1-day step above 200 km, 10-minute step below.
 * Stop at 120 km altitude. Cap at 100 years.
 */
export function simulateLifetime(
  params: SimulationParams,
  multiplier = 1.0,
  maxYears = 100
): SimulationResult {
  const { altitudeKm, massKg, areaM2, cd } = params;
  const B = calculateBallisticTerm(cd, areaM2, massKg);

  if (altitudeKm <= 120) {
    return {
      lifetimeYears: 0,
      trajectory: [{ tYears: 0, altKm: altitudeKm }],
      reentered: true,
    };
  }

  if (B <= 0) {
    return {
      lifetimeYears: maxYears,
      trajectory: [
        { tYears: 0, altKm: altitudeKm },
        { tYears: maxYears, altKm: altitudeKm },
      ],
      reentered: false,
    };
  }

  let hKm = altitudeKm;
  let tSeconds = 0;
  const maxSeconds = maxYears * SECONDS_PER_YEAR;

  // We keep track of trajectory points.
  // Downsampling strategy: record initially, then periodically or on significant change, and always at the end.
  const rawTrajectory: TrajectoryPoint[] = [{ tYears: 0, altKm: Number(hKm.toFixed(2)) }];

  const dtAbove200 = 86400; // 1 day
  const dtBelow200 = 600;   // 10 minutes (600s)

  let lastSavedTime = 0;
  // Dynamic sampling interval based on anticipated duration
  const sampleIntervalSeconds = 86400 * 30; // ~monthly sample for long runs

  while (tSeconds < maxSeconds && hKm > 120) {
    // Determine time step
    let dt = hKm > 200 ? dtAbove200 : dtBelow200;

    // Density at current altitude
    const rho = getAtmosphericDensity(hKm, multiplier);

    // a in meters
    const aMeters = (R_EARTH_KM + hKm) * 1000.0;

    // da/dt in m/s = -sqrt(mu * a) * rho * B
    const daDtMetersPerSec = -Math.sqrt(MU * aMeters) * rho * B;
    const dhDtKmPerSec = daDtMetersPerSec / 1000.0;

    // Guard against excessive overshoot in single step
    if (dhDtKmPerSec < 0) {
      const dropInStep = -dhDtKmPerSec * dt;
      if (dropInStep > 20) {
        // limit drop per step so we don't jump straight past 120 km in one massive leap
        dt = 20 / -dhDtKmPerSec;
      }
    }

    // Advance time and altitude
    hKm += dhDtKmPerSec * dt;
    tSeconds += dt;

    // Save trajectory points
    if (tSeconds - lastSavedTime >= sampleIntervalSeconds || hKm <= 200) {
      rawTrajectory.push({
        tYears: Number((tSeconds / SECONDS_PER_YEAR).toFixed(4)),
        altKm: Number(Math.max(120, hKm).toFixed(2)),
      });
      lastSavedTime = tSeconds;
    }
  }

  const reentered = hKm <= 120;
  const finalTimeYears = Number((tSeconds / SECONDS_PER_YEAR).toFixed(3));

  if (rawTrajectory[rawTrajectory.length - 1].tYears !== finalTimeYears) {
    rawTrajectory.push({
      tYears: finalTimeYears,
      altKm: Number(Math.max(120, hKm).toFixed(2)),
    });
  }

  // Downsample trajectory if it exceeds ~150 points for snappy chart rendering
  const downsampled = downsampleTrajectory(rawTrajectory, 120);

  return {
    lifetimeYears: Math.min(finalTimeYears, maxYears),
    trajectory: downsampled,
    reentered,
  };
}

/**
 * Helper to downsample a trajectory array to a max size while retaining start and end points
 */
function downsampleTrajectory(points: TrajectoryPoint[], maxPoints = 120): TrajectoryPoint[] {
  if (points.length <= maxPoints) {
    return points;
  }
  const result: TrajectoryPoint[] = [points[0]];
  const step = (points.length - 1) / (maxPoints - 1);
  for (let i = 1; i < maxPoints - 1; i++) {
    const index = Math.round(i * step);
    result.push(points[index]);
  }
  result.push(points[points.length - 1]);
  return result;
}

/**
 * Runs simulation across all predefined solar scenarios (low, medium, high)
 */
export function runScenarios(params: SimulationParams): ScenarioResults {
  const bTerm = calculateBallisticTerm(params.cd, params.areaM2, params.massKg);
  return {
    low: simulateLifetime(params, SOLAR_SCENARIOS.low.multiplier),
    medium: simulateLifetime(params, SOLAR_SCENARIOS.medium.multiplier),
    high: simulateLifetime(params, SOLAR_SCENARIOS.high.multiplier),
    bTerm,
  };
}

/**
 * Finds the maximum initial circular altitude (in km) such that the lifetime
 * does not exceed limitYears under a given solar multiplier (defaulting to medium = 1.0).
 * Binary search between 120 km and 1200 km with 1 km precision.
 */
export function findMaxPassingAltitude(
  params: Omit<SimulationParams, 'altitudeKm'>,
  limitYears: number,
  multiplier = 1.0
): number {
  let lowAlt = 120;
  let highAlt = 1200;
  let bestAlt = 120;

  // If even at 120 it exceeds (e.g. limit is 0), return 120
  const checkAtMin = simulateLifetime({ ...params, altitudeKm: lowAlt }, multiplier);
  if (checkAtMin.lifetimeYears > limitYears) {
    return lowAlt;
  }

  while (highAlt - lowAlt > 0.5) {
    const midAlt = Math.round((lowAlt + highAlt) / 2);
    const sim = simulateLifetime({ ...params, altitudeKm: midAlt }, multiplier);

    if (sim.lifetimeYears <= limitYears && sim.reentered) {
      bestAlt = midAlt;
      lowAlt = midAlt + 0.5; // Can possibly go higher
    } else {
      highAlt = midAlt - 0.5; // Must go lower
    }
  }

  // Ensure strict safety: verify bestAlt passes
  while (bestAlt >= 120) {
    const verification = simulateLifetime({ ...params, altitudeKm: bestAlt }, multiplier);
    if (verification.lifetimeYears <= limitYears && verification.reentered) {
      break;
    }
    bestAlt -= 1;
  }

  return Math.max(120, bestAlt);
}

/**
 * Finds the required cross-sectional drag area (in m^2) to achieve deorbit within limitYears
 * from the specified altitude.
 * Binary search between initial area and a practical ceiling (e.g., 20 m^2 for deployable sails).
 */
export function findRequiredArea(
  params: SimulationParams,
  limitYears: number,
  multiplier = 1.0
): number {
  // If current already passes, return current area
  const currentSim = simulateLifetime(params, multiplier);
  if (currentSim.lifetimeYears <= limitYears && currentSim.reentered) {
    return params.areaM2;
  }

  let lowArea = params.areaM2;
  let highArea = 25.0; // Up to 25 m^2 (e.g. large drag sail)
  let bestArea = highArea;

  // If even 25 m^2 cannot deorbit in limitYears (e.g. high altitude like 1000 km)
  const maxCheck = simulateLifetime({ ...params, areaM2: highArea }, multiplier);
  if (maxCheck.lifetimeYears > limitYears) {
    return highArea; // Return max bound
  }

  for (let i = 0; i < 25; i++) {
    const midArea = (lowArea + highArea) / 2;
    const sim = simulateLifetime({ ...params, areaM2: midArea }, multiplier);

    if (sim.lifetimeYears <= limitYears && sim.reentered) {
      bestArea = midArea;
      highArea = midArea; // Try finding smaller area
    } else {
      lowArea = midArea; // Need larger area
    }
  }

  // Add 1% safety margin to ensure re-simulation strictly passes numerical precision
  const safeArea = Number((bestArea * 1.01).toFixed(4));
  return safeArea;
}
