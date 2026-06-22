import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { ThemeProvider } from '../src/themes/ThemeContext';
import { SleepDataProvider } from '../src/data/SleepDataContext';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  return (
    <ThemeProvider>
      <SleepDataProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="session/[id]"
            options={{
              headerShown: false,
              presentation: 'card',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="session/edit/[id]"
            options={{
              headerShown: false,
              presentation: 'card',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="track/index"
            options={{
              headerShown: false,
              presentation: 'fullScreenModal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="track/live"
            options={{
              headerShown: false,
              presentation: 'fullScreenModal',
              animation: 'fade',
            }}
          />
        </Stack>
      </SleepDataProvider>
    </ThemeProvider>
  );
}
