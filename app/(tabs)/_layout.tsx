import { Tabs } from 'expo-router';
import { type ColorValue } from 'react-native';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useTheme } from '../../src/themes/ThemeContext';

// Native SF Symbols render reliably on iOS (unlike obscure Unicode glyphs).
const SYMBOLS: Record<string, SFSymbol> = {
  Today: 'sun.max.fill',
  Trends: 'chart.line.uptrend.xyaxis',
  History: 'calendar',
  Settings: 'gearshape.fill',
};

function TabIcon({ label, focused, color }: { label: string; focused: boolean; color: ColorValue }) {
  return (
    <SymbolView
      name={SYMBOLS[label] ?? 'circle.fill'}
      size={focused ? 26 : 23}
      tintColor={color}
      weight={focused ? 'semibold' : 'regular'}
    />
  );
}

export default function TabLayout() {
  const { theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.navBg,
          borderTopColor: theme.cardBorder,
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 24,
          paddingTop: 8,
        },
        tabBarActiveTintColor: theme.navActive,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ focused, color }) => <TabIcon label="Today" focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Trends',
          tabBarIcon: ({ focused, color }) => <TabIcon label="Trends" focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ focused, color }) => <TabIcon label="History" focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused, color }) => <TabIcon label="Settings" focused={focused} color={color} />,
        }}
      />
    </Tabs>
  );
}
