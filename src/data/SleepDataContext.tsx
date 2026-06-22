import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type {
  SleepDay,
  SleepGoals,
  SleepSettings,
  SmartAlarmConfig,
  LiveSession,
  SleepTag,
} from './types';
import { DEFAULT_GOALS, recomputeDerived } from './derive';
import {
  initSessions,
  persistSessions,
  newLiveSession,
  liveSample,
  synthesizeFromLive,
} from './repository';
import { load, save, KEYS } from './persistence';

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
  stopTracking: () => SleepDay | null;
}

const SleepDataContext = createContext<SleepDataValue | null>(null);

export function SleepDataProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SleepDay[]>([]);
  const [goals, setGoalsState] = useState<SleepGoals>(DEFAULT_GOALS);
  const [settings, setSettingsState] = useState<SleepSettings>(DEFAULT_SETTINGS);
  const [smartAlarm, setSmartAlarmState] = useState<SmartAlarmConfig>(DEFAULT_ALARM);
  const [liveSession, setLiveSession] = useState<LiveSession | null>(null);
  // Mirror of liveSession for synchronous reads in stopTracking.
  const liveRef = useRef<LiveSession | null>(null);
  liveRef.current = liveSession;

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [loadedSessions, loadedGoals, loadedSettings, loadedAlarm, loadedLive] = await Promise.all([
        initSessions(),
        load<SleepGoals>(KEYS.goals, DEFAULT_GOALS),
        load<SleepSettings>(KEYS.settings, DEFAULT_SETTINGS),
        load<SmartAlarmConfig>(KEYS.smartAlarm, DEFAULT_ALARM),
        load<LiveSession | null>(KEYS.liveSession, null),
      ]);
      if (!mounted) return;
      setSessions(loadedSessions);
      setGoalsState(loadedGoals);
      setSettingsState(loadedSettings);
      setSmartAlarmState(loadedAlarm);
      setLiveSession(loadedLive);
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
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTracking = useCallback(() => {
    const live = newLiveSession(Date.now());
    setLiveSession(live);
    save(KEYS.liveSession, live);
  }, []);

  const stopTracking = useCallback((): SleepDay | null => {
    const prev = liveRef.current;
    if (!prev) return null;
    const created = synthesizeFromLive(prev, Date.now());
    setSessions(s => {
      const next = [...s, created];
      persistSessions(next);
      return next;
    });
    liveRef.current = null;
    setLiveSession(null);
    save(KEYS.liveSession, null);
    return created;
  }, []);

  // While tracking, accumulate samples every few seconds (1 "minute" of sleep
  // per real second, sped up for the simulator demo). Elapsed is recomputed from
  // startedAt so backgrounding doesn't desync.
  useEffect(() => {
    if (!liveSession) {
      if (tickRef.current) clearInterval(tickRef.current);
      return;
    }
    tickRef.current = setInterval(() => {
      setLiveSession(prev => {
        if (!prev) return prev;
        const elapsedMin = prev.samples.length;
        const lastStage = prev.samples[prev.samples.length - 1]?.stage ?? 0;
        const next = { ...prev, samples: [...prev.samples, liveSample(elapsedMin, lastStage)] };
        save(KEYS.liveSession, next);
        return next;
      });
    }, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [!!liveSession]);

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
    stopTracking,
  };

  return <SleepDataContext.Provider value={value}>{children}</SleepDataContext.Provider>;
}

export function useSleepData(): SleepDataValue {
  const ctx = useContext(SleepDataContext);
  if (!ctx) throw new Error('useSleepData must be used within SleepDataProvider');
  return ctx;
}
