export interface SolarScenario {
  name: string;
  multiplier: number;
  description: string;
}

export const SOLAR_SCENARIOS = {
  low: {
    name: 'Low Solar Activity',
    multiplier: 0.4,
    description: 'Solar minimum conditions (lower atmospheric density, longer lifetime)',
  },
  medium: {
    name: 'Medium Solar Activity',
    multiplier: 1.0,
    description: 'Mean solar cycle conditions (standard reference baseline)',
  },
  high: {
    name: 'High Solar Activity',
    multiplier: 3.0,
    description: 'Solar maximum conditions (elevated atmospheric density, faster decay)',
  },
} as const;

export type SolarScenarioKey = keyof typeof SOLAR_SCENARIOS;
