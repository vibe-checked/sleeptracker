// Backward-compat barrel. The data layer now lives in:
//   types.ts (types) · derive.ts (pure math/utils) · providers/* (generation)
//   repository.ts (persistence/orchestration) · SleepDataContext.tsx (React hook)
// Screens should consume data via useSleepData(); these re-exports cover the
// pure types and helpers that are still imported directly.

export type {
  SleepStage,
  HealthMetrics,
  SleepDay,
  SleepTag,
  SleepGoals,
  ApneaData,
  NoiseSample,
  SnoringSample,
} from './types';

export {
  formatMinutes,
  getSleepBank,
  getTonightBedtime,
  exportSleepData,
  recomputeDerived,
  computeRecovery,
  sourceLabel,
  DEFAULT_GOALS,
} from './derive';
