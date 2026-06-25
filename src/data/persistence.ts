import AsyncStorage from '@react-native-async-storage/async-storage';

// Typed, storage-agnostic wrapper. Each value is a versioned envelope so we can
// migrate later. Swapping to SQLite later only touches this file.

const PREFIX = '@sleeptracker/';

interface Envelope<T> {
  v: number;
  data: T;
}

export const KEYS = {
  sessions: 'sessions',
  goals: 'goals',
  settings: 'settings',
  smartAlarm: 'smartAlarm',
  theme: 'theme',
  liveSession: 'liveSession',
  dataSource: 'dataSource',
  healthOnboarded: 'healthOnboarded',
  schemaVersion: 'schemaVersion',
} as const;

export async function load<T>(key: string, fallback: T, version = 1): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (raw == null) return fallback;
    const env = JSON.parse(raw) as Envelope<T>;
    if (env == null || typeof env !== 'object' || !('data' in env)) return fallback;
    return env.data;
  } catch {
    return fallback;
  }
}

export async function save<T>(key: string, value: T, version = 1): Promise<void> {
  try {
    const env: Envelope<T> = { v: version, data: value };
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(env));
  } catch {
    // Best-effort; persistence failures shouldn't crash the UI.
  }
}

export async function remove(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(PREFIX + key);
  } catch {
    // ignore
  }
}
