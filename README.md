# SleepTracker

A comprehensive sleep tracking mobile app inspired by [AutoSleep](https://apps.apple.com/us/app/autosleep-watch-sleep-tracker/id1164801111). Built with React Native (Expo), Expo Router, and react-native-svg.

## Features

- **Sleep Rings** — Animated circular progress rings (sleep duration, quality, deep sleep)
- **Today Dashboard** — Morning briefing with emoji, notes, and full sleep summary
- **Sleep Stage Hypnogram** — Awake/REM/Light/Deep visualization with heart rate overlay
- **Readiness Score** — Composite score with Sleep Fuel, Recovery, and Onset gauges
- **Health Metrics** — Heart rate, SpO2, HRV, respiration rate, wrist temperature
- **Sleep Consistency** — Bedtime pattern tracking with tonight's recommendation
- **Sleep Bank** — 7-day cumulative sleep debt/surplus
- **History** — 14-day stacked bar charts, rating trends, tappable session list
- **Session Detail** — Full breakdown screen with all metrics
- **Smart Alarm** — Time picker with haptic feedback and smart window (15/30/45 min)
- **3 Themes** — Midnight, Neon, Sunrise
- **Data Export** — Share sleep data as CSV
- **Emoji & Notes** — Per-session annotations

## Tech Stack

- Expo SDK 53 + Expo Router (file-based navigation)
- React Native + TypeScript
- react-native-svg (rings, charts)
- react-native-reanimated (animations)
- expo-haptics (alarm feedback)
- expo-sharing (CSV export)
- expo-linear-gradient (backgrounds)

## Getting Started

```bash
npm install
npx expo start
```

Press `i` for iOS Simulator or `a` for Android Emulator.

## Project Structure

```
app/
  (tabs)/           # 4 tab screens: Today, Clock, History, Settings
  session/[id].tsx  # Session detail screen
src/
  components/       # SleepRings, BarChart, HealthCards, etc.
  data/mockData.ts  # Data model + realistic mock data
  themes/           # 3 themes + ThemeContext
```

## License

MIT
