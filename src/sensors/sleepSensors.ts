// Pure helpers for iPhone-sensor sleep tracking: turn raw accelerometer +
// microphone readings into movement, noise, and an estimated sleep stage.
// This is the classic actigraphy approach Sleep-Cycle-style apps use.

// Peak-to-peak of accelerometer magnitude over a slot's readings = how much the
// sleeper moved. At rest the magnitude is ~1g (gravity), so we measure deviation.
export function movementFromAccel(magnitudes: number[]): number {
  if (magnitudes.length === 0) return 0;
  let min = Infinity;
  let max = -Infinity;
  for (const m of magnitudes) {
    if (m < min) min = m;
    if (m > max) max = m;
  }
  return Math.max(0, max - min);
}

export function accelMagnitude(x: number, y: number, z: number): number {
  return Math.sqrt(x * x + y * y + z * z);
}

// Microphone metering is dBFS (~ -160 silent .. 0 max). Map to a 0-100 noise
// scale: a quiet room (~-50) ≈ 17, snoring (~-20) ≈ 67.
export function dbToNoise(db: number | undefined): number {
  if (db == null || !Number.isFinite(db)) return 0;
  return Math.max(0, Math.min(100, Math.round((db + 60) * (100 / 60))));
}

// Estimate a sleep stage from this slot's movement (g) plus a 90-min cycle
// position so REM clusters realistically. 0=Awake 1=REM 2=Light 3=Deep.
export function estimateStage(movement: number, slotIndex: number): number {
  if (slotIndex < 2) return 0; // settling in
  if (movement > 0.18) return 0; // clear motion -> awake
  if (movement > 0.06) return 2; // some motion -> light
  // Low movement: deep, with REM windows late in each ~90-min cycle.
  const cyclePos = (slotIndex % 90) / 90;
  if (cyclePos > 0.7 && slotIndex > 30) return 1; // REM
  return 3; // deep
}

export const MOVE_THRESHOLD_AWAKE = 0.18;
