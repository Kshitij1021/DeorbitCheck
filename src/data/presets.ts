export interface CubeSatPreset {
  id: string;
  name: string;
  massKg: number;
  areaM2: number;
  cd: number;
}

export const CUBESAT_PRESETS: CubeSatPreset[] = [
  { id: '1u', name: '1U', massKg: 1.3, areaM2: 0.01, cd: 2.2 },
  { id: '2u', name: '2U', massKg: 2.6, areaM2: 0.02, cd: 2.2 },
  { id: '3u', name: '3U', massKg: 4.0, areaM2: 0.03, cd: 2.2 },
  { id: '6u', name: '6U', massKg: 8.0, areaM2: 0.06, cd: 2.2 },
  { id: '12u', name: '12U', massKg: 16.0, areaM2: 0.12, cd: 2.2 },
];
