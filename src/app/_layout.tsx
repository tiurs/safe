import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { DATABASE_NAME, migrateDbIfNeeded } from '../db/schema';
import { LockGate } from '../lib/lock';
import { useTheme } from '../lib/theme';

export default function RootLayout() {
  const t = useTheme();
  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDbIfNeeded}>
      <LockGate>
        <StatusBar style="auto" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: t.card },
            headerTintColor: t.text,
            contentStyle: { backgroundColor: t.bg },
          }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </LockGate>
    </SQLiteProvider>
  );
}
