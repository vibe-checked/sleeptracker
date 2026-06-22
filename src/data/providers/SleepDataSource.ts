import type { SleepDay } from '../types';

// The seam for swapping data sources. The mock provider implements this today;
// a real HealthKit provider can implement it later without touching screens.
export interface SleepDataSource {
  readonly id: 'mock' | 'healthkit';
  isAvailable(): Promise<boolean>;
  requestPermissions(): Promise<boolean>;
  getSessions(rangeDays: number): Promise<SleepDay[]>;
  getLatest(): Promise<SleepDay | null>;
}
