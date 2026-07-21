import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type {
  SleepDay,
  SleepGoals,
  SleepSettings,
  SmartAlarmConfig,
  LiveSession,
  SleepTag,
  NoiseSample,
  SnoringSample,
} from './types';
import type { SleepSource } from './types';
import { DEFAULT_GOALS, recomputeDerived } from './derive';
import {
  initSessions,
  persistSessions,
  newLiveSession,
  liveSample,
  synthesizeFromLive,
  setDataSource,
} from './repository';
import { healthKitProvider, seedHealthKitSampleNight, startHealthBackgroundSync } from './providers/healthKitProvider';
import { load, save, KEYS } from './persistence';
import * as Device from 'expo-device';
import { AppState } from 'react-native';

// true on a real iPhone, false on the iOS Simulator. Drives the core rule:
// device -> real Apple Health data; simulator -> mock data.
export const IS_DEVICE = Device.isDevice;

// Merge a fresh HealthKit pull into the existing list: keep non-Health
// sessions (iPhone-tracked, manual), and for Health nights carry over the
// user's edits/notes/tags from the stored copy with the same stable id.
function mergeHealthSessions(prev: SleepDay[], hk: SleepDay[]): SleepDay[] {
  const prevById = new Map(prev.map(s => [s.id, s]));
  const merged = hk.map(d => {
    const old = prevById.get(d.id);
    if (!old) return d;
    if (old.edited) return old; // user-adjusted nights win over re-imports
    return { ...d, emoji: old.emoji || d.emoji, note: old.note || d.note, tags: old.tags.length ? old.tags : d.tags };
  });
  const rest = prev.filter(s => s.source !== 'healthkit');
  const key = (s: SleepDay) => `${s.isoDate}T${s.wakeTime.padStart(5, '0')}`;
  return [...rest, ...merged].sort((a, b) => (key(a) < key(b) ? -1 : 1));
}

const DEFAULT_SETTINGS: SleepSettings = { temperatureUnit: 'C' };
const DEFAULT_ALARM: SmartAlarmConfig = { enabled: true, wakeHour: 7, wakeMin: 0, windowMin: 30 };

export interface SleepEdit {
  bedtime?: string;
  wakeTime?: string;
  emoji?: string;
  note?: string;
  tags?: SleepTag[];
}

interface SleepDataValue {
  loading: boolean;
  sessions: SleepDay[];
  today: SleepDay | null;
  goals: SleepGoals;
  settings: SleepSettings;
  smartAlarm: SmartAlarmConfig;
  liveSession: LiveSession | null;
  getById: (id: string) => SleepDay | undefined;
  updateSession: (id: string, edit: SleepEdit) => void;
  addSession: (day: SleepDay) => void;
  setGoals: (g: SleepGoals) => void;
  setSettings: (s: SleepSettings) => void;
  setSmartAlarm: (a: SmartAlarmConfig) => void;
  startTracking: () => void;
  recordSample: (stage: number, heartRate: number, time: string) => void;
  stopTracking: (extra?: { noise?: NoiseSample[]; snoring?: SnoringSample[]; hasHeartRate?: boolean }) => SleepDay | null;
  dataSource: SleepSource;
  isDevice: boolean;
  healthAvailable: boolean;
  connectHealth: () => Promise<{ authorized: boolean; imported: number }>;
  syncFromHealth: () => Promise<number>;
  seedHealthSample: () => Promise<boolean>;
}

const SleepDataContext = createContext<SleepDataValue | null>(null);

export function SleepDataProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SleepDay[]>([]);
  const [goals, setGoalsState] = useState<SleepGoals>(DEFAULT_GOALS);
  const [settings, setSettingsState] = useState<SleepSettings>(DEFAULT_SETTINGS);
  const [smartAlarm, setSmartAlarmState] = useState<SmartAlarmConfig>(DEFAULT_ALARM);
  const [liveSession, setLiveSession] = useState<LiveSession | null>(null);
  const [dataSource, setDataSourceState] = useState<SleepSource>('mock');
  const [healthAvailable, setHealthAvailable] = useState(false);
  // Mirror of liveSession for synchronous reads in stopTracking.
  const liveRef = useRef<LiveSession | null>(null);
  liveRef.current = liveSession;

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [loadedGoals, loadedSettings, loadedAlarm, loadedLive] = await Promise.all([
        load<SleepGoals>(KEYS.goals, DEFAULT_GOALS),
        load<SleepSettings>(KEYS.settings, DEFAULT_SETTINGS),
        load<SmartAlarmConfig>(KEYS.smartAlarm, DEFAULT_ALARM),
        load<LiveSession | null>(KEYS.liveSession, null),
      ]);
      if (!mounted) return;
      setGoalsState(loadedGoals);
      setSettingsState(loadedSettings);
      setSmartAlarmState(loadedAlarm);

      if (IS_DEVICE) {
        // Real iPhone: Apple Health is the only data source — never mock.
        setDataSource(healthKitProvider);
        setDataSourceState('healthkit');
        setLiveSession(loadedLive); // allow resuming an interrupted phone session
        // Keep real data only: Apple Health + iPhone-tracked nights (drop mock seed).
        const stored = (await load<SleepDay[]>(KEYS.sessions, [])).filter(s => s.source !== 'mock');
        if (!mounted) return;
        setSessions(stored);
        setLoading(false); // render stored data / onboarding immediately
        healthKitProvider.isAvailable().then(a => mounted && setHealthAvailable(a));

        // Then prompt (first launch only) and sync in the background, so the
        // Health sheet appears over the UI rather than a blank loading screen.
        (async () => {
          const onboarded = await load<boolean>(KEYS.healthOnboarded, false);
          if (!onboarded) {
            await healthKitProvider.requestPermissions().catch(() => false);
            await save(KEYS.healthOnboarded, true);
            await save(KEYS.dataSource, 'healthkit');
          }
          try {
            const hk = await healthKitProvider.getSessions(180);
            if (mounted && hk.length > 0) {
              setSessions(prev => {
                const next = mergeHealthSessions(prev, hk);
                persistSessions(next);
                return next;
              });
            }
          } catch {
            // keep stored
          }
        })();
        return;
      } else {
        // Simulator: mock data + the live demo.
        const loadedSource = await load<SleepSource>(KEYS.dataSource, 'mock');
        const seeded = await initSessions();
        if (!mounted) return;
        setSessions(seeded);
        setLiveSession(loadedLive);
        setDataSourceState(loadedSource);
        if (loadedSource === 'healthkit') setDataSource(healthKitProvider);
        healthKitProvider.isAvailable().then(a => mounted && setHealthAvailable(a));
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const writeSessions = useCallback((next: SleepDay[]) => {
    setSessions(next);
    persistSessions(next);
  }, []);

  const getById = useCallback((id: string) => sessions.find(d => d.id === id), [sessions]);

  const updateSession = useCallback(
    (id: string, edit: SleepEdit) => {
      setSessions(prev => {
        const next = prev.map(d => {
          if (d.id !== id) return d;
          const merged: SleepDay = {
            ...d,
            bedtime: edit.bedtime ?? d.bedtime,
            wakeTime: edit.wakeTime ?? d.wakeTime,
            emoji: edit.emoji ?? d.emoji,
            note: edit.note ?? d.note,
            tags: edit.tags ?? d.tags,
            edited: true,
          };
          return recomputeDerived(merged);
        });
        persistSessions(next);
        return next;
      });
    },
    []
  );

  const addSession = useCallback((day: SleepDay) => {
    setSessions(prev => {
      const next = [...prev, day];
      persistSessions(next);
      return next;
    });
  }, []);

  const setGoals = useCallback((g: SleepGoals) => {
    setGoalsState(g);
    save(KEYS.goals, g);
  }, []);

  const setSettings = useCallback((s: SleepSettings) => {
    setSettingsState(s);
    save(KEYS.settings, s);
  }, []);

  const setSmartAlarm = useCallback((a: SmartAlarmConfig) => {
    setSmartAlarmState(a);
    save(KEYS.smartAlarm, a);
  }, []);

  // --- Live tracking --------------------------------------------------------
  // The live tracking screen samples real iPhone sensors (or simulates on the
  // simulator) and pushes stages here via recordSample; stopTracking finalizes.
  const startTracking = useCallback(() => {
    const live = newLiveSession(Date.now());
    liveRef.current = live;
    setLiveSession(live);
    save(KEYS.liveSession, live);
  }, []);

  const recordSample = useCallback((stage: number, heartRate: number, time: string) => {
    setLiveSession(prev => {
      if (!prev) return prev;
      const next = { ...prev, samples: [...prev.samples, { time, stage, heartRate }] };
      liveRef.current = next;
      save(KEYS.liveSession, next);
      return next;
    });
  }, []);

  const stopTracking = useCallback(
    (extra: { noise?: NoiseSample[]; snoring?: SnoringSample[]; hasHeartRate?: boolean } = {}): SleepDay | null => {
      const prev = liveRef.current;
      if (!prev) return null;
      const created = synthesizeFromLive(prev, Date.now(), extra);
      setSessions(s => {
        const next = [...s, created];
        persistSessions(next);
        return next;
      });
      liveRef.current = null;
      setLiveSession(null);
      save(KEYS.liveSession, null);
      return created;
    },
    []
  );

  // --- Apple Health -----------------------------------------------------------
  const connectHealth = useCallback(async () => {
    const authorized = await healthKitProvider.requestPermissions();
    if (!authorized) return { authorized: false, imported: 0 };
    setDataSource(healthKitProvider);
    const hk = await healthKitProvider.getSessions(180);
    if (hk.length > 0) {
      setSessions(prev => {
        const next = mergeHealthSessions(prev, hk);
        persistSessions(next);
        return next;
      });
    }
    setDataSourceState('healthkit');
    save(KEYS.dataSource, 'healthkit');
    return { authorized: true, imported: hk.length };
  }, [writeSessions]);

  const syncFromHealth = useCallback(async () => {
    const hk = await healthKitProvider.getSessions(180);
    if (hk.length > 0) {
      setSessions(prev => {
        const next = mergeHealthSessions(prev, hk);
        persistSessions(next);
        return next;
      });
    }
    return hk.length;
  }, []);

  const seedHealthSample = useCallback(() => seedHealthKitSampleNight(), []);

  // Keep Apple Health data fresh on device without a manual tap:
  //  - re-pull when the app returns to the foreground (throttled to ~1/min)
  //  - register a HealthKit background observer so iOS can wake the app and
  //    refresh even while it's closed.
  const lastSyncRef = useRef(0);
  useEffect(() => {
    if (!IS_DEVICE) return;
    const throttledSync = () => {
      const now = Date.now();
      if (now - lastSyncRef.current < 60_000) return;
      lastSyncRef.current = now;
      syncFromHealth().catch(() => {});
    };

    const appStateSub = AppState.addEventListener('change', state => {
      if (state === 'active') throttledSync();
    });

    let unsubscribe: (() => void) | undefined;
    startHealthBackgroundSync(() => throttledSync()).then(fn => {
      unsubscribe = fn;
    });

    return () => {
      appStateSub.remove();
      unsubscribe?.();
    };
  }, [syncFromHealth]);

  const today = sessions.length > 0 ? sessions[sessions.length - 1] : null;

  const value: SleepDataValue = {
    loading,
    sessions,
    today,
    goals,
    settings,
    smartAlarm,
    liveSession,
    getById,
    updateSession,
    addSession,
    setGoals,
    setSettings,
    setSmartAlarm,
    startTracking,
    recordSample,
    stopTracking,
    dataSource,
    isDevice: IS_DEVICE,
    healthAvailable,
    connectHealth,
    syncFromHealth,
    seedHealthSample,
  };

  return <SleepDataContext.Provider value={value}>{children}</SleepDataContext.Provider>;
}

export function useSleepData(): SleepDataValue {
  const ctx = useContext(SleepDataContext);
  if (!ctx) throw new Error('useSleepData must be used within SleepDataProvider');
  return ctx;
}
