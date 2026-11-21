import { describe, it, expect } from 'vitest';
import {
  simulateLifetime,
  runScenarios,
  findMaxPassingAltitude,
  findRequiredArea,
  calculateBallisticTerm,
  getAtmosphericDensity,
} from './engine';

describe('Orbital Decay Engine', () => {
  const cubesat3U = {
    altitudeKm: 500,
    massKg: 4.0,
    areaM2: 0.03,
    cd: 2.2,
  };

  it('calculates ballistic term correctly', () => {
    const B = calculateBallisticTerm(2.2, 0.03, 4.0);
    expect(B).toBeCloseTo(0.0165, 5);
  });

  it('calculates atmospheric density from piecewise table', () => {
    expect(getAtmosphericDensity(0)).toBeCloseTo(1.225, 3);
    const rho300 = getAtmosphericDensity(300);
    const rho500 = getAtmosphericDensity(500);
    const rho700 = getAtmosphericDensity(700);

    expect(rho300).toBeGreaterThan(rho500);
    expect(rho500).toBeGreaterThan(rho700);
    expect(getAtmosphericDensity(500, 2.0)).toBeCloseTo(rho500 * 2.0);
  });

  it('verifies for 3U cubesat that lifetime increases with altitude across 400, 500, 600, 700 km', () => {
    const altitudes = [400, 500, 600, 700];
    const lifetimes = altitudes.map((alt) =>
      simulateLifetime({ ...cubesat3U, altitudeKm: alt }, 1.0).lifetimeYears
    );

    for (let i = 0; i < lifetimes.length - 1; i++) {
      expect(lifetimes[i + 1]).toBeGreaterThan(lifetimes[i]);
    }
  });

  it('verifies solar activity impact: high-activity lifetime < medium < low', () => {
    const scenarios = runScenarios({ ...cubesat3U, altitudeKm: 500 });
    expect(scenarios.high.lifetimeYears).toBeLessThan(scenarios.medium.lifetimeYears);
    expect(scenarios.medium.lifetimeYears).toBeLessThan(scenarios.low.lifetimeYears);
  });

  it('verifies findMaxPassingAltitude result actually passes when re-simulated', () => {
    const limitYears = 25;
    const maxAlt = findMaxPassingAltitude(
      { massKg: cubesat3U.massKg, areaM2: cubesat3U.areaM2, cd: cubesat3U.cd },
      limitYears,
      1.0
    );

    expect(maxAlt).toBeGreaterThan(200);

    const reSim = simulateLifetime(
      { ...cubesat3U, altitudeKm: maxAlt },
      1.0
    );

    expect(reSim.reentered).toBe(true);
    expect(reSim.lifetimeYears).toBeLessThanOrEqual(limitYears);
  });

  it('verifies findRequiredArea result actually passes when re-simulated', () => {
    const initialAlt = 600;
    const targetLimit = 5.0;

    const reqArea = findRequiredArea(
      { ...cubesat3U, altitudeKm: initialAlt },
      targetLimit,
      1.0
    );

    expect(reqArea).toBeGreaterThan(cubesat3U.areaM2);

    const reSim = simulateLifetime(
      { ...cubesat3U, altitudeKm: initialAlt, areaM2: reqArea },
      1.0
    );

    expect(reSim.reentered).toBe(true);
    expect(reSim.lifetimeYears).toBeLessThanOrEqual(targetLimit);
  });

  it('prints sanity-check lifetime table for 3U cubesat', () => {
    const altitudes = [400, 500, 600, 700];
    const results = altitudes.map((alt) => {
      const res = runScenarios({ ...cubesat3U, altitudeKm: alt });
      return {
        altitudeKm: alt,
        highYears: res.high.lifetimeYears,
        mediumYears: res.medium.lifetimeYears,
        lowYears: res.low.lifetimeYears,
      };
    });
    console.log('--- 3U CubeSat Sanity Check Lifetimes (Years) ---');
    console.table(results);
  });
});
